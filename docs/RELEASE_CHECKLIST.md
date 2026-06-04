# Release Checklist

VisionClipを一般向けに近い形で配布する前のチェックリストです。

## 必須チェック

- [ ] `extension/manifest.json` の `version` を更新する
- [ ] 公開前に `LICENSE` を追加するか、ライセンス未決定として公開範囲と告知文を制限する
- [ ] `node scripts/check_license_policy.js` が、現在のライセンス状態と公開文面の整合性を確認できる
- [ ] `node scripts/check_release_readiness.js` が自動チェックを通し、手動ブロッカーを表示できる
- [ ] 一般公開に近い配布判断の前に `node scripts/check_release_readiness.js --strict` が成功する
- [ ] `README.md` のセットアップ手順、制限、プライバシー説明が現在の実装と一致している
- [ ] [PRIVACY.md](./PRIVACY.md) が現在のデータ送信・保存内容と一致している
- [ ] [CHROME_PERMISSIONS.md](./CHROME_PERMISSIONS.md) がmanifestの権限と一致している
- [ ] [STORE_LISTING.md](./STORE_LISTING.md) が現在の機能、権限、privacy説明と一致している
- [ ] [MACOS_DISTRIBUTION.md](./MACOS_DISTRIBUTION.md) が現在の配布scriptと一致している
- [ ] `CHANGELOG.md` と `docs/RELEASE_NOTES_v<version>.md` が現在のrelease内容と一致している
- [ ] `SECURITY.md`、`SUPPORT.md`、`CONTRIBUTING.md` が現在の運用と一致している
- [ ] `extension/manifest.json` とnative hostの `Config.version` が一致している
- [ ] Native Messaging形式の `status` 応答が `ok: true`、現在version、default modelを返す
- [ ] `./scripts/check.sh` が成功する
- [ ] `./scripts/package_release.sh` が成功する
- [ ] `node scripts/check_release_package.js` が成功する
- [ ] `./scripts/check_native_host_pkg.sh` が成功する
- [ ] Chrome Web StoreとmacOS署名/notarizationの資格情報を用意した環境で `./scripts/check_release_preflight.sh` が成功する
- [ ] `./scripts/check_release_install.sh` が成功する
- [ ] `v<version>` タグでGitHub Releaseにartifactが添付され、`Release Artifacts` workflowの手動実行ではActions artifactが生成される
- [ ] `dist/checksums-v<version>.txt` のchecksumを確認する
- [ ] `dist/visionclip-extension-v<version>.zip` の中身がChrome拡張ファイルだけになっている
- [ ] `dist/visionclip-native-host-macos-<arch>-v<version>.zip` にbuild済みnative host、install/uninstall script、CHANGELOG、docs、samples、告知用assetsが入っている
- [ ] `dist/visionclip-native-host-macos-<arch>-v<version>.pkg` にsystem-wide native host、wrapper、Chrome Native Messaging manifestが入っている
- [ ] `LICENSE` を追加した場合、native hostのrelease zipにも同梱されている
- [ ] `extension/icons/` に16/32/48/128pxのアイコンPNGがあり、`icon-source.png` がextension zipに入っていない
- [ ] `assets/store/promotional-small.png` が440x280で、告知画像は `assets/social/` に置かれている
- [ ] `assets/store/screenshots/` にChrome Web Store用の1280x800スクリーンショットが5枚ある
- [ ] `.github/workflows/chrome-web-store.yml` でChrome Web Storeへdraft uploadできる
- [ ] `samples/index.html` で右クリックOCR、範囲OCR、モーダル上の範囲OCRを同じfixtureで確認できる

## 手元での動作確認

- [ ] Chromeで拡張をreloadできる
- [ ] native hostを現在のChrome拡張IDでインストールできる
- [ ] 設定画面でAPIキー状態を確認できる
- [ ] 画像右クリックOCRが成功し、クリップボードへコピーされる
- [ ] 範囲OCRが成功し、クリップボードへコピーされる
- [ ] `Option+Shift+O` で範囲OCRを開始できる
- [ ] `samples/index.html` の `Modal` で開いた画像を範囲OCRできる
- [ ] `image-ocr-host version` と `image-ocr-host diagnose <Chrome拡張ID>` が実行できる
- [ ] OCR履歴の再コピーができる
- [ ] `履歴削除` でOCR履歴を削除できる
- [ ] 履歴保存OFF時に新しいOCR結果が履歴へ追加されない
- [ ] manifestが `<all_urls>` と常時content scriptを要求していない
- [ ] `clear-key` でKeychainのAPIキーを削除できる
- [ ] `uninstall_native_host.sh` でnative hostを削除できる

## 公開前に残っている大きな課題

- [ ] Chrome Web Storeの初期unlisted公開に必要なSecretsとStore itemを用意する
- [ ] Chrome Web StoreのOAuth / draft upload前に `./scripts/check_release_preflight.sh --store-only --online` が成功する
- [ ] Chrome Web Store提出直前にスクリーンショットを実機表示と照合し、必要なら撮り直す
- [ ] Developer ID証明書とnotarytool profileを用意し、pkg署名・notarization済みartifactを実機評価する
- [ ] Developer ID証明書とnotarytool profileを用意したMacで `./scripts/check_release_preflight.sh --macos-only --online` が成功する
