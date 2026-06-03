# macOS Native Host Distribution

VisionClipのmacOS Native Messagingホストを一般配布へ近づけるための署名・notarizationメモです。現時点のrelease artifactは、GitHubから手動で取得してインストールするMVP配布です。正式なmacOSアプリ、pkg installer、notarized installerではありません。

## 現在のartifact

`./scripts/package_release.sh` は次を作成します。

- Chrome拡張zip
- macOS native host zip
- SHA-256 checksum

native host zipには、build済み `image-ocr-host`、`install_native_host.sh`、`uninstall_native_host.sh`、README、support/security/contributing docs、`docs/` が入ります。

## 任意のcodesign

Developer ID Application証明書がKeychainにある場合は、次の環境変数を指定してpackage scriptを実行すると、zipへ入れる前の `image-ocr-host` に署名します。

```sh
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" ./scripts/package_release.sh
```

script内では次を行います。

```sh
codesign --force --timestamp --options runtime --sign "$VISIONCLIP_CODESIGN_IDENTITY" image-ocr-host
codesign --verify --strict --verbose=2 image-ocr-host
```

`VISIONCLIP_CODESIGN_IDENTITY` を指定しない場合は、今まで通りunsigned artifactを作成します。

## notarizationの流れ

notarizationにはApple Developer Program、Developer ID証明書、notarytool用の認証情報が必要です。

例:

```sh
xcrun notarytool store-credentials visionclip-notary
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" ./scripts/package_release.sh
xcrun notarytool submit dist/visionclip-native-host-macos-<arch>-v<version>.zip --keychain-profile visionclip-notary --wait
```

zipで配布する場合、notarization ticketをzip自体へstapleする運用ではありません。正式配布では、notarized pkgまたはdmgにするか、Gatekeeperでの実際の評価を確認したうえで配布形式を決めてください。

## 検証コマンド

署名済みbinary:

```sh
codesign --display --verbose=4 path/to/image-ocr-host
codesign --verify --strict --verbose=2 path/to/image-ocr-host
```

Gatekeeper評価:

```sh
spctl --assess --type execute --verbose=4 path/to/image-ocr-host
```

Native Messaging install後:

```sh
"$HOME/Library/Application Support/VisionClip/image-ocr-host" version
"$HOME/Library/Application Support/VisionClip/image-ocr-host" diagnose <Chrome拡張ID>
"$HOME/Library/Application Support/VisionClip/image-ocr-host" check-key
```

## 正式配布前の残タスク

- Developer ID Application証明書で署名したartifactを作る
- notarizationの提出と結果確認を行う
- pkgまたはdmg installerを作るか、zip配布を続けるか決める
- installer内でChrome extension IDをどう扱うか決める
- Gatekeeper評価、Native Messaging接続、uninstallを実機で確認する
