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

マルチテナント分離は「組織ごとに専用の Gophish ユーザー（APIキー）」を発行し、Gophish の per-user フィルタリングで実現しています。

## セットアップ

```bash
cd web
cp .env.example .env        # DATABASE_URL / AUTH_SECRET / GOPHISH_* を設定
pnpm install
pnpm exec prisma migrate dev   # または prisma generate
pnpm run dev
```

Docker で一括起動する場合はリポジトリ直下の `docker-compose.yml` を利用します（Postgres + Gophish + Web）。

## 開発コマンド

```bash
pnpm run dev      # 開発サーバ
pnpm run build    # 本番ビルド
pnpm run test     # ユニットテスト
pnpm run lint     # ESLint
```

## セキュリティ上の原則

- 訓練用ランディングページにクレデンシャル入力フォームは設置せず、`capture_credentials` / `capture_passwords` を常に `false` に固定。
- 登録・送信先は認証済み自社ドメインに限定（フリーメール禁止）。
- Gophish 管理ポートは Docker 内部ネットワークに閉じ込め、外部からは Next.js 経由のみ。

## さらなる情報

- 料金・特徴: [ランディングページ](http://localhost:3000/) の「料金プラン」
- よくある質問: [Q&A](http://localhost:3000/faq)
- 操作手順: [操作マニュアル](http://localhost:3000/manual)
