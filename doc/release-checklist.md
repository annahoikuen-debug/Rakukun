# リリース前チェックリスト

対象: `Rakukun/web`（Next.js BFF/フロント）+ Gophish 配信エンジン
適用: 本番デプロイ直前・ステージング運用開始前に全項目を確認する。

---

## 1. 自動ゲート（CI が緑であること）

- [ ] `npm run typecheck` — TS エラー 0
- [ ] `npm run lint` — 警告 0
- [ ] `npm run test:coverage` — 全テスト通過、カバレッジ下限以上
- [ ] `npm run build` — プロダクションビルド成功
- [ ] CI ワークフロー（`.github/workflows/ci.yml`）が PR で緑
- [ ] `npm audit --audit-level=high` で Critical/High が解消済み（またはリスク受容を明記）

## 2. 環境変数・シークレット

- [ ] `AUTH_SECRET`（NextAuth）— 本番専用の乱数値
- [ ] `AUTH_URL` — 本番ドメイン
- [ ] `GOPHISH_KEY_ENCRYPTION_SECRET` — 32 バイト（Gophish API キーの AES-GCM 用）
- [ ] `DATABASE_URL` — 本番 DB
- [ ] `REDIS_URL` — Upstash（レート制限用）
- [ ] `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — 本番キー
- [ ] SES/SNS 用: `SES_SKIP_SIGNATURE_VERIFY=false`、リージョン等
- [ ] 秘密情報を `.env` にコミットしていないこと（`.gitignore` 確認）

## 3. インフラ・公開範囲

- [ ] Gophish admin ポート 3333 が**外部から到達不可**（内部ネットワーク限定）
- [ ] web → gophish の通信経路を確認（開発: http 平文を許容 / 本番: TLS 化を検討 — Step 8）
- [ ] DB・Redis のバックアップとリストア手順が文書化済み
- [ ] HTTPS リダイレクト・HSTS が有効（`next.config.ts` のヘッダー）

## 4. セキュリティ設定の確認

- [ ] SES/SNS 署名検証が有効（`SES_SKIP_SIGNATURE_VERIFY` が false）
- [ ] Stripe webhook が署名検証あり、**冪等化**（`ProcessedStripeEvent`）が有効
- [ ] プラン上限チェックが Serializable トランザクションで担保
- [ ] ドメイン制限（フリー送信拒否・テナントドメイン制約）が有効
- [ ] `capture_credentials` が `false` 固定（パスワード収集禁止）になっている
- [ ] 監査ログ（`auditLog`）が主要な mutate 系で出力されている

## 5. 主要フローの目視/手動確認

- [ ] サインアップ → オンボーディング → CSV アップロード
- [ ] グループ / テンプレート / 送信プロファイル作成
- [ ] キャンペーン作成 → 配信 → `/training/[rid]` でクリック・クイズ記録
- [ ] レポート PDF ダウンロード（`application/pdf` で 200）
- [ ] ダッシュボード集計（クリック率・レポート率・提出率）
- [ ] 退会 / 匿名化エンドポイント（`/api/tenants/[id]/anonymize`）

## 6. 可観測性・障害対応

- [ ] `/api/health` が DB / Redis / Gophish の状態を返す
- [ ] 構造化ログ（structured logger）が有効
- [ ] エラーエンドポイント（`/api/errors`）が動作
- [ ] 監控アラート（未応答・5xx 増加）を設定

## 7. セキュリティ強化（security-hardening-plan 対応）

- [ ] MFA が OWNER/ADMIN に強制されている（`/mfa-required` ゲート）
- [ ] `GOPHISH_KEY_ENCRYPTION_SECRET` が 32 文字以上、V2 鍵が設定済み（ローテーション時）
- [ ] 監査ログの high-severity イベントが専用経路に出力されている
- [ ] 依存監査が High 0 件（`npm audit --audit-level=high`）
- [ ] `x-forwarded-for` 末尾ホップ信頼が本番プロキシ構成と一致（`TRUSTED_PROXY_COUNT`）
- [ ] CSP 違反が主要画面でゼロ（E2E `security.spec.ts`）

## 7b. 依存脆弱性 トリアージ（`npm audit`）

現状 `npm audit`: **critical 2 / high 4 / moderate 20**。リスク別に分類:

| 対象 | 重要度 | 種別 | 対応方針 |
|------|--------|------|----------|
| `zod` <4.6.7（メモリ枯渇 GHSA-mrhx-c7xc-m3w5） | high | **runtime** | 配列 `.max()` で上限を付与済み（`validators.ts`）。恒久対応は zod 4 移行（breaking）— 次フェーズ |
| `prisma` deepmerge-ts（stack exhaustion） | high | CLI/dev | ランタイム（`@prisma/client`）非影響。prisma 7 移行（breaking）で解消 — 次フェーズ |
| `vitest` tinypool / @vitest/mocker | critical | test tooling | 開発のみ。vitest 5 移行（breaking）— 次フェーズ |
| eslint / minimatch / glob（transitive） | moderate | dev tooling | ランタイム非影響。受容 |

- **runtime での主リスクは `zod` のみ**（入力によるメモリ枯渇）。上限付与で実効低減。
- 残りは開発/テスト/CLI ツール由来で本番ランタイムに載らない。破壊的移行（zod4 / prisma7 / vitest5）は別フェーズで段階導入を計画。
- `npm audit fix --force` は**破壊的**なので安易に実行しないこと。

## 8. ステージング・ロールバック

- [ ] ステージング環境で上記 1–6 をリハーサル済み
- [ ] DB マイグレーション（`prisma migrate deploy`）手順を文書化・実行済み
- [ ] ロールバック手順（旧イメージ / マイグレーション巻き戻し）が用意されている
- [ ] 機能フラグ / 段階リリースの切り替え点が明文化されている

---

## 追加の回帰防止ループ

1. リリース後にバグを発見したら、まず**回帰テストを追加**する。
2. 次に **CI ゲート**（type / lint / coverage / E2E）を強化する。
3. 過去バグは `lib/__tests__/regression.test.ts` に永続化する。
