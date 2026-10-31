# コードレビュー指摘対応 実装計画書

対象: `Rakukun/web`（Next.js BFF/フロント）＋ Gophish 配信エンジン連携
目的: レビューで挙がった Medium/Low 指摘を段階的に解消し、**リグレッションを仕組みで防止**する。
方針: 1 ステップ = 1 つの検証可能な単位。各ステップで「実装 → 型/リント/テスト → 回帰テスト追加」を完結させる。

---

## 0. 指摘とステップ対応表

| 指摘 | 重要度 | 対応ステップ |
|------|--------|--------------|
| 削除系アクションのテナント所有権チェック不統一 | Medium | Step 2 |
| `/api/training/*` の rid 推測・列挙リスク | Medium | Step 4 |
| Gophish 管理 API が http 平文 | Medium | Step 8 |
| 未使用の `gophish-client.ts` 重複クライアント | Low | Step 3 |
| `any` 濫用・型安全の弱さ | Low | Step 3, 10 |
| Stripe webhook 冪等性なし | Low | Step 5 |
| `upload-csv` の N+1 | Low | Step 6 |
| CSP `unsafe-inline` / `dangerouslySetInnerHTML` | Low | Step 7 |
| 回帰防止のテスト基盤 | 横断 | Step 1, 9, 11, 12 |

---

## 1. 前提条件とベースライン固定

**目的**: 以降の変更前後で同じ検証を再現可能にし、回帰を検知できる土台を作る。

**対象ファイル**
- `web/tsconfig.json`
- `web/package.json`（scripts）
- `.github/workflows/*`（CI があれば）
- `web/vitest.config.ts` / `vitest.setup.ts`

**実装内容**
1. `npm run check` を追加: `tsc --noEmit && eslint && vitest run` を順に実行。
2. 現状の緑（ビルド成功・テスト 22 passed・リント 0 警告）を「ベースライン」として記録。
3. カバレッジ取得を導入（`vitest --coverage`、`@vitest/coverage-v8`）し、現状値を基準线とする。
4. 変更対象の主要モジュール（`lib/gophish.ts`, `lib/rate-limit.ts`, `app/actions.ts`, `lib/report-aggregator.ts`）のカバレッジを特に監視対象に指定。

**受け入れ基準**
- `npm run check` がローカルで通る。
- カバレッジレポートが生成され、現状の行カバレッジが記録される。

**回帰防止**
- 全ステップの完了条件に `npm run check` 通過を組み込む（Step 12 の CI で強制）。

---

## 2. 削除系アクションのテナント所有権チェック統一

**目的**: template/page/group/smtp の削除が Gophish の per-user フィルタに単独依存している状態を解消し、DB 側でも所有権を検証（campaign と揃える）。

**対象ファイル**
- `web/app/actions.ts`（`deleteTemplateAction`, `deletePageAction`, `deleteGroupAction`, `deleteSmtpAction`）
- `web/prisma/schema.prisma`（リソース ID のテナント紐付けが要検討）

**実装内容**
1. 現状確認: Gophish リソース ID（template/page/group/smtp）は Prisma に保存されていない。よって完全な DB 検証には ID マッピングの保存が必要。
2. 方針 A（推奨・軽量）: 各 delete の直前に `ctx()` で org を解決済みの client を使い、**削除対象 ID が現 org の一覧に存在するか**を `getXxx()` で照合してから削除。存在しなければ 404 相当。
3. 方針 B（堅牢）: `TemplateRef`/`PageRef`/… テーブルを追加し `gophishId + tenantId` を保存。削除時に DB で検証。移行コスト高。
4. 本計画では **方針 A** を採用（Gophish の per-user フィルタを一次防线としつつ、二重に存在確認）。

**受け入れ基準**
- 別テナントの ID を渡すと削除されず、エラーが返る（単体テストで模擬）。
- 自テナントのリソースは従来どおり削除できる。

**回帰防止**
- `lib/__tests__/tenant-isolation.test.ts` を新設:
  - 他テナント ID に対する各 delete が「client 一覧に無い → 拒否」であることを検証。
  - campaign の所有権チェック既存挙動を回帰テスト化。
- delete 系の正常系（存在する ID）もテストし、チェック追加で正常動作が壊れないことを担保。

---

## 3. 型安全の改善と gophish クライアント統合

**目的**: 未使用の `gophish-client.ts`（型付き）を統合先にし、`any` 濫用を排除。

**対象ファイル**
- `web/lib/gophish-client.ts`（削除）
- `web/lib/gophish.ts`（型付きクライアントへ刷新）
- `web/types/gophish.ts`（型定義を活用）
- 呼び出し元: `app/actions.ts`, `app/api/**`, `lib/rid-sync.ts`, `lib/org.ts`, 各 dashboard ページ

