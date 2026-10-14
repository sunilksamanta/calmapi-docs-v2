import catalog from '../generated/blocks.json';
import BlocksCatalogClient from './BlocksCatalogClient.jsx';

/**
 * The official blocks as cards, on /blocks in place of the "Official blocks" table. The data is
 * written by scripts/generate-docs-assets.mjs from public/r (the registry), the manifest and
 * the groups of that table. Every card is in the prerendered HTML; search and the group
 * filter run in the browser.
 */
function BlocksCatalog() {
  return <BlocksCatalogClient groups={catalog.groups} blocks={catalog.blocks} />;
}

export default BlocksCatalog;
