// Lightweight HTML sanitizer safe for both server and client components.
// Removes the common XSS vectors:
//   - <script>, <iframe>, <object>, <embed>, <style> tags and their contents
//   - on* event handler attributes
//   - javascript: URLs
// Allowed elements are intentionally minimal so admin-authored template
// previews cannot execute code. Use only on trusted admin content; user input
// should never reach this function without additional validation.
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  let out = input;

  // Remove dangerous tags entirely (opening + closing + self-closing).
  out = out.replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  out = out.replace(/<\s*(script|iframe|object|embed|style)[^>]*\/?>/gi, "");

  // Remove on* event handlers.
  out = out.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");

  // Neutralize javascript: URLs.
  out = out.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "$1=$2#$2");
  out = out.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, "$1=#");

  return out;
}
