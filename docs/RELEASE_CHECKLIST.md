# Release Checklist

VisionClipを一般向けに近い形で配布する前のチェックリストです。

## 必須チェック

- [ ] `extension/manifest.json` の `version` を更新する
- [ ] `README.md` のセットアップ手順、制限、プライバシー説明が現在の実装と一致している
- [ ] [PRIVACY.md](./PRIVACY.md) が現在のデータ送信・保存内容と一致している
- [ ] [CHROME_PERMISSIONS.md](./CHROME_PERMISSIONS.md) がmanifestの権限と一致している
- [ ] `./scripts/check.sh` が成功する
- [ ] `./scripts/package_release.sh` が成功する
- [ ] `dist/checksums-v<version>.txt` のchecksumを確認する
- [ ] `dist/visionclip-extension-v<version>.zip` の中身がChrome拡張ファイルだけになっている
- [ ] `dist/visionclip-native-host-macos-<arch>-v<version>.zip` にbuild済みnative hostとinstall/uninstall scriptが入っている

## 手元での動作確認

- [ ] Chromeで拡張をreloadできる
- [ ] native hostを現在のChrome拡張IDでインストールできる
- [ ] 設定画面でAPIキー状態を確認できる
- [ ] 画像右クリックOCRが成功し、クリップボードへコピーされる
- [ ] 範囲OCRが成功し、クリップボードへコピーされる
- [ ] `Option+Shift+O` で範囲OCRを開始できる
- [ ] OCR履歴の再コピーができる
- [ ] `履歴削除` でOCR履歴を削除できる
- [ ] 履歴保存OFF時に新しいOCR結果が履歴へ追加されない
- [ ] `clear-key` でKeychainのAPIキーを削除できる
- [ ] `uninstall_native_host.sh` でnative hostを削除できる

## 公開前に残っている大きな課題

- [ ] Chrome Web Store公開、unlisted公開、または組織内配布の方針を決める
- [ ] Chrome Web Store用の説明文、スクリーンショット、権限説明を準備する
- [ ] macOS native hostの署名・notarization・installer化方針を決める
- [ ] リリースartifactをGitHub Releases等に添付する運用を決める
- [ ] サポート先、問い合わせ先、脆弱性報告先を決める
- [ ] `<all_urls>` と常時content scriptを減らせるか検証する
