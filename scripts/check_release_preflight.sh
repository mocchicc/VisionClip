#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHECK_STORE=true
CHECK_MACOS=true
ONLINE=false
FAILURES=()
DEFAULT_EXTENSION_ID="bficjnhffakpmfcjbjjcanabccfldfhk"

usage() {
  cat <<'USAGE'
Usage: scripts/check_release_preflight.sh [--store-only|--macos-only] [--online]

Checks the external credentials and local tools needed for a broader release.
The default mode is offline and does not print secret values.

Required Chrome Web Store environment variables:
  CWS_PUBLISHER_ID
  CWS_EXTENSION_ID
  CWS_CLIENT_ID
  CWS_CLIENT_SECRET
  CWS_REFRESH_TOKEN

Required macOS distribution environment variables:
  VISIONCLIP_CODESIGN_IDENTITY
  VISIONCLIP_PKG_SIGN_IDENTITY
  VISIONCLIP_NOTARY_PROFILE

Use --online to also verify the Chrome OAuth refresh token and notarytool
keychain profile with their remote services.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --store-only)
      CHECK_STORE=true
      CHECK_MACOS=false
      shift
      ;;
    --macos-only)
      CHECK_STORE=false
      CHECK_MACOS=true
      shift
      ;;
    --online)
      ONLINE=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

fail() {
  FAILURES+=("$1")
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    fail "Missing command: $command_name"
  fi
}

require_env() {
  local env_name="$1"
  if [[ -z "${!env_name:-}" ]]; then
    fail "Missing environment variable: $env_name"
    return 1
  fi
  return 0
}

release_extension_ids() {
  local ids="${VISIONCLIP_RELEASE_EXTENSION_IDS:-$DEFAULT_EXTENSION_ID}"
  read -r -a RELEASE_EXTENSION_ID_ARGS <<< "$ids"
}

array_contains() {
  local needle="$1"
  shift
  local item
  for item in "$@"; do
    if [[ "$item" == "$needle" ]]; then
      return 0
    fi
  done
  return 1
}

print_present_env() {
  local env_name="$1"
  if [[ -n "${!env_name:-}" ]]; then
    echo "  $env_name: present"
  else
    echo "  $env_name: missing"
  fi
}

check_store() {
  echo "Chrome Web Store preflight:"
  require_command curl
  require_command node
  require_command unzip

  local extension_zip
  extension_zip="$(find "$ROOT_DIR/dist" -maxdepth 1 -name 'visionclip-extension-v*.zip' -print -quit 2>/dev/null || true)"
  if [[ -z "$extension_zip" ]]; then
    fail "Missing extension release zip in dist/. Run ./scripts/package_release.sh first."
  fi

  local missing_env=false
  for env_name in CWS_PUBLISHER_ID CWS_EXTENSION_ID CWS_CLIENT_ID CWS_CLIENT_SECRET CWS_REFRESH_TOKEN; do
    print_present_env "$env_name"
    require_env "$env_name" || missing_env=true
  done

  if [[ -n "${CWS_EXTENSION_ID:-}" && ! "$CWS_EXTENSION_ID" =~ ^[a-p]{32}$ ]]; then
    fail "CWS_EXTENSION_ID must be a 32-character Chrome extension ID."
  fi

  release_extension_ids
  if [[ -n "${CWS_EXTENSION_ID:-}" ]] &&
      ! array_contains "$CWS_EXTENSION_ID" "${RELEASE_EXTENSION_ID_ARGS[@]}"; then
    fail "CWS_EXTENSION_ID is not included in VISIONCLIP_RELEASE_EXTENSION_IDS. Native Messaging pkg would not allow this Store extension ID."
  fi

  if [[ "$ONLINE" == true && "$missing_env" == false ]]; then
    echo "  online OAuth check: running"
    local token_response
    if ! token_response="$(curl -fsS "https://oauth2.googleapis.com/token" \
      --data-urlencode "client_secret=$CWS_CLIENT_SECRET" \
      --data-urlencode "grant_type=refresh_token" \
      --data-urlencode "refresh_token=$CWS_REFRESH_TOKEN" \
      --data-urlencode "client_id=$CWS_CLIENT_ID")"; then
      fail "Chrome Web Store OAuth token request failed."
    elif ! node -e "const data = JSON.parse(process.argv[1]); if (!data.access_token) process.exit(1);" "$token_response"; then
      fail "Chrome Web Store OAuth response did not include an access token."
    else
      echo "  online OAuth check: ok"
    fi
  elif [[ "$ONLINE" == true ]]; then
    echo "  online OAuth check: skipped because credentials are missing"
  fi
}

