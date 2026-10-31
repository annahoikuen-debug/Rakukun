# セキュリティ強化 実装計画書（36ステップ）

対象: `Rakukun/web`（Next.js BFF/フロント）+ Gophish 配信エンジン連携
目的: コードレビューで挙がったセキュリティ指摘を、**小さな検証可能な 36 ステップ**で解消し、回帰を仕組みで防止する。
方針: 1 ステップ = 1 検証単位。各ステップで「実装 → 型/リント/テスト → 回帰テスト追加」を完結させ、独立してマージ可能にする。
完了条件: 各ステップで `npm run check`（拡充後は CI ゲート）が緑であること。

---

## 0. 指摘とステップ対応表

| 指摘 | 重要度 | ステップ |
|------|--------|----------|
| `x-forwarded-for` 信用によるレート制限バイパス | High | 3, 5–9 |
| ログインがメール単位のみ（分散総当たりに弱い） | High | 7, 8 |
| 管理者ロールに MFA なし | High | 10–18 |
| セッション設定（maxAge/secure）未明示 | High | 10 |
| パスワード強度ポリシー不明 | High | 11 |
| `rid` が連番（推測・改ざん可能） | Medium | 19–22 |
| CSP `script-src 'unsafe-inline'` | Medium | 23–26 |
| Gophish APIキーの鍵ローテーション不能 | Medium | 27–29 |
| 監査ログが best-effort（握りつぶし） | Medium | 30, 31 |
| サインアップ無制限（テナント大量作成） | Low | 32 |
| test-send/launch のスパム化リスク | Low | 33 |
| エラー詳細漏洩 | Low | 34 |
| 依存脆弱性（npm audit） | Low | 4, 35 |
| セキュリティ境界の E2E 欠如 | 横断 | 1, 2, 26, 36 |

推奨実施順: Phase A（基盤）→ B（レート制限）→ C（認証）→ D（rid）→ E（CSP）→ F（鍵）→ G（監査）→ H（低優先）→ I（仕上げ）。

---

# Phase A — 基盤（回帰防止の土台）

## 1. セキュリティテスト用モック／ファクトリ整備
**目的**: 以降の全ステップで認証・IP・レート制限を模擬できる共通基盤を作る。
**対象**: `web/vitest.setup.ts`, `web/tests/factories/`（新設）
**実装**: Prisma モックに `user`（passwordHash 有）・`mfa` 関連・`trainingResult.publicToken` を追加。`auth()` をスタブ化する factory（ログイン/未ログイン/役割別）を `tests/factories/auth.ts` に整備。
**受け入れ**: 既存 25 テストが緑のまま、新 factory を import できる。
**回帰防止**: factory 自体のユニットテスト（役割・MFA状態の生成）を追加。

## 2. セキュリティ CI ゲートとベースライン固定
**目的**: `npm run check` にセキュリティテストを組込み、現状を基準線に。
**対象**: `web/package.json`, `.github/workflows/ci.yml`
**実装**: `check` に `test:coverage` を組み込み。CI の `npm audit` を `continue-on-error: false` へ段階移行（High で fail）。
**受け入れ**: ローカル `check` 通過、CI で audit High がブロック対象になる。
**回帰防止**: audit 失敗時もビルドログに残ることを CI で担保。

## 3. 信頼可能なクライアント IP ヘルパー `clientIp()`
**目的**: `x-forwarded-for` 先頭値の信用を排し、プロキシ末尾ホップ／`x-real-ip` のみを信頼。
**対象**: `web/lib/client-ip.ts`（新設）
**実装**: `clientIp(headers: Headers): string` — `x-real-ip` があればそれ、無ければ `x-forwarded-for` の**末尾**ホップ、どちらも無ければ `"unknown"`。env `TRUSTED_PROXY_COUNT` で末尾から数える位置を調整可。
**受け入れ**: 偽装先頭値を無視し、末尾を採用することを unit test で確認。
**回帰防止**: `lib/__tests__/client-ip.test.ts`（先頭/末尾/real-ip/欠落の4ケース）。

## 4. 依存脆弱性の可視化
**目的**: `npm audit` の High/Critical を解消 or 受容を明文化。
**対象**: `doc/release-checklist.md`, `.github/workflows/ci.yml`
**実装**: 本番依存で `npm audit --audit-level=high` を実行し、指摘を洗い出し。受容するものは理由と併記。
**受け入れ**: High 以上がゼロ、または受容理由がチェックリストに記載。
**回帰防止**: CI audit をゲート化（Step 2）で以後の混入を防止。

