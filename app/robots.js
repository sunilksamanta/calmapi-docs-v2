import { SITE } from '../src/docs/manifest.js';

// Everything may be crawled, by search engines and AI crawlers alike. AI crawlers are also
// named, so a later rule for "*" cannot shut them out by accident. The docs as plain text for
// language models: /llms.txt and /llms-full.txt.
const AI_CRAWLERS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_CRAWLERS, allow: '/' },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
