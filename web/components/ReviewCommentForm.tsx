"use client";
import { useState } from "react";

export default function ReviewCommentForm({ campaignId, initial }: { campaignId: number; initial: string }) {
  const [comment, setComment] = useState(initial);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/review-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      setStatus(res.ok ? "保存しました" : "保存に失敗しました");
    } catch (e) {
      console.error("review comment save failed", e);
      setStatus("保存に失敗しました（通信エラー）");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={6}
        className="w-full border p-2 rounded text-sm"
        placeholder="総評・改善計画コメント（PDF報告書に記載されます）"
      />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="bg-black text-white px-3 py-1 rounded text-sm disabled:opacity-50">コメントを保存</button>
        {status && <span className="text-sm text-gray-500">{status}</span>}
      </div>
    </div>
  );
}