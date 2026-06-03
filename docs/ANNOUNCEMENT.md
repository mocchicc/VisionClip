# Announcement Drafts

VisionClipを公開するときのX投稿文と添付画像候補です。大げさな説明に寄せすぎず、普通に「使える小さな公開MVP」として伝わるトーンにしています。`LICENSE` を追加するまでは、OSS / open-source の表現は避けます。

## 画像候補

- `assets/social/x-modal-range-ocr.png`  
  モーダル上の範囲OCRが一番伝わりやすい第一候補です。
- `assets/social/x-workflow-keychain.png`  
  OCRからclipboard、Keychain管理までの流れを見せたいときに使います。
- `assets/social/x-product-hero.png`  
  プロダクト感を強めたい告知や英語投稿に向いています。
- `assets/store/promotional-small.png`  
  Chrome Web Store small promotional image向けの440x280画像です。

## 日本語

### 案1

VisionClipを公開しました。Web上の画像や画面の一部をOCRして、そのままMacのクリップボードへコピーするChrome拡張です。右クリック画像OCR、範囲OCR、APIキーはKeychain保存。まだ公開MVPだけど、日々の「画像の中の文字コピペできない問題」をかなり減らせるはず。

https://github.com/mocchicc/VisionClip

### 案2

画像の中に閉じ込められた文字を、もう手で打ち直したくないのでVisionClipを作りました。Chromeで画像を右クリック、または画面範囲を選ぶだけでOCRしてコピー。自分のOpenAI APIキーを使うBYOK運用で、キーはmacOS Keychainに保存します。まずは公開MVPとして育てます。

https://github.com/mocchicc/VisionClip

### 案3

VisionClip、かなり小さい道具だけど便利です。Webページの画像、スクショっぽいUI、モーダル内の画像などから範囲OCRして、結果を即クリップボードへ。Chrome拡張 + macOS Native Messaging + OpenAI API。まだ手動セットアップ前提のMVPなので、触れる人から試してもらえると嬉しい。

https://github.com/mocchicc/VisionClip

### 案4

OpenAI APIを使った個人用OCRツール、VisionClipを公開しました。画像や選択範囲の文字をコピーできる形に変換するChrome拡張です。Chrome Web Store配布前のMVPなので導入はまだ少し手作業。でも、権限を絞って、キーはKeychainに置く形で作っています。

https://github.com/mocchicc/VisionClip

## English

### Draft 1

I released VisionClip: a small public MVP Chrome extension for macOS that OCRs images or selected screen regions and copies the text to your clipboard. BYOK with an OpenAI API key in macOS Keychain. Manual setup for now.

https://github.com/mocchicc/VisionClip

### Draft 2

Text trapped inside images is a tiny daily tax, so I built VisionClip. Right-click an image or select a screen region, run OCR, and get the result on your macOS clipboard. It uses your own OpenAI API key and keeps it in Keychain. Public MVP:

https://github.com/mocchicc/VisionClip

### Draft 3

VisionClip is my small attempt at making OCR feel like copy/paste. Chrome extension on the front, macOS Native Messaging host underneath, OpenAI API for OCR, Keychain for secrets. Still an MVP, but already useful for web images and modal screenshots.

https://github.com/mocchicc/VisionClip

### Draft 4

Shipping a public MVP of VisionClip today. It lets you OCR web images and arbitrary screen regions from Chrome, then copies the text to macOS clipboard. No store release yet, no installer yet, but the core workflow is ready to try.

https://github.com/mocchicc/VisionClip

## おすすめ

- 日本語: 案2 + `assets/social/x-modal-range-ocr.png`
- 英語: Draft 2 + `assets/social/x-product-hero.png`
