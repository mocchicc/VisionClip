import AppKit
import Foundation
import Darwin

private enum Config {
    static let hostName = "com.mocchicc.visionclip"
    static let keychainService = "com.mocchicc.visionclip.openai"
    static let legacyKeychainService = "com.mocchicc.image_ocr.openai"
    static let keychainAccount = "default"
    static let defaultModel = "gpt-4.1-mini"
    static let defaultDetail = "high"
    static let logPath = NSHomeDirectory() + "/Library/Logs/VisionClip/native-host.log"
    static let maxImageBytes = 50 * 1024 * 1024
    static let maxNativeResponsePreviewCharacters = 8_000
    static let defaultPrompt = """
    Extract all readable text from this image.
    Return only the extracted text, preserving line breaks and natural reading order.
    If there is no readable text, return an empty string.
    """
}

private enum HostError: LocalizedError {
    case missingImage
    case missingAPIKey
    case invalidNativeMessage
    case unsupportedImage(String)
    case httpError(Int, String)
    case openAIError(String)
    case keychainError(Int32, String)

    var errorDescription: String? {
        switch self {
        case .missingImage:
            return "No image URL or image data was provided."
        case .missingAPIKey:
            return "OpenAI API key is not set. Run image-ocr-host set-key first."
        case .invalidNativeMessage:
            return "Invalid native messaging payload."
        case .unsupportedImage(let reason):
            return reason
        case .httpError(let status, let body):
            return "HTTP \(status): \(body)"
        case .openAIError(let message):
            return message
        case .keychainError(let status, let message):
            return "Keychain error \(status): \(message)"
        }
    }
}

private struct OCRRequest: Decodable {
    let type: String?
    let imageUrl: String?
    let imageDataUrl: String?
    let pageUrl: String?
    let tabTitle: String?
    let model: String?
    let prompt: String?
    let detail: String?
    let apiKey: String?
}

private struct NativeResponse: Encodable {
    let ok: Bool
    let textPreview: String?
    let copied: Bool?
    let model: String?
    let error: String?
    var keyIsSet: Bool? = nil
    var version: String? = nil
}

@main
struct ImageOCRHost {
    static func main() async {
        Diagnostics.log("launch args=\(CommandLine.arguments.dropFirst().joined(separator: " "))")
        let arguments = Array(CommandLine.arguments.dropFirst())

        if arguments.isEmpty {
            await runNativeMessagingMode()
            return
        }

        do {
            try await runCLI(arguments)
        } catch {
            FileHandle.standardError.writeLine(error.localizedDescription)
            exit(1)
        }
    }

    private static func runNativeMessagingMode() async {
        do {
            let requestData = try NativeMessaging.readMessage()
            let request = try JSONDecoder().decode(OCRRequest.self, from: requestData)
            Diagnostics.log("native request type=\(request.type ?? "nil") bytes=\(requestData.count)")
            let response = try await OCRService().process(request)
            try NativeMessaging.writeMessage(response)
            Diagnostics.log("native response ok=\(response.ok)")
        } catch {
            Diagnostics.log("native error=\(error.localizedDescription)")
            let response = NativeResponse(
                ok: false,
                textPreview: nil,
                copied: false,
                model: nil,
                error: error.localizedDescription
            )
            try? NativeMessaging.writeMessage(response)
        }
    }

    private static func runCLI(_ arguments: [String]) async throws {
        switch arguments[0] {
        case "set-key":
            let key = try readSecret(prompt: "OpenAI API key: ")
            guard let key = key.nilIfBlank else {
                throw HostError.missingAPIKey
            }
            try KeychainStore.saveAPIKey(key)
            print("Saved OpenAI API key to Keychain.")

        case "set-key-clipboard":
            guard let key = await Clipboard.readString()?.nilIfBlank else {
                throw HostError.missingAPIKey
            }
            try KeychainStore.saveAPIKey(key)
            print("Saved OpenAI API key from clipboard to Keychain.")

        case "check-key":
            _ = try KeychainStore.readAPIKey()
            print("OpenAI API key is set.")

        case "clear-key":
            try KeychainStore.deleteAPIKey()
            print("Deleted OpenAI API key from Keychain.")

        case "ocr-url":
            guard arguments.count >= 2 else {
                throw HostError.missingImage
            }
            let request = OCRRequest(
                type: "ocr_image",
                imageUrl: arguments[1],
                imageDataUrl: nil,
                pageUrl: nil,
                tabTitle: nil,
                model: arguments.count >= 3 ? arguments[2] : nil,
                prompt: nil,
                detail: nil,
                apiKey: nil
            )
            let response = try await OCRService().process(request)
            print(response.textPreview ?? "")
            print("Copied OCR text to clipboard.")

        case "help", "--help", "-h":
            printUsage()

        default:
            printUsage()
            exit(2)
        }
    }

