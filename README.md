# VisionClip - Image OCR to Clipboard

VisionClipは、Chromeで画像を右クリックして、画像の中の文字を読み取り、結果をMacのクリップボードにコピーするツールです。

たとえば、ブラウザ上の画像を右クリックして「この画像をOCRする」を押すと、数秒後に読み取った文字がコピーされた状態になります。そのままメモ帳やSlackなどに貼り付けできます。

## 最初に必要なもの

- Mac
- Chrome
- OpenAI APIキー
- Xcode Command Line Tools、またはXcode

OpenAI APIキーは、各ユーザーが自分のものを登録します。APIキーはMacのKeychainに保存され、Chrome拡張には保存されません。

## セットアップ

### 1. Chromeに拡張を入れる

1. Chromeで `chrome://extensions` を開く
2. 右上の `Developer mode` をONにする
3. `Load unpacked` を押す
4. このフォルダの中にある `extension` フォルダを選ぶ
5. 追加された拡張の `ID` をコピーする

### 2. Mac側の受け口を入れる

ターミナルで、このプロジェクトのフォルダを開いてから、次を実行します。

```sh
cd "/Users/mocchicc/Documents/VisionClip"
./scripts/install_native_host.sh <さっきコピーしたChrome拡張ID>
```

例:

```sh
./scripts/install_native_host.sh abcdefghijklmnopabcdefghijklmnop
```

### 3. OpenAI APIキーを登録する

Chrome右上の拡張ボタンから `VisionClip - Image OCR to Clipboard` を開き、`設定` を押します。

設定画面でOpenAI APIキーを貼り付けて、`Keychainに保存` を押します。APIキーは保存時だけMac側ホストに渡され、MacのKeychainに保存されます。Chrome拡張には保存されません。

同じ設定画面でOCRに使うモデルを選べます。`gpt-4.1-mini`、`gpt-5.4-nano`、`gpt-5.4-mini` から選択できます。

CLIで登録したい場合は、APIキーをコピーした状態で次を実行することもできます。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" set-key-clipboard
```

## 使い方

1. Chromeで画像があるページを開く
2. 画像を右クリックする
3. `この画像をOCRする` を押す
4. 成功すると、読み取った文字がクリップボードに入る
5. 好きな場所に貼り付ける

Chrome右上の拡張ボタンから `VisionClip - Image OCR to Clipboard` を開くと、APIキーの状態、直近の実行状態、最近5件の履歴を確認できます。`範囲OCR` を押すと、現在見えている画面上でドラッグした範囲だけをOCRできます。

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

## 今の制限

- PNG、JPEG、WEBP、非アニメーションGIFが主な対象です。
- ログインが必要なページの画像は、画像の取り方によって失敗することがあります。
- まだメニューバーアプリ、設定画面、モデル切り替えUIはありません。

## 技術メモ

- Chrome拡張は、右クリックメニューを出してMac側に画像情報を渡します。
- Mac側のSwiftプログラムがOpenAI APIを呼び、結果をクリップボードへコピーします。
- デフォルトモデルは `gpt-4.1-mini` です。