check_macos() {
  echo "macOS distribution preflight:"
  require_command codesign
  require_command cpio
  require_command gzip
  require_command pkgbuild
  require_command pkgutil
  require_command productsign
  require_command security
  require_command spctl
  require_command xcrun

  local native_pkg
  native_pkg="$(find "$ROOT_DIR/dist" -maxdepth 1 -name 'visionclip-native-host-macos-*-v*.pkg' -print -quit 2>/dev/null || true)"
  if [[ -z "$native_pkg" ]]; then
    fail "Missing native host pkg in dist/. Run ./scripts/package_release.sh first."
  fi

  release_extension_ids
  if [[ -n "$native_pkg" ]]; then
    local pkg_check_output
    if ! pkg_check_output="$("$ROOT_DIR/scripts/check_native_host_pkg.sh" "${RELEASE_EXTENSION_ID_ARGS[@]}" 2>&1)"; then
      fail "Native host pkg allowed origins check failed: $pkg_check_output"
    fi
  fi

  for env_name in VISIONCLIP_CODESIGN_IDENTITY VISIONCLIP_PKG_SIGN_IDENTITY VISIONCLIP_NOTARY_PROFILE; do
    print_present_env "$env_name"
    require_env "$env_name" >/dev/null || true
  done

  if [[ -n "${VISIONCLIP_CODESIGN_IDENTITY:-}" ]] &&
      ! security find-identity -v -p codesigning | grep -Fq "$VISIONCLIP_CODESIGN_IDENTITY"; then
    fail "VISIONCLIP_CODESIGN_IDENTITY was not found as a valid codesigning identity."
  fi

  if [[ -n "${VISIONCLIP_PKG_SIGN_IDENTITY:-}" ]] &&
      ! security find-certificate -a -c "$VISIONCLIP_PKG_SIGN_IDENTITY" >/dev/null 2>&1; then
    fail "VISIONCLIP_PKG_SIGN_IDENTITY certificate was not found in the keychain."
  fi

  if ! xcrun notarytool --help >/dev/null 2>&1; then
    fail "xcrun notarytool is not available."
  fi

  if ! xcrun stapler --help >/dev/null 2>&1; then
    fail "xcrun stapler is not available."
  fi

  if [[ "$ONLINE" == true && -n "${VISIONCLIP_NOTARY_PROFILE:-}" ]]; then
    echo "  online notarytool profile check: running"
    if xcrun notarytool history --keychain-profile "$VISIONCLIP_NOTARY_PROFILE" --limit 1 >/dev/null; then
      echo "  online notarytool profile check: ok"
    else
      fail "notarytool keychain profile check failed."
    fi
  elif [[ "$ONLINE" == true ]]; then
    echo "  online notarytool profile check: skipped because VISIONCLIP_NOTARY_PROFILE is missing"
  fi
}

if [[ "$CHECK_STORE" == true ]]; then
  check_store
fi

if [[ "$CHECK_MACOS" == true ]]; then
  check_macos
fi

if [[ "${#FAILURES[@]}" -gt 0 ]]; then
  echo
  echo "Release preflight failed:"
  for failure in "${FAILURES[@]}"; do
    echo "- $failure"
  done
  exit 1
fi

echo
if [[ "$ONLINE" == true ]]; then
  echo "Release preflight passed, including online credential checks."
else
  echo "Release preflight passed. Re-run with --online before publishing to verify remote credentials."
fi