    private static func printUsage() {
        print("""
        Usage:
          image-ocr-host set-key
          image-ocr-host set-key-clipboard
          image-ocr-host check-key
          image-ocr-host clear-key
          image-ocr-host ocr-url <image-url> [model]
        """)
    }

    private static func readSecret(prompt: String) throws -> String {
        print(prompt, terminator: "")
        fflush(stdout)

        var oldTerm = termios()
        guard tcgetattr(STDIN_FILENO, &oldTerm) == 0 else {
            return readLine() ?? ""
        }

        var newTerm = oldTerm
        newTerm.c_lflag &= ~tcflag_t(ECHO)
        tcsetattr(STDIN_FILENO, TCSANOW, &newTerm)
        defer {
            tcsetattr(STDIN_FILENO, TCSANOW, &oldTerm)
            print("")
        }

        return readLine() ?? ""
    }
}

private final class OCRService {
    func process(_ request: OCRRequest) async throws -> NativeResponse {
        if request.type == "status" {
            return NativeResponse(
                ok: true,
                textPreview: nil,
                copied: nil,
                model: Config.defaultModel,
                error: nil,
                keyIsSet: (try? KeychainStore.readAPIKey()) != nil,
                version: "0.1.0"
            )
        }

        if request.type == "set_api_key" {
            guard let apiKey = request.apiKey?.nilIfBlank else {
                throw HostError.missingAPIKey
            }

            try KeychainStore.saveAPIKey(apiKey)
            return NativeResponse(
                ok: true,
                textPreview: nil,
                copied: nil,
                model: Config.defaultModel,
                error: nil,
                keyIsSet: true,
                version: "0.1.0"
            )
        }

        guard request.type == nil || request.type == "ocr_image" else {
            throw HostError.invalidNativeMessage
        }

        let apiKey = try KeychainStore.readAPIKey()
        let model = request.model?.nilIfBlank ?? Config.defaultModel
        let prompt = request.prompt?.nilIfBlank ?? Config.defaultPrompt
        let detail = request.detail?.nilIfBlank ?? Config.defaultDetail
        let imageDataURL = try await ImageInputLoader.loadDataURL(
            imageUrl: request.imageUrl,
            imageDataUrl: request.imageDataUrl
        )

        let text = try await OpenAIClient(apiKey: apiKey).extractText(
            imageDataURL: imageDataURL,
            model: model,
            prompt: prompt,
            detail: detail
        )

        await Clipboard.copy(text)

        return NativeResponse(
            ok: true,
            textPreview: text.preview(limit: Config.maxNativeResponsePreviewCharacters),
            copied: true,
            model: model,
            error: nil
        )
    }
}

private enum NativeMessaging {
    static func readMessage() throws -> Data {
        let lengthData = FileHandle.standardInput.readData(ofLength: 4)
        guard lengthData.count == 4 else {
            throw HostError.invalidNativeMessage
        }

        let length = lengthData.enumerated().reduce(UInt32(0)) { partial, item in
            partial | (UInt32(item.element) << UInt32(item.offset * 8))
        }

        guard length > 0 && length < UInt32.max else {
            throw HostError.invalidNativeMessage
        }

        let messageData = FileHandle.standardInput.readData(ofLength: Int(length))
        guard messageData.count == Int(length) else {
            throw HostError.invalidNativeMessage
        }

        return messageData
    }

    static func writeMessage<T: Encodable>(_ message: T) throws {
        let data = try JSONEncoder().encode(message)
        var length = UInt32(data.count).littleEndian
        let lengthData = Data(bytes: &length, count: MemoryLayout<UInt32>.size)

        FileHandle.standardOutput.write(lengthData)
        FileHandle.standardOutput.write(data)
    }
}

