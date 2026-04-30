// ============================================
// Server-side Security - HTML Sanitization
// ============================================
import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content using DOMPurify.
 * Use this for rich text fields where some HTML is allowed.
 * ONLY for server-side usage - import from here, not from security.ts
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (dirty == null) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: [],
  });
}
