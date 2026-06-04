const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"));
const version = manifest.version;
const arch = os.machine();
const distDir = path.join(root, "dist");
const extensionZip = path.join(distDir, `visionclip-extension-v${version}.zip`);
const nativeZip = path.join(distDir, `visionclip-native-host-macos-${arch}-v${version}.zip`);
const nativePkg = path.join(distDir, `visionclip-native-host-macos-${arch}-v${version}.pkg`);
const checksumsFile = path.join(distDir, `checksums-v${version}.txt`);

assertFile(extensionZip);
assertFile(nativeZip);
assertFile(nativePkg);
assertFile(checksumsFile);

const extensionEntries = listZipEntries(extensionZip);
const nativeEntries = listZipEntries(nativeZip);

requireEntries(extensionEntries, [
  "manifest.json",
  "background.js",
  "content.js",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "icons/icon-16.png",
  "icons/icon-32.png",
  "icons/icon-48.png",
  "icons/icon-128.png"
]);

forbidEntries(extensionEntries, [
  "assets/",
  "docs/",
  "samples/",
  "icons/icon-source.png"
]);

const nativeRoot = `visionclip-native-host-macos-${arch}-v${version}`;
const licenseFile = ["LICENSE", "LICENSE.md", "LICENCE", "COPYING"]
  .find((fileName) => fs.existsSync(path.join(root, fileName)));

requireEntries(nativeEntries, [
  `${nativeRoot}/image-ocr-host`,
  `${nativeRoot}/install_native_host.sh`,
  `${nativeRoot}/uninstall_native_host.sh`,
  `${nativeRoot}/README.md`,
  `${nativeRoot}/CHANGELOG.md`,
  `${nativeRoot}/SECURITY.md`,
  `${nativeRoot}/SUPPORT.md`,
  `${nativeRoot}/CONTRIBUTING.md`,
  `${nativeRoot}/docs/PRIVACY.md`,
  `${nativeRoot}/docs/CHROME_PERMISSIONS.md`,
  `${nativeRoot}/docs/RELEASE_CHECKLIST.md`,
  `${nativeRoot}/docs/STORE_LISTING.md`,
  `${nativeRoot}/docs/MACOS_DISTRIBUTION.md`,
  `${nativeRoot}/docs/ANNOUNCEMENT.md`,
  `${nativeRoot}/docs/RELEASE_NOTES_v${version}.md`,
  `${nativeRoot}/samples/README.md`,
  `${nativeRoot}/samples/index.html`,
  `${nativeRoot}/samples/ocr-sample-01-dashboard.png`,
  `${nativeRoot}/samples/ocr-sample-02-receipts-labels.png`,
  `${nativeRoot}/samples/ocr-sample-03-whiteboard-notes.png`,
  `${nativeRoot}/assets/social/x-modal-range-ocr.png`,
  `${nativeRoot}/assets/social/x-workflow-keychain.png`,
  `${nativeRoot}/assets/social/x-product-hero.png`,
  `${nativeRoot}/assets/social/x-imagegen-modal-range-ocr.png`,
  `${nativeRoot}/assets/social/x-imagegen-workflow-keychain.png`,
  `${nativeRoot}/assets/social/x-imagegen-launch-desk.png`,
  `${nativeRoot}/assets/store/promotional-small.png`,
  `${nativeRoot}/assets/store/screenshot-source.html`,
  `${nativeRoot}/assets/store/screenshots/store-screenshot-01-image-context.png`,
  `${nativeRoot}/assets/store/screenshots/store-screenshot-02-region-ocr.png`,
  `${nativeRoot}/assets/store/screenshots/store-screenshot-03-popup-history.png`,
  `${nativeRoot}/assets/store/screenshots/store-screenshot-04-options-keychain.png`,
  `${nativeRoot}/assets/store/screenshots/store-screenshot-05-modal-shortcut.png`
]);

if (licenseFile) {
  requireEntries(nativeEntries, [`${nativeRoot}/${licenseFile}`]);
}

verifyChecksums([
  path.basename(extensionZip),
  path.basename(nativeZip),
  path.basename(nativePkg)
]);

function assertFile(filePath) {
  const stat = fs.statSync(filePath, { throwIfNoEntry: false });
  if (!stat?.isFile()) {
    throw new Error(`Missing file: ${filePath}`);
  }
}

function listZipEntries(zipPath) {
  const output = execFileSync("unzip", ["-Z", "-1", zipPath], { encoding: "utf8" });
  return output.split("\n").filter(Boolean);
}

function requireEntries(entries, expectedEntries) {
  for (const expected of expectedEntries) {
    if (!entries.includes(expected)) {
      throw new Error(`Zip is missing ${expected}`);
    }
  }
}

function forbidEntries(entries, forbiddenPrefixes) {
  for (const entry of entries) {
    for (const prefix of forbiddenPrefixes) {
      if (entry === prefix || entry.startsWith(prefix)) {
        throw new Error(`Zip must not include ${entry}`);
      }
    }
  }
}

function verifyChecksums(fileNames) {
  const lines = fs.readFileSync(checksumsFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const recorded = new Map();
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    if (!match) {
      throw new Error(`Malformed checksum line: ${line}`);
    }
    recorded.set(match[2], match[1]);
  }

  for (const fileName of fileNames) {
    const expected = recorded.get(fileName);
    if (!expected) {
      throw new Error(`Missing checksum entry for ${fileName}`);
    }

    const actual = crypto
      .createHash("sha256")
      .update(fs.readFileSync(path.join(distDir, fileName)))
      .digest("hex");
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for ${fileName}`);
    }
  }
}
