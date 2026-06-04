#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT_DIR/extension/manifest.json', 'utf8')).version)")"
ARCH="$(uname -m)"
PKG_FILE="$ROOT_DIR/dist/visionclip-native-host-macos-$ARCH-v$VERSION.pkg"

if [[ ! -f "$PKG_FILE" ]]; then
  echo "Missing native host pkg: $PKG_FILE" >&2
  echo "Run ./scripts/package_native_host_pkg.sh <chrome-extension-id> first." >&2
  exit 2
fi

PAYLOAD_FILES="$(pkgutil --payload-files "$PKG_FILE" | sed 's#^\./##')"

if grep -Eq '(^|/)\._' <<<"$PAYLOAD_FILES"; then
  echo "pkg payload must not contain AppleDouble resource fork files:" >&2
  grep -E '(^|/)\._' <<<"$PAYLOAD_FILES" >&2
  exit 1
fi

require_payload() {
  local expected="$1"
  if ! grep -Fxq "$expected" <<<"$PAYLOAD_FILES"; then
    echo "pkg payload is missing: $expected" >&2
    exit 1
  fi
}

require_payload "Library/Application Support/VisionClip/image-ocr-host"
require_payload "Library/Application Support/VisionClip/visionclip-native-host"
require_payload "Library/Application Support/VisionClip/uninstall_native_host_system.sh"
require_payload "Library/Google/Chrome/NativeMessagingHosts/com.mocchicc.visionclip.json"
require_payload "Library/Google/Chrome/NativeMessagingHosts/com.mocchicc.image_ocr.json"

EXPANDED_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-native-pkg-check.XXXXXX")"
trap 'rm -rf "$EXPANDED_DIR"' EXIT

pkgutil --expand "$PKG_FILE" "$EXPANDED_DIR/expanded"
PACKAGE_INFO="$(find "$EXPANDED_DIR/expanded" -name PackageInfo -print -quit)"

if [[ -z "$PACKAGE_INFO" ]]; then
  echo "Expanded pkg is missing PackageInfo" >&2
  exit 1
fi

node - "$PACKAGE_INFO" "$VERSION" <<'NODE'
const fs = require("fs");
const packageInfoPath = process.argv[2];
const version = process.argv[3];
const packageInfo = fs.readFileSync(packageInfoPath, "utf8");

if (!packageInfo.includes('identifier="com.mocchicc.visionclip.native-host"')) {
  throw new Error("pkg PackageInfo has an unexpected identifier");
}
if (!packageInfo.includes(`version="${version}"`)) {
  throw new Error(`pkg PackageInfo is missing version ${version}`);
}
NODE
