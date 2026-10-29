import Link from "next/link";
import PublicNav from "@/components/PublicNav";

const toc = [
  { id: "signup", label: "1. サインアップ" },
  { id: "csv", label: "2. 対象者登録（CSV）" },
  { id: "whitelist", label: "3. ホワイトリスト設定" },
  { id: "template", label: "4. テンプレート選択" },
  { id: "schedule", label: "5. 配信スケジュール" },
  { id: "dashboard", label: "6. 集計の見方" },
  { id: "report", label: "7. レポート出力" },
  { id: "anonymize", label: "8. 個人情報の削除" },
  { id: "partners", label: "9. パートナー管理" },
  { id: "ses", label: "10. SES配信イベント" },
  { id: "trouble", label: "11. トラブルシューティング" },
];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold mt-14 mb-4 scroll-mt-24">
      <span className="text-indigo-600">■</span> {children}
    </h2>
  );
}

export default function ManualPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PublicNav />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">操作マニュアル</h1>
        <p className="text-gray-600 mb-6">
          サインアップから監査レポート出力までの流れです。不明点は
          <Link href="/faq" className="text-indigo-600 underline"> Q&amp;A</Link>もご確認ください。
        </p>
        <nav className="bg-white border rounded-lg p-4 mb-2 text-sm">
          <p className="font-semibold mb-2">目次</p>
          <ul className="grid md:grid-cols-2 gap-1">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-indigo-600 hover:underline">{t.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <H id="signup">サインアップ</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li><Link href="/signup" className="text-indigo-600 underline">サインアップ</Link>ページで、法人メールアドレス（フリーメール不可）と会社名を入力します。</li>
          <li>登録したメールのドメインが「認証済み自社ドメイン」として設定され、以降は同一ドメインのみ登録可能になります。</li>
          <li>最初の登録者はオーナーとして自動的に作成されます。</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">※ フリーメールでの登録や、他社ドメインの登録はスパム悪用防止のため制限されます。</p>

        <H id="csv">対象者登録（CSV）</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li>「<code>部署,氏名,メールアドレス</code>」の3列CSVを用意します（Shift-JIS / UTF-8 自動判別）。</li>
          <li>オンボーディングの <strong>Step 1</strong> でファイルをアップロードします。</li>
          <li>重複アドレスは自動で除外され、裏側でGophishのグループが作成されます。</li>
          <li>自社ドメイン外のアドレスや不正な形式はエラーとして表示されます。プラン上限（無料5名/スタンダード100名/ビジネス300名）もここで検証されます。</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">よくある質問: <Link href="/faq" className="text-indigo-600 underline">CSVの形式は？</Link></p>

        <H id="whitelist">ホワイトリスト設定</H>
        <p className="text-sm mb-2">訓練メールを迷惑メール判定から防ぐため、送信元を許可リストに登録します。</p>
        <ul className="list-disc ml-5 text-sm space-y-1">
          <li><strong>Google Workspace:</strong> 管理コンソール → アプリ → Google Workspace → Gmail → 迷惑メール → 許可リスト（IP / ドメイン）</li>
          <li><strong>Microsoft 365:</strong> Exchange 管理センター → メールフロー → 受信コネクター / 送信コネクター → IP許可リスト</li>
        </ul>
        <p className="text-sm mt-2">
          設定後、<strong>Step 2</strong> の「テスト送信」で管理者自身のアドレスに1通送り、受信トレイに届くことを確認してから次へ進みます。
        </p>
        <p className="text-sm text-gray-600 mt-2">届かない場合: <Link href="/faq" className="text-indigo-600 underline">訓練メールが迷惑メール判定されませんか？</Link></p>

        <H id="template">テンプレート選択</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li><strong>Step 3</strong> で訓練名とシナリオ（配送不在/パスワード期限/セキュリティ更新/請求書/会議録画）を選びます。</li>
          <li>HTML編集は不要です。日本語の文面はあらかじめ用意されています。</li>
          <li>送信に使う送信プロファイル（SMTP）とグループを指定します。</li>
        </ol>

        <H id="schedule">配信スケジュール</H>
        <ul className="list-disc ml-5 text-sm space-y-1">
          <li><strong>一括即時配信:</strong> 指定日時に全対象者へ一斉送信します。</li>
          <li><strong>分散配信（推奨）:</strong> 期間内に社員ごとに送信日時をランダム分散し、社内でのネタバレを防ぎます。終了日時を指定してください。</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">関連: <Link href="/faq" className="text-indigo-600 underline">ネタバレしてしまいそう</Link></p>

        <H id="dashboard">集計の見方</H>
        <ul className="list-disc ml-5 text-sm space-y-1">
          <li>メールを開封し、リンクを踏んだ「実クリック」だけを計測します（Bot誤検知を除外）。</li>
          <li>クリックした社員には教育コンテンツと3択クイズが表示され、全問正解で「事後教育完了」と記録されます。</li>
          <li>キャンペーン詳細ページで、サマリー・部署別・受講結果一覧を確認できます。</li>
          <li>ダッシュボードでは、全体の対象者数・クリック率・教育完了率と、部署別のクリック率ランキング、最近のキャンペーン一覧を確認できます。</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">仕組みの詳細: <Link href="/faq" className="text-indigo-600 underline">Safe Linksで誤計測されない？</Link> / ダッシュボード: <Link href="/faq" className="text-indigo-600 underline">ダッシュボードで何が見られますか？</Link></p>

        <H id="report">レポート出力</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li>キャンペーン詳細ページの「Download PDF report」をクリックします。</li>
          <li>「総評・改善計画コメント」欄に、クリック率に応じた定型コメントが自動挿入されます。そのまま編集・保存できます。</li>
          <li>出力されるA4 PDFは、対象者数・部署別クリック率・受講結果一覧・総評を含み、Pマーク/ISMS審査に提出できます。FREEプランは「SAMPLE」透かし入りです。</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">審査対応: <Link href="/faq" className="text-indigo-600 underline">審査に提出できる？</Link></p>

        <H id="anonymize">個人情報の削除</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li>レポート出力後、キャンペーン詳細ページの「個人情報を匿名化（削除）」ボタンを押します。</li>
          <li>社員の氏名・メールアドレスが匿名化され、Gophish側のグループターゲットも空にされるため、実メールが残りません。</li>
        </ol>

        <H id="partners">パートナー管理</H>
        <ol className="list-decimal ml-5 text-sm space-y-2">
          <li>パートナープランの親テナントとしてログインし、管理画面の「パートナー管理」を開きます。</li>
          <li>子テナント（クライアント企業）の一覧が表示され、社員数・キャンペーン数を確認できます。</li>
          <li>「テナント切替」リンクから、該当子テナントに切り替えて運用できます。</li>
        </ol>
        <p className="text-sm text-gray-600 mt-2">関連: <Link href="/faq" className="text-indigo-600 underline">パートナーとして複数社を管理できますか？</Link></p>

        <H id="ses">SES配信イベント</H>
        <p className="text-sm mb-2">Amazon SES の SNS Webhook でバウンス・苦情・配信イベントを自動収集します。</p>
        <ul className="list-disc ml-5 text-sm space-y-1">
          <li>ハードバウンス・苦情の宛先は抑制リストに登録され、二度送信されません。</li>
          <li>イベントは `SesEvent` テーブルに記録され、配信信頼性の監視に利用できます。</li>
        </ul>
        <p className="text-sm text-gray-600 mt-2">関連: <Link href="/faq" className="text-indigo-600 underline">バウンスメールや苦情メールはどう処理されますか？</Link></p>

        <H id="trouble">トラブルシューティング</H>
        <ul className="list-disc ml-5 text-sm space-y-1">
          <li>メールが届かない → <Link href="/manual#whitelist" className="text-indigo-600 underline">ホワイトリスト設定</Link>を確認。</li>
          <li>クリックが増えない → <Link href="/manual#dashboard" className="text-indigo-600 underline">集計の見方</Link>（Bot除外の挙動）を確認。</li>
          <li>バウンスが多い → <Link href="/manual#ses" className="text-indigo-600 underline">SES配信イベント</Link>と抑制リストを確認。</li>
          <li>その他の疑問 → <Link href="/faq" className="text-indigo-600 underline">Q&amp;A</Link>をご覧ください。</li>
        </ul>

        <div className="mt-16 p-6 bg-white border rounded-lg text-center">
          <p className="font-semibold mb-2">準備はできましたか？</p>
          <Link href="/signup" className="inline-block bg-black text-white px-6 py-2 rounded">無料で始める</Link>
        </div>
      </div>
    </div>
  );
}
