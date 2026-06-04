const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const manifest = readJson("extension/manifest.json");
const version = manifest.version;
const arch = os.machine();
const distDir = path.join(root, "dist");
const outputPath = path.join(distDir, `release-qa-v${version}.md`);
const artifactFiles = [
  `visionclip-extension-v${version}.zip`,
  `visionclip-native-host-macos-${arch}-v${version}.zip`,
  `visionclip-native-host-macos-${arch}-v${version}.pkg`,
  `checksums-v${version}.txt`
];
const requiredDocs = [
  "README.md",
  "CHANGELOG.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CONTRIBUTING.md",
  "docs/PRIVACY.md",
  "docs/CHROME_PERMISSIONS.md",
  "docs/LICENSE_DECISION.md",
  "docs/STORE_LISTING.md",
  "docs/MACOS_DISTRIBUTION.md",
  "docs/RELEASE_CHECKLIST.md",
  "docs/RELEASE_RUNBOOK.md",
  `docs/RELEASE_NOTES_v${version}.md`
];
const requiredAssets = [
  "assets/store/promotional-small.png",
  "assets/store/screenshots/store-screenshot-01-image-context.png",
  "assets/store/screenshots/store-screenshot-02-region-ocr.png",
  "assets/store/screenshots/store-screenshot-03-popup-history.png",
  "assets/store/screenshots/store-screenshot-04-options-keychain.png",
  "assets/store/screenshots/store-screenshot-05-modal-shortcut.png",
  "samples/index.html",
  "samples/ocr-sample-01-dashboard.png",
  "samples/ocr-sample-02-receipts-labels.png",
  "samples/ocr-sample-03-whiteboard-notes.png"
];

fs.mkdirSync(distDir, { recursive: true });

const readiness = run("node", ["scripts/check_release_readiness.js"]);
const strictReadiness = run("node", ["scripts/check_release_readiness.js", "--strict"]);
const report = [
  `# VisionClip Release QA Report v${version}`,
  "",
  `Generated: ${new Date().toISOString()}`,
  `Repository: ${git(["config", "--get", "remote.origin.url"]) || "(no origin)"}`,
  `Branch: ${git(["branch", "--show-current"]) || "(detached)"}`,
  `Commit: ${git(["rev-parse", "--short", "HEAD"]) || "(unknown)"}`,
  `Working tree: ${git(["status", "--short"]) ? "dirty" : "clean"}`,
  "",
  "## Version",
  "",
  `- Chrome extension manifest: ${manifest.version}`,
  `- Native host architecture: ${arch}`,
  "",
  "## Artifacts",
  "",
  "| File | Present | Size | SHA-256 |",
  "| --- | --- | ---: | --- |",
  ...artifactRows(),
  "",
  "## Release Readiness",
  "",
  `- Automated readiness: ${readiness.status === 0 ? "passed" : "failed"}`,
  `- Strict readiness: ${strictReadiness.status === 0 ? "passed" : "failed"}`,
  "",
  "### Strict Blockers",
  "",
  ...strictBlockers(strictReadiness),
  "",
  "## Required Public Docs",
  "",
  "| File | Present |",
  "| --- | --- |",
  ...presenceRows(requiredDocs),
  "",
  "## Required Release Assets",
  "",
  "| File | Present |",
  "| --- | --- |",
  ...presenceRows(requiredAssets),
  "",
  "## Verification Commands",
  "",
  "- `./scripts/check.sh`",
  "- `./scripts/package_release.sh`",
  "- `node scripts/check_release_package.js`",
  `- \`./scripts/check_native_host_pkg.sh ${process.env.CWS_EXTENSION_ID || "bficjnhffakpmfcjbjjcanabccfldfhk"}\``,
  "- `./scripts/check_release_install.sh`",
  "- `./scripts/check_release_preflight.sh --store-only --online` after Chrome Web Store secrets are available",
  "- `./scripts/check_release_preflight.sh --macos-only --online` after Developer ID certificates and notarytool profile are available",
  "",
  "## Notes",
  "",
  "- This report does not print API keys, OAuth secrets, notarytool credentials, OCR results, or screenshots.",
  "- Store upload, notarization, Gatekeeper assessment, and real Chrome OCR flows still require the release operator's machine and credentials.",
  ""
].join("\n");

fs.writeFileSync(outputPath, report);
console.log(outputPath);

function artifactRows() {
  const checksums = readChecksums();
  return artifactFiles.map((fileName) => {
    const filePath = path.join(distDir, fileName);
    const stat = fs.statSync(filePath, { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      return `| \`${fileName}\` | no | - | - |`;
    }

    const actualHash = sha256(filePath);
    const recordedHash = checksums.get(fileName);
    const hashText = recordedHash && recordedHash !== actualHash ?
      `${actualHash} (checksum file has ${recordedHash})` :
      actualHash;
    return `| \`${fileName}\` | yes | ${stat.size} | \`${hashText}\` |`;
  });
}

function presenceRows(files) {
  return files.map((relativePath) => {
    const exists = fs.existsSync(path.join(root, relativePath));
    return `| \`${relativePath}\` | ${exists ? "yes" : "no"} |`;
  });
}

function strictBlockers(result) {
  if (result.status === 0) {
    return ["- none"];
  }

  const output = `${result.stdout}\n${result.stderr}`;
  const blockers = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

  return blockers.length > 0 ? blockers : ["- strict readiness failed; inspect command output"];
}

function readChecksums() {
  const checksumsPath = path.join(distDir, `checksums-v${version}.txt`);
  const checksums = new Map();
  if (!fs.existsSync(checksumsPath)) {
    return checksums;
  }

  for (const line of fs.readFileSync(checksumsPath, "utf8").split("\n")) {
    const match = line.trim().match(/^([a-f0-9]{64})\s+(.+)$/);
    if (match) {
      checksums.set(match[2], match[1]);
    }
  }
  return checksums;
}

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function git(args) {
  const result = run("git", args);
  return result.status === 0 ? result.stdout.trim() : "";
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8"
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}
