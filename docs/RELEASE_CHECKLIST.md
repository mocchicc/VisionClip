# Release Checklist

VisionClipを一般向けに近い形で配布する前のチェックリストです。

## 必須チェック

- [ ] `extension/manifest.json` の `version` を更新する
- [ ] `README.md` のセットアップ手順、制限、プライバシー説明が現在の実装と一致している
- [ ] [PRIVACY.md](./PRIVACY.md) が現在のデータ送信・保存内容と一致している
- [ ] [CHROME_PERMISSIONS.md](./CHROME_PERMISSIONS.md) がmanifestの権限と一致している
- [ ] [STORE_LISTING.md](./STORE_LISTING.md) が現在の機能、権限、privacy説明と一致している
- [ ] [MACOS_DISTRIBUTION.md](./MACOS_DISTRIBUTION.md) が現在の配布scriptと一致している
- [ ] `SECURITY.md`、`SUPPORT.md`、`CONTRIBUTING.md` が現在の運用と一致している
- [ ] `extension/manifest.json` とnative hostの `Config.version` が一致している
- [ ] `./scripts/check.sh` が成功する
- [ ] `./scripts/package_release.sh` が成功する
- [ ] `node scripts/check_release_package.js` が成功する
- [ ] `dist/checksums-v<version>.txt` のchecksumを確認する
- [ ] `dist/visionclip-extension-v<version>.zip` の中身がChrome拡張ファイルだけになっている
- [ ] `dist/visionclip-native-host-macos-<arch>-v<version>.zip` にbuild済みnative host、install/uninstall script、docs、samples、告知用assetsが入っている
- [ ] `extension/icons/` に16/32/48/128pxのアイコンPNGがあり、`icon-source.png` がextension zipに入っていない
- [ ] `assets/store/promotional-small.png` が440x280で、告知画像は `assets/social/` に置かれている
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

- [ ] Chrome Web Store公開、unlisted公開、または組織内配布の方針を決める
- [ ] Chrome Web Store用の実機スクリーンショットを作成する
- [ ] macOS native hostのnotarizationとinstaller化方針を決める
- [ ] リリースartifactをGitHub Releases等に添付する運用を決める
