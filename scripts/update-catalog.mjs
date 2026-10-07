import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, 'public', 'catalog.json');
const COVERS_PATH = path.join(ROOT, 'public', 'covers');
const LIMIT = Math.max(1, Number.parseInt(process.env.IFDB_LIMIT || '100', 10));
const SEARCH = 'system:Inform rating:3- #ratings:2-';
const STORY_EXTENSION = /\.(z3|z4|z5|z8|zblorb|zlb|gblorb|glb|ulx|blorb)$/i;
const PLAYABLE_FORMATS = new Set(['zcode', 'blorb/zcode', 'glulx', 'blorb/glulx']);

function requestUrl(endpoint, parameters) {
  const url = new URL(endpoint, 'https://ifdb.org');
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url;
}

async function fetchResponse(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'FableForge catalog updater (https://github.com/)',
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`${url.pathname} returned ${response.status}`);
  return response;
}

async function fetchJson(url) {
  return fetchResponse(url).then(response => response.json());
}

function plainText(html = '') {
  return html
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function archiveStoryLink(detail) {
  const links = detail?.ifdb?.downloads?.links;
  if (!Array.isArray(links)) return null;

  return links
    .filter(link => link?.isGame && PLAYABLE_FORMATS.has(link.format))
    .map(link => {
      try {
        const url = new URL(link.url);
        if (!/(^|\.)ifarchive\.org$/i.test(url.hostname)) return null;
        const filename = decodeURIComponent(url.pathname.split('/').pop() || '');
        if (!STORY_EXTENSION.test(filename)) return null;
        url.protocol = 'https:';
        return { url: url.toString(), filename };
      } catch {
        return null;
      }
    })
    .filter(Boolean)[0] || null;
}

async function cacheCover(tuid, sourceUrl) {
  if (!sourceUrl) return undefined;
  try {
    const url = new URL(sourceUrl);
    const version = (url.searchParams.get('version') || 'latest').replace(/[^a-z0-9_-]/gi, '');
    url.searchParams.set('thumbnail', '240x320');
    const response = await fetchResponse(url);
    const contentType = response.headers.get('content-type') || '';
    const extension = contentType.includes('png') ? 'png'
      : contentType.includes('gif') ? 'gif'
        : contentType.includes('webp') ? 'webp'
          : 'jpg';
    const filename = `${tuid.replace(/[^a-z0-9_-]/gi, '')}-${version}.${extension}`;
    await writeFile(path.join(COVERS_PATH, filename), Buffer.from(await response.arrayBuffer()));
    return `covers/${filename}`;
  } catch (error) {
    console.warn(`Cover skipped for ${tuid}: ${error.message}`);
    return undefined;
  }
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const output = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      output[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return output;
}

async function catalogEntry(summary) {
  try {
    const detail = await fetchJson(requestUrl('/viewgame', { json: '', id: summary.tuid }));
    const story = archiveStoryLink(detail);
    if (!story) return null;

    const description = plainText(detail?.bibliographic?.description);
    const coverUrl = await cacheCover(summary.tuid, detail?.ifdb?.coverart?.url || summary.coverArtLink);
    return {
      id: summary.tuid,
      title: detail?.bibliographic?.title || summary.title,
      author: detail?.bibliographic?.author || summary.author || 'Unknown author',
      description: description.length > 260 ? `${description.slice(0, 257).trimEnd()}…` : description,
      fileUrl: story.url,
      fileName: story.filename,
      ...(coverUrl ? { coverUrl } : {}),
      ifdbUrl: detail?.ifdb?.link || summary.link,
      ...(Number.isFinite(summary.starRating) ? { rating: summary.starRating } : {}),
      ...(summary?.published?.machine ? { published: summary.published.machine } : {}),
      ...(detail?.identification?.format ? { format: detail.identification.format } : {}),
    };
  } catch (error) {
    console.warn(`Story skipped (${summary.title || summary.tuid}): ${error.message}`);
    return null;
  }
}

async function main() {
  await mkdir(COVERS_PATH, { recursive: true });
  const searchUrl = requestUrl('/search', {
    json: '',
    game: '',
    browse: '1',
    searchfor: SEARCH,
    pg: 'all',
  });
  const search = await fetchJson(searchUrl);
  const summaries = Array.isArray(search.games) ? search.games.slice(0, LIMIT) : [];
  if (summaries.length === 0) throw new Error('IFDB returned no search results.');

  const entries = (await mapWithConcurrency(summaries, 5, catalogEntry)).filter(Boolean);
  if (entries.length === 0) throw new Error('IFDB returned no directly playable IF Archive files.');

  await writeFile(CATALOG_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${entries.length} playable IFDB stories to public/catalog.json.`);
}

main().catch(async error => {
  let existingCount = 0;
  try {
    existingCount = JSON.parse(await readFile(CATALOG_PATH, 'utf8')).length;
  } catch {
    // The main error below is more useful than a secondary fallback-read error.
  }
  console.warn(`Catalog refresh failed; keeping the existing ${existingCount}-story snapshot.`);
  console.warn(error.message);
  if (process.env.IFDB_STRICT === '1') process.exitCode = 1;
});
