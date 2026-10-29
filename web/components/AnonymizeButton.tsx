"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";

export default function AnonymizeButton({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function anonymize() {
    if (busy || done) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/anonymize`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone(true);
        toast({ variant: "success", title: "Anonymized", description: `${data.anonymized ?? 0}名を匿名化しました` });
      } else {
        toast({ variant: "error", title: "Anonymize failed", description: data.error ?? "failed" });
      }
    } catch (e) {
      console.error("anonymize failed", e);
      toast({ variant: "error", title: "Anonymize failed", description: "匿名化に失敗しました（通信エラー）" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={done || busy}
        className="border border-red-500 text-red-600 px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        個人情報を匿名化（削除）
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="匿名化の確認"
        description="社員の氏名・メールアドレスを完全に匿名化します。よろしいですか？"
        confirmLabel="匿名化する"
        cancelLabel="キャンセル"
        variant="destructive"
        onConfirm={anonymize}
      />
    </div>
  );
}