**実装内容**
1. `gophish.ts` の `GophishClient` を `gophish-client.ts` の型（`Template`, `Group`, `Campaign` など）に差し替え。`any` を全面的に具象型へ。
2. `gophish-client.ts` は削除（または `gophish.ts` に re-export を残さず単一化）。
3. `adminClient()` / `orgClient()` は戻り型を明示（`GophishClient`）。
4. 呼び出し側の `as any` を解消（`report-aggregator.ts`、`dashboard` 各ページの `results as any[]` は Prisma include 型に置換）。

**受け入れ基準**
- `grep -r "any"` が対象ファイルで解消（Prisma 由来の安全な型を除く）。
- `tsc --noEmit` 通過。

**回帰防止**
- `lib/__tests__/gophish-client.test.ts` でモック fetch を使い、request 成功/失敗/`success:false` の分岐を回帰テスト。
- 型消去を前提とした呼び出し元のビルドが落ちないことを Step 1 の `npm run check` で担保。

---

## 4. `/api/training/*` の rid 難猜化・列挙対策

**目的**: `track-human-click` / `complete-quiz` が連番の `gophishResultId` を受け取る列挙リスクを低減。

**対象ファイル**
- `web/app/api/training/track-human-click/route.ts`
- `web/app/api/training/complete-quiz/route.ts`
- `web/app/training/[rid]/client.tsx`
- `web/lib/rid-sync.ts`（rid の採番）
- `web/prisma/schema.prisma`（必要ならトークン列追加）

**実装内容**
1. 方針 A（推奨・段階的）: rid の長さ/形式バリデーションを強化（既存 5〜20 文字 → 例: cuid 形式のみ許可）。列挙でヒットする確率を低下。
2. 方針 B（堅牢）: `TrainingResult` に `publicToken String? @unique` を追加し、学習者に渡す rid はこの難猜トークンに変更。gophish の連番 ID は内部保持。
3. 本計画では **方針 A を先行導入、方針 B を次フェーズ**とし、切替点を明記。
4. 両 endpoint でレート制限キーに userId/tenant ではなく IP を使う現状を維持（学習者は未認証のため）。

**受け入れ基準**
- 不正形式の rid は 400。
- 既存の冪等（初回のみ記録）挙動が維持される。

**回帰防止**
- `lib/__tests__/training-rid.test.ts`:
  - 形式バリデーション（短すぎ/長すぎ/不正文字）。
  - 二重 POST でクリック・クイズが二重加算されない冪等性。
  - human click 未記録時に quiz 完了が 409 になる既存ガードを回帰テスト化。

---

## 5. Stripe webhook の冪等化

**目的**: 同一イベントの再送で tenant 更新が二重適用されるリスクを排除。

**対象ファイル**
- `web/app/api/billing/webhook/route.ts`
- `web/prisma/schema.prisma`（`ProcessedEvent` テーブル追加）
- `web/prisma/migrations/*`

**実装内容**
1. `ProcessedEvent(id String @id, type String, receivedAt DateTime)` を追加。
2. webhook ハンドラ冒頭で `event.id` を DB に insert（一意制約違反なら既処理とみなし `200` を返して終了）。
3. 各 event 処理をこの「処理済み登録」の後ろで実行（best-effort ではなくトランザクション）。
4. `customer.subscription.deleted` など取消系は冪等だが、更新系（created/updated）で特に有効。

**受け入れ基準**
- 同一 `event.id` を 2 回 POST しても DB 更新は 1 回。
- 署名不正は従来どおり 400。

**回帰防止**
- `lib/__tests__/stripe-webhook-idempotency.test.ts`:
  - 同一イベント 2 回で `ProcessedEvent` が 1 レコード・tenant.plan 更新が 1 回。
  - 異なるイベントは別処理されること。
  - 署名不正・処理例外の分岐を模擬。

---

## 6. `upload-csv` のパフォーマンス最適化

**目的**: Serializable トランザクション内の N+1 upsert を削減。

**対象ファイル**
- `web/app/api/onboarding/upload-csv/route.ts`

**実装内容**
1. 現状: 1 名ごとに `findUnique` + `upsert`（計 2 クエリ × N）。
2. `findMany({ where: { email: { in: [...] } } })` で既存を一括取得（既に部分的に実施）。
3. 新規/更新を分離し、新規のみ `createMany({ skipDuplicates: true })`、既存のみ `updateMany` をループで高速化。`created/updated` カウントは差分集合から算出。
4. プラン上限チェック（`LIMIT:`）ロジックは維持。

