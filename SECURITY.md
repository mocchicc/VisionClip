# Security Policy

VisionClipは、Chrome拡張とmacOS Native Messagingホストを組み合わせて、ユーザー操作で指定された画像や選択範囲をOpenAI APIへ送るツールです。セキュリティ報告では、APIキー、OCR対象画像、OCR結果、ログイン後画面のスクリーンショットなどを公開issueへ載せないでください。

## Supported Versions

現在は公開MVPのため、`main` ブランチの最新版のみをサポート対象とします。古いrelease artifactや古いローカルcheckoutで再現する問題は、まず最新版で再確認してください。

## Reporting a Vulnerability

脆弱性や秘密情報の露出につながる可能性がある問題は、公開issueに詳細を書かないでください。

GitHubのprivate vulnerability reportingが利用できる場合は、このリポジトリの `Security` タブから報告してください。利用できない場合は、公開issueに `[security]` を含む短いタイトルだけを作り、詳細、再現手順、画像、ログ、APIキー、OCR結果は載せずに、非公開で共有するための連絡方法を調整してください。

報告に含めてほしい情報:

- 影響を受ける機能
- macOS / Chrome / VisionClip のバージョン
- 問題の種類
- 公開しても問題ない範囲の再現条件
- 期待される影響

## Scope

次の領域は特に重視します。

- OpenAI APIキーの保存、削除、誤送信
- Chrome拡張とNative Messagingホストの通信
- Native Messaging manifestやinstall scriptの権限
- OCR対象画像、OCR結果、履歴、clipboardの取り扱い
- host permissions、content script、tab accessの範囲

一般的な使い方の質問、機能要望、通常の不具合は [SUPPORT.md](SUPPORT.md) を見てください。
