# Image OCR to Clipboard

Chromeで画像を右クリックして「この画像をOCRする」を押すと、OpenAIのマルチモーダルモデルで画像内テキストを抽出し、結果をmacOSのクリップボードへコピーする小さなMac向けユーティリティです。

このMVPは自分用/社内検証用です。APIキーは各ユーザーが自分で登録し、macOS Keychainに保存します。Chrome拡張にはAPIキーを保存しません。

## 構成

- `extension/`: Chrome拡張。右クリックメニューとNative Messaging呼び出しだけを担当します。
- `native-host/`: Swift製のNative Messagingホスト。画像取得、OpenAI API呼び出し、Keychain、クリップボードコピーを担当します。
- `scripts/`: Chrome Native Messagingホストのインストール/削除スクリプトです。

## セットアップ

### 1. Chrome拡張を読み込む

1. Chromeで `chrome://extensions` を開く
2. Developer modeをONにする
3. Load unpackedを押す
4. このリポジトリの `extension/` を選ぶ
5. 表示された拡張IDをコピーする

### 2. Native Messagingホストをインストールする

```sh
./scripts/install_native_host.sh <chrome-extension-id>
```

インストール先:

- ホストバイナリ: `~/Library/Application Support/ImageOCRToClipboard/image-ocr-host`
- Chromeホスト定義: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.mocchicc.image_ocr.json`

### 3. OpenAI APIキーを登録する

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" set-key
```

キーはKeychainの `com.mocchicc.image_ocr.openai` に保存されます。

### 4. 使う

Chromeで画像を右クリックし、「この画像をOCRする」を選びます。成功すると抽出テキストがクリップボードに入ります。

## CLIで動作確認

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" check-key
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" ocr-url "https://example.com/image.png"
```

`ocr-url` も成功時に結果をクリップボードへコピーします。

## モデル

デフォルトは `gpt-4.1-mini` です。Native Messagingのリクエストに `model` を含めると差し替えできます。

## 制限

- 対応画像はOpenAI APIの画像入力に合わせて、主にPNG/JPEG/WEBP/非アニメーションGIFです。
- ログイン必須サイトやBlob URLの画像は、Chrome拡張側で取得できた場合は処理できます。取得できない場合はOCRできません。
- このMVPには履歴、メニューバーUI、モデル選択UI、チーム配布用の署名/ notarization はまだありません。

## アンインストール

```sh
./scripts/uninstall_native_host.sh
```

Keychainに保存したAPIキーも消す場合:

```sh
"$HOME/Library/Application Support/ImageOCRToClipboard/image-ocr-host" clear-key
```

