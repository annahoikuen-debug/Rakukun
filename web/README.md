# Rakukun SecTraining

中小企業向けの標的型攻撃メール訓練 SaaS。Gophish をヘッドレス配信・計測エンジンとして内部起動し、Next.js 側でマルチテナント管理・マイクロ教育・監査レポート PDF を提供します。

## コンセプト

年1回30万円の標的型メール訓練を、**年額6万円・設定10分・全自動**で完了させ、Pマーク / ISMS 審査にそのまま提出できる監査レポート PDF をワンクリック出力します。

## 画面構成（ドキュメントとのつながり）

| 画面 | パス | 内容 |
|------|------|------|
| ランディングページ | `/` | サービス紹介・特徴・料金。ナビから Q&A / マニュアル / サインアップへ誘導 |
| Q&A | `/faq` | よくある質問。各回答から該当するマニュアル章节へリンク |
| 操作マニュアル | `/manual` | サインアップ→登録→配信→レポート出力の手順。目次・アンカー付き、各所から Q&A へ誘導 |
| 管理画面 | `/dashboard` | 訓練・テンプレート・レポートの操作 |
| 訓練ランディング | `/training/[rid]` | 社員が閲覧するネタバラシ＆教育ページ（Bot除外計測） |

LP・Q&A・マニュアルは相互リンクしており、マーケティングからオンボーディング、問い合わせまで一続きに設計しています。

## アーキテクチャ

- **フロントエンド / BFF:** Next.js（App Router / TypeScript / Tailwind CSS）
- **データベース:** PostgreSQL（Supabase）+ Prisma — マルチテナント、Bot除外後のクリック履歴、クイズ受講履歴
- **配信・計測エンジン:** `gophish`（Docker）— プライベートネットワーク内、管理ポート 3333 は内部のみ
- **PDF生成:** `@react-pdf/renderer`（Noto Sans JP 埋め込み、A4縦）

マルチテナント分離は「組織ごとに専用の Gophish ユーザー（APIキー）」を発行し、Gophish の per-user フィルタリングで実現しています。Next.js 側でも全テナント操作の入口で membership 検証を行い、二重の分離を確保しています。

## セットアップ

```bash
cd web
cp .env.example .env        # DATABASE_URL / AUTH_SECRET / GOPHISH_* を設定
npm install
npx prisma migrate dev   # または prisma generate
npm run dev
```

Docker で一括起動する場合はリポジトリ直下の `docker-compose.yml` を利用します（Postgres + Gophish + Web）。

## 開発コマンド

```bash
npm run dev      # 開発サーバ
npm run build    # 本番ビルド
npm run test     # ユニットテスト（42テスト）
npm run lint     # ESLint
npm run typecheck # TypeScript 型チェック
npm run check    # typecheck + lint + test の一括実行
```

## セキュリティ上の原則

- **訓練用ランディングページにクレデンシャル入力フォームは設置せず、`capture_credentials` / `capture_passwords` を常に `false` に固定。**
- **登録・送信先は認証済み自社ドメインに限定（フリーメール禁止）。**
- **Gophish 管理ポートは Docker 内部ネットワークに閉じ込め、外部からは Next.js 経由のみ。**
- **Gophish APIキーは AES-256-GCM で暗号化してDB保存。クライアントには「設定済み/未設定」のみ返却。**
- **MFA（TOTP＋回復コード）は OWNER/ADMIN のサーバアクション実行時に必須。**
- **レート制限:** ログイン・サインアップ・テストメール送信・キャンペーン発信・CSVインポート・MFA検証・クライアントエラー報告などにIP/テナント二重制限を適用。
- **抑制リスト:** バウンス/苦情メールを自動で登録し、再送を防止。
- **監査ログ:** テンプレート・ページ・グループ・SMTP・キャンペーン・テナント切替・匿名化・テスト送信・発信などの変動を記録（ベストエフォート）。

## フィッシングメール機能

| API | パス | 説明 | 権限 |
|-----|------|------|------|
| テストメール送信 | `POST /api/onboarding/test-send` | 1通のテストメールを送信（抑制リスト・ドメイン守備チェック済） | OWNER/ADMIN |
| キャンペーン発信 | `POST /api/onboarding/launch` | Gophish にキャンペーンを作成・発信し、研修結果行を作成 | OWNER/ADMIN |
| CSV一括インポート | `POST /api/onboarding/upload-csv` | 従業員リストを一括インポート | OWNER/ADMIN |
| キャンペーン結果同期 | `POST /api/campaigns/[id]/sync-results` | Gophish の結果を取得し DB に反映 | 認証済みメンバー |
| レポートPDF | `GET /api/campaigns/[id]/report-pdf` | 訓練結果の監査レポートPDFを生成 | 認証済みメンバー |
| 人間クリック計測 | `POST /api/training/track-human-click` | 研修メール内の人間クリックを計測 | 未認証（レート制限あり） |
| クイズ完了 | `POST /api/training/complete-quiz` | 研修クイズの完了を記録 | 未認証（レート制限あり） |

## 環境変数（主要項目）

| 変数 | 説明 | 必須 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 接続文字列 | Yes |
| `REDIS_URL` | Redis 接続文字列（レート制限共有用） | Yes |
| `AUTH_SECRET` | NextAuth シークレット（32バイト以上） | Yes |
| `NEXTAUTH_URL` | 公開ベースURL | Yes |
| `GOPHISH_ADMIN_URL` | Gophish 管理 API ベースURL | Yes |
| `GOPHISH_ADMIN_API_KEY` | Gophish 管理 API キー | Yes |
| `GOPHISH_KEY_ENCRYPTION_SECRET` | Gophish APIキー暗号化用シークレット（32文字以上） | Yes |
| `SES_WEBHOOK_SECRET` | SES/SNS Webhook 署名検証用シークレット | Yes |
| `STRIPE_SECRET_KEY` | Stripe 秘密鍵 | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe Webhook 署名検証用シークレット | Yes |

シークレット生成例:

```bash
openssl rand -base64 32   # AUTH_SECRET / GOPHISH_KEY_ENCRYPTION_SECRET
openssl rand -hex 32      # SES_WEBHOOK_SECRET / STRIPE_WEBHOOK_SECRET
```

## さらなる情報

- 料金・特徴: [ランディングページ](http://localhost:3000/) の「料金プラン」
- よくある質問: [Q&A](http://localhost:3000/faq)
- 操作手順: [操作マニュアル](http://localhost:3000/manual)
