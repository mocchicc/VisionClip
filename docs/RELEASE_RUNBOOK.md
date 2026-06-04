# Release Runbook

VisionClipを公開MVPから一般リリースへ近づけて出すときの作業順です。迷ったら [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) を正とし、このrunbookは実行順のメモとして使います。

## 0. Release levelを決める

現時点で選べるrelease level:

- public MVP: GitHub Releaseと手動セットアップで配布する
- Chrome Web Store unlisted: Store URLを知っている人へ配布する
- broader release: LICENSE、Store item、Developer ID署名、notarization、実機評価まで揃えて配布する

`LICENSE` がない間は、READMEや告知で再配布・改変許可が決まっているような表現を避け、「公開MVP」「公開repo」として扱います。

候補と判断観点は [LICENSE_DECISION.md](./LICENSE_DECISION.md) にまとめています。

## 1. Versionとdocsを揃える

1. `extension/manifest.json` の `version` を更新する。
2. `native-host/Sources/ImageOCRHost/main.swift` の `Config.version` を同じ値にする。
3. `docs/RELEASE_NOTES_v<version>.md` を作る。
4. `LICENSE` を追加した場合は、READMEのライセンス欄、告知文、[LICENSE_DECISION.md](./LICENSE_DECISION.md) の現在状態を更新する。
5. `CHANGELOG.md` と [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) を更新する。

確認:

```sh
node scripts/check_version_consistency.js
node scripts/check_release_tag.js v<version>
```

## 2. Local release gatesを通す

通常チェック:

```sh
./scripts/check.sh
```

一般公開に近い判断をする前のstrict check:

```sh
node scripts/check_release_readiness.js --strict
```

strict checkが失敗する場合は、出力されたmanual blockerをrelease notesや告知文で制限として扱うか、release前に解消します。

## 3. Artifactを作る

既定Store IDで作る場合:

```sh
./scripts/package_release.sh
```

Chrome Web Store item IDが既定と違う場合:

```sh
VISIONCLIP_RELEASE_EXTENSION_IDS="<Chrome Web Store extension ID>" ./scripts/package_release.sh
```

複数IDを許可したい場合は、スペース区切りで指定します。

```sh
VISIONCLIP_RELEASE_EXTENSION_IDS="<Store ID> <dev ID>" ./scripts/package_release.sh
```

生成物:

- `dist/visionclip-extension-v<version>.zip`
- `dist/visionclip-native-host-macos-<arch>-v<version>.zip`
- `dist/visionclip-native-host-macos-<arch>-v<version>.pkg`
- `dist/checksums-v<version>.txt`

## 4. Artifactを検証する

```sh
node scripts/check_release_package.js
./scripts/check_native_host_pkg.sh <Chrome extension ID>
./scripts/check_release_install.sh <Chrome extension ID>
node scripts/generate_release_qa_report.js
```

`dist/release-qa-v<version>.md` にcommit、working tree、artifact、checksum、readiness blockerが出ます。APIキー、OAuth secret、notarytool credential、OCR結果、スクリーンショットは出しません。

## 5. Chrome Web Store準備

GitHub Secrets:

- `CWS_PUBLISHER_ID`
- `CWS_EXTENSION_ID`
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

ローカルまたは同等の環境でpreflight:

```sh
./scripts/check_release_preflight.sh --store-only --online
```

Developer Dashboardでは [STORE_LISTING.md](./STORE_LISTING.md) の内容を使います。PrivacyタブにはPrivacy Policy URL、Single purpose、User data usage、Limited Useを入力します。

uploadだけなら `.github/workflows/chrome-web-store.yml` を `publish=false` で手動実行します。review submitまで進める場合だけ `publish=true` にします。

## 6. macOS signing / notarization準備

Developer ID証明書とnotarytool profileを用意します。

```sh
xcrun notarytool store-credentials visionclip-notary
```

preflight:

```sh
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
VISIONCLIP_PKG_SIGN_IDENTITY="Developer ID Installer: Example Name (TEAMID)" \
VISIONCLIP_NOTARY_PROFILE="visionclip-notary" \
./scripts/check_release_preflight.sh --macos-only --online
```

signed / notarized artifact生成:

```sh
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
VISIONCLIP_PKG_SIGN_IDENTITY="Developer ID Installer: Example Name (TEAMID)" \
VISIONCLIP_NOTARY_PROFILE="visionclip-notary" \
VISIONCLIP_RELEASE_EXTENSION_IDS="<Chrome extension ID>" \
./scripts/package_release.sh
```

Gatekeeper確認:

```sh
spctl --assess --type install --verbose=4 dist/visionclip-native-host-macos-<arch>-v<version>.pkg
```

## 7. GitHub Releaseを作る

tag名はmanifest versionと一致させます。

```sh
git tag v<version>
git push origin v<version>
```

`Release Artifacts` workflowは、artifact、checksum、release QA reportをGitHub Releaseへ添付します。workflow完了後に次を確認します。

- GitHub Releaseにzip / pkg / checksum / release QA reportがある
- `dist/checksums-v<version>.txt` と添付artifactのSHA-256が一致する
- release notesが `docs/RELEASE_NOTES_v<version>.md` と一致する

## 8. Final smoke

実機Chromeで確認します。

- Chrome拡張をreloadできる
- native hostを現在の拡張IDでinstallできる
- `image-ocr-host diagnose <Chrome拡張ID>` がuser/system manifestを表示する
- APIキー状態を確認できる
- 画像右クリックOCRが成功する
- 範囲OCRが成功する
- `Option+Shift+O` でモーダル上の範囲OCRができる
- OCR履歴の再コピー、削除、保存OFFが期待通り動く

## 9. Rollback / cleanup

Chrome Web Storeでreview submit前なら、Developer Dashboardでdraftを修正します。GitHub Release artifactを差し替える場合は、同じtagで `Release Artifacts` workflowを再実行するか、問題が大きい場合は新しいpatch versionを切ります。

手元のNative Messaging hostを消す場合:

```sh
./scripts/uninstall_native_host.sh
```

system-wide pkg installを消す場合:

```sh
sudo "/Library/Application Support/VisionClip/uninstall_native_host_system.sh"
```

APIキーも消す場合は、uninstall前に `clear-key` を実行します。
