const fs = require("fs");
const path = require("path");

const tagName = process.argv[2];
if (!tagName) {
  throw new Error("Usage: node scripts/check_release_tag.js <tag-name>");
}

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "extension/manifest.json"), "utf8"));
const expectedTag = `v${manifest.version}`;

if (tagName !== expectedTag) {
  throw new Error(`Release tag must match manifest version: expected ${expectedTag}, got ${tagName}`);
}
