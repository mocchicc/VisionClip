const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const strict = process.argv.includes("--strict");
const quiet = process.argv.includes("--quiet");

const failures = [];
const manualBlockers = [];
const storeScreenshotFiles = [
  "assets/store/screenshots/store-screenshot-01-image-context.png",
  "assets/store/screenshots/store-screenshot-02-region-ocr.png",
  "assets/store/screenshots/store-screenshot-03-popup-history.png",
  "assets/store/screenshots/store-screenshot-04-options-keychain.png",
  "assets/store/screenshots/store-screenshot-05-modal-shortcut.png"
];

const manifest = readJson("extension/manifest.json");
const docsDir = path.join(root, "docs");
const publicMarkdownFiles = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  ...fs.readdirSync(docsDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.join("docs", fileName))
].sort();

checkRequiredFiles([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/workflows/chrome-web-store.yml",
  ".github/workflows/checks.yml",
  ".github/workflows/release-artifacts.yml",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "docs/ANNOUNCEMENT.md",
  "docs/CHROME_PERMISSIONS.md",
  "docs/MACOS_DISTRIBUTION.md",
  "docs/PRIVACY.md",
  "docs/RELEASE_CHECKLIST.md",
  "docs/STORE_LISTING.md",
  `docs/RELEASE_NOTES_v${manifest.version}.md`,
  "assets/store/screenshot-source.html",
  "scripts/generate_store_screenshots.sh",
  "scripts/check.sh",
  "scripts/check_native_host_pkg.sh",
  "scripts/package_release.sh",
  "scripts/package_native_host_pkg.sh",
  "scripts/check_release_package.js",
  "scripts/check_release_install.sh",
  "scripts/check_release_preflight.sh",
  "scripts/upload_chrome_web_store.sh",
  ...storeScreenshotFiles
]);
checkMarkdownLinks();
checkPermissionsDocs();
checkPrivacyDocs();
checkReleaseDocs();
checkWorkflows();
checkChromeWebStoreWorkflow();
checkDistributionSignals();
checkAnnouncementAssets();
collectManualBlockers();

if (failures.length > 0) {
  throw new Error([
    "Release readiness automated checks failed:",
    ...failures.map((failure) => `- ${failure}`)
  ].join("\n"));
}

if (manualBlockers.length > 0 && strict) {
  throw new Error([
    "Release readiness strict mode found unresolved manual blockers:",
    ...manualBlockers.map((blocker) => `- ${blocker}`)
  ].join("\n"));
}

if (!quiet) {
  console.log("Release readiness: automated checks passed.");
  if (manualBlockers.length > 0) {
    console.log("Release readiness: manual blockers remain for broad release:");
    for (const blocker of manualBlockers) {
      console.log(`- ${blocker}`);
    }
    console.log("Run `node scripts/check_release_readiness.js --strict` to fail on these blockers.");
  } else {
    console.log("Release readiness: no manual blockers detected.");
  }
}