---

# Phase B — レート制限と IP 信頼（High）

## 5. training レート制限を `clientIp()` 化
**目的**: `track-human-click`/`complete-quiz` の IP キーを安全化。
**対象**: `app/api/training/track-human-click/route.ts`, `.../complete-quiz/route.ts`
**実装**: `req.headers.get("x-forwarded-for")` を `clientIp(req.headers)` に置換。
**受け入れ**: 既存のレート制限挙動は維持、キーが末尾ホップ由来に。
**回帰防止**: rid + rate-limit の既存テストが緑のまま。`client-ip.test.ts` が IP 解決を担保。

## 6. anonymize / billing を `clientIp()` 化
**目的**: 残りの IP キー利用箇所を統一。
**対象**: `app/api/tenants/[id]/anonymize/route.ts`, `app/api/billing/checkout/route.ts`
**実装**: 同様に `clientIp()` へ置換。未使用なら IP キーの追加可否を判断。
**受け入れ**: 既存挙動維持。
**回帰防止**: 各ルートの所有権/役割テストが緑。

## 7. ログインに IP 単位レート制限を追加
**目的**: 分散 IP からのアカウント総当たりを低減。
**対象**: `web/auth.ts`
**実装**: `authorize` 冒頭で `rateLimit(\`login-ip:${clientIp}\`, 20, 60_000)` を追加（メール単位より緩め）。超過で `null`。
**受け入れ基準**: 正常ログインは通り、同一 IP からの大量試行を遮断。
**回帰防止**: `lib/__tests__/login-rate-limit.test.ts`（IP 上限・メール上限の独立性）。

## 8. ログインの IP×email 合成キー
**目的**: 複数メールを叩く分散攻撃にも効くよう二段構え。
**対象**: `web/auth.ts`
**実装**: `rateLimit(\`login-pair:${ip}:${email}\`, 5, 300_000)` を追加（5分で5回）。
**受け入れ**: 同一 IP で複数アカウントを試行すると遮断。
**回帰防止**: Step 7 のテストに合成キーのケースを追加。

## 9. レート制限応答の統一（429 + Retry-After）
**目的**: ブロック時に明確な 429 と再試行可能時刻を返す。
**対象**: 上記 training / billing / anonymize ルート
**実装**: 判定 false 時に `NextResponse.json({error}, {status:429, headers:{"Retry-After": 秒}})` を統一ヘルパー化。
**受け入れ**: 制限超過が 429 + `Retry-After` になる。
**回帰防止**: ヘルパー unit test（429・ヘッダ値）。

---

# Phase C — 認証ハードニング（High）

## 10. セッション設定の明示（maxAge / secure）
**目的**: 長期トークン被窃の窓を縮小。
**対象**: `web/auth.config.ts`
**実装**: `session: { strategy: "jwt", maxAge: 8*3600 }`、`useSecureCookies: true`（https 前提）。
**受け入れ**: セッションが 8h で失効、cookie に Secure/HttpOnly/SameSite が付与。
**回帰防止**: `lib/__tests__/session-config.test.ts`（maxAge/strategy の値を固定）。

## 11. パスワードポリシー強制
**目的**: 弱いパスワードをサインアップ/変更で拒否。
**対象**: `web/lib/validators.ts`, `app/(auth)/signup`, `app/api/**/password`
**実装**: zod スキーマに最小12文字・大小/数字/記号のうち2種を要求。`signupAction` で適用。
**受け入れ**: 弱いパスワードは 400、強いパスワードは通る。
**回帰防止**: `lib/__tests__/password-policy.test.ts`（境界（境界値テーブル）。

## 12. MFA データモデル追加
**目的**: TOTP/リカバリーコードの保存基盤。
**対象**: `web/prisma/schema.prisma`
**実装**: `User` に `mfaEnabled Boolean @default(false)`, `mfaSecret String?`（暗号化保存）, `mfaConfirmedAt DateTime?`。`MfaRecoveryCode`（ハッシュ化・使用フラグ）を別テーブルで追加。マイグレーション生成。
**受け入れ**: `prisma migrate` が成功、client generate 後 typecheck 緑。
**回帰防止**: スキーマ変更後 `npm run check` 全通過。

