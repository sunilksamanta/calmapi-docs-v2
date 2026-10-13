// Small markdown helpers shared by the site and scripts/generate-docs-assets.mjs, so heading
// ids in the browser, the table of contents and the search index always agree.

/** GitHub style slug: lowercase, punctuation removed, spaces to hyphens. */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

/** Returns a slug function that de-duplicates: "setup", "setup-1", "setup-2". */
export function createSlugger() {
  const counts = new Map();
  return (text) => {
    const base = slugify(text) || 'section';
    let slug = base;
    while (counts.has(slug)) {
      const n = counts.get(base) + 1;
      counts.set(base, n);
      slug = `${base}-${n}`;
    }
    counts.set(slug, 0);
    return slug;
  };
}

/** Plain text of one line of inline markdown (code spans, links, emphasis removed). */
export function inlineToText(md) {
  return String(md)
    .split(/(`+[^`]*`+)/)
    .map((part, i) => {
      if (i % 2 === 1) return part.replace(/^`+\s?|\s?`+$/g, '');
      return part
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*\s][^*]*)\*/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/\\([\\`*_{}[\]()#+\-.!|])/g, '$1');
    })
    .join('')
    .trim();
}

const FENCE = /^\s*(`{3,}|~{3,})/;
const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Split a markdown page into its title and sections. Every heading gets the same id the
 * site gives it (rehype-heading-ids.js uses the same slugger, in the same order).
 *
 * @returns {{ title: string, headings: Array<{ level: number, text: string, id: string }>,
 *             sections: Array<{ id: string, level: number, heading: string, lines: string[] }> }}
 */
export function parseMarkdown(md) {
  const slug = createSlugger();
  const headings = [];
  const sections = [{ id: '', level: 1, heading: '', lines: [] }];
  let fence = null;
  let title = '';
  for (const line of String(md).split('\n')) {
    const f = FENCE.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      sections.at(-1).lines.push(line);
      continue;
    }
    const h = fence ? null : HEADING.exec(line);
    if (h) {
      const level = h[1].length;
      const text = inlineToText(h[2]);
      const id = slug(text);
      headings.push({ level, text, id });
      if (level === 1 && !title) title = text;
      if (level === 2 || level === 3) sections.push({ id, level, heading: text, lines: [] });
      continue;
    }
    sections.at(-1).lines.push(line);
  }
  return { title, headings, sections };
}

/** Rough plain text of a block of markdown lines, for search snippets. */
export function linesToText(lines) {
  return lines
    .filter((line) => !FENCE.test(line) && !/^\s*\|?\s*:?-{3,}/.test(line) && !/^\s*---\s*$/.test(line))
    .map((line) => inlineToText(line.replace(/^\s*(>\s?|[-*+]\s+|\d+\.\s+)/, '').replace(/^\[!(?:note|tip|important|warning|caution|danger)\]\s*/i, '').replace(/\|/g, ' ')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
