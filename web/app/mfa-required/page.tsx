"use client";
import { useState } from "react";

export default function MfaRequiredPage() {
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setup() {
    setError(null);
    const res = await fetch("/api/mfa/setup", { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "setup failed"); return; }
    setUri(data.uri);
    setSecret(data.secret);
  }

  async function verify() {
    setError(null);
    const res = await fetch("/api/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "verify failed"); return; }
    setCodes(data.recoveryCodes);
  }

  if (codes) {
    return (
      <div className="max-w-md mx-auto mt-10 space-y-4">
        <h1 className="text-xl font-bold">MFA 有効化完了</h1>
        <p className="text-sm">回復コード（安全に保管してください）:</p>
        <ul className="font-mono text-sm bg-gray-100 p-3 rounded">
          {codes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        <a href="/dashboard" className="underline">ダッシュボードへ</a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <h1 className="text-xl font-bold">MFA の設定が必要です</h1>
      <p className="text-sm text-gray-600">管理者アカウントには多要素認証が必須です。</p>
      {!uri && <button onClick={setup} className="bg-black text-white px-4 py-2 rounded">セットアップ開始</button>}
      {uri && (
        <div className="space-y-2">
          <p className="text-xs break-all">Secret: {secret}</p>
          <p className="text-xs break-all">URI: {uri}</p>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="6桁コード" className="border p-2 w-full" />
          <button onClick={verify} className="bg-black text-white px-4 py-2 rounded">確認</button>
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}