const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const extensionDir = path.join(root, "extension");
const manifest = JSON.parse(fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8"));
const requiredIconSizes = [16, 32, 48, 128];

if ((manifest.host_permissions || []).includes("<all_urls>")) {
  throw new Error("manifest must not request <all_urls> host permission");
}

if ((manifest.content_scripts || []).some((script) => (script.matches || []).includes("<all_urls>"))) {
  throw new Error("manifest must not inject content scripts on <all_urls>");
}

validateIconSet("icons", manifest.icons);
validateIconSet("action.default_icon", manifest.action?.default_icon);

const sourceInExtension = path.join(extensionDir, "icons", "icon-source.png");
if (fs.existsSync(sourceInExtension)) {
  throw new Error("extension package must not include icon-source.png");
}

function validateIconSet(label, icons) {
  if (!icons || typeof icons !== "object") {
    throw new Error(`manifest is missing ${label}`);
  }

  for (const size of requiredIconSizes) {
    const iconPath = icons[String(size)];
    if (!iconPath) {
      throw new Error(`${label} is missing ${size}px icon`);
    }

    const absolutePath = path.join(extensionDir, iconPath);
    const metadata = readPngMetadata(absolutePath);
    if (metadata.width !== size || metadata.height !== size) {
      throw new Error(`${iconPath} must be ${size}x${size}, got ${metadata.width}x${metadata.height}`);
    }
    if (metadata.bitDepth !== 8 || metadata.colorType !== 6) {
      throw new Error(`${iconPath} must be 8-bit RGBA PNG`);
    }
  }
}

function readPngMetadata(filePath) {
  const data = fs.readFileSync(filePath);
  const signature = data.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`${filePath} is not a PNG file`);
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data.readUInt8(24),
    colorType: data.readUInt8(25)
  };
}
