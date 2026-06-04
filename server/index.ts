/**
 * Backend server: image → iNaturalist CV → Wikipedia summary → JSON.
 *
 * Data sources:
 *   1. iNaturalist Computer Vision  (~85k taxa, species-level ID)
 *      POST https://api.inaturalist.org/v1/computervision/score_image
 *      Auth: 24h JWT from https://www.inaturalist.org/users/api_token
 *   2. Wikipedia REST API           (public, no auth)
 *      GET https://{zh|en}.wikipedia.org/api/rest_v1/page/summary/{title}
 *      Used to populate `description`. We try zh first, fall back to en.
 *
 * Endpoint:
 *   POST /api/identify   multipart/form-data  field=image
 *     → { id, name, scientificName, confidence, description,
 *         photoUrl, wikipediaUrl, inatUrl }
 */

import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

// Vite-style env precedence: .env.local overrides .env.
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

// Node's native fetch (undici) ignores HTTPS_PROXY by default. If the
// host has an outbound proxy configured (common in restricted networks),
// route fetch() through it so requests to Wikipedia / iNat succeed.
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy;
console.log(`[server] HTTPS_PROXY env: ${PROXY || '(none)'}`);
if (PROXY && /^https?:\/\//i.test(PROXY)) {
  setGlobalDispatcher(new ProxyAgent(PROXY));
  console.log(`[server] routing fetch through HTTP proxy: ${PROXY}`);
}

const app = express();
const PORT = Number(process.env.PORT ?? 8787);
const INAT_TOKEN = process.env.INAT_TOKEN;

interface InatTaxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  english_common_name?: string;
  iconic_taxon_name?: string;
  wikipedia_url?: string;
  default_photo?: { medium_url?: string; square_url?: string };
}

interface InatScoreItem {
  combined_score: number;
  taxon: InatTaxon;
}

interface InsectAnalysisResult {
  id: string;
  name: string;
  scientificName: string;
  confidence: number;
  description: string;
  photoUrl?: string;
  wikipediaUrl?: string;
  inatUrl?: string;
}

async function scoreImageWithInat(buf: Buffer, filename: string): Promise<InatScoreItem[]> {
  if (!INAT_TOKEN) throw new Error('INAT_TOKEN not set');
  const form = new FormData();
  form.append('image', new Blob([buf], { type: 'image/jpeg' }), filename || 'image.jpg');
  const r = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${INAT_TOKEN}`,
      'User-Agent': 'environment-detect/1.0',
    },
    body: form,
  });
  if (r.status === 401) {
    throw new Error('iNat 401: INAT_TOKEN missing or expired (refresh at https://www.inaturalist.org/users/api_token)');
  }
  if (!r.ok) throw new Error(`iNat CV failed: HTTP ${r.status}`);
  const data = (await r.json()) as { results: InatScoreItem[] };
  return data.results ?? [];
}

/**
 * Pull a one-paragraph summary from Wikipedia.
 *   1. Try zh.wikipedia with the Chinese common name (iNat returns one)
 *   2. Try zh.wikipedia with the scientific name
 *   3. Try en.wikipedia with the title from iNat's wikipedia_url
 *   4. Try en.wikipedia with the scientific name
 */
async function fetchWikiSummary(
  wikiUrl: string | undefined,
  scientificName: string,
  commonName: string | undefined,
): Promise<string> {
  let enTitle: string | undefined;
  if (wikiUrl) {
    const m = wikiUrl.match(/wikipedia\.org\/wiki\/(.+)$/);
    if (m) enTitle = decodeURIComponent(m[1]);
  }
  const sciTitle = scientificName.replace(/\s+/g, '_');

  const tryFetch = async (lang: string, title: string): Promise<string | null> => {
    try {
      const r = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        { headers: { 'User-Agent': 'environment-detect/1.0' } },
      );
      if (!r.ok) return null;
      const j = (await r.json()) as { extract?: string; type?: string };
      if (j.type === 'disambiguation') return null;
      return j.extract?.trim() || null;
    } catch {
      return null;
    }
  };

  const attempts: Array<[string, string]> = [];
  if (commonName && /[\u4e00-\u9fff]/.test(commonName)) attempts.push(['zh', commonName]);
  attempts.push(['zh', sciTitle]);
  if (enTitle) attempts.push(['en', enTitle]);
  attempts.push(['en', sciTitle]);

  for (const [lang, title] of attempts) {
    const s = await tryFetch(lang, title);
    if (s) return s;
  }
  return `${scientificName} — 暂无百科摘要。`;
}

function pickBestArthropod(items: InatScoreItem[]): InatScoreItem | undefined {
  return items.find(it => {
    const i = it.taxon?.iconic_taxon_name;
    return i === 'Insecta' || i === 'Arachnida';
  }) ?? items[0];
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image field required' });
    const items = await scoreImageWithInat(req.file.buffer, req.file.originalname);
    const best = pickBestArthropod(items);
    if (!best) return res.status(404).json({ error: 'no candidates returned' });

    const total = items.reduce((s, i) => s + (i.combined_score ?? 0), 0) || 1;
    const confidence = (best.combined_score ?? 0) / total;
    const commonName =
      best.taxon.preferred_common_name ||
      best.taxon.english_common_name ||
      best.taxon.name;
    const scientificName = best.taxon.name;
    const description = await fetchWikiSummary(best.taxon.wikipedia_url, scientificName, commonName);

    const result: InsectAnalysisResult = {
      id: `inat-${best.taxon.id}`,
      name: commonName,
      scientificName,
      confidence,
      description,
      photoUrl: best.taxon.default_photo?.medium_url,
      wikipediaUrl: best.taxon.wikipedia_url,
      inatUrl: `https://www.inaturalist.org/taxa/${best.taxon.id}`,
    };
    res.json(result);
  } catch (e: any) {
    console.error('[identify] failed:', e?.message ?? e);
    res.status(500).json({ error: e?.message ?? 'identification failed' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, inatToken: Boolean(INAT_TOKEN) });
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[server] iNat token: ${INAT_TOKEN ? 'set' : 'MISSING'}`);
});
