"use client";
import { useState } from "react";

export default function ReviewCommentForm({ campaignId, initial }: { campaignId: number; initial: string }) {
  const [comment, setComment] = useState(initial);
  const [status, setStatus] = useState("");

  async function save() {
    const res = await fetch(`/api/campaigns/${campaignId}/review-comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    });
    setStatus(res.ok ? "保存しました" : "保存に失敗しました");
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
        <button onClick={save} className="bg-black text-white px-3 py-1 rounded text-sm">コメントを保存</button>
        {status && <span className="text-sm text-gray-500">{status}</span>}
      </div>
    </div>
  );
}