const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "extension/manifest.json");
const nativeHostPath = path.join(root, "native-host/Sources/ImageOCRHost/main.swift");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestVersion = manifest.version;
if (!/^\d+\.\d+\.\d+$/.test(manifestVersion)) {
  throw new Error(`extension/manifest.json version must be semver-like x.y.z, got ${manifestVersion}`);
}

const nativeHostSource = fs.readFileSync(nativeHostPath, "utf8");
const nativeVersionMatch = nativeHostSource.match(/static let version = "([^"]+)"/);
if (!nativeVersionMatch) {
  throw new Error("Native host Config.version was not found");
}

const nativeVersion = nativeVersionMatch[1];
if (nativeVersion !== manifestVersion) {
  throw new Error(`Version mismatch: manifest=${manifestVersion}, native-host=${nativeVersion}`);
}

for (const forbidden of [
  /version:\s*"0\.1\.0"/,
  /VisionClip\/0\.1"/
]) {
  if (forbidden.test(nativeHostSource)) {
    throw new Error(`Native host contains stale hard-coded version pattern: ${forbidden}`);
  }
}
