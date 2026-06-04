# VisionClip v0.1.0 Release Notes

VisionClip v0.1.0は、Chrome上の画像や画面の一部をOCRし、抽出したテキストをmacOSのクリップボードへコピーする公開MVPです。

このリリースは、個人利用や、仕組みを理解している人が手元で試す用途を想定しています。Chrome Web Store配布、macOSアプリ化、Developer ID署名・notarization済み配布はまだ未対応です。

## Highlights

- 画像右クリックメニューから画像OCR
- popup、ページ右クリック、`Option+Shift+O` / `Alt+Shift+O` から範囲OCR
- モーダル上の画像を閉じにくくするスクリーンショット固定型の範囲OCR
- OCR結果をmacOSクリップボードへ自動コピー
- OpenAI APIキーをmacOS Keychainに保存
- OCRモデル選択、token usage表示、最近5件の履歴、履歴削除、履歴保存OFF
- `samples/index.html` によるローカルOCR smoke fixture
- extension zip / native host zip / native host pkg / checksum生成
- release artifact検証、Native Messaging status検証、release installer smoke検証
- release QA report生成
- release runbookによる公開MVP / Chrome Web Store unlisted / broader releaseの作業順整理
- broader release前のライセンス判断メモ
- ユーザー配下installとsystem-wide pkg installの両方を表示するNative host diagnostics
- Chrome Web Store / Developer ID / notarization資格情報のrelease preflight
- Chrome Web StoreのPrivacyタブ向けSingle purpose、User data usage、Limited Use草案

## Artifacts

`./scripts/package_release.sh` で次のartifactを生成します。

- `dist/visionclip-extension-v0.1.0.zip`
- `dist/visionclip-native-host-macos-<arch>-v0.1.0.zip`
- `dist/visionclip-native-host-macos-<arch>-v0.1.0.pkg`
- `dist/checksums-v0.1.0.txt`
- `dist/release-qa-v0.1.0.md`

生成後の確認:

```sh
./scripts/check.sh
./scripts/package_release.sh
node scripts/check_release_package.js
./scripts/check_native_host_pkg.sh
node scripts/generate_release_qa_report.js
./scripts/check_release_install.sh
```

Chrome Web StoreやmacOS署名/notarizationの資格情報を用意した環境では、公開直前に次を実行します。

```sh
./scripts/check_release_preflight.sh
```

## Install Summary

1. Chromeで `chrome://extensions` を開き、Developer modeをONにします。
2. `Load unpacked` から `extension/` を読み込み、Chrome拡張IDをコピーします。
3. macOS側でNative Messagingホストをインストールします。

```sh
./scripts/install_native_host.sh <Chrome拡張ID>
```

4. 拡張の設定画面でOpenAI APIキーを保存します。

## Privacy Summary

- OCR対象の画像、または選択範囲のスクリーンショットはOpenAI APIへ送信されます。
- 送信はユーザーがOCRを開始したときだけ行います。
- OpenAI APIキーはmacOS Keychainに保存し、Chrome拡張local storageには保存しません。
- OCR履歴はChrome local storageに最近5件だけ保存できます。履歴は削除でき、新規保存もOFFにできます。

詳しくは [PRIVACY.md](./PRIVACY.md) と [CHROME_PERMISSIONS.md](./CHROME_PERMISSIONS.md) を参照してください。

## Known Limitations

- GitHubからの手動セットアップ前提です。
- Chrome Web Store配布はまだ行っていません。
- macOS native hostのpkgは生成できますが、Developer ID署名・notarization済み配布ではありません。
- ユーザー自身のOpenAI APIキーが必要です。
- ログインが必要なページや動的な画像表示では、直接画像OCRではなく範囲OCRが必要になる場合があります。

## Recommended Announcement Copy

日本語:

> 画像の中に閉じ込められた文字を、もう手で打ち直したくないのでVisionClipを作りました。Chromeで画像を右クリック、または画面範囲を選ぶだけでOCRしてコピー。自分のOpenAI APIキーを使うBYOK運用で、キーはmacOS Keychainに保存します。まずは公開MVPとして育てます。

English:

> Text trapped inside images is a tiny daily tax, so I built VisionClip. Right-click an image or select a screen region, run OCR, and get the result on your macOS clipboard. It uses your own OpenAI API key and keeps it in Keychain. Public MVP.
