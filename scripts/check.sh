#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/visionclip-check-build.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

cd "$ROOT_DIR"
export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/clang-module-cache"
MANIFEST_VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('extension/manifest.json', 'utf8')).version)")"

node --check extension/background.js
node --check extension/content.js
node --check extension/options.js
node --check extension/popup.js
node --check scripts/check_extension_assets.js
node --check scripts/check_release_assets.js
node --check scripts/check_release_package.js
node --check scripts/check_release_tag.js
node --check scripts/check_license_policy.js
node --check scripts/check_release_readiness.js
node --check scripts/check_native_message.js
node --check scripts/check_version_consistency.js
node scripts/check_extension_assets.js
node scripts/check_release_assets.js
node scripts/check_release_tag.js "v$MANIFEST_VERSION"
node scripts/check_license_policy.js
node scripts/check_release_readiness.js
node scripts/check_version_consistency.js
ruby -e "require 'yaml'; Dir['.github/**/*.yml'].sort.each { |path| YAML.load_file(path) }"

bash -n scripts/install_native_host.sh
bash -n scripts/install_release_native_host.sh
bash -n scripts/check_native_host_pkg.sh
bash -n scripts/check_release_install.sh
bash -n scripts/generate_store_screenshots.sh
bash -n scripts/package_native_host_pkg.sh
bash -n scripts/package_release.sh
bash -n scripts/upload_chrome_web_store.sh
bash -n scripts/uninstall_native_host.sh

swift build -c release --package-path native-host --build-path "$BUILD_DIR"
"$BUILD_DIR/release/image-ocr-host" version >/dev/null
"$BUILD_DIR/release/image-ocr-host" diagnose >/dev/null
node scripts/check_native_message.js "$BUILD_DIR/release/image-ocr-host"

git diff --check
