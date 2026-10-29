"use client";

export type ToastVariant = "success" | "error";

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

export function Toast({ toast }: { toast: Toast }) {
  const isError = toast.variant === "error";
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-lg border p-4 text-sm shadow-lg animate-in fade-in slide-in-from-top-2",
        "duration-300",
        "border-",
        isError ? "border-red-500 bg-red-50 text-red-900" : "border-green-500 bg-green-50 text-green-900",
      ].join(" ")}
    >
      <div className="shrink-0 mt-0.5">
        {isError ? (
          <span className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 9l-1.293 1.293a1 1 0 101.414 1.414L10 10.414l1.293 1.293a1 1 0 001.414-1.414L11.414 9l1.293-1.293a1 1 0 00-1.414-1.414L10 7.586z" />
            </svg>
          </span>
        ) : (
          <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 17.11 4.528 12.09a1 1 0 011.414-1.414l3.611 3.611 7.778-7.778a1 1 0 111.414 1.414l-8 8a1 1 0 01-1.11 0z" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex-1 leading-relaxed">
        <div className="font-semibold">{toast.title}</div>
        {toast.description && <div className="mt-0.5 opacity-90">{toast.description}</div>}
      </div>
    </div>
  );
}
