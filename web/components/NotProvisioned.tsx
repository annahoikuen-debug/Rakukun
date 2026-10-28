export default function NotProvisioned() {
  return (
    <div className="border border-amber-300 bg-amber-50 p-6 rounded-lg max-w-xl">
      <h2 className="font-semibold mb-2">配信エンジン（Gophish）が未設定です</h2>
      <p className="text-sm text-gray-700 leading-relaxed">
        このテナントは Gophish と連携されていません。メール配信・計測機能を利用するには、
        Gophish 管理サーバ（<code>GOPHISH_ADMIN_URL</code>）が起動していることと、
        管理 API キー（<code>GOPHISH_ADMIN_API_KEY</code>）が設定されていることを確認し、
        組織を初期化してください。
      </p>
      <p className="text-sm text-gray-600 mt-3">
        設定後はサインアップ時、または初回アクセス時に自動で初期化されます。
        問題が続く場合は管理者に連絡してください。
      </p>
    </div>
  );
}