private enum KeychainStore {
    static func readAPIKey() throws -> String {
        do {
            return try readAPIKey(service: Config.keychainService)
        } catch HostError.missingAPIKey {
            return try readAPIKey(service: Config.legacyKeychainService)
        }
    }

    private static func readAPIKey(service: String) throws -> String {
        let result = try ProcessRunner.run(
            "/usr/bin/security",
            arguments: [
                "find-generic-password",
                "-s", service,
                "-a", Config.keychainAccount,
                "-w"
            ]
        )

        guard result.status != 44 else {
            throw HostError.missingAPIKey
        }
        guard result.status == 0 else {
            throw HostError.keychainError(result.status, result.stderrText)
        }

        let key = result.stdoutText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            throw HostError.missingAPIKey
        }

        return key
    }

    static func saveAPIKey(_ key: String) throws {
        let result = try ProcessRunner.run(
            "/usr/bin/security",
            arguments: [
                "add-generic-password",
                "-U",
                "-s", Config.keychainService,
                "-a", Config.keychainAccount,
                "-w", key
            ]
        )

        guard result.status == 0 else {
            throw HostError.keychainError(result.status, result.stderrText)
        }
    }

    static func deleteAPIKey() throws {
        let services = [Config.keychainService, Config.legacyKeychainService]
        for service in services {
            let result = try ProcessRunner.run(
                "/usr/bin/security",
                arguments: [
                    "delete-generic-password",
                    "-s", service,
                    "-a", Config.keychainAccount
                ]
            )

            guard result.status == 0 || result.status == 44 else {
                throw HostError.keychainError(result.status, result.stderrText)
            }
        }
    }
}

private enum ProcessRunner {
    struct Result {
        let status: Int32
        let stdout: Data
        let stderr: Data

        var stdoutText: String {
            String(data: stdout, encoding: .utf8) ?? ""
        }

        var stderrText: String {
            String(data: stderr, encoding: .utf8) ?? ""
        }
    }

    static func run(_ executable: String, arguments: [String], stdin: Data? = nil) throws -> Result {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        let stdinPipe: Pipe?
        if stdin != nil {
            let pipe = Pipe()
            process.standardInput = pipe
            stdinPipe = pipe
        } else {
            stdinPipe = nil
        }

        try process.run()

        if let stdin, let stdinPipe {
            stdinPipe.fileHandleForWriting.write(stdin)
            try? stdinPipe.fileHandleForWriting.close()
        }

        process.waitUntilExit()

        return Result(
            status: process.terminationStatus,
            stdout: stdoutPipe.fileHandleForReading.readDataToEndOfFile(),
            stderr: stderrPipe.fileHandleForReading.readDataToEndOfFile()
        )
    }
}