## 13. TOTP 検証ヘルパー
**目的**: `otplib` を暗号的に正しくラップ。
**対象**: `web/lib/mfa.ts`（新設）
**実装**: `generateTotpSecret()`, `verifyTotp(secret, token)`, `totpUri(issuer, account)`。シークレットは encrypt 保存。
**受け入れ**: 正しいトークンで true、ずれたトークンで false。
**回帰防止**: `lib/__tests__/mfa.test.ts`（有効/無効/ウィンドル幅）。

## 14. MFA セットアップ API（SECRET 発行）
**目的**: OWNER/ADMIN が QR/シークレットを取得。
**対象**: `app/api/mfa/setup/route.ts`（新設）
**実装**: `requireOrg` + 役割チェック（OWNER/ADMIN）。新シークレト生成→暗号化保存→URI/QR を返す（未確認状態）。
**受け入れ**: 対象外役割は 403、対象役割は URI 受け取れる。
**回帰防止**: 役割境界テスト（403/200）。

## 15. MFA 有効化確認 API
**目的**: 初回 TOTP を検証し `mfaEnabled` を立てる。
**対象**: `app/api/mfa/verify/route.ts`（新設）
**実装**: 有効な TOTP を受領→`mfaEnabled=true`・`mfaConfirmedAt` 設定。回復コードを発行・返す。
**受け入れ**: 誤トークンは 401、正なら有効化＋回復コード返却。
**回帰防止**: verify テスト（有効/無効/二重確認）。

## 16. ログイン後 MFA チェレンジ
**目的**: MFA 有効ユーザーの第二段ゲート。
**対象**: `app/api/auth/**`, `app/signin`, `lib/mfa.ts`
**実装**: credentials 成功後 `mfaEnabled` ならトークンを発行し `/signin/mfa` へ。TOTP 入力でセッション確定（next-auth の callback か独自セッション）。
**受け入れ**: MFA ユーザーは TOTP なしでセッション化しない。
**回帰防止**: フェーズ遷移 unit test（mfa未設定→直通／設定→要求）。

## 17. MFA 必須化ポリシー
**目的**: 役割基準で MFA を義務化しバイパス防止。
**対象**: `lib/org.ts`, `middleware.ts`, `app/dashboard/settings`
**実装**: OWNER/ADMIN は MFA 未有効だとダッシュボード到達前に `/mfa-required` へ強制。設定画面に有効化導線。
**受け入れ**: 未有効管理者はダッシュボード不可。有効化後は解除。
**回帰防止**: 権限×MFA状態の組合せテスト。

## 18. リカバリーコード管理
**目的**: MFA ロックアウト時の逃生口を安全に。
**対象**: `web/lib/mfa.ts`, `app/api/mfa/recovery/route.ts`
**実装**: ハッシュ化保存・1回使用制・再生成 API。ログインで回復コード利用時 `mfaEnabled` 維持 or 強制再設定をポリシー決定。
**受け入れ**: 使用済みコードは再利用不可、残数が減る。
**回帰防止**: recovery unit test（使用・無効・残数）。

---

# Phase D — Training rid 難猜化（Medium）

## 19. `publicToken` データモデル追加
**目的**: 連番の外部露出を止めるための難猜トークン列。
**対象**: `web/prisma/schema.prisma`
**実装**: `TrainingResult.publicToken String? @unique` 追加＋マイグレーション。
**受け入れ**: migrate 成功、既存行は NULL（後続 Step 20 で充填）。
**回帰防止**: `npm run check` 全通過。

## 20. publicToken 発行
**目的**: rid 連番を難猜トークンに置換。
**対象**: `web/lib/rid-sync.ts`
**実装**: TrainingResult 作成/同期時に `publicToken`（cuid or HMAC(連番)）を付与。内部の連番は `gophishResultId` に保持。
**受け入れ**: 新規/既存行にトークンが入る。
**回帰防止**: `lib/__tests__/rid-token.test.ts`（発行・一意性・冪等）。

## 21. `/training/[rid]` を publicToken 受付へ
**目的**: 公開ルートが難猜トークンのみ受理。
**対象**: `app/training/[rid]/page.tsx`, `client.tsx`
**実装**: URL の rid を publicToken として解決。連番は内部参照のみ。
**受け入れ**: トークンでページ表示、連番では 404。
**回帰防止**: ページ解決 unit test（トークン/連番/不正）。

