# Chrome Extension Permissions

この文書は、VisionClipのChrome拡張が要求する権限と、その用途を説明します。

## permissions

### `activeTab`

範囲OCRで現在のタブを対象にし、表示中の画面をキャプチャするために使用します。

### `contextMenus`

画像右クリックメニュー `この画像をOCRする` と、ページ右クリックメニュー `この画面の範囲をOCRする` を表示するために使用します。

### `nativeMessaging`

Chrome拡張からmacOS Native Messagingホストを呼び出すために使用します。Native hostはOpenAI API呼び出し、Keychain操作、macOSクリップボードコピーを担当します。

### `storage`

次のユーザー設定と状態をChrome local storageへ保存するために使用します。

- 選択中のOCRモデル
- OCR履歴保存のON/OFF
- 直近の処理状態
- OCR履歴保存がONの場合、最近5件のOCR結果プレビュー

### `clipboardWrite`

popupの履歴から抽出済みテキストを再コピーするために使用します。OCR実行直後の自動コピーはnative host側でmacOSクリップボードに書き込みます。

## host permissions

### `<all_urls>`

画像右クリックOCRと範囲OCRを一般的なWebページで動作させるために使用します。

特に、ログイン済みページ、blob URL、data URL、canvas化できる画像、モーダル上の画像などは、ページごとに画像取得方法が異なります。VisionClipは、OCR実行時に対象画像または選択範囲だけを処理します。

## content scripts

### `<all_urls>` / `document_start`

右クリック対象画像の情報を事前に覚えるため、また範囲OCRの選択UIとスクリーンショット固定表示をページ上に重ねるために使用します。

content scriptはOCRを自動実行しません。OCRはユーザーが右クリックメニュー、popup、またはショートカットから開始したときだけ実行されます。

## 今後の権限削減候補

一般公開前に、次を検討します。

- `activeTab` と `chrome.scripting.executeScript` を使い、常時content scriptを減らせるか検証する
- 右クリック画像OCRとblob/data画像対応を維持したまま、host permissionsを限定できるか検証する
- Chrome Web Store提出時の権限説明文をこの文書から作成する
