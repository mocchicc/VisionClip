# VisionClip - Image OCR to Clipboard

VisionClipは、Chrome上の画像や画面の一部をOCRし、抽出したテキストをMacのクリップボードへコピーする小さなユーティリティです。

画像を右クリックして `この画像をOCRする` を押すと、OpenAIのマルチモーダルモデルで画像内の文字を読み取り、結果をそのまま貼り付けられる状態にします。Chrome右上のpopupから `範囲OCR` を押すと、現在見えているページ上でドラッグした範囲だけをOCRできます。

## OpenAI APIを使う理由

OpenAIのAPIキーを活用することで、VisionClipはブラウザ上で画像として閉じ込められている文字を、コピー・検索・翻訳・記録に使えるテキストへ戻します。スクリーンショット、モーダル内の画像、ログイン後の業務画面、レシートやラベルのような細かい文字も、ユーザー自身の操作で必要な範囲だけOCRできます。

APIキーは各ユーザーのMacのKeychainに保存し、Chrome拡張には保存しません。OpenAI APIクレジットを活用できる場合は、多言語・低解像度・モーダル表示・UIスクリーンショットなどのサンプルを増やし、モデル/プロンプト比較、token usage確認、リリース前のOCR回帰チェックに使うことで、実利用で壊れにくいOSSとして育てていきます。

## 現在の位置づけ

VisionClipは公開MVPです。Chrome拡張を手動で読み込み、Mac側のNative Messagingホストをインストールできる人が、個人利用や小さなチーム内検証で使うことを想定しています。

現時点の配布はGitHubからの手動セットアップです。Chrome Web Store配布、macOSアプリ化、署名・notarization、正式installer化は未対応です。一般配布へ向けて残っている作業は [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) にまとめています。

## できること

- Chromeの画像右クリックメニューから画像OCR
- Chrome popupから画面上の選択範囲だけをOCR
- OCR結果をMacのクリップボードへ自動コピー
- popupでAPIキー状態、現在の処理状態、最近5件の履歴とtoken usageを確認
- 履歴から抽出済みテキストを再コピー
- OCR履歴の削除と履歴保存OFF
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

モーダルやpopup内の画像を読み取るときは、拡張popupを開かずに `Option+Shift+O`（Chrome表記では `Alt+Shift+O`）で範囲OCRを開始するか、ページ上で右クリックして `この画面の範囲をOCRする` を選ぶと、対象モーダルが閉じにくくなります。

### 状態と履歴を見る

Chrome右上の拡張ボタンからpopupを開くと、次を確認できます。

- APIキーがセット済みか
- 現在選択されているモデル
- 直近の実行状態
- 最近5件のOCR履歴

成功した履歴には `コピー` ボタンが表示され、抽出済みテキストをもう一度クリップボードへコピーできます。

履歴を消したい場合はpopupの `履歴削除` を押してください。履歴を保存したくない場合は設定画面の `OCR履歴をpopupに保存する` をOFFにできます。

## OCRサンプル画像

動作確認用のサンプル画像を `samples/` に置いています。通常のChromeページ上で画像を開いた状態で、右クリックOCRや範囲OCRを試すためのテスト素材です。日本語と英語が混ざったUI、レシート、ラベル、ホワイトボード風の画像です。

- `samples/ocr-sample-01-dashboard.png`
- `samples/ocr-sample-02-receipts-labels.png`
- `samples/ocr-sample-03-whiteboard-notes.png`

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
- OCR履歴保存がONの場合、OCR結果の最近5件はChromeのローカルストレージに保存されます。履歴はpopupから削除でき、設定画面で新規保存をOFFにできます。
- 機密文書、個人情報、公開できない画面で使う場合は、所属組織や利用環境のルールとOpenAI API利用方針を確認してください。
- Chrome拡張は、ユーザーがOCRを開始したときだけ現在のタブへ一時的にアクセスします。
- 現時点の配布はGitHubからの手動セットアップで、署名済みinstallerではありません。

詳しいデータ取り扱いは [docs/PRIVACY.md](docs/PRIVACY.md)、Chrome拡張権限の理由は [docs/CHROME_PERMISSIONS.md](docs/CHROME_PERMISSIONS.md) を参照してください。

## 今の制限

- PNG、JPEG、WEBP、非アニメーションGIFが主な対象です。
- ログインが必要なページの画像は、画像の取り方によって失敗することがあります。
- `Load unpacked` を使う開発者向けインストール手順です。
- macOSの署名、notarization、installer化は未対応です。

## 技術メモ

- Chrome拡張は、右クリックメニューまたは範囲選択UIからMac側に画像情報を渡します。
- Mac側のSwiftプログラムがOpenAI Responses APIを呼び、結果をクリップボードへコピーします。
- Native Messagingの設定は `scripts/install_native_host.sh` が作成します。
- デフォルトモデルは `gpt-5.4-nano` です。

## 開発時の確認

変更後は次を実行すると、Chrome拡張のJS構文、manifest JSON、shell script構文、Swift release build、空白差分をまとめて確認できます。

```sh
./scripts/check.sh
```

## リリース用artifact作成

Chrome拡張zip、macOS Native Messagingホストzip、SHA-256 checksumを `dist/` に作成できます。

```sh
./scripts/package_release.sh
```

作成される主なファイル:

- `dist/visionclip-extension-v<version>.zip`
- `dist/visionclip-native-host-macos-<arch>-v<version>.zip`
- `dist/checksums-v<version>.txt`

native host zipには、build済み `image-ocr-host` と、配布zip内から実行する `install_native_host.sh` / `uninstall_native_host.sh` が含まれます。現時点では署名・notarization済みinstallerではありません。

リリース前の確認項目は [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) にまとめています。
