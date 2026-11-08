/** Estimate reading time from Markdown at 200 words/minute, minimum one minute.
 * Count prose and code; omit image paths, link destinations and HTML markup.
 */
export function countWords(markdown = '') {
  const text = markdown
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*$/gm, '')
    .replace(/!\[[^\]]*\]\([^\n]*?\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^\n]*?\)/g, '$1')
    .replace(/^[ \t]*\[[^\]]+\]:[^\n]*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ');
  const words = text.match(/[\p{L}\p{N}]+(?:['’_-][\p{L}\p{N}]+)*/gu) ?? [];
  return words.length;
}

export function readingMinutes(markdown = '') {
  return Math.max(1, Math.ceil(countWords(markdown) / 200));
}
