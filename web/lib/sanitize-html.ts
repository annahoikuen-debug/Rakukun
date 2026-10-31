// Lightweight HTML sanitizer for admin-authored template previews.
// Not a full DOMPurify replacement, but removes the common XSS vectors:
//   - <script>...</script> and <iframe>/<object>/<embed>
//   - on* event handler attributes
//   - javascript: URLs
export function sanitizeHtml(input: string): string {
  if (!input) return "";
  let out = input;
  // Remove dangerous tags entirely.
  out = out.replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  out = out.replace(/<\s*(script|iframe|object|embed)[^>]*\/?>/gi, "");
  // Remove on* event handlers.
  out = out.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
  // Neutralize javascript: URLs.
  out = out.replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2');
  out = out.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1=#');
  return out;
}