**受け入れ基準**
- 挙動（created/updated レスポンス、上限エラー、Gophish グループ同期）が不変。
- クエリ数が N 固定から O(1) 系に減少。

**回帰防止**
- `lib/__tests__/upload-csv.test.ts`:
  - 同一 CSV の再アップロードで重複が作られないこと。
  - 上限超過で `LIMIT:` エラーが返ること。
  - 既存従業員の department/name が更新されること。
  - グループ作成の重複時フォールバック（updateGroup）を回帰テスト化。

---

## 7. XSS/CSP の検討（テンプレートプレビュー）

**目的**: `templates/new` の `dangerouslySetInnerHTML` と CSP `unsafe-inline` のリスクを整理・低減。

**対象ファイル**
- `web/next.config.ts`（CSP）
- `web/app/(dashboard)/dashboard/templates/new/page.tsx`
- （該当すれば）サニタイズ導入

**実装内容**
1. プレビューは管理者自身の入力（自 XSS）であることを前提に、リスク許容を明文化。
2. サニタイズを導入する場合: DOMPurify 相当を導入しプレビュー描画を通過させる（依存追加）。非導入ならコメントで意図を明記。
3. CSP: Next.js のインラインスクリプト要件を確認のうえ、`script-src 'unsafe-inline'` を `'nonce-...'` へ移行できるか検証。難しければ現状維持＋理由をコメント。
4. 変更しない場合は「実施しない判断と理由」をこの計画に記録。

**受け入れ基準**
- プレビューが機能すること。
- CSP 変更時は全画面でスタイル・スクリプトが崩れないこと。

**回帰防止**
- ビルド後の主要 LP/Q&A/マニュアル/訓練ページの目視または E2E（Step 11）で描画確認。
- CSP 変更時にブラウザコンソールの違反が出ないこと。

---

## 8. Gophish 管理 API 通信の TLS 化

**目的**: 管理 API が内部ネット上で http 平文である点を解消。

**対象ファイル**
- `docker-compose.yml`
- `config.json` / 起動スクリプト `docker/run.sh`
- `web/.env.example`

**実装内容**
1. Gophish admin を TLS 化（`ADMIN_USE_TLS: "true"` ＋ 内部 CA/自己署名証、`cert_path`/`key_path` 指定）。
2. web 側 `GOPHISH_ADMIN_URL` を `https://gophish:3333` に変更。自己署名証のため `NODE_EXTRA_CA_CERTS` または fetch の CA 信頼設定を検討。
3. admin ポート 3333 は外部公開せず内部ネットワーク限定（現状維持を確認）。
4. 移行リスク（内部証明書の配布）を軽減するため、TLS 化は「開発環境で先行検証 → 本番反映」の 2 段階。

**受け入れ基準**
- web → gophish が https で疎通。
- admin ポートが外部から到達不可。

**回帰防止**
- `npm run check` に加え、docker 環境での疎通確認（`/api/health` の gophish チェックが true）を手順化。
- キー発行（provision）→ campaign 作成の E2E（Step 11）で TLS 経由の全 API 動作を確認。

---

## 9. 回帰テスト基盤の拡充

**目的**: 既存の 22 テストを「主要契約」で固定し、以降の変更で気づかず壊さない仕組みを作る。

**対象ファイル**
- `web/lib/__tests__/*`（既存 5 ファイル＋新設分）
- `web/vitest.setup.ts`

**実装内容**
1. 主要「契約」をテスト化:
   - 租戸分離（`requireOrg` / `getActiveOrgId`）。
   - レート制限（メモリ + Redis アダプタ）。
   - crypto 往復。
   - domain-guard / plan limit。
   - SES suppression フィルタ。
2. Prisma モックの共通ファクトリを `tests/factories/` に整備（各テストの重複削減）。
3. 既存の回帰テスト（`regression.test.ts`）に「過去バグ」クエスチョンを継続追加（今回の rateLimit await 欠落など）。

**受け入れ基準**
- テストが独立・再現可能（モックのリークなし）。
- `npm run test` が安定して緑。

**回帰防止**
- 本ステップ自体が回帰防止の中核。以降の各ステップで新規テストをここに追加する規約を確立。

---

## 10. リント・型チェックの厳格化

**目的**: `any`・未使用変数など品質劣化を機械的に検知。

**対象ファイル**
- `web/tsconfig.json`
- `web/eslint.config.mjs`

**実装内容**
1. `tsconfig` の `strict` は既に true。`noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` の追加を検討（段階導入）。
2. ESLint で `@typescript-eslint/no-explicit-any` を warn → error へ段階強化。
3. 既存の 0 警告を維持できることを確認。

