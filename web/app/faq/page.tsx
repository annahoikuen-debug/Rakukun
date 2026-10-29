"use client";
import Link from "next/link";
import PublicNav from "@/components/PublicNav";

const faqs = [
  {
    q: "訓練メールが迷惑メール判定されませんか？",
    a: (
      <>
        メール到達率を高めるため、送信前に必ず送信元IP・ドメインをホワイトリスト登録してください。Google Workspace / Microsoft 365
        それぞれの手順と、管理者宛のテスト送信による到達確認のやり方は
        <Link href="/manual#whitelist" className="text-indigo-600 underline">マニュアル「ホワイトリスト設定」</Link>に詳述しています。
      </>
    ),
  },
  {
    q: "社員のパスワードなどの個人情報は保存されますか？",
    a: (
      <>
        いいえ。訓練用ランディングページにはパスワード入力フォームを一切設置せず、<code>capture_credentials</code> と
        <code>capture_passwords</code> をシステムレベルで常に <code>false</code> に固定しています。従業員の認証情報は一切預かりません。
      </>
    ),
  },
  {
    q: "Microsoft Defender（Safe Links）でリンクが事前スキャンされ、クリックと誤計測されませんか？",
    a: (
      <>
        このサービスはボット除外機構を標準搭載しています。初回のGETアクセスでは計測せず、ブラウザ上で人間が
        操作（スクロール・マウス移動・ボタン押下）した時点で「実クリック」として記録します。詳細は
        <Link href="/manual#dashboard" className="text-indigo-600 underline">マニュアル「集計の見方」</Link>をご覧ください。
      </>
    ),
  },
  {
    q: "審査（Pマーク・ISMS）にそのまま提出できるレポートは出せますか？",
    a: (
      <>
        出せます。A4縦の「標的型攻撃メール訓練 実施報告書」をワンクリックでPDF出力できます。対象者数・部署別クリック率・受講結果一覧・
        総評コメントを含みます。FREEプランは「SAMPLE」透かし入り、スタンダード以上は透かしなしです。
        手順は<Link href="/manual#report" className="text-indigo-600 underline">マニュアル「レポート出力」</Link>を参照してください。
      </>
    ),
  },
  {
    q: "料金と契約期間を教えてください。",
    a: (
      <>
        年間契約（一括前払い）のみで月額課金はありません。フリー（5名まで・無料）、スタンダード（年額60,000円・100名まで）、
        ビジネス（年額120,000円・300名まで）の3プランです。<Link href="/#pricing" className="text-indigo-600 underline">料金プラン</Link>もご確認ください。
        パートナー（代理店）プランをご希望の場合は別途お問い合わせください。
      </>
    ),
  },
  {
    q: "CSVの形式は？文字コードは？",
    a: (
      <>
        「部署,氏名,メールアドレス」の3列です。Shift-JIS / UTF-8 どちらも自動判別します。登録可能なのは認証済みの自社ドメインのみで、
        フリーメールは利用できません。詳しくは<Link href="/manual#csv" className="text-indigo-600 underline">マニュアル「対象者登録」</Link>へ。
      </>
    ),
  },
  {
    q: "「訓練メールが来た」と社内でネタバレしてしまいそうです。対策はありますか？",
    a: (
      <>
        分散配信（抜き打ち配信）を推奨します。指定した期間の中で社員ごとに送信日時をランダムに分散できます。設定方法は
        <Link href="/manual#schedule" className="text-indigo-600 underline">マニュアル「配信スケジュール」</Link>をご覧ください。
      </>
    ),
  },
  {
    q: "訓練後に社員のメールアドレスを削除できますか？",
    a: (
      <>
        はい。訓練終了・レポート出力後に、氏名・メールアドレスをワンクリックで匿名化できます。Gophish側のグループターゲットも空にするため、
        実メールが残りません。手順は<Link href="/manual#anonymize" className="text-indigo-600 underline">マニュアル「個人情報の削除」</Link>にあります。
      </>
    ),
  },
  {
    q: "ダッシュボードで何が見られますか？",
    a: (
      <>
        全体の対象者数・人間によるクリック数・クリック率・教育完了率をサマリー表示し、部署別のクリック率ランキングも確認できます。
        最近のキャンペーン一覧も表示され、進捗をリアルタイムで把握できます。詳細は
        <Link href="/manual#dashboard" className="text-indigo-600 underline">マニュアル「集計の見方」</Link>をご覧ください。
      </>
    ),
  },
  {
    q: "バウンスメールや苦情メールはどう処理されますか？",
    a: (
      <>
        Amazon SES の SNS Webhook でバウンス・苦情イベントを自動収集し、ハードバウンスや苦情の宛先は抑制リストに登録して二度送信しないようにします。
        配信信頼性を守る仕組みです。<Link href="/manual#ses" className="text-indigo-600 underline">マニュアル「SES配信イベント」</Link>を参照してください。
      </>
    ),
  },
  {
    q: "パートナー（代理店）として複数社を管理できますか？",
    a: (
      <>
        はい。パートナープランでは親テナントから子テナント（クライアント企業）を一覧・切替管理できます。
        管理画面の「パートナー管理」から子テナントの社員数・キャンペーン数を確認し、各社に切り替えて運用できます。
        <Link href="/manual#partners" className="text-indigo-600 underline">マニュアル「パートナー管理」</Link>をご覧ください。
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <PublicNav />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Q&amp;A（よくある質問）</h1>
        <p className="text-gray-600 mb-10">
          解決しない場合は <Link href="/manual" className="text-indigo-600 underline">操作マニュアル</Link> をご覧ください。
        </p>
        <div className="space-y-6">
          {faqs.map((f) => (
            <div key={f.q} className="bg-white p-6 rounded-lg border">
              <h2 className="font-semibold mb-2 flex gap-2">
                <span className="text-indigo-600">Q.</span>{f.q}
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed flex gap-2">
                <span className="text-indigo-600">A.</span>
                <span>{f.a}</span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center text-sm">
          導入の全体像は <Link href="/manual" className="text-indigo-600 underline">マニュアル</Link> へ、
          料金は <Link href="/#pricing" className="text-indigo-600 underline">料金プラン</Link> へ。
        </div>
      </div>
    </div>
  );
}
