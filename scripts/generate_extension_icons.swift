#!/usr/bin/env swift
import AppKit
import Foundation

let sizes = [16, 32, 48, 128]
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let iconDirectory = root.appendingPathComponent("extension/icons", isDirectory: true)
let sourceURL = root.appendingPathComponent("assets/extension-icon-source.png")

guard let sourceImage = NSImage(contentsOf: sourceURL) else {
    fatalError("Missing icon source: \(sourceURL.path)")
}

try FileManager.default.createDirectory(at: iconDirectory, withIntermediateDirectories: true)

for size in sizes {
    let pngData = renderIconPNG(sourceImage: sourceImage, size: size)
    let outputURL = iconDirectory.appendingPathComponent("icon-\(size).png")
    try pngData.write(to: outputURL)
    print("Wrote \(outputURL.path)")
}

func renderIconPNG(sourceImage: NSImage, size: Int) -> Data {
    let dimension = CGFloat(size)
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: size,
        pixelsHigh: size,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        fatalError("Failed to allocate bitmap for icon-\(size).png")
    }

    guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fatalError("Failed to create graphics context for icon-\(size).png")
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    defer {
        NSGraphicsContext.restoreGraphicsState()
    }

    let canvasSize = NSSize(width: dimension, height: dimension)
    NSColor.clear.setFill()
    NSRect(origin: .zero, size: canvasSize).fill()

    let radius = max(3, dimension * 0.22)
    let clipPath = NSBezierPath(
        roundedRect: NSRect(origin: .zero, size: canvasSize),
        xRadius: radius,
        yRadius: radius
    )
    clipPath.addClip()

    sourceImage.draw(
        in: NSRect(origin: .zero, size: canvasSize),
        from: centeredSquareRect(for: sourceImage),
        operation: .copy,
        fraction: 1.0
    )

    guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
        fatalError("Failed to encode icon-\(size).png")
    }
    return pngData
}

func centeredSquareRect(for image: NSImage) -> NSRect {
    let width = image.size.width
    let height = image.size.height
    let side = min(width, height)
    return NSRect(
        x: (width - side) / 2,
        y: (height - side) / 2,
        width: side,
        height: side
    )
}
