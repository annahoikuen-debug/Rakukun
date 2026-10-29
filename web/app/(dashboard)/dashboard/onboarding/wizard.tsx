"use client";
import { useState } from "react";
import { SCENARIOS } from "@/lib/scenarios";

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [smtpName, setSmtpName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [groupName, setGroupName] = useState("");
  const [scenarioKey, setScenarioKey] = useState(SCENARIOS[0].key);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("http://localhost");
  const [mode, setMode] = useState<"bulk" | "staggered">("staggered");
  const [sendByDate, setSendByDate] = useState("");
  const [status, setStatus] = useState("");

  async function uploadCsv(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/onboarding/upload-csv", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setGroupName(data.groupName ?? "");
      setStep(2);
    } else {
      const detail = Array.isArray(data.details) ? data.details.join(" / ") : "";
      setStatus((data.error ?? "upload failed") + (detail ? `: ${detail}` : ""));
    }
  }

  async function testSend(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/onboarding/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smtpName, recipientEmail: recipient, url }),
    });
    const data = await res.json();
    setStatus(res.ok ? "Test email sent. Check your inbox." : data.error ?? "send failed");
  }

  async function launch(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/onboarding/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: title || `Training ${scenarioKey}`,
        scenarioKey,
        pageName: "training-landing",
        smtpName,
        groupName,
        url,
        mode,
        sendByDate: mode === "staggered" ? sendByDate : "",
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? `Launched campaign ${data.campaignId}` : data.error ?? "launch failed");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">3-Step Training Onboarding</h1>
      <div className="flex gap-2 text-sm">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`px-3 py-1 rounded ${step === n ? "bg-black text-white" : "bg-gray-200"}`}>Step {n}</span>
        ))}
      </div>

      {step === 1 && (
        <form onSubmit={uploadCsv} className="space-y-3 border p-4 rounded">
          <h2 className="font-semibold">Step 1: 対象者CSVアップロード</h2>
          <p className="text-sm text-gray-500">CSV columns: 部署,氏名,メールアドレス</p>
          <input type="file" name="file" accept=".csv" required className="w-full" />
          <button className="bg-black text-white px-3 py-1 rounded" type="submit">Upload & register group</button>
          {status && <p className="text-sm text-red-600">{status}</p>}
        </form>
      )}

      {step === 2 && (
        <div className="space-y-3 border p-4 rounded">
          <h2 className="font-semibold">Step 2: ホワイトリスト設定 & テスト送信</h2>
          <p className="text-sm">Google Workspace / Microsoft 365 で送信元IPをホワイトリスト登録してください。</p>
          <ul className="text-sm list-disc pl-5">
            <li>Google Workspace: 管理コンソール → アプリ → Google Workspace → Gmail → 迷惑メール → 許可リスト</li>
            <li>Microsoft 365: Exchange 管理センター → メールフロー → 接続フィルター → IP許可リスト</li>
          </ul>
          <form onSubmit={testSend} className="space-y-2">
            <input placeholder="Sending profile name" value={smtpName} onChange={(e) => setSmtpName(e.target.value)} className="w-full border p-2 rounded" />
            <input placeholder="Your email (recipient)" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full border p-2 rounded" />
            <input placeholder="URL base" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full border p-2 rounded" />
            <button className="bg-black text-white px-3 py-1 rounded" type="submit">Send test email</button>
          </form>
          {status && <p className="text-sm">{status}</p>}
          <button onClick={() => setStep(3)} className="border px-3 py-1 rounded text-sm">Next</button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={launch} className="space-y-3 border p-4 rounded">
          <h2 className="font-semibold">Step 3: テンプレート選択 & 開始</h2>
          <input placeholder="訓練名（例：2026年度 上期標的型メール訓練）" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded" />
          <select value={scenarioKey} onChange={(e) => setScenarioKey(e.target.value)} className="w-full border p-2 rounded">
            {SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <input placeholder="Sending profile name" value={smtpName} onChange={(e) => setSmtpName(e.target.value)} className="w-full border p-2 rounded" />
          <input placeholder="Group name (from step 1)" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="w-full border p-2 rounded" />
          <input placeholder="URL base" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full border p-2 rounded" />
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "staggered"} onChange={() => setMode("staggered")} />
              分散配信（ネタバレ防止・推奨）
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" checked={mode === "bulk"} onChange={() => setMode("bulk")} />
              一括即時配信
            </label>
          </div>
          {mode === "staggered" && (
            <div>
              <label className="text-sm text-gray-500">分散配信の終了日時（この日時までにランダム配信）</label>
              <input type="datetime-local" value={sendByDate} onChange={(e) => setSendByDate(e.target.value)} className="w-full border p-2 rounded" />
            </div>
          )}
          <button className="bg-black text-white px-3 py-1 rounded" type="submit">Launch training</button>
          {status && <p className="text-sm">{status}</p>}
        </form>
      )}
    </div>
  );
}