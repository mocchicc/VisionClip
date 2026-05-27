# VisionClip - Image OCR to Clipboard

VisionClipは、Chrome上の画像や画面の一部をOCRし、抽出したテキストをMacのクリップボードへコピーする小さなユーティリティです。

画像を右クリックして `この画像をOCRする` を押すと、OpenAIのマルチモーダルモデルで画像内の文字を読み取り、結果をそのまま貼り付けられる状態にします。Chrome右上のpopupから `範囲OCR` を押すと、現在見えているページ上でドラッグした範囲だけをOCRできます。

## 現在の位置づけ

これはMVP配布・α検証用のツールです。少人数の技術者が中身を理解したうえで試す用途を想定しています。

まだChrome Web Store配布、macOSアプリ化、署名・notarization、正式なinstaller化はしていません。非エンジニア向けの本番配布は、配布手順とセキュリティ整理をもう一段進めてからにしてください。

## できること

- Chromeの画像右クリックメニューから画像OCR
- Chrome popupから画面上の選択範囲だけをOCR
- OCR結果をMacのクリップボードへ自動コピー
- popupでAPIキー状態、現在の処理状態、最近5件の履歴を確認
- 履歴から抽出済みテキストを再コピー
- 設定画面からOpenAI APIキーをMacのKeychainに保存
- 設定画面からOCRモデルを選択

## 最初に必要なもの

- Mac
- Google Chrome
- OpenAI APIキー
- Xcode Command Line Tools、またはXcode

OpenAI APIキーは各ユーザーが自分のものを登録します。APIキーはMacのKeychainに保存され、Chrome拡張には保存されません。

## セットアップ

### 1. リポジトリを用意する

```sh
git clone git@github.com:mocchicc/VisionClip.git
cd VisionClip
```

すでにローカルにある場合は、そのプロジェクトフォルダをターミナルで開いてください。

### 2. Chromeに拡張を入れる

1. Chromeで `chrome://extensions` を開く
2. 右上の `Developer mode` をONにする
3. `Load unpacked` を押す
4. このリポジトリ内の `extension` フォルダを選ぶ
5. 追加された拡張の `ID` をコピーする

### 3. Mac側のNative Messagingホストを入れる

ターミナルで、このプロジェクトのフォルダを開いてから、次を実行します。

```sh
./scripts/install_native_host.sh <さっきコピーしたChrome拡張ID>
```

例:

```sh
./scripts/install_native_host.sh abcdefghijklmnopabcdefghijklmnop
```

install scriptはSwiftのrelease buildを行い、Native Messagingホストを次の場所へ配置します。

```text
~/Library/Application Support/VisionClip/
~/Library/Application Support/Google/Chrome/NativeMessagingHosts/
```

### 4. OpenAI APIキーを登録する

Chrome右上の拡張ボタンから `VisionClip - Image OCR to Clipboard` を開き、`設定` を押します。

設定画面でOpenAI APIキーを貼り付けて、`Keychainに保存` を押します。APIキーは保存時だけMac側ホストに渡され、MacのKeychainに保存されます。Chrome拡張には保存されません。

CLIで登録したい場合は、APIキーをコピーした状態で次を実行することもできます。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" set-key-clipboard
```

### 5. OCRモデルを選ぶ

同じ設定画面でOCRに使うモデルを選べます。

- `gpt-4.1-mini`
- `gpt-5.4-nano`
- `gpt-5.4-mini`

保存したモデルは、画像右クリックOCRと範囲OCRの両方に使われます。popupにも現在の選択モデルが表示されます。

## 使い方

### 画像を右クリックしてOCRする

1. Chromeで画像があるページを開く
2. 画像を右クリックする
3. `この画像をOCRする` を押す
4. 成功すると、読み取った文字がクリップボードに入る
5. 好きな場所に貼り付ける

### 画面の一部を選んでOCRする

1. Chrome右上の拡張ボタンから `VisionClip - Image OCR to Clipboard` を開く
2. `範囲OCR` を押す
3. ページ上でOCRしたい範囲をドラッグする
4. 成功すると、選択範囲の抽出テキストがクリップボードに入る

### 状態と履歴を見る

Chrome右上の拡張ボタンからpopupを開くと、次を確認できます。

- APIキーがセット済みか
- 現在選択されているモデル
- 直近の実行状態
- 最近5件のOCR履歴

成功した履歴には `コピー` ボタンが表示され、抽出済みテキストをもう一度クリップボードへコピーできます。

## うまく動かないとき

### 右クリックメニューやpopupが更新されない

Chrome拡張が読み込まれているか確認してください。

`chrome://extensions` を開いて、`VisionClip - Image OCR to Clipboard` がONになっていればOKです。コードを更新した後は、その画面で拡張のreloadボタンを押してください。

### APIキーが登録されているか確認したい

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" check-key
```

`OpenAI API key is set.` と出れば登録されています。

### もう一度APIキーを入れ直したい

Chrome右上の拡張ボタンから `VisionClip - Image OCR to Clipboard` を開き、`設定` を押して新しいAPIキーを保存してください。

### Native Messagingホストの接続を確認したい

popupで `確認失敗` や `Error when communicating with the native messaging host.` が出る場合は、Chrome拡張のIDを確認し、Native Messagingホストを入れ直してください。

```sh
./scripts/install_native_host.sh <Chrome拡張ID>
```

Chrome側で拡張をreloadするか、Chromeを再起動すると反映されることがあります。

### テストで画像URLを直接OCRしたい

画像URLは実在する画像を指定してください。`https://example.com/image.png` はダミーなので使えません。

Chrome上の画像で試すほうが簡単ですが、CLIで試す場合は、実在するPNG/JPEG/WEBP/GIFのURLを指定します。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" ocr-url "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Example.jpg/320px-Example.jpg"
```

成功すると、結果が表示され、同時にクリップボードにもコピーされます。

## アンインストール

```sh
./scripts/uninstall_native_host.sh
```

APIキーも消したい場合は、先に次を実行します。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" clear-key
```

## プライバシーと注意点

- OCR対象の画像、または選択範囲のスクリーンショットはOpenAI APIへ送信されます。
- OCR結果の最近5件はChromeのローカルストレージに保存されます。
- 機密文書、個人情報、公開できない画面で使う場合は、所属組織や利用環境のルールとOpenAI API利用方針を確認してください。
- Chrome拡張は画像取得と範囲選択のために広めの権限を使っています。
- 現時点ではMVP配布向けで、正式配布向けの署名済みinstallerではありません。

## 今の制限

- PNG、JPEG、WEBP、非アニメーションGIFが主な対象です。
- ログインが必要なページの画像は、画像の取り方によって失敗することがあります。
- `Load unpacked` を使う開発者向けインストール手順です。
- macOSの署名、notarization、installer化は未対応です。
- OCR履歴の削除ボタンや履歴保存OFF設定はまだありません。

## 技術メモ

- Chrome拡張は、右クリックメニューまたは範囲選択UIからMac側に画像情報を渡します。
- Mac側のSwiftプログラムがOpenAI Responses APIを呼び、結果をクリップボードへコピーします。
- Native Messagingホスト名は `com.mocchicc.visionclip` です。
- 互換性のため、旧ホスト名 `com.mocchicc.image_ocr` にもフォールバックします。
- デフォルトモデルは `gpt-4.1-mini` です。
