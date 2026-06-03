# Chrome Extension Permissions

この文書は、VisionClipのChrome拡張が要求する権限と、その用途を説明します。

## permissions

### `activeTab`

ユーザーが右クリックメニュー、popup、またはショートカットからOCRを開始したときに、現在のタブだけを対象にするために使用します。範囲OCRでは表示中の画面をキャプチャします。

### `contextMenus`

画像右クリックメニュー `この画像をOCRする` と、ページ右クリックメニュー `この画面の範囲をOCRする` を表示するために使用します。

### `nativeMessaging`

Chrome拡張からmacOS Native Messagingホストを呼び出すために使用します。Native hostはOpenAI API呼び出し、Keychain操作、macOSクリップボードコピーを担当します。

### `scripting`

OCR開始時に、現在のタブへ `content.js` を一時的に注入するために使用します。注入したscriptは、範囲OCRの選択UI、スクリーンショット固定表示、blob/data画像の補助取得、OCR結果toast表示に使います。

### `storage`

次のユーザー設定と状態をChrome local storageへ保存するために使用します。

- 選択中のOCRモデル
- OCR履歴保存のON/OFF
- 直近の処理状態
- OCR履歴保存がONの場合、最近5件のOCR結果プレビュー

### `clipboardWrite`

popupの履歴から抽出済みテキストを再コピーするために使用します。OCR実行直後の自動コピーはnative host側でmacOSクリップボードに書き込みます。

## host permissions

現在、manifestの `host_permissions` は要求していません。

## content scripts

manifestの `content_scripts` には常時注入scriptを登録していません。

VisionClipは、ユーザーがOCRを開始したタイミングで `activeTab` と `scripting` を使い、現在のタブへ `content.js` を注入します。これにより、全ページへ常時content scriptを入れずに画像OCRと範囲OCRを実行します。

content scriptはOCRを自動実行しません。OCRはユーザーが右クリックメニュー、popup、またはショートカットから開始したときだけ実行されます。

## 今後の権限削減候補

一般公開前に、次を検討します。

- Chrome Web Store提出時の権限説明文をこの文書から作成する
