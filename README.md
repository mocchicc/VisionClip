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

次を実行します。

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" set-key
```

`OpenAI API key:` と表示されたら、自分のOpenAI APIキーを貼り付けてEnterを押します。入力中は画面に表示されませんが、それで正常です。

## 使い方

1. Chromeで画像があるページを開く
2. 画像を右クリックする
3. `この画像をOCRする` を押す
4. 成功すると、読み取った文字がクリップボードに入る
5. 好きな場所に貼り付ける

## うまく動かないとき

### 右クリックメニューが出ない

Chrome拡張が読み込まれているか確認してください。

`chrome://extensions` を開いて、`VisionClip - Image OCR to Clipboard` がONになっていればOKです。

### APIキーが登録されているか確認したい

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" check-key
```

`OpenAI API key is set.` と出れば登録されています。

### もう一度APIキーを入れ直したい

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" set-key
```

同じコマンドで上書きできます。

### テストで画像URLを直接OCRしたい

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" ocr-url "https://example.com/image.png"
```

成功すると、結果が表示され、同時にクリップボードにもコピーされます。

## アンインストール

```sh
./scripts/uninstall_native_host.sh
```

APIキーも消したい場合は、先に次を実行します。

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" clear-key
```

## 今の制限

- PNG、JPEG、WEBP、非アニメーションGIFが主な対象です。
- ログインが必要なページの画像は、画像の取り方によって失敗することがあります。
- まだメニューバーアプリ、履歴、設定画面、モデル切り替えUIはありません。

## 技術メモ

- Chrome拡張は、右クリックメニューを出してMac側に画像情報を渡します。
- Mac側のSwiftプログラムがOpenAI APIを呼び、結果をクリップボードへコピーします。
- デフォルトモデルは `gpt-4.1-mini` です。
