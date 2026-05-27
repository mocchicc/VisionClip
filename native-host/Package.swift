// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "ImageOCRHost",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "image-ocr-host", targets: ["ImageOCRHost"])
    ],
    targets: [
        .executableTarget(
            name: "ImageOCRHost",
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("Security")
            ]
        )
    ]
)
