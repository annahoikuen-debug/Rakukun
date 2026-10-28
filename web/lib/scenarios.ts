export interface Scenario {
  key: string;
  label: string;
  subject: string;
  html: string;
}

// Safe templates: no password forms, no credential capture. Tracking via {{.URL}} and {{.Tracker}}.
export const SCENARIOS: Scenario[] = [
  {
    key: "delivery",
    label: "配送業者の不在通知",
    subject: "【佐川急便】お届け先に不在のお知らせ（お荷物あり）",
    html: `<p>{{.FirstName}} 様</p><p>お届け予定のお荷物がお留守宅のためお預かりしております。</p><p>再配達のご手配はこちら：<br><a href="{{.URL}}">再配達を申し込む</a></p><p>※本メールは送信専用です。</p>`,
  },
  {
    key: "sso-expiry",
    label: "クラウド会計・勤怠システム パスワード期限切れ",
    subject: "【重要】勤怠システムのパスワードが本日失効します",
    html: `<p>{{.FirstName}} 様</p><p>ご利用の勤怠システムのパスワードが本日24時に失効します。</p><p>有効期限を延長するには以下からご対応ください：<br><a href="{{.URL}}">パスワードを更新する</a></p>`,
  },
  {
    key: "security-update",
    label: "社内情シス セキュリティアップデート通知",
    subject: "【社内情報システム部】セキュリティ更新の実施について",
    html: `<p>{{.FirstName}} 様</p><p>セキュリティ強化のため、全社員の端末に更新を実施します。</p><p>更新プログラムの適用はこちら：<br><a href="{{.URL}}">更新を開始する</a></p>`,
  },
  {
    key: "invoice",
    label: "取引先からの請求書PDF確認依頼",
    subject: "ご確認：御社宛の請求書PDFを送付いたします",
    html: `<p>{{.FirstName}} 様</p><p>請求書PDFを添付しましたが添付が失敗したため、以下からご確認ください。</p><p><a href="{{.URL}}">請求書PDFを確認する</a></p>`,
  },
  {
    key: "meeting",
    label: "オンライン会議の録画共有通知",
    subject: "【Zoom/Teams】会議の録画が共有されました",
    html: `<p>{{.FirstName}} 様</p><p>先日の会議の録画が共有されました。</p><p>録画を再生する：<br><a href="{{.URL}}">録画を再生する</a></p>`,
  },
];

export function getScenario(key: string): Scenario {
  return SCENARIOS.find((s) => s.key === key) ?? SCENARIOS[0];
}