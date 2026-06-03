# Chrome Web Store Listing Draft

Chrome Web Store提出時に使う説明文、権限説明、privacy項目、スクリーンショット案の下書きです。実際に提出する前に、現在の実装、version、スクリーンショット、privacy policyと一致していることを確認してください。

## Listing Basics

### Name

VisionClip - Image OCR to Clipboard

### Category

Productivity

### Language

Japanese

英語圏向けに出す場合は、下のEnglish Listing Draftを使います。Chrome Web Store上のprimary languageは配布方針に合わせて選んでください。

### Short Description

Chrome上の画像や選択範囲をOCRし、抽出したテキストをmacOSのクリップボードへコピーします。

### Detailed Description

VisionClipは、Chrome上の画像や画面の一部をOCRし、抽出したテキストをmacOSのクリップボードへコピーするユーティリティです。

画像を右クリックして `この画像をOCRする` を選ぶと、画像内の文字をOpenAIのマルチモーダルモデルで読み取り、結果をそのまま貼り付けられる状態にします。Chrome拡張のpopupやショートカットから範囲OCRを開始すると、現在表示されているページ上でドラッグした範囲だけをOCRできます。

APIキーはユーザー自身のOpenAI APIキーを使います。APIキーはmacOS Keychainに保存され、Chrome拡張には保存されません。OCR履歴はChrome local storageに最近5件だけ保存でき、popupから削除したり、設定画面で履歴保存をOFFにできます。

主な機能:

- 画像右クリックOCR
- 表示中ページの範囲OCR
- OCR結果のmacOSクリップボード自動コピー
- OCRモデル選択
- APIキー状態、実行状態、token usageの確認
- OCR履歴の再コピー、削除、保存OFF
- モーダルやpopup上の画像を閉じにくくするショートカット起動

現在は公開MVPです。Chrome Web Storeで配布する場合も、macOS Native Messagingホストのインストールが別途必要です。

macOS native hostの署名・notarization・installer化の状態は [MACOS_DISTRIBUTION.md](./MACOS_DISTRIBUTION.md) にまとめています。

## Single Purpose

ユーザーが明示的に選択した画像、または画面上の選択範囲から文字を抽出し、抽出テキストをmacOSのクリップボードへコピーすること。

## Permission Justification

### `activeTab`

ユーザーが右クリックメニュー、popup、またはショートカットからOCRを開始した現在のタブだけを対象にするために使います。範囲OCRでは、表示中の画面をキャプチャします。

### `contextMenus`

画像右クリックメニュー `この画像をOCRする` と、ページ右クリックメニュー `この画面の範囲をOCRする` を表示するために使います。

### `scripting`

OCR開始時に現在のタブへ `content.js` を一時的に注入するために使います。範囲選択UI、スクリーンショット固定表示、blob/data画像の補助取得、OCR結果toast表示に使います。

### `nativeMessaging`

Chrome拡張からmacOS Native Messagingホストを呼び出すために使います。Native hostはOpenAI API呼び出し、Keychain操作、macOSクリップボードコピーを担当します。

### `storage`

選択中のOCRモデル、直近の処理状態、OCR履歴保存のON/OFF、保存がONの場合の最近5件のOCR結果プレビューをChrome local storageへ保存するために使います。

### `clipboardWrite`

popupの履歴から抽出済みテキストを再コピーするために使います。OCR実行直後の自動コピーはnative host側でmacOSクリップボードへ書き込みます。

## Privacy Disclosure Draft

VisionClipは、ユーザーが明示的にOCRを開始した画像、または選択範囲のスクリーンショットをOpenAI APIへ送信します。送信はOCR機能を提供するためだけに行います。

VisionClipの開発者は、独自サーバーでOCR対象画像、OCR結果、APIキー、閲覧履歴を収集・保存しません。APIキーはmacOS Keychainに保存され、Chrome拡張には保存されません。OCR履歴保存がONの場合、最近5件のOCR結果プレビューはChrome local storageに保存されます。履歴はpopupから削除でき、設定画面で新規保存をOFFにできます。

詳しいデータ取り扱いは [PRIVACY.md](./PRIVACY.md) を参照してください。

## Screenshot Plan

