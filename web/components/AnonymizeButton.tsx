"use client";
import { useState } from "react";

export default function AnonymizeButton({ tenantId }: { tenantId: string }) {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  async function anonymize() {
    if (!confirm("社員の氏名・メールアドレスを完全に匿名化します。よろしいですか？")) return;
    const res = await fetch(`/api/tenants/${tenantId}/anonymize`, { method: "POST" });
    const data = await res.json();
    setStatus(res.ok ? `${data.anonymized}名を匿名化しました` : data.error ?? "failed");
    if (res.ok) setDone(true);
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={anonymize} disabled={done} className="border border-red-500 text-red-600 px-3 py-1 rounded text-sm">
        個人情報を匿名化（削除）
      </button>
      {status && <span className="text-sm text-gray-500">{status}</span>}
    </div>
  );
}