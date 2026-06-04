#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT_DIR/extension/manifest.json', 'utf8')).version)")"
ARCH="$(uname -m)"
EXTENSION_ID="${1:-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"
NATIVE_ZIP="$ROOT_DIR/dist/visionclip-native-host-macos-$ARCH-v$VERSION.zip"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-release-install-check.XXXXXX")"
PACKAGE_DIR="$WORK_DIR/visionclip-native-host-macos-$ARCH-v$VERSION"
TEST_HOME="$WORK_DIR/home"
HOST_BINARY="$TEST_HOME/Library/Application Support/VisionClip/image-ocr-host"
HOST_MANIFEST="$TEST_HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.mocchicc.visionclip.json"

trap 'rm -rf "$WORK_DIR"' EXIT

if [[ ! -f "$NATIVE_ZIP" ]]; then
  echo "Missing native release zip: $NATIVE_ZIP" >&2
  echo "Run ./scripts/package_release.sh first." >&2
  exit 2
fi

unzip -q "$NATIVE_ZIP" -d "$WORK_DIR"
HOME="$TEST_HOME" "$PACKAGE_DIR/install_native_host.sh" "$EXTENSION_ID" >/dev/null

if [[ ! -x "$HOST_BINARY" ]]; then
  echo "Installed binary is missing or not executable: $HOST_BINARY" >&2
  exit 1
fi

if [[ "$("$HOST_BINARY" version)" != "$VERSION" ]]; then
  echo "Installed binary version does not match $VERSION" >&2
  exit 1
fi

if [[ ! -f "$HOST_MANIFEST" ]]; then
  echo "Native messaging manifest is missing: $HOST_MANIFEST" >&2
  exit 1
fi

node - "$HOST_MANIFEST" "$EXTENSION_ID" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const extensionId = process.argv[3];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedOrigin = `chrome-extension://${extensionId}/`;

if (manifest.name !== "com.mocchicc.visionclip") {
  throw new Error(`Unexpected native host name: ${manifest.name}`);
}
if (manifest.type !== "stdio") {
  throw new Error(`Unexpected native host type: ${manifest.type}`);
}
if (!Array.isArray(manifest.allowed_origins) || !manifest.allowed_origins.includes(expectedOrigin)) {
  throw new Error(`Missing allowed origin: ${expectedOrigin}`);
}
if (typeof manifest.path !== "string" || !manifest.path.endsWith("/visionclip-native-host")) {
  throw new Error(`Unexpected native host path: ${manifest.path}`);
}
NODE

"$HOST_BINARY" diagnose "$EXTENSION_ID" >/dev/null
