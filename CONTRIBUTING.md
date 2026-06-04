# Contributing

VisionClipへの貢献を歓迎します。小さな修正、セットアップ改善、OCRの失敗例、ドキュメント改善、リリース準備の提案は特に助かります。

## 開発前に知っておいてほしいこと

- OpenAI APIキーはChrome拡張に保存せず、macOS Keychainへ保存します。
- OCR対象画像や選択範囲のスクリーンショットはOpenAI APIへ送信されます。
- issue、PR、test fixtureにAPIキー、機密画像、個人情報を含むOCR結果を入れないでください。
- Chrome権限はできるだけ小さく保ちます。`<all_urls>` や常時content scriptを戻す変更には、明確な理由と代替案の検討を書いてください。

## ローカル確認

変更後は次を実行してください。

```sh
./scripts/check.sh
```

pull requestではGitHub ActionsのChecksとCodeQLも確認します。GitHub Actions自体の更新はDependabot PRとして届く想定です。

リリースartifactに関わる変更では、次も確認してください。

```sh
./scripts/package_release.sh
```

## PRの観点

PRでは、次を短く書いてください。

- 何を変えたか
- なぜ変えたか
- ユーザーへの影響
- 確認したコマンド
- プライバシー、権限、APIキー保存への影響

## 優先している改善

- Chrome Web Store配布に向けた説明文、スクリーンショット、権限説明
- macOS native hostの署名、notarization、installer化
- OCRの回帰確認に使えるサンプル画像と検証手順
- モーダル、blob/data画像、ログイン後ページなど実利用で壊れやすいケースの改善
- README、support、security、release checklistの整備