## 22. 記録 API を publicToken 解決へ
**目的**: 改ざん（他人の記録変更）を不能化しつつ冪等維持。
**対象**: `app/api/training/track-human-click/route.ts`, `.../complete-quiz/route.ts`
**実装**: publicToken → `TrainingResult` 解決。既存の `updateMany` 冪等ガードを維持。
**受け入れ**: 他人トークンで自記録を書き換えられない、二重加算されない。
**回帰防止**: 冪等性・不正トークン拒否のテストを拡充。

---

# Phase E — CSP nonce（Medium）

## 23. nonce ベース CSP 生成
**目的**: `unsafe-inline` を排除する nonce を発行。
**対象**: `middleware.ts`, `next.config.ts`
**実装**: リクエスト毎の nonce を生成し CSP ヘッダに `script-src 'nonce-...' 'strict-dynamic'`。middleware が応答ヘッダへ注入。
**受け入れ**: CSP ヘッダに nonce が入り、主要画面が崩れない。
**回帰防止**: CSP ヘッダ unit test（nonce 有・`unsafe-inline` 除）。

## 24. インラインスクリプトへ nonce 注入
**目的**: Next.js インラインが nonce 付きで許可されるか検証。
**対象**: `app/layout.tsx`, 該当インライン script
**実装**: App Router の nonce 取得手段（`headers()`）で script に `nonce` 属性を付与。
**受け入れ**: ブラウザで CSP違反が出ない（E2E Step 26 で確認）。
**回帰防止**: レイアウトの nonce 属性の存在をテスト。

## 25. テンプレートプレビューのサニタイズ
**目的**: `dangerouslySetInnerHTML` を DOMPurify 通過で自己XSSの限界を緩和。
**対象**: `app/(dashboard)/dashboard/templates/new/page.tsx`
**実装**: `isomorphic-dompurify` 導入、プレビュー描画前に sanitize。
**受け入れ**: 危険な script 除去、正常 HTML 表示維持。
**回帰防止**: `lib/__tests__/sanitize.test.ts`（script/iframe 除去、onclick 無効化）。

## 26. CSP 違反の E2E 検知
**目的**: 画面レベルで CSP違反を自動検知。
**対象**: `web/e2e/*.spec.ts`
**実装**: 主要画面でコンソールの CSP違反を監視し、違反ゼロをアサート。
**受け入れ**: 主要画面で違反が出ない。
**回帰防止**: 以後の CSP 変更を自動検知。

---

# Phase F — Gophish キーの鍵ローテーション（Medium）

## 27. 鍵バージョンのデータモデル
**目的**: 複数鍵を解決できるようにする。
**対象**: `web/prisma/schema.prisma`
**実装**: `Tenant.gophishKeyVersion Int @default(1)` 追加＋マイグレーション。
**受け入れ**: migrate 成功、既存は v1。
**回帰防止**: `npm run check` 全通過。

## 28. version 付き encrypt/decrypt
**目的**: ローテーション可能な暗号化。
**対象**: `web/lib/crypto.ts`
**実装**: `encrypt(plain, keyVersion)` / `decrypt(cipher, keyVersion)`。`GOPHISH_KEY_ENCRYPTION_SECRET_V1/V2` を env から解決。既存鍵は v1。
**受け入れ**: v1 往復、旧暗号文が新コードで復号可能。
**回帰防止**: `lib/__tests__/crypto.test.ts` に version 切替ケース追加。

## 29. ローテーション手順と移行
**目的**: 漏洩時/定期での鍵入れ替えを定型化。
**対象**: `doc/security-key-rotation.md`（新設）
**実装**: 新鍵導入→再暗号化バッチ→version 更新→旧鍵失効の手順を文書化＋スクリプト。
**受け入れ**: 手順が文書化され、再暗号化バッチが動作。
**回帰防止**: 移行バッチの dry-run テスト。

---

# Phase G — 監査ログ耐久性（Medium）

## 30. 監査書き込みのリトライ/非同期化
**目的**: セキュリティイベントの監査が握りつぶされない。
**対象**: `web/lib/audit.ts`
**実装**: 重要イベントは失敗時リトライ（exponential backoff）＋非同期キュー（or `after()`）。汎用ログは現状維持。
**受け入れ**: 書込失敗時にリトライされ、消失が減る。
**回帰防止**: `lib/__tests__/audit.test.ts`（成功/失敗リトライ/最終破棄）。

