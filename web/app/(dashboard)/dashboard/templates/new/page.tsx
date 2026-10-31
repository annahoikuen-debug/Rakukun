"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createTemplateAction } from "@/app/actions";
import { templateSchema } from "@/lib/validators";
import { useToast } from "@/components/ui/ToastProvider";
import { sanitizeHtml } from "@/lib/sanitize-html";

const VARIABLES = [
  { key: "{{.FirstName}}", desc: "Recipient first name" },
  { key: "{{.URL}}", desc: "Tracking / landing page URL" },
  { key: "{{.Tracker}}", desc: "Open-tracking pixel URL" },
];

export default function NewTemplatePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    subject: "",
    text: "",
    html: "",
    envelope_sender: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback(
    (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      setError("");
    },
    []
  );

  const lineNumbers = form.html.split("\n").map((_, i) => i + 1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = templateSchema.safeParse({
      name: form.name,
      subject: form.subject,
      text: form.text,
      html: form.html,
      envelope_sender: form.envelope_sender || undefined,
    });
    if (!parsed.success) {
      setError("Please fix the errors above.");
      toast({ variant: "error", title: "Invalid input", description: "Name, subject, and HTML body are required." });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("subject", form.subject);
      formData.append("text", form.text);
      formData.append("html", form.html);
      if (form.envelope_sender) formData.append("envelope_sender", form.envelope_sender);
      const result = await createTemplateAction(formData);
      if (result?.error) {
        setError(result.error);
        toast({ variant: "error", title: "Create failed", description: result.error });
        return;
      }
      toast({ variant: "success", title: "Template created" });
      router.push("/dashboard/templates");
    } catch {
      setError("An unexpected error occurred.");
      toast({ variant: "error", title: "Create failed", description: "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create Template</h1>
        <Link href="/dashboard/templates" className="text-sm text-gray-600 hover:underline">Back to templates</Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange("name")}
              required
              className="w-full border p-2 rounded"
              placeholder="e.g. Delivery absence notice"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input
              name="subject"
              value={form.subject}
              onChange={handleChange("subject")}
              required
              className="w-full border p-2 rounded"
              placeholder="e.g. お届け先に不在のお知らせ"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Envelope sender (optional)</label>
            <input
              name="envelope_sender"
              value={form.envelope_sender}
              onChange={handleChange("envelope_sender")}
              className="w-full border p-2 rounded"
              placeholder="sender@example.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Plain text body (optional)</label>
            <textarea
              name="text"
              value={form.text}
              onChange={handleChange("text")}
              rows={4}
              className="w-full border p-2 rounded font-mono text-sm"
              placeholder="Plain text fallback body..."
            />
          </div>
        </div>

        <div className="md:col-span-2" style={{ display: "contents" }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 min-w-0 border rounded overflow-hidden flex flex-col">
              <div className="px-3 py-1 bg-gray-100 border-b text-xs text-gray-500 font-mono">
                HTML body
              </div>
              <div className="relative flex-1 min-h-[400px]">
                <div className="absolute left-0 top-0 bottom-0 w-8 border-r text-xs font-mono text-gray-400 flex items-center justify-center select-none">
                  {lineNumbers.map((n) => (
                    <div key={n} className="h-[1.35rem] flex items-center justify-center">{n}</div>
                  ))}
                </div>
                <textarea
                  name="html"
                  value={form.html}
                  onChange={handleChange("html")}
                  required
                  rows={20}
                  className="w-full pl-8 pt-3 pb-2 px-2 font-mono text-sm outline-none resize-none bg-transparent"
                  placeholder="<p>Hello {{.FirstName}}...</p>"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 border rounded overflow-hidden flex flex-col">
              <div className="px-3 py-1 bg-gray-100 border-b text-xs text-gray-500 font-mono">Preview</div>
              <div className="flex-1 overflow-auto p-4 bg-gray-50 text-sm">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.html) }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-sm font-semibold mb-3">Template variables</h3>
            <p className="text-xs text-gray-500 mb-3">
              Use these variables in your HTML body. They are replaced per recipient at send time.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {VARIABLES.map((v) => (
                <div key={v.key} className="flex items-center gap-2 p-2 bg-white border rounded text-xs">
                  <code className="font-mono">{v.key}</code>
                  <span className="text-gray-600">{v.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "Creating..." : "Create template"}
          </button>
        </div>
      </form>
    </div>
  );
}
