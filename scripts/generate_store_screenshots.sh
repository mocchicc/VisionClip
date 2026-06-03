#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHROME_BIN="${VISIONCLIP_CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
SOURCE_HTML="$ROOT_DIR/assets/store/screenshot-source.html"
OUTPUT_DIR="$ROOT_DIR/assets/store/screenshots"
USER_DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-store-screenshots.XXXXXX")"

trap 'rm -rf "$USER_DATA_DIR"' EXIT

if [[ ! -x "$CHROME_BIN" ]]; then
  echo "Google Chrome was not found at: $CHROME_BIN" >&2
  echo "Set VISIONCLIP_CHROME to a Chromium-compatible browser binary." >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

render() {
  local shot_id="$1"
  local output_file="$2"
  local output_path="$OUTPUT_DIR/$output_file"
  local profile_dir="$USER_DATA_DIR/$shot_id"
  local chrome_pid

  mkdir -p "$profile_dir"
  rm -f "$output_path"

  "$CHROME_BIN" \
    --headless=new \
    --disable-background-networking \
    --disable-component-update \
    --disable-default-apps \
    --disable-dev-shm-usage \
    --disable-extensions \
    --disable-gpu \
    --disable-sync \
    --hide-scrollbars \
    --metrics-recording-only \
    --no-first-run \
    --run-all-compositor-stages-before-draw \
    --user-data-dir="$profile_dir" \
    --virtual-time-budget=1000 \
    --window-size=1280,800 \
    --screenshot="$output_path" \
    "file://$SOURCE_HTML?shot=$shot_id" >/dev/null 2>&1 &
  chrome_pid="$!"

  for _ in {1..100}; do
    if [[ -s "$output_path" ]]; then
      break
    fi
    if ! kill -0 "$chrome_pid" 2>/dev/null; then
      break
    fi
    sleep 0.2
  done

  if [[ ! -s "$output_path" ]]; then
    wait "$chrome_pid"
  fi

  kill "$chrome_pid" 2>/dev/null || true
  wait "$chrome_pid" 2>/dev/null || true
  local dimensions
  dimensions="$(sips -g pixelWidth -g pixelHeight "$output_path")"
  if [[ "$dimensions" != *"pixelWidth: 1280"* || "$dimensions" != *"pixelHeight: 800"* ]]; then
    echo "$output_file must be 1280x800" >&2
    echo "$dimensions" >&2
    exit 1
  fi
}

render "01-image-context" "store-screenshot-01-image-context.png"
render "02-region-ocr" "store-screenshot-02-region-ocr.png"
render "03-popup-history" "store-screenshot-03-popup-history.png"
render "04-options-keychain" "store-screenshot-04-options-keychain.png"
render "05-modal-shortcut" "store-screenshot-05-modal-shortcut.png"

echo "Created Chrome Web Store screenshots in $OUTPUT_DIR"