private enum ImageInputLoader {
    static func loadDataURL(imageUrl: String?, imageDataUrl: String?) async throws -> String {
        if let imageDataUrl = imageDataUrl?.nilIfBlank {
            try validateDataURL(imageDataUrl)
            return imageDataUrl
        }

        guard let imageUrl = imageUrl?.nilIfBlank else {
            throw HostError.missingImage
        }

        if imageUrl.starts(with: "data:image/") {
            try validateDataURL(imageUrl)
            return imageUrl
        }

        guard let url = URL(string: imageUrl), ["http", "https"].contains(url.scheme?.lowercased()) else {
            throw HostError.unsupportedImage("Only http(s) image URLs and data:image URLs are supported.")
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.setValue("Mozilla/5.0 VisionClip/0.1", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        if let httpResponse = response as? HTTPURLResponse, !(200..<300).contains(httpResponse.statusCode) {
            let body = String(data: data.prefix(500), encoding: .utf8) ?? ""
            throw HostError.httpError(httpResponse.statusCode, body)
        }

        guard data.count <= Config.maxImageBytes else {
            throw HostError.unsupportedImage("Image is larger than \(Config.maxImageBytes / 1024 / 1024) MB.")
        }

        let mimeType = response.mimeType ?? inferMimeType(from: url)
        guard isSupportedMimeType(mimeType) else {
            throw HostError.unsupportedImage("Unsupported image type: \(mimeType). Use PNG, JPEG, WEBP, or non-animated GIF.")
        }

        return "data:\(mimeType);base64,\(data.base64EncodedString())"
    }

    private static func inferMimeType(from url: URL) -> String {
        switch url.pathExtension.lowercased() {
        case "png":
            return "image/png"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "webp":
            return "image/webp"
        case "gif":
            return "image/gif"
        default:
            return "application/octet-stream"
        }
    }

    private static func isSupportedMimeType(_ mimeType: String) -> Bool {
        ["image/png", "image/jpeg", "image/webp", "image/gif"].contains(mimeType.lowercased())
    }

    private static func validateDataURL(_ dataURL: String) throws {
        guard dataURL.starts(with: "data:image/") else {
            throw HostError.unsupportedImage("Inline image data must be a data:image URL.")
        }

        let metadata = dataURL.split(separator: ",", maxSplits: 1).first ?? ""
        let mimeType = metadata
            .replacingOccurrences(of: "data:", with: "")
            .split(separator: ";", maxSplits: 1)
            .first
            .map(String.init) ?? ""

        guard isSupportedMimeType(mimeType) else {
            throw HostError.unsupportedImage("Unsupported inline image type: \(mimeType). Use PNG, JPEG, WEBP, or non-animated GIF.")
        }
    }
}

private final class OpenAIClient {
    private let apiKey: String

    init(apiKey: String) {
        self.apiKey = apiKey
    }

    func extractText(imageDataURL: String, model: String, prompt: String, detail: String) async throws -> String {
        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/responses")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "model": model,
            "input": [
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "input_text",
                            "text": prompt
                        ],
                        [
                            "type": "input_image",
                            "image_url": imageDataURL,
                            "detail": detail
                        ]
                    ]
                ]
            ],
            "max_output_tokens": 4000
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw HostError.openAIError("OpenAI API returned an invalid response.")
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            throw HostError.openAIError(Self.extractAPIError(from: data) ?? "OpenAI API returned HTTP \(httpResponse.statusCode).")
        }

        return try Self.extractOutputText(from: data)
    }

    private static func extractOutputText(from data: Data) throws -> String {
        guard let root = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw HostError.openAIError("OpenAI API response was not a JSON object.")
        }

        if let outputText = root["output_text"] as? String {
            return outputText.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        var chunks: [String] = []
        if let output = root["output"] as? [[String: Any]] {
            for item in output {
                guard let content = item["content"] as? [[String: Any]] else {
                    continue
                }

                for part in content {
                    if let text = part["text"] as? String {
                        chunks.append(text)
                    }
                }
            }
        }

        let text = chunks.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            throw HostError.openAIError("OpenAI API returned no text.")
        }

        return text
    }

    private static func extractAPIError(from data: Data) -> String? {
        guard
            let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let error = root["error"] as? [String: Any]
        else {
            return String(data: data.prefix(1000), encoding: .utf8)
        }

        return error["message"] as? String
    }
}

private enum Clipboard {
    
    @MainActor
    static func readString() -> String? {
        NSPasteboard.general.string(forType: .string)
    }

    @MainActor
    static func copy(_ text: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
    }
}

private extension FileHandle {
    func writeLine(_ line: String) {
        if let data = (line + "\n").data(using: .utf8) {
            write(data)
        }
    }
}

private extension String {
    var nilIfBlank: String? {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    func preview(limit: Int) -> String {
        if count <= limit {
            return self
        }

        return String(prefix(limit)) + "\n...[truncated]"
    }
}


private enum Diagnostics {
    static func log(_ message: String) {
        let line = "[\(ISO8601DateFormatter().string(from: Date()))] \(message)\n"
        let url = URL(fileURLWithPath: Config.logPath)
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            if FileManager.default.fileExists(atPath: url.path) {
                let handle = try FileHandle(forWritingTo: url)
                try handle.seekToEnd()
                if let data = line.data(using: .utf8) {
                    try handle.write(contentsOf: data)
                }
                try handle.close()
            } else {
                try line.write(to: url, atomically: true, encoding: .utf8)
            }
        } catch {
        }
    }
}
