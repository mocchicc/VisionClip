#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PUBLISH=false
ZIP_FILE=""

usage() {
  cat <<'USAGE'
Usage: scripts/upload_chrome_web_store.sh --zip <extension.zip> [--publish]

Required environment variables:
  CWS_PUBLISHER_ID
  CWS_EXTENSION_ID
  CWS_CLIENT_ID
  CWS_CLIENT_SECRET
  CWS_REFRESH_TOKEN

This script uses the Chrome Web Store API v2 to upload an existing extension zip.
With --publish, it also submits the uploaded draft for review.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --zip)
      ZIP_FILE="${2:-}"
      shift 2
      ;;
    --publish)
      PUBLISH=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$ZIP_FILE" ]]; then
  echo "--zip is required" >&2
  usage >&2
  exit 1
fi

if [[ "$ZIP_FILE" != /* ]]; then
  ZIP_FILE="$ROOT_DIR/$ZIP_FILE"
fi

if [[ ! -f "$ZIP_FILE" ]]; then
  echo "Extension zip was not found: $ZIP_FILE" >&2
  exit 1
fi

for env_name in CWS_PUBLISHER_ID CWS_EXTENSION_ID CWS_CLIENT_ID CWS_CLIENT_SECRET CWS_REFRESH_TOKEN; do
  if [[ -z "${!env_name:-}" ]]; then
    echo "$env_name is required" >&2
    exit 1
  fi
done

TOKEN_RESPONSE="$(curl -fsS "https://oauth2.googleapis.com/token" \
  --data-urlencode "client_secret=$CWS_CLIENT_SECRET" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=$CWS_REFRESH_TOKEN" \
  --data-urlencode "client_id=$CWS_CLIENT_ID")"

ACCESS_TOKEN="$(node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync(0, 'utf8')); if (!data.access_token) { throw new Error('access_token missing'); } console.log(data.access_token);" <<<"$TOKEN_RESPONSE")"
ITEM_NAME="publishers/$CWS_PUBLISHER_ID/items/$CWS_EXTENSION_ID"

echo "Uploading extension zip to Chrome Web Store draft..."
curl -fsS \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/zip" \
  -X POST \
  -T "$ZIP_FILE" \
  "https://chromewebstore.googleapis.com/upload/v2/$ITEM_NAME:upload"
echo

if [[ "$PUBLISH" == true ]]; then
  echo "Submitting uploaded draft for Chrome Web Store review..."
  curl -fsS \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -X POST \
    "https://chromewebstore.googleapis.com/v2/$ITEM_NAME:publish"
  echo
else
  echo "Upload complete. Re-run with --publish to submit the draft for review."
fi
