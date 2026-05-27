#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: ./scripts/install_native_host.sh <chrome-extension-id>" >&2
  exit 2
fi

EXTENSION_ID="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOST_NAME="com.mocchicc.visionclip"
INSTALL_DIR="$HOME/Library/Application Support/VisionClip"
CHROME_HOST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
HOST_BINARY="$INSTALL_DIR/image-ocr-host"
HOST_MANIFEST="$CHROME_HOST_DIR/$HOST_NAME.json"

if [[ ! "$EXTENSION_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Chrome extension ID looks invalid: $EXTENSION_ID" >&2
  echo "Load extension/ in chrome://extensions first, then copy its ID." >&2
  exit 2
fi

swift build -c release --package-path "$ROOT_DIR/native-host"

mkdir -p "$INSTALL_DIR"
mkdir -p "$CHROME_HOST_DIR"
cp "$ROOT_DIR/native-host/.build/release/image-ocr-host" "$HOST_BINARY"
chmod 755 "$HOST_BINARY"

cat > "$HOST_MANIFEST" <<JSON
{
  "name": "$HOST_NAME",
  "description": "VisionClip native messaging host",
  "path": "$HOST_BINARY",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
JSON

echo "Installed native host:"
echo "  $HOST_BINARY"
echo "  $HOST_MANIFEST"
echo
echo "Next:"
echo "  \"$HOST_BINARY\" set-key"

