"use client";

import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  if (!open) return null;

  const isDestructive = variant === "destructive";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "w-full max-w-sm bg-background border border-gray-200 rounded-lg p-6 shadow-lg",
          isDestructive ? "border-red-200" : ""
        )}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold mb-1">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-600 mb-6">{description}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded transition",
              isDestructive
                ? "text-white bg-red-600 hover:bg-red-700"
                : "text-white bg-black hover:bg-gray-800"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
