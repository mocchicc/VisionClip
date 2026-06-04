# License Decision

VisionClipを一般リリースへ近づける前に、配布・再利用・改変の条件を決めるためのメモです。現在はMIT Licenseを採用しています。

## 現在の状態

- ルートに `LICENSE` を追加済みです。
- READMEのライセンス欄と告知文はMIT License採用に合わせています。
- broader releaseでも、現在のMIT Licenseを前提に配布・再利用・改変の条件を説明します。

## 採用ライセンス

### MIT License

小さな開発者向けツールでよく使われる、短く扱いやすい許諾型の選択肢です。再利用しやすい一方で、特許許諾の明記は薄めです。

向いている場合:

- 使いやすさと採用しやすさを優先したい
- 個人開発の小さなユーティリティとして広く試してもらいたい
- 依存先や配布先から特に強い条件を求められていない

VisionClipは、Chrome拡張、macOS Native Messaging host、OpenAI APIキーのBYOK運用、Keychain保存を含む小さなユーティリティです。外部応募や広い告知で「誰でも試し、必要なら手元で直せる」ことを見せやすくするため、短く扱いやすいMIT Licenseを採用します。

## 検討した候補

### Apache-2.0

許諾型ですが、特許許諾やNOTICEの扱いがMITより明確な選択肢です。企業利用や長めの運用を意識するなら候補になります。

向いている場合:

- 特許許諾を明示したい
- 企業や組織内で試される可能性を少し意識したい
- 長めのライセンス文でも問題ない

### ライセンス未決定のまま公開MVPを継続

GitHubでコードを見られる状態にはできますが、第三者の再利用・改変・再配布を積極的に許す状態ではありません。一般リリースや外部応募で「誰でも使える公開プロジェクト」として見せたい場合は弱いです。

向いている場合:

- まだ配布条件を決めたくない
- 個人利用や限定的な検証に留めたい
- Store公開や広い告知の前に、機能・配布UXをもう少し固めたい

## 更新済みのもの

1. ルートに `LICENSE` を追加済み。
2. READMEの「ライセンス」欄を、MIT Licenseと `LICENSE` へのリンクに更新済み。
3. `docs/ANNOUNCEMENT.md` の冒頭注意を、MIT License採用に合わせて更新済み。
4. `docs/RELEASE_CHECKLIST.md` のライセンス項目を完了扱いにできる状態へ更新済み。
5. `./scripts/check.sh`、`./scripts/package_release.sh`、`node scripts/check_release_package.js`、`node scripts/check_release_readiness.js --strict` で確認します。
