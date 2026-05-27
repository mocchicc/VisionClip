#!/usr/bin/env bash
set -euo pipefail

HOST_NAME="com.mocchicc.visionclip"
INSTALL_DIR="$HOME/Library/Application Support/VisionClip"
CHROME_HOST_MANIFEST="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/$HOST_NAME.json"

rm -f "$CHROME_HOST_MANIFEST"
rm -f "$INSTALL_DIR/image-ocr-host"
rmdir "$INSTALL_DIR" 2>/dev/null || true

echo "Removed native host binary and Chrome manifest."
echo "Keychain API key is kept. Run image-ocr-host clear-key before uninstalling if you want to remove it too."

