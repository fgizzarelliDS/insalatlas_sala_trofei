/**
 * Sanitizes input string to prevent HTML/XSS injection when rendered via innerHTML
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes a string for safe interpolation inside single-quoted JS string literals
 * embedded within double-quoted HTML event attributes (e.g. onclick="fn('${escapeJsAttr(val)}')")
 */
export function escapeJsAttr(str: string | null | undefined): string {
  if (!str) return '';
  return escapeHtml(
    String(str)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
  );
}
