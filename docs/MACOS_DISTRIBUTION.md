# macOS Native Host Distribution

VisionClipのmacOS Native Messagingホストを一般配布へ近づけるためのpkg、署名、notarizationメモです。現時点のrelease artifactは、GitHubから手動で取得してインストールするMVP配布です。pkg生成はできますが、Developer ID署名・notarization済み配布はまだ行っていません。

## 現在のartifact

`./scripts/package_release.sh` は次を作成します。

- Chrome拡張zip
- macOS native host zip
- macOS native host pkg
- SHA-256 checksum

native host zipには、build済み `image-ocr-host`、`install_native_host.sh`、`uninstall_native_host.sh`、README、CHANGELOG、support/security/contributing docs、`docs/`、`samples/`、告知用の `assets/social/` と `assets/store/` が入ります。

native host pkgは、system-wide install用のpayloadです。

- binary: `/Library/Application Support/VisionClip/image-ocr-host`
- wrapper: `/Library/Application Support/VisionClip/visionclip-native-host`
- manifest: `/Library/Google/Chrome/NativeMessagingHosts/com.mocchicc.visionclip.json`
- legacy manifest: `/Library/Google/Chrome/NativeMessagingHosts/com.mocchicc.image_ocr.json`

pkgのallowed originsには、`VISIONCLIP_RELEASE_EXTENSION_IDS`、または未指定時の既定Store IDを使います。複数IDを入れる場合はスペース区切りで指定します。

```sh
VISIONCLIP_RELEASE_EXTENSION_IDS="bficjnhffakpmfcjbjjcanabccfldfhk aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" ./scripts/package_release.sh
```

pkgだけを作る場合:

```sh
./scripts/package_native_host_pkg.sh bficjnhffakpmfcjbjjcanabccfldfhk
./scripts/check_native_host_pkg.sh bficjnhffakpmfcjbjjcanabccfldfhk
```

`check_native_host_pkg.sh` はpayloadのファイル構成に加えて、system-wide manifestの `allowed_origins` に指定したChrome拡張IDが入っていることも確認します。

## 任意のcodesignとpkg署名

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

pkg自体を署名する場合は、Developer ID Installer証明書を `VISIONCLIP_PKG_SIGN_IDENTITY` に指定します。

```sh
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
VISIONCLIP_PKG_SIGN_IDENTITY="Developer ID Installer: Example Name (TEAMID)" \
./scripts/package_release.sh
```

証明書と環境変数を入れた後、pkg作成前にpreflightを実行できます。

```sh
./scripts/check_release_preflight.sh --macos-only
```

## notarizationの流れ

notarizationにはApple Developer Program、Developer ID証明書、notarytool用の認証情報が必要です。

例:

```sh
xcrun notarytool store-credentials visionclip-notary
VISIONCLIP_CODESIGN_IDENTITY="Developer ID Application: Example Name (TEAMID)" \
VISIONCLIP_PKG_SIGN_IDENTITY="Developer ID Installer: Example Name (TEAMID)" \
VISIONCLIP_NOTARY_PROFILE="visionclip-notary" \
./scripts/package_release.sh
```

`VISIONCLIP_NOTARY_PROFILE` を指定すると、pkg作成後に `xcrun notarytool submit --wait` と `xcrun stapler staple` を実行します。zipで配布する場合、notarization ticketをzip自体へstapleする運用ではありません。正式配布では、notarized pkgまたはdmgにするか、Gatekeeperでの実際の評価を確認したうえで配布形式を決めてください。

notarytool profileの認証まで確認する場合は、`--online` を付けます。

```sh
./scripts/check_release_preflight.sh --macos-only --online
```

## 検証コマンド

署名済みbinary:

```sh
codesign --display --verbose=4 path/to/image-ocr-host
codesign --verify --strict --verbose=2 path/to/image-ocr-host
```

Gatekeeper評価:

```sh
spctl --assess --type execute --verbose=4 path/to/image-ocr-host
spctl --assess --type install --verbose=4 dist/visionclip-native-host-macos-<arch>-v<version>.pkg
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
- pkg内のChrome extension IDがStore IDと一致していることを確認する
- Gatekeeper評価、Native Messaging接続、uninstallを実機で確認する
