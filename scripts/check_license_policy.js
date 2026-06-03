const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const licenseFiles = ["LICENSE", "LICENSE.md", "LICENCE", "COPYING"];
const currentLicense = licenseFiles.find((fileName) => fs.existsSync(path.join(root, fileName)));

const publicDocPaths = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  ...fs.readdirSync(path.join(root, "docs"))
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => path.join("docs", fileName))
].sort();

if (!currentLicense) {
  const violations = [];

  for (const relativePath of publicDocPaths) {
    const text = fs.readFileSync(path.join(root, relativePath), "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!mentionsOpenSourceClaim(line)) {
        return;
      }
      if (isLicenseCaveat(line)) {
        return;
      }
      violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    });
  }

  if (violations.length > 0) {
    throw new Error([
      "LICENSE file is missing, so public docs must avoid active OSS/open-source/license claims.",
      "Use public MVP/public repo wording, or add a LICENSE file before claiming open-source reuse.",
      ...violations.map((violation) => `- ${violation}`)
    ].join("\n"));
  }
}

function mentionsOpenSourceClaim(line) {
  return [
    /\bopen[- ]source\b/i,
    /\bOSS\b/,
    /オープンソース/,
    /小さなOSS/,
    /\blicensed under\b/i,
    /MIT License/i,
    /Apache-2\.0/i,
    /\bGPL\b/i,
    /\bBSD-3-Clause\b/i,
    /ライセンスは/
  ].some((pattern) => pattern.test(line));
}

function isLicenseCaveat(line) {
  return [
    /ライセンス未決定/,
    /未決定/,
    /追加/,
    /避け/,
    /制限/,
    /公開範囲/,
    /する場合/,
    /\bmissing\b/i,
    /\bnot licensed\b/i,
    /\bwithout a license\b/i,
    /\bavoid\b/i,
    /\bbefore\b/i,
    /\badd\b/i
  ].some((pattern) => pattern.test(line));
}
