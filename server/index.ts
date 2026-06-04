/**
 * Backend server: image → iNaturalist CV → Gemini enrichment → JSON.
 *
 * Two external services compose the "database":
 *   1. iNaturalist Computer Vision  (~85k taxa, species-level ID)
 *      POST https://api.inaturalist.org/v1/computervision/score_image
 *      Auth: 24h JWT bearer token from
 *        https://www.inaturalist.org/users/api_token
 *   2. Google Gemini  (description / habitat / fun-fact synthesis)
 *      Uses @google/genai already declared in package.json.
 *
 * Endpoint:
 *   POST /api/identify   multipart/form-data  field=image
 *     → { id, name, scientificName, confidence,
 *         description, habitat, funFact,
 *         photoUrl, wikipediaUrl, inatUrl }
 */

import express from 'express';
import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

const INAT_TOKEN = process.env.INAT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

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
  vision_score: number;
  frequency_score: number;
  taxon: InatTaxon;
}

interface InsectAnalysisResult {
  id: string;
  name: string;
  scientificName: string;
  confidence: number;
  description: string;
  habitat: string;
  funFact: string;
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

const ENRICH_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    description: { type: Type.STRING, description: '一段中文生物特征描述，2-3 句' },
    habitat: { type: Type.STRING, description: '中文的栖息环境描述，1-2 句' },
    funFact: { type: Type.STRING, description: '中文的有趣事实，1 句' },
  },
  required: ['description', 'habitat', 'funFact'],
};

async function enrichWithGemini(commonName: string, scientificName: string) {
  if (!ai) {
    return {
      description: `${commonName}（${scientificName}）。设置 GEMINI_API_KEY 后可自动生成详细描述。`,
      habitat: '未知。',
      funFact: '设置 GEMINI_API_KEY 以解锁有趣事实。',
    };
  }
  const prompt = `你是一位昆虫学家。请用中文为以下物种写百科介绍：\n` +
    `中文名：${commonName}\n学名：${scientificName}\n\n` +
    `要求：description 2-3 句描述形态特征；habitat 1-2 句描述栖息地与分布；funFact 1 句有趣事实。\n` +
    `只输出 JSON，不要其他文字。`;
  const resp = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { responseMimeType: 'application/json', responseSchema: ENRICH_SCHEMA },
  });
  const text = resp.text ?? '{}';
  return JSON.parse(text) as { description: string; habitat: string; funFact: string };
}

function pickBestArthropod(items: InatScoreItem[]): InatScoreItem | undefined {
  return items.find(it => {
    const i = it.taxon?.iconic_taxon_name;
    return i === 'Insecta' || i === 'Arachnida';
  }) ?? items[0];
}

// Multer-less multipart parser using express's built-in raw + a tiny boundary
// parser would be heavy; we use the standard `multer` lib instead.
import multer from 'multer';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

app.post('/api/identify', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'image field required' });
    const items = await scoreImageWithInat(req.file.buffer, req.file.originalname);
    const best = pickBestArthropod(items);
    if (!best) return res.status(404).json({ error: 'no candidates returned' });

    const total = items.reduce((s, i) => s + (i.combined_score ?? 0), 0) || 1;
    const confidence = (best.combined_score ?? 0) / total;
    const commonName = best.taxon.preferred_common_name || best.taxon.english_common_name || best.taxon.name;
    const scientificName = best.taxon.name;

    const enriched = await enrichWithGemini(commonName, scientificName);

    const result: InsectAnalysisResult = {
      id: `inat-${best.taxon.id}`,
      name: commonName,
      scientificName,
      confidence,
      ...enriched,
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
  res.json({
    ok: true,
    inatToken: Boolean(INAT_TOKEN),
    geminiKey: Boolean(GEMINI_API_KEY),
  });
});

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  console.log(`[server] iNat token: ${INAT_TOKEN ? 'set' : 'MISSING'}`);
  console.log(`[server] Gemini key: ${GEMINI_API_KEY ? 'set' : 'MISSING (enrichment will be stubbed)'}`);
});