## 31. 重要イベント分離とアラート
**目的**: high-severity を専用 sink へ。
**対象**: `web/lib/audit.ts`, `app/actions.ts`
**実装**: `delete`/`anonymize`/`subscribe`/`tenant.switch` を severity=high で分類し、将用経路（ログ+メトリクス）へ。失敗でアラート。
**受け入れ**: 重要イベントが専用経路に出る。
**回帰防止**: severity 分類の unit test。

---

# Phase H — 低優先

## 32. サインアップの IP レート制限
**目的**: テナント大量作成を防止。
**対象**: `app/(auth)/signup`, `app/actions.ts`（`signupAction`）
**実装**: `rateLimit(\`signup-ip:${clientIp}\`, 5, 3600_000)` を追加。
**受け入れ**: 1h に 5 超過で 429。
**回帰防止**: signup レート制限テスト。

## 33. test-send/launch のテナント単位レート制限
**目的**: メールスパム化を防止。
**対象**: `app/api/onboarding/test-send/route.ts`, `.../launch/route.ts`
**実装**: `rateLimit(\`send:${tenantId}\`, N, 窓)` を追加。
**受け入れ**: 連続送信が制限される。
**回帰防止**: テナントキー独立性のテスト。

## 34. エラー詳細の統一（内部漏洩除去）
**目的**: 内部情報のクライアント漏洩を防止。
**対象**: `web/lib/errors.ts`, 呼び出し元
**実装**: `OrgAccessError` の client 表示文を固定（汎用化）。ログ側には詳細を残す。
**受け入れ**: レスポンスに内部詳細が出ない。
**回帰防止**: エラーレスポンスの snapshot テスト。

## 35. 依存監査 CI ゲート強化
**目的**: 以後の High/Critical 混入を機械的に遮断。
**対象**: `.github/workflows/ci.yml`
**実装**: `npm audit --audit-level=high` を `continue-on-error` なしで必須ゲート化。
**受け入れ**: High 混入 PR が CI で fail。
**回帰防止**: ゲート自体が回帰装置。

---

# Phase I — 仕上げ

## 36. セキュリティ E2E とチェックリスト更新
**目的**: MFA・権限境界・rid 改ざん拒否を画面レベルで固定。
**対象**: `web/e2e/security.spec.ts`（新設）, `doc/release-checklist.md`
**実装**: E2E — ①管理者は MFA 未設定だとダッシュボード不可 ②連番 rid で 404 ③非対象役割は 403。チェックリストに MFA/鍵/監査/依存の項目を追記。
**受け入れ**: 3 フローが自動検証され、チェックリストが現行を反映。
**回帰防止**: UI/権限境界変更を自動検知。

---

## 全体リグレッション防止計画（統括）

1. **ファクトリ起点のテスト**: Step 1 の auth/Prisma ファクトリを使い、全ステップで境界（役割・IP・MFA・トークン）を模擬。
2. **clientIp の一元化**: IP 解決は `lib/client-ip.ts` に閉じ、unit test で偽装耐性を固定（Step 3, 5, 6, 32, 33）。
3. **過去バグの永続化**: XFF 先頭信用・メール単位のみ・連番 rid をそれぞれ回帰テスト化（Step 5, 7, 22）。
4. **型で守る**: 鍵 version・publicToken・mfa カラムを型で追跡し、破壊をコンパイル時に検知（Step 12, 19, 27）。
5. **自動ゲート**: type/lint/unit/coverage/build/audit を CI で必須（Step 2, 35）、E2E で権限境界と CSP を固定（Step 26, 36）。
6. **可観測性**: 監査リトライ＋重要イベント分離（Step 30, 31）で、リリース後の逸脱を早期検知。

## リスクと軽減策
| リスク | 軽減策 |
|--------|--------|
| CSP nonce 化でインラインが壊れる | Step 23→24→26 を段階化、E2E で違反検知 |
| MFA 導入で管理者が締め出し | Step 18 リカバリーコード、Step 17 は段階義務化 |
| 鍵 version 移行で復号失敗 | Step 28 で旧鍵互換維持、Step 29 dry-run |
| rid 切替で既存リンクが死ぬ | Step 20 で既存行へトークン充填、並行受理期間を設ける |
| IP 信頼厳格化で実 IP 誤認 | Step 3 の `TRUSTED_PROXY_COUNT` でデプロイ形態に合わせ調整 |

## マージ条件
各ステップは独立マージ可能。マージ前に必ず `npm run check`、Phase E/F/G 以降は CI ゲート（audit・E2E 含む）を通すこと。
