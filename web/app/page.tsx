import Link from "next/link";
import PublicNav from "@/components/PublicNav";

const features = [
  {
    title: "Bot誤検知を排除",
    body: "メールセキュリティソフト（Safe Links等）の機械的なURLスキャンを「クリック」と誤判定しません。人間の操作（スクロール・マウス移動・ボタン押下）を検知してから計測します。",
  },
  {
    title: "日本語テンプレート5種",
    body: "配送不在通知・パスワード期限切れ・セキュリティアップデート・請求書PDF・会議録画共有。HTML編集は不要、選ぶだけで開始できます。",
  },
  {
    title: "監査提出用レポートPDF",
    body: "Pマーク・ISMS審査にそのまま提出できるA4の「標的型攻撃メール訓練 実施報告書」をワンクリック出力。総評コメントは自動生成後に編集可能。",
  },
  {
    title: "ネタバレ防止の分散配信",
    body: "指定した期間の中で社員ごとに送信日時を分散。社内チャットでの「訓練メール来たよ」を防ぎ、真のクリック率を測定します。",
  },
  {
    title: "設定10分・全自動",
    body: "CSVアップロード→ホワイトリスト設定→テンプレート選択の3ステップ。配信・集計・レポート作成まで自動で行います。",
  },
  {
    title: "個人情報を預けない",
    body: "訓練用ランディングページにパスワード入力フォームは一切設置せず、クレデンシャル取得はシステムレベルで完全無効化しています。",
  },
];

const steps = [
  { n: "1", title: "対象者をCSVで登録", body: "「部署,氏名,メールアドレス」の3列CSVをアップロード。裏側で自動的にGophishのグループが作成されます。" },
  { n: "2", title: "到達性を確保", body: "Google Workspace / Microsoft 365で送信元をホワイトリスト登録。管理者宛にテスト送信で到達確認できます。" },
  { n: "3", title: "テンプレを選んで開始", body: "訓練シナリオと配信期間を選ぶだけ。開始後は自動で配信・計測・レポート作成が進行します。" },
];

const plans = [
  { name: "フリー", price: "0円", note: "体験用", limit: "対象5名まで", items: ["テスト配信", "サンプル透かし入りPDF", "1テンプレート"] },
  { name: "スタンダード", price: "¥60,000/年", note: "人気", limit: "対象100名まで", items: ["通年分散配信", "日本語テンプレ全種", "監査レポートPDF出力", "部署別集計"], featured: true },
  { name: "ビジネス", price: "¥120,000/年", note: "複数拠点", limit: "対象300名まで", items: ["スタンダードの全機能", "複数拠点・部署比較レポート"] },
];

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="text-indigo-600 font-semibold mb-4">中小企業のための標的型メール訓練SaaS</p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          年1回30万円の標的型メール訓練を、<br />年額6万円・設定10分・全自動で。
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Pマーク・ISMSの審査に必須の「訓練実施記録」を、そのまま提出できる監査レポートPDFとして出力。
          個人情報の取得もしない安全設計です。
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="bg-black text-white px-6 py-3 rounded-lg font-semibold">無料で始める</Link>
          <Link href="/manual" className="border px-6 py-3 rounded-lg font-semibold">操作マニュアルを見る</Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">選ばれる6つの理由</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-10">導入はたったの3ステップ</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="p-6">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold mb-4">{s.n}</div>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 text-sm">
            詳しい手順は <Link href="/manual" className="text-indigo-600 underline">操作マニュアル</Link> をご覧ください。
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-4">料金プラン</h2>
        <p className="text-center text-sm text-gray-500 mb-10">年間契約（一括前払い）のみ。月額課金はありません。</p>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div key={p.name} className={`bg-white p-6 rounded-lg border ${p.featured ? "border-indigo-600 ring-2 ring-indigo-100" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{p.note}</span>
              </div>
              <p className="text-2xl font-bold mb-1">{p.price}</p>
              <p className="text-sm text-gray-500 mb-4">{p.limit}</p>
              <ul className="text-sm space-y-1 mb-6">
                {p.items.map((i) => <li key={i}>✓ {i}</li>)}
              </ul>
              <Link href="/signup" className={`block text-center py-2 rounded ${p.featured ? "bg-black text-white" : "border"}`}>始める</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ / Manual links */}
      <section className="bg-white border-t">
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">はじめる前に</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/faq" className="border px-6 py-3 rounded-lg font-semibold">Q&amp;A（よくある質問）</Link>
            <Link href="/manual" className="border px-6 py-3 rounded-lg font-semibold">操作マニュアル</Link>
          </div>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-center text-sm text-gray-500">
        <p>© Rakukun SecTraining. 訓練メールの送信は必ず事前許可（社内調整）のもと実施してください。</p>
      </footer>
    </div>
  );
}