Chrome Web Storeでは、実際のユーザー体験と主要機能が伝わるスクリーンショットを用意します。公式docsでは少なくとも1枚、できれば最大5枚のスクリーンショットが推奨されています。サイズは `1280x800`、または `640x400` を使います。

スクリーンショット撮影には `samples/index.html` を使えます。ローカルで `python3 -m http.server 8787 --directory samples` を実行し、`http://localhost:8787/` をChromeで開くと、右クリックOCR、範囲OCR、モーダル上の範囲OCRを同じfixtureで撮れます。

優先して用意する画像:

1. 画像右クリックメニューから `この画像をOCRする` を選ぶ画面
2. 範囲OCRでドラッグ選択している画面
3. popupでAPIキー状態、モデル、履歴、token usageが見える画面
4. options画面でAPIキー保存、モデル選択、履歴保存OFFが見える画面
5. モーダル上の画像を `Option+Shift+O` で範囲OCRする画面

画像にはAPIキー、実在の個人情報、ログイン後の機密画面、実ユーザーのOCR結果を含めないでください。サンプル画像か、公開して問題ないfixtureだけを使ってください。

## Icon Assets

拡張アイコンは `assets/extension-icon-source.png` をsourceにし、`scripts/generate_extension_icons.swift` で次のPNGを生成します。

- `extension/icons/icon-16.png`
- `extension/icons/icon-32.png`
- `extension/icons/icon-48.png`
- `extension/icons/icon-128.png`

Chrome Web Store提出時は `icon-128.png` をstore iconとして使います。source画像はextension packageに含めません。

## Promotional Image Plan

小さなpromotional imageは `440x280` で用意します。細かいUI説明や長い文字は避け、「画像の文字をすぐコピーできる」ことをビジュアルで伝えます。

現在の候補:

- `assets/store/promotional-small.png` (`440x280`)

案:

- ブラウザ上の画像に範囲選択枠を重ねる
- 選択範囲から短いテキスト片がclipboardへ入る流れを図示する
- 文字を入れる場合はプロダクト名程度にとどめる

## English Listing Draft

### Short Description

OCR images and selected screen regions in Chrome, then copy the extracted text to the macOS clipboard.

### Detailed Description

VisionClip is a small macOS-focused Chrome extension that turns text inside images or selected screen regions into clipboard-ready text.

Right-click an image and choose `この画像をOCRする` to read text from that image with an OpenAI multimodal model. Start region OCR from the popup, context menu, or `Option+Shift+O` to capture only the visible area you select on the current page.

VisionClip uses your own OpenAI API key. The API key is saved in macOS Keychain and is not stored in Chrome extension storage. Optional OCR history keeps only the latest 5 result previews in Chrome local storage, and you can clear it from the popup or disable new history saves from the options page.

Main features:

- Image OCR from the right-click context menu
- Region OCR for the currently visible page
- Automatic copy to the macOS clipboard
- OCR model selection
- API key status, current run status, token usage, and recent history in the popup
- Re-copy, clear, or disable OCR history
- Shortcut-based region OCR for modal and popup-heavy pages

VisionClip is currently a public MVP. Even when distributed through Chrome Web Store, it still requires a separate macOS Native Messaging host installation.

## Test Instructions Draft

Reviewer向けに必要なら次を記載します。

1. Chromeで拡張をインストールする。
2. macOS Native MessagingホストをREADMEの手順でインストールする。
3. Options画面でOpenAI APIキーを保存する。
4. `samples/index.html` をローカルHTTPで開き、画像右クリックOCRを実行する。
5. popupまたは `Option+Shift+O` から範囲OCRを実行する。
6. `Modal` ボタンで画像を開き、モーダル上で範囲OCRを実行する。
7. OCR結果がmacOSクリップボードにコピーされ、popup履歴に表示されることを確認する。

OpenAI APIキーはreviewer側で用意する必要があります。APIキーはmacOS Keychainに保存され、Chrome拡張には保存されません。

## References

- Chrome Web Store publishing flow: https://developer.chrome.com/docs/webstore/publish
- Chrome Web Store program policies: https://developer.chrome.com/docs/webstore/program-policies/policies
- Chrome Web Store image requirements: https://developer.chrome.com/docs/webstore/images
