# OCR sample images

VisionClipのOCR動作確認用サンプル画像です。日本語と英語がだいたい半々になるようにしつつ、読み順、小さい文字、表、ラベル、金額、日付、低コントラスト、手書き風フォントを混ぜています。

## Files

- `ocr-sample-01-dashboard.png` - アプリ画面・表・ステータスカード・日英混在UI
- `ocr-sample-02-receipts-labels.png` - レシート、配送ラベル、注意書き、小さい文字
- `ocr-sample-03-whiteboard-notes.png` - ホワイトボード、付箋、手書き風、低コントラスト

## Suggested checks

- 日本語と英語の読み順が崩れないか
- 金額、日付、ID、記号を正しく拾えるか
- 小さい文字や低コントラストの文字がどこまで読めるか
- 範囲OCRで一部だけ選択したときに期待通り抽出されるか