**受け入れ基準**
- `npm run lint` / `tsc --noEmit` が通る。
- 新規 `any` が CI でブロックされる設定。

**回帰防止**
- Step 12 の CI で lint/type を必須ゲート化。

---

## 11. 主要フローの統合/E2E テスト

**目的**: 単体では見えない「画面→API→DB」の結合回帰を検知。

**対象ファイル**
- `web/e2e/*`（Playwright 導入）
- `web/package.json`

**実装内容**
1. Playwright 導入（`@playwright/test`）。
2. 次の主要フローを E2E 化:
   - サインアップ → サインイン → ダッシュボード表示。
   - CSV アップロード → グループ作成（モック Gophish）。
   - 訓練ランディング(`/training/[rid]`)でのスクロール/マウス移動でクリック記録 API が呼ばれること。
   - レポート PDF ダウンロードが 200 かつ `application/pdf`。
3. Gophish / Stripe はモック（テストダブル）で分離。

**受け入れ基準**
- 主要フロー 4 本が自動検証される。
- CI で実行可能（ブラウザインストール込み）。

**回帰防止**
- UI 構造変更・リダイレクト変更・権限境界変更を即検知。
- Step 2/4/5/8 の変更が画面レベルで壊れないことを担保。

---

## 12. CI/CD とリリース前チェックリストの確立

**目的**: 以上の全ステップを自動ゲートにまとめ、リリース前検証を定型化。

**対象ファイル**
- `.github/workflows/ci.yml`（新設/拡張）
- `doc/release-checklist.md`（新設）

**実装内容**
1. CI パイプライン:
   - typecheck → lint → unit test（coverage 閾値）→ build → E2E（Step 11）。
   - カバレッジ下限（例: 全体 70%、`lib/` 80%）をゲート化。
2. 依存監査: `npm audit` を組み込み、Critical/High で失敗。
3. リリース前チェックリスト（手動確認）:
   - 環境変数（`AUTH_SECRET`, `GOPHISH_KEY_ENCRYPTION_SECRET`, `STRIPE_*`）設定済みか。
   - admin ポート 3333 が外部非公開か。
   - SES/SNS 署名検証が有効（`SES_SKIP_SIGNATURE_VERIFY` が false）か。
   - 主要ページの目視確認、PDF 出力確認。
4. ステージング環境でのリハーサル手順を文書化。

**受け入れ基準**
- PR が緑でなければマージ不可。
- リリース前チェックリストが運用に組み込まれる。

**回帰防止**
- 本ステップが全ての回帰防止策の集大成（自動ゲート）。
- 過去バグの再発時は「回帰テスト追加 → CI ゲート強化」のループを回す。

---

## 全体のリグレッション防止計画（統括）

1. **テストピラミッド**: 単体（Step 3–6, 9）を厚く、統合/E2E（Step 11）で主要フローを固定。
2. **自動ゲート**: type/lint/unit/build/E2E/coverage を CI（Step 12）で必須化し、緑でない変更をマージ不可に。
3. **契約テスト**: 租戸分離・レート制限・署名検証・プラン上限など「セキュリティ境界」を毎ステップでテスト化。
4. **過去バグの記憶**: 各バグ（rateLimit の await 欠落、SNS canonical message、欠落ルート等）を回帰テストとして永続化。
5. **型で守る**: `any` 排除（Step 3, 10）で呼び出し契約の破壊をコンパイル時に検知。
6. **可観測性**: structured logger・health・監査ログを活かし、リリース後の挙動変化を早期検知。

## リスクと軽減策

| リスク | 軽減策 |
|--------|--------|
| Step 8 の TLS 化で内部疎通が切れる | 開発環境で先行検証、E2E で疎通確認、段階反映 |
| Step 3 の型刷新で呼び出し元が崩れる | `npm run check` を全ステップの完了条件に |
| Step 2 の所有権チェックで正常削除が拒否される | 正常系の回帰テストを必須追加 |
| Step 6 の最適化で集計が変わる | created/updated の既存テストで不変を担保 |
| E2E 導入の環境依存 | Gophish/Stripe をテストダブルで分離 |

## 推奨実施順序

- 基盤: Step 1 → 9 → 10（回帰防止の土台を先に）
- 実装: Step 2 → 3 → 4 → 5 → 6（指摘解消）
- 仕上げ: Step 7 → 8 → 11 → 12（強化と自動化）

各ステップは独立してマージ可能。マージ前に必ず `npm run check`（拡充後は CI）を通すこと。
