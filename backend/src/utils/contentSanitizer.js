// ============================================
// contentSanitizer.js — Server-side Text Sanitization
// ============================================
// Strips HTML tags and dangerous patterns from user-generated content
// before it is stored in MongoDB. Defense-in-depth alongside frontend
// DOMPurify. Prevents stored XSS if a client renders raw content.
// ============================================

/**
 * Simple but effective HTML stripper for user-generated text content.
 * Removes all HTML tags, script-injection patterns, and javascript: URIs.
 * This is NOT a full HTML sanitizer — use it for plain text fields only.
 *
 * For rich HTML content, use a server-side DOMPurify equivalent (jsdom).
 *
 * @param {string} text - Raw user input
 * @param {number} [maxLength=10000] - Truncate at this length
 * @returns {string} Sanitized plain text
 */
const sanitizeText = (text, maxLength = 10_000) => {
  if (!text || typeof text !== "string") return "";

  let clean = text.slice(0, maxLength);

  // Remove <script> blocks (including content)
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove <iframe>, <object>, <embed>, <link>, <meta>
  clean = clean.replace(/<(iframe|object|embed|link|meta|base|form)[^>]*>/gi, "");

  // Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, "");

  // Neutralise javascript: protocol in any remaining attribute-like patterns
  clean = clean.replace(/javascript\s*:/gi, "");

  // Normalise excessive whitespace
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();

  return clean;
};

/**
 * Sanitize Markdown content — preserves Markdown syntax but strips
 * embedded HTML and script injection.
 *
 * @param {string} markdown - Raw markdown from user
 * @param {number} [maxLength=50000]
 * @returns {string} Sanitized markdown
 */
const sanitizeMarkdown = (markdown, maxLength = 50_000) => {
  if (!markdown || typeof markdown !== "string") return "";

  let clean = markdown.slice(0, maxLength);

  // Remove <script> blocks
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove dangerous HTML tags inside Markdown (iframe, object, embed etc.)
  clean = clean.replace(/<(iframe|object|embed|link|meta|base|form|script)\b[^>]*>/gi, "");
  clean = clean.replace(/<\/(iframe|object|embed|script)>/gi, "");

  // Neutralise javascript: URIs
  clean = clean.replace(/javascript\s*:/gi, "");

  return clean.trim();
};

module.exports = { sanitizeText, sanitizeMarkdown };