function checkRequiredFiles(relativePaths) {
  for (const relativePath of relativePaths) {
    const stat = fs.statSync(path.join(root, relativePath), { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      failures.push(`Missing required file: ${relativePath}`);
    }
  }
}

function checkMarkdownLinks() {
  for (const relativePath of publicMarkdownFiles) {
    const absolutePath = path.join(root, relativePath);
    const text = fs.readFileSync(absolutePath, "utf8");
    const fileDir = path.dirname(absolutePath);

    for (const match of text.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
      const href = match[1].trim();
      if (shouldSkipLinkTarget(href)) {
        continue;
      }

      const target = href.split("#")[0];
      const targetPath = path.resolve(fileDir, target);
      if (!targetPath.startsWith(root + path.sep) && targetPath !== root) {
        failures.push(`${relativePath} links outside the repository: ${href}`);
        continue;
      }
      if (!fs.existsSync(targetPath)) {
        failures.push(`${relativePath} links to missing file: ${href}`);
      }
    }
  }
}

function checkPermissionsDocs() {
  const permissionsDoc = readText("docs/CHROME_PERMISSIONS.md");

  for (const permission of manifest.permissions || []) {
    if (!permissionsDoc.includes(`### \`${permission}\``)) {
      failures.push(`docs/CHROME_PERMISSIONS.md must explain manifest permission: ${permission}`);
    }
  }

  if ((manifest.host_permissions || []).length === 0 &&
      !permissionsDoc.includes("manifestの `host_permissions` は要求していません")) {
    failures.push("docs/CHROME_PERMISSIONS.md must state that host_permissions are not requested");
  }

  if (!(manifest.content_scripts || []).length &&
      !permissionsDoc.includes("常時注入scriptを登録していません")) {
    failures.push("docs/CHROME_PERMISSIONS.md must state that persistent content scripts are not registered");
  }
}

function checkPrivacyDocs() {
  const privacyDoc = readText("docs/PRIVACY.md");
  const storeListing = readText("docs/STORE_LISTING.md");

  for (const requiredText of [
    "OpenAI API",
    "macOS Keychain",
    "Chrome local storage",
    "履歴削除",
    "OCR履歴をpopupに保存する",
    "analytics",
    "clear-key",
    "uninstall_native_host.sh",
    "HTTPS",
    "Chrome Web Store Limited Use Statement",
    "広告",
    "行動ターゲティング",
    "独自サーバーでOCR対象画像、OCR結果、APIキー、閲覧履歴を収集・保存しません"
  ]) {
    if (!privacyDoc.includes(requiredText)) {
      failures.push(`docs/PRIVACY.md must mention ${requiredText}`);
    }
  }

  for (const requiredText of [
    "Privacy Policy URL",
    "https://github.com/mocchicc/VisionClip/blob/main/docs/PRIVACY.md",
    "Privacy Tab Draft",
    "Single purpose",
    "User data usage",
    "Limited Use",
    "Website content",
    "Authentication information",
    "OpenAI APIへHTTPSで送信",
    "Chrome local storage"
  ]) {
    if (!storeListing.includes(requiredText)) {
      failures.push(`docs/STORE_LISTING.md must mention privacy submission detail: ${requiredText}`);
    }
  }
}

function checkReleaseDocs() {
  const readme = readText("README.md");
  const releaseChecklist = readText("docs/RELEASE_CHECKLIST.md");

  for (const requiredText of [
    "./scripts/check.sh",
    "./scripts/package_release.sh",
    "node scripts/check_release_package.js",
    "./scripts/check_release_preflight.sh",
    "./scripts/check_release_install.sh",
    "docs/RELEASE_CHECKLIST.md"
  ]) {
    if (!readme.includes(requiredText)) {
      failures.push(`README.md must mention release command or doc: ${requiredText}`);
    }
  }

  for (const requiredText of [
    "Chrome Web Store",
    "unlisted公開",
    "notarization",
    "GitHub Release",
    "check_release_preflight.sh",
    "実機表示"
  ]) {
    if (!releaseChecklist.includes(requiredText)) {
      failures.push(`docs/RELEASE_CHECKLIST.md must keep manual release blocker: ${requiredText}`);
    }
  }

  const checkScript = readText("scripts/check.sh");
  if (!checkScript.includes("bash -n scripts/check_release_preflight.sh")) {
    failures.push("scripts/check.sh must syntax-check scripts/check_release_preflight.sh");
  }
}

function checkWorkflows() {
  const checksWorkflow = readText(".github/workflows/checks.yml");
  const releaseWorkflow = readText(".github/workflows/release-artifacts.yml");

  for (const requiredText of [
    "./scripts/check.sh",
    "./scripts/package_release.sh",
    "node scripts/check_release_package.js",
    "./scripts/check_native_host_pkg.sh",
    "./scripts/check_release_install.sh"
  ]) {
    if (!checksWorkflow.includes(requiredText)) {
      failures.push(`.github/workflows/checks.yml must run ${requiredText}`);
    }
  }

  for (const requiredText of [
    "check_release_tag.js",
    "./scripts/check.sh",
    "./scripts/package_release.sh",
    "node scripts/check_release_package.js",
    "./scripts/check_native_host_pkg.sh",
    "./scripts/check_release_install.sh",
    "actions/upload-artifact@v4",
    "permissions:",
    "contents: write",
    "GH_TOKEN",
    "gh release create",
    "gh release upload",
    "RELEASE_NOTES_",
    "--verify-tag",
    "dist/*.zip",
    "dist/*.pkg",
    "dist/checksums-*.txt"
  ]) {
    if (!releaseWorkflow.includes(requiredText)) {
      failures.push(`.github/workflows/release-artifacts.yml must contain ${requiredText}`);
    }
  }
}

function checkChromeWebStoreWorkflow() {
  const storeWorkflow = readText(".github/workflows/chrome-web-store.yml");
  const uploadScript = readText("scripts/upload_chrome_web_store.sh");

  for (const requiredText of [
    "workflow_dispatch:",
    "publish:",
    "./scripts/check.sh",
    "./scripts/package_release.sh",
    "node scripts/check_release_package.js",
    "./scripts/check_native_host_pkg.sh",
    "./scripts/upload_chrome_web_store.sh",
    "./scripts/check_release_preflight.sh --store-only --online",
    "VISIONCLIP_RELEASE_EXTENSION_IDS",
    "CWS_PUBLISHER_ID",
    "CWS_EXTENSION_ID",
    "CWS_CLIENT_ID",
    "CWS_CLIENT_SECRET",
    "CWS_REFRESH_TOKEN"
  ]) {
    if (!storeWorkflow.includes(requiredText)) {
      failures.push(`.github/workflows/chrome-web-store.yml must contain ${requiredText}`);
    }
  }

  for (const requiredText of [
    "https://oauth2.googleapis.com/token",
    "chromewebstore.googleapis.com/upload/v2",
    "chromewebstore.googleapis.com/v2",
    "--publish",
    "CWS_REFRESH_TOKEN",
    "Content-Type: application/zip"
  ]) {
    if (!uploadScript.includes(requiredText)) {
      failures.push(`scripts/upload_chrome_web_store.sh must contain ${requiredText}`);
    }
  }

  const preflightScript = readText("scripts/check_release_preflight.sh");
  for (const requiredText of [
    "CWS_PUBLISHER_ID",
    "CWS_EXTENSION_ID",
    "CWS_CLIENT_ID",
    "CWS_CLIENT_SECRET",
    "CWS_REFRESH_TOKEN",
    "https://oauth2.googleapis.com/token",
    "CWS_EXTENSION_ID is not included in VISIONCLIP_RELEASE_EXTENSION_IDS",
    "--store-only",
    "--online"
  ]) {
    if (!preflightScript.includes(requiredText)) {
      failures.push(`scripts/check_release_preflight.sh must contain Chrome Web Store preflight signal: ${requiredText}`);
    }
  }
}

function checkDistributionSignals() {
  const packageScript = readText("scripts/package_release.sh");
  const pkgScript = readText("scripts/package_native_host_pkg.sh");
  const macosDoc = readText("docs/MACOS_DISTRIBUTION.md");

  for (const requiredText of [
    "VISIONCLIP_CODESIGN_IDENTITY",
    "codesign --force",
    "codesign --verify"
  ]) {
    if (!packageScript.includes(requiredText)) {
      failures.push(`scripts/package_release.sh must contain ${requiredText}`);
    }
  }

  for (const requiredText of [
    "pkgbuild",
    "VISIONCLIP_CODESIGN_IDENTITY",
    "VISIONCLIP_PKG_SIGN_IDENTITY",
    "VISIONCLIP_NOTARY_PROFILE",
    "xcrun notarytool",
    "xcrun stapler",
    "--macos-only",
    "check_native_host_pkg.sh",
    "/Library/Google/Chrome/NativeMessagingHosts",
    "/Library/Application Support/VisionClip"
  ]) {
    const source = ["--macos-only", "check_native_host_pkg.sh"].includes(requiredText) ?
      readText("scripts/check_release_preflight.sh") :
      pkgScript;
    const sourceLabel = ["--macos-only", "check_native_host_pkg.sh"].includes(requiredText) ?
      "scripts/check_release_preflight.sh" :
      "scripts/package_native_host_pkg.sh";
    if (!source.includes(requiredText)) {
      failures.push(`${sourceLabel} must contain ${requiredText}`);
    }
  }

  for (const requiredText of [
    "notarytool",
    "package_native_host_pkg.sh",
    "spctl --assess",
    "正式配布前の残タスク"
  ]) {
    if (!macosDoc.includes(requiredText)) {
      failures.push(`docs/MACOS_DISTRIBUTION.md must mention ${requiredText}`);
    }
  }
}

function checkAnnouncementAssets() {
  const announcement = readText("docs/ANNOUNCEMENT.md");
  for (const match of announcement.matchAll(/`(assets\/(?:social|store)\/[^`]+\.png)`/g)) {
    const relativePath = match[1];
    const stat = fs.statSync(path.join(root, relativePath), { throwIfNoEntry: false });
    if (!stat?.isFile()) {
      failures.push(`docs/ANNOUNCEMENT.md references missing image: ${relativePath}`);
    }
  }
}

function collectManualBlockers() {
  const licenseFiles = ["LICENSE", "LICENSE.md", "LICENCE", "COPYING"];
  if (!licenseFiles.some((fileName) => fs.existsSync(path.join(root, fileName)))) {
    manualBlockers.push("No LICENSE file is present; keep public-MVP wording or choose a license before broader reuse claims.");
  }

  const workflowFiles = fs.readdirSync(path.join(root, ".github", "workflows")).join("\n");
  if (!/chrome.*web.*store/i.test(workflowFiles)) {
    manualBlockers.push("Chrome Web Store publishing is not configured; choose Store, unlisted, organization, or manual GitHub distribution.");
  }

  const releaseWorkflow = readText(".github/workflows/release-artifacts.yml");
  if (!fs.existsSync(path.join(root, "scripts/package_native_host_pkg.sh")) ||
      !releaseWorkflow.includes("dist/*.pkg")) {
    manualBlockers.push("No pkg/dmg installer exists yet; broad macOS distribution still needs installer/notarization direction.");
  }

  if (!/gh release (create|upload)/i.test(releaseWorkflow)) {
    manualBlockers.push("GitHub Releases upload is not automated; current workflow stores Actions artifacts only.");
  }

  if (!storeScreenshotFiles.every((fileName) => fs.existsSync(path.join(root, fileName)))) {
    manualBlockers.push("Chrome Web Store screenshots are not present; create 1280x800 screenshots before Store submission.");
  }
}

function shouldSkipLinkTarget(href) {
  return href.startsWith("#") ||
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith("mailto:");
}

function hasAnyFileMatching(needles) {
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === ".git" || entry.name === "dist" || entry.name === ".build") {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      const relativePath = path.relative(root, entryPath);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (needles.some((needle) => relativePath.toLowerCase().includes(needle))) {
        return true;
      }
    }
  }
  return false;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
