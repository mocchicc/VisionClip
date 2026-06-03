# Support

VisionClipは公開MVPです。まずは個人利用や小さなチーム内検証で使うことを想定しています。

## 質問や不具合

通常の質問、不具合、機能要望はGitHub Issuesで受け付けます。

issueを書く前に確認してほしいもの:

- [README.md](README.md) のセットアップ手順
- [docs/PRIVACY.md](docs/PRIVACY.md) のデータ取り扱い
- [docs/CHROME_PERMISSIONS.md](docs/CHROME_PERMISSIONS.md) のChrome権限説明
- [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) の現在の制限

Native MessagingホストやAPIキー状態で困っている場合は、公開して問題ない範囲で次の出力も添えてください。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" diagnose <Chrome拡張ID>
"$HOME/Library/Application Support/VisionClip/image-ocr-host" check-key
```

これらのコマンドはAPIキーの値やOCR結果を表示しません。Keychainアクセスの問題を含めて診断したい場合は、`diagnose <Chrome拡張ID> --check-keychain` も使えます。

## issueに載せないでほしいもの

- OpenAI APIキー
- OCR対象の機密画像やスクリーンショット
- 個人情報を含むOCR結果
- ログイン後画面のURL、cookie、token、認証情報

必要なら、公開しても問題ないサンプル画像や、機密情報を取り除いた再現手順に置き換えてください。

## セキュリティ報告

APIキー漏えい、権限の過剰取得、秘密情報の露出などにつながる可能性がある問題は、公開issueに詳細を書かず [SECURITY.md](SECURITY.md) を確認してください。
