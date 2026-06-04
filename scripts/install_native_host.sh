#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/install_native_host.sh <chrome-extension-id> [additional-extension-id...]" >&2
  exit 2
fi

EXTENSION_IDS=("$@")
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST_NAME="com.mocchicc.visionclip"
LEGACY_HOST_NAME="com.mocchicc.image_ocr"
INSTALL_DIR="$HOME/Library/Application Support/VisionClip"
CHROME_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
HOST_BINARY="$INSTALL_DIR/image-ocr-host"
HOST_WRAPPER="$INSTALL_DIR/visionclip-native-host"
HOST_MANIFEST="$CHROME_HOST_DIR/$HOST_NAME.json"
LEGACY_HOST_MANIFEST="$CHROME_HOST_DIR/$LEGACY_HOST_NAME.json"

for extension_id in "${EXTENSION_IDS[@]}"; do
  if [[ ! "$extension_id" =~ ^[a-p]{32}$ ]]; then
    echo "Chrome extension ID looks invalid: $extension_id" >&2
    echo "Load extension/ in chrome://extensions first, then copy its ID." >&2
    exit 2
  fi
done

BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-native-build.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

swift build -c release --package-path "$ROOT_DIR/native-host" --build-path "$BUILD_DIR"

mkdir -p "$INSTALL_DIR"
mkdir -p "$CHROME_HOST_DIR"
cp "$BUILD_DIR/release/image-ocr-host" "$HOST_BINARY"
chmod 755 "$HOST_BINARY"
xattr -c "$HOST_BINARY" 2>/dev/null || true

cat > "$HOST_WRAPPER" <<SH
#!/usr/bin/env bash
set -euo pipefail
LOG_FILE="/tmp/visionclip-native-wrapper.log"
printf '[%s] wrapper launch\n' "\$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "\$LOG_FILE" 2>/dev/null || true
exec "$HOST_BINARY"
SH
chmod 755 "$HOST_WRAPPER"
xattr -c "$HOST_WRAPPER" 2>/dev/null || true

ALLOWED_ORIGINS_JSON=""
for extension_id in "${EXTENSION_IDS[@]}"; do
  origin="chrome-extension://$extension_id/"
  if [[ -n "$ALLOWED_ORIGINS_JSON" ]]; then
    ALLOWED_ORIGINS_JSON+=$',\n'
  fi
  ALLOWED_ORIGINS_JSON+="    \"$origin\""
done
for manifest in "$HOST_MANIFEST" "$LEGACY_HOST_MANIFEST"; do
  name="$HOST_NAME"
  if [[ "$manifest" == "$LEGACY_HOST_MANIFEST" ]]; then
    name="$LEGACY_HOST_NAME"
  fi

  cat > "$manifest" <<JSON
{
  "name": "$name",
  "description": "VisionClip native messaging host",
  "path": "$HOST_WRAPPER",
  "type": "stdio",
  "allowed_origins": [
$ALLOWED_ORIGINS_JSON
  ]
}
JSON
done

echo "Installed native host:"
echo "  $HOST_BINARY"
echo "  $HOST_WRAPPER"
echo "  $HOST_MANIFEST"
echo "  $LEGACY_HOST_MANIFEST"
echo
echo "Verification:"
echo "  version: $("$HOST_BINARY" version)"
"$HOST_BINARY" diagnose "${EXTENSION_IDS[0]}"
echo
echo "Next:"
echo "  \"$HOST_BINARY\" set-key"
