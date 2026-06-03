#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('$ROOT_DIR/extension/manifest.json', 'utf8')).version)")"
ARCH="$(uname -m)"
DIST_DIR="$ROOT_DIR/dist"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-release.XXXXXX")"
BUILD_DIR="$WORK_DIR/native-build"
NATIVE_PACKAGE_DIR="$WORK_DIR/visionclip-native-host-macos-$ARCH-v$VERSION"
EXTENSION_ZIP="$DIST_DIR/visionclip-extension-v$VERSION.zip"
NATIVE_ZIP="$DIST_DIR/visionclip-native-host-macos-$ARCH-v$VERSION.zip"
CHECKSUMS_FILE="$DIST_DIR/checksums-v$VERSION.txt"
CODESIGN_IDENTITY="${VISIONCLIP_CODESIGN_IDENTITY:-}"
SIGNING_STATUS="unsigned"

trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$DIST_DIR"
rm -f "$EXTENSION_ZIP" "$NATIVE_ZIP" "$CHECKSUMS_FILE"

(
  cd "$ROOT_DIR/extension"
  zip -qr "$EXTENSION_ZIP" . -x '*.DS_Store'
)

export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/clang-module-cache"
swift build -c release --package-path "$ROOT_DIR/native-host" --build-path "$BUILD_DIR"

mkdir -p "$NATIVE_PACKAGE_DIR"
cp "$BUILD_DIR/release/image-ocr-host" "$NATIVE_PACKAGE_DIR/image-ocr-host"
cp "$ROOT_DIR/scripts/install_release_native_host.sh" "$NATIVE_PACKAGE_DIR/install_native_host.sh"
cp "$ROOT_DIR/scripts/uninstall_native_host.sh" "$NATIVE_PACKAGE_DIR/uninstall_native_host.sh"
cp "$ROOT_DIR/README.md" "$NATIVE_PACKAGE_DIR/README.md"
cp "$ROOT_DIR/SECURITY.md" "$NATIVE_PACKAGE_DIR/SECURITY.md"
cp "$ROOT_DIR/SUPPORT.md" "$NATIVE_PACKAGE_DIR/SUPPORT.md"
cp "$ROOT_DIR/CONTRIBUTING.md" "$NATIVE_PACKAGE_DIR/CONTRIBUTING.md"
cp -R "$ROOT_DIR/docs" "$NATIVE_PACKAGE_DIR/docs"
mkdir -p "$NATIVE_PACKAGE_DIR/assets"
cp -R "$ROOT_DIR/assets/social" "$NATIVE_PACKAGE_DIR/assets/social"
cp -R "$ROOT_DIR/assets/store" "$NATIVE_PACKAGE_DIR/assets/store"
chmod 755 "$NATIVE_PACKAGE_DIR/image-ocr-host"
chmod 755 "$NATIVE_PACKAGE_DIR/install_native_host.sh"
chmod 755 "$NATIVE_PACKAGE_DIR/uninstall_native_host.sh"

if [[ -n "$CODESIGN_IDENTITY" ]]; then
  codesign --force --timestamp --options runtime --sign "$CODESIGN_IDENTITY" "$NATIVE_PACKAGE_DIR/image-ocr-host"
  codesign --verify --strict --verbose=2 "$NATIVE_PACKAGE_DIR/image-ocr-host"
  SIGNING_STATUS="signed with $CODESIGN_IDENTITY"
fi

(
  cd "$WORK_DIR"
  zip -qr "$NATIVE_ZIP" "$(basename "$NATIVE_PACKAGE_DIR")" -x '*.DS_Store'
)

(
  cd "$DIST_DIR"
  shasum -a 256 "$(basename "$EXTENSION_ZIP")" "$(basename "$NATIVE_ZIP")" > "$(basename "$CHECKSUMS_FILE")"
)

echo "Created release artifacts:"
echo "  $EXTENSION_ZIP"
echo "  $NATIVE_ZIP"
echo "  $CHECKSUMS_FILE"
echo "Native host signing: $SIGNING_STATUS"
