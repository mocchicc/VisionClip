#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT_DIR/extension/manifest.json', 'utf8')).version)")"
ARCH="$(uname -m)"
DIST_DIR="$ROOT_DIR/dist"
CHECKSUMS_FILE="$DIST_DIR/checksums-v$VERSION.txt"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-native-pkg.XXXXXX")"
BUILD_DIR="$WORK_DIR/native-build"
PKG_ROOT="$WORK_DIR/pkgroot"
PKG_IDENTIFIER="com.mocchicc.visionclip.native-host"
OUTPUT_PKG="$DIST_DIR/visionclip-native-host-macos-$ARCH-v$VERSION.pkg"
UNSIGNED_PKG="$WORK_DIR/visionclip-native-host-unsigned.pkg"
CLEAN_PKG="$WORK_DIR/visionclip-native-host-clean.pkg"
CODESIGN_IDENTITY="${VISIONCLIP_CODESIGN_IDENTITY:-}"
PKG_SIGN_IDENTITY="${VISIONCLIP_PKG_SIGN_IDENTITY:-}"
NOTARY_PROFILE="${VISIONCLIP_NOTARY_PROFILE:-}"

trap 'rm -rf "$WORK_DIR"' EXIT

usage() {
  cat <<'USAGE'
Usage: scripts/package_native_host_pkg.sh <chrome-extension-id> [additional-extension-id...]

Creates a macOS pkg that installs VisionClip's Native Messaging host system-wide.

Optional environment variables:
  VISIONCLIP_CODESIGN_IDENTITY   Developer ID Application identity for native host signing
  VISIONCLIP_PKG_SIGN_IDENTITY   Developer ID Installer identity for pkg signing
  VISIONCLIP_NOTARY_PROFILE      notarytool keychain profile for notarization
USAGE
}

