# VisionClip Privacy Notice

VisionClipは、Chrome上の画像や画面の一部をOCRし、抽出したテキストをMacのクリップボードへコピーするユーティリティです。

この文書は、VisionClipが扱うデータ、保存場所、外部送信先、ユーザーが操作できる削除・停止方法を説明します。

## 送信されるデータ

OCRを実行すると、次のいずれかがOpenAI APIへ送信されます。

- 右クリックOCRの対象画像、または対象画像URL
- 範囲OCRで選択した画面領域のスクリーンショット
- OCR指示用の固定プロンプト
- 選択中のOCRモデル名

送信はユーザーがOCRを実行したときだけ行われます。VisionClipはバックグラウンドでページ全体を継続的に送信しません。

## 保存されるデータ

### macOS Keychain

OpenAI APIキーは、macOS Keychainに保存されます。Chrome拡張のlocal storageには保存されません。

KeychainからAPIキーを削除するには、native hostをインストールした後に次を実行します。

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" clear-key
```

### Chrome local storage

Chrome拡張は、次の情報をChrome local storageに保存します。

- 選択中のOCRモデル
- OCR履歴保存のON/OFF
- 直近の処理状態
- OCR履歴保存がONの場合、最近5件のOCR結果プレビューとtoken usage

OCR履歴はpopupの `履歴削除` で削除できます。新しい履歴を保存したくない場合は、設定画面の `OCR履歴をpopupに保存する` をOFFにしてください。

## 保存されないデータ

VisionClipは次を保存しません。

- ユーザーのOpenAI APIキーをChrome拡張側に保存すること
- 独自サーバーへのOCR画像やOCR結果の送信
- analytics、広告ID、行動トラッキング
- OCR履歴5件を超える長期履歴

## 外部サービス

VisionClipはOCR処理にOpenAI APIを利用します。OpenAI APIキー、送信画像、OCR結果の取り扱いは、ユーザーが利用するOpenAI APIの契約・ポリシーにも従います。

OpenAI APIへの送信はHTTPSで行います。Chrome拡張とmacOS Native Messagingホストの間の通信は同じMac上のローカル通信です。

## Chrome Web Store Limited Use Statement

VisionClipが扱うユーザーデータは、ユーザーが明示的に開始したOCRとクリップボードコピー機能を提供する目的に限定して使用します。

- OCR対象画像、選択範囲スクリーンショット、OCR結果、APIキーを広告、行動ターゲティング、信用判断、販売、またはVisionClipの単一目的と関係しない用途に使用しません。
- VisionClipの開発者は、独自サーバーでOCR対象画像、OCR結果、APIキー、閲覧履歴を収集・保存しません。
- VisionClipの開発者は、OCR対象画像やOCR結果を人間が読む運用を行いません。サポート時にユーザーが任意で共有した情報だけを、問い合わせ対応に必要な範囲で確認します。
- OCRのためにOpenAI APIへ画像または選択範囲スクリーンショットを送信します。この送信は、ユーザーが開始したOCR機能を提供するために必要な範囲に限定します。

## 権限の考え方

VisionClipは、画像右クリックOCR、画面範囲OCR、Native Messaging、クリップボードコピーのためにChrome拡張権限を使用します。権限ごとの理由は [CHROME_PERMISSIONS.md](./CHROME_PERMISSIONS.md) を参照してください。

## アンインストール時

native hostを削除するには次を実行します。

```sh
./scripts/uninstall_native_host.sh
```

APIキーも削除したい場合は、アンインストール前に `clear-key` を実行してください。
