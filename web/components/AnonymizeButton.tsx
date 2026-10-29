"use client";
import { useState } from "react";

export default function AnonymizeButton({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function anonymize() {
    if (busy || done) return;
    if (!confirm("社員の氏名・メールアドレスを完全に匿名化します。よろしいですか？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/anonymize`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setStatus(res.ok ? `${data.anonymized ?? 0}名を匿名化しました` : (data.error ?? "failed"));
      if (res.ok) setDone(true);
    } catch (e) {
      console.error("anonymize failed", e);
      setStatus("匿名化に失敗しました（通信エラー）");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={anonymize} disabled={done || busy} className="border border-red-500 text-red-600 px-3 py-1 rounded text-sm disabled:opacity-50">
        個人情報を匿名化（削除）
      </button>
      {status && <span className="text-sm text-gray-500">{status}</span>}
    </div>
  );
}