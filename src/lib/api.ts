export interface InsectAnalysisResult {
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

/**
 * 调用后端 /api/identify。
 * 后端流程：iNaturalist CV 识别物种 → Gemini 生成中文百科 → 返回 JSON。
 *
 * 接受 File（来自上传）；如需传入 Base64 字符串，先转回 File/Blob 即可。
 */
export async function identifyInsect(imageFile: File | string): Promise<InsectAnalysisResult> {
  const form = new FormData();
  if (typeof imageFile === 'string') {
    // Accept "data:image/...;base64,XXXX" or raw base64
    const m = imageFile.match(/^data:(.+?);base64,(.*)$/);
    const mime = m?.[1] ?? 'image/jpeg';
    const b64 = m?.[2] ?? imageFile;
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    form.append('image', new Blob([buf], { type: mime }), 'image.jpg');
  } else {
    form.append('image', imageFile);
  }

  const resp = await fetch('/api/identify', { method: 'POST', body: form });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => '');
    throw new Error(`identify failed: HTTP ${resp.status} ${detail}`);
  }
  return (await resp.json()) as InsectAnalysisResult;
}