remove_appledouble_from_pkg() {
  local input_pkg="$1"
  local output_pkg="$2"
  local expanded_dir="$WORK_DIR/pkg-expanded"
  local payload_dir="$WORK_DIR/pkg-payload"

  rm -rf "$expanded_dir" "$payload_dir"
  mkdir -p "$payload_dir"
  pkgutil --expand "$input_pkg" "$expanded_dir"
  (
    cd "$payload_dir"
    gzip -dc "$expanded_dir/Payload" | cpio -idm --quiet
    find . -name '._*' -delete
    find . | LC_ALL=C sort | cpio -o --format odc --quiet | gzip -c > "$expanded_dir/Payload"
  )
  mkbom "$payload_dir" "$expanded_dir/Bom"
  pkgutil --flatten "$expanded_dir" "$output_pkg"
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

EXTENSION_IDS=("$@")
for extension_id in "${EXTENSION_IDS[@]}"; do
  if [[ ! "$extension_id" =~ ^[a-p]{32}$ ]]; then
    echo "Chrome extension ID looks invalid: $extension_id" >&2
    exit 2
  fi
done

if [[ -n "$NOTARY_PROFILE" && -z "$PKG_SIGN_IDENTITY" ]]; then
  echo "VISIONCLIP_PKG_SIGN_IDENTITY is required when VISIONCLIP_NOTARY_PROFILE is set." >&2
  exit 2
fi

mkdir -p "$DIST_DIR"
rm -f "$OUTPUT_PKG"

export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/clang-module-cache"
swift build -c release --package-path "$ROOT_DIR/native-host" --build-path "$BUILD_DIR"

SYSTEM_INSTALL_DIR="/Library/Application Support/VisionClip"
SYSTEM_CHROME_HOST_DIR="/Library/Google/Chrome/NativeMessagingHosts"
HOST_NAME="com.mocchicc.visionclip"
LEGACY_HOST_NAME="com.mocchicc.image_ocr"
HOST_BINARY="$SYSTEM_INSTALL_DIR/image-ocr-host"
HOST_WRAPPER="$SYSTEM_INSTALL_DIR/visionclip-native-host"

INSTALL_DIR="$PKG_ROOT$SYSTEM_INSTALL_DIR"
CHROME_HOST_DIR="$PKG_ROOT$SYSTEM_CHROME_HOST_DIR"
mkdir -p "$INSTALL_DIR" "$CHROME_HOST_DIR"

cp "$BUILD_DIR/release/image-ocr-host" "$INSTALL_DIR/image-ocr-host"
chmod 755 "$INSTALL_DIR/image-ocr-host"
if [[ -n "$CODESIGN_IDENTITY" ]]; then
  codesign --force --timestamp --options runtime --sign "$CODESIGN_IDENTITY" "$INSTALL_DIR/image-ocr-host"
  codesign --verify --strict --verbose=2 "$INSTALL_DIR/image-ocr-host"
fi

cat > "$INSTALL_DIR/visionclip-native-host" <<SH
#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="/tmp/visionclip-native-wrapper.log"
printf '[%s] wrapper launch\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "\$LOG_FILE" 2>/dev/null || true
exec "$HOST_BINARY"
SH
chmod 755 "$INSTALL_DIR/visionclip-native-host"

cat > "$INSTALL_DIR/uninstall_native_host_system.sh" <<SH
#!/usr/bin/env bash
set -euo pipefail
rm -f "$SYSTEM_CHROME_HOST_DIR/$HOST_NAME.json"
rm -f "$SYSTEM_CHROME_HOST_DIR/$LEGACY_HOST_NAME.json"
rm -f "$HOST_BINARY"
rm -f "$HOST_WRAPPER"
rm -f "$SYSTEM_INSTALL_DIR/uninstall_native_host_system.sh"
rmdir "$SYSTEM_INSTALL_DIR" 2>/dev/null || true
echo "Removed VisionClip system native host files. Keychain API key is kept."
SH
chmod 755 "$INSTALL_DIR/uninstall_native_host_system.sh"

ALLOWED_ORIGINS_JSON=""
for extension_id in "${EXTENSION_IDS[@]}"; do
  origin="chrome-extension://$extension_id/"
  if [[ -n "$ALLOWED_ORIGINS_JSON" ]]; then
    ALLOWED_ORIGINS_JSON+=$',\n'
  fi
  ALLOWED_ORIGINS_JSON+="    \"$origin\""
done

write_manifest() {
  local host_name="$1"
  local manifest_path="$2"
  cat > "$manifest_path" <<JSON
{
  "name": "$host_name",
  "description": "VisionClip native messaging host",
  "path": "$HOST_WRAPPER",
  "type": "stdio",
  "allowed_origins": [
$ALLOWED_ORIGINS_JSON
  ]
}
JSON
}

write_manifest "$HOST_NAME" "$CHROME_HOST_DIR/$HOST_NAME.json"
write_manifest "$LEGACY_HOST_NAME" "$CHROME_HOST_DIR/$LEGACY_HOST_NAME.json"

node - "$CHROME_HOST_DIR/$HOST_NAME.json" "${EXTENSION_IDS[0]}" <<'NODE'
const fs = require("fs");
const manifestPath = process.argv[2];
const extensionId = process.argv[3];
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedOrigin = `chrome-extension://${extensionId}/`;

if (manifest.name !== "com.mocchicc.visionclip") {
  throw new Error(`Unexpected native host name: ${manifest.name}`);
}
if (manifest.path !== "/Library/Application Support/VisionClip/visionclip-native-host") {
  throw new Error(`Unexpected native host path: ${manifest.path}`);
}
if (!Array.isArray(manifest.allowed_origins) || !manifest.allowed_origins.includes(expectedOrigin)) {
  throw new Error(`Missing allowed origin: ${expectedOrigin}`);
}
NODE

PKGBUILD_ARGS=(
  --root "$PKG_ROOT"
  --identifier "$PKG_IDENTIFIER"
  --version "$VERSION"
  --install-location "/"
)

xattr -cr "$PKG_ROOT" 2>/dev/null || true
find "$PKG_ROOT" -name '._*' -delete
COPYFILE_DISABLE=1 pkgbuild "${PKGBUILD_ARGS[@]}" "$UNSIGNED_PKG"
remove_appledouble_from_pkg "$UNSIGNED_PKG" "$CLEAN_PKG"

if [[ -n "$PKG_SIGN_IDENTITY" ]]; then
  productsign --sign "$PKG_SIGN_IDENTITY" "$CLEAN_PKG" "$OUTPUT_PKG"
else
  cp "$CLEAN_PKG" "$OUTPUT_PKG"
fi

if [[ -n "$NOTARY_PROFILE" ]]; then
  xcrun notarytool submit "$OUTPUT_PKG" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$OUTPUT_PKG"
fi

pkgutil --payload-files "$OUTPUT_PKG" >/dev/null

(
  cd "$DIST_DIR"
  if [[ -f "$(basename "$CHECKSUMS_FILE")" ]]; then
    grep -v "  $(basename "$OUTPUT_PKG")$" "$(basename "$CHECKSUMS_FILE")" > "$(basename "$CHECKSUMS_FILE").tmp" || true
    mv "$(basename "$CHECKSUMS_FILE").tmp" "$(basename "$CHECKSUMS_FILE")"
  fi
  shasum -a 256 "$(basename "$OUTPUT_PKG")" >> "$(basename "$CHECKSUMS_FILE")"
)

echo "Created native host pkg:"
echo "  $OUTPUT_PKG"
echo "  $CHECKSUMS_FILE"
if [[ -n "$PKG_SIGN_IDENTITY" ]]; then
  echo "pkg signing: signed with $PKG_SIGN_IDENTITY"
else
  echo "pkg signing: unsigned"
fi
if [[ -n "$CODESIGN_IDENTITY" ]]; then
  echo "native host signing: signed with $CODESIGN_IDENTITY"
else
  echo "native host signing: unsigned"
fi
if [[ -n "$NOTARY_PROFILE" ]]; then
  echo "notarization: submitted with keychain profile $NOTARY_PROFILE"
else
  echo "notarization: skipped"
fi
