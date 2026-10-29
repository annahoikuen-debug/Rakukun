"use client";

import { useState } from "react";

import { useToast } from "@/components/ui/ToastProvider";

export default function ReviewCommentForm({ campaignId, initial }: { campaignId: number; initial: string }) {
  const { toast } = useToast();
  const [comment, setComment] = useState(initial);
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
      if (res.ok) {
        toast({ variant: "success", title: "Saved", description: "保存しました" });
      } else {
        toast({ variant: "error", title: "Save failed", description: "保存に失敗しました" });
      }
    } catch (e) {
      console.error("review comment save failed", e);
      toast({ variant: "error", title: "Save failed", description: "保存に失敗しました（通信エラー）" });
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
        <button onClick={save} disabled={saving} className="bg-black text-white px-3 py-1 rounded text-sm disabled:opacity-50">
          コメントを保存
        </button>
      </div>
    </div>
  );
}
