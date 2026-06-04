<div align="center">

# 🐞 Environment Detect · 自然图鉴

**上传一张昆虫照片，识别物种 + 自动拉百科摘要**

</div>

---

## 这是什么

一个端到端的昆虫识别 Web App：

- **前端**：React 19 + Vite + Tailwind v4，已有的扫描动效 + 结果卡片
- **后端**：Express + TypeScript，接收图片 → 调 iNaturalist CV → 拿到候选物种 → 调 Wikipedia REST API 取一段摘要
- **离线备份**：`python/` 目录下有一份独立的 Python 实现，含本地 ViT 兜底，离线也能用

### 识别能力

| 数据源 | 用途 | 鉴权 |
| --- | --- | --- |
| [iNaturalist CV API](https://api.inaturalist.org/v1/docs/#!/Computer_Vision/post_computervision_score_image) | 物种识别（~85k 物种，species 级，中文俗名） | 24h JWT (`INAT_TOKEN`) |
| [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/) | description 摘要（先 zh.wikipedia，回退 en.wikipedia） | 免鉴权 |
| `google/vit-base-patch16-224`（Python 备份） | 离线兜底，32 个大类 | 免鉴权 |

实测：帝王斑蝶照片 → `Danaus plexippus` species 级，置信度 **98.7%**。

---

## 快速开始

### 1) 安装依赖

```bash
npm install
```

### 2) 配置 token

复制 `.env.example` 为 `.env.local`，填入 iNaturalist JWT：

```env
INAT_TOKEN="eyJhbGciOiJIUzUxMiJ9...."   # 来自 https://www.inaturalist.org/users/api_token
PORT=8787
```

- 先到 https://www.inaturalist.org/signup 注册（免费），登录后访问 https://www.inaturalist.org/users/api_token 复制 JWT。**有效期 24 小时**，过期再访问同一 URL 即可刷新。

### 3) 启动

```bash
npm run dev
```

会同时拉起：
- 前端 dev server：http://localhost:3000
- 后端 API：http://localhost:8787（`/api/identify`、`/api/health`）

Vite 已配置把 `/api/*` 反向代理到后端，前端直接 `fetch('/api/identify')` 即可。

---

## 系统流程

```
浏览器选图
     │
     ▼
POST /api/identify   (multipart, field=image)
     │
     ▼
Express ─→ iNat CV /v1/computervision/score_image
     │           └─ 返回 ~10 个候选物种 (Insecta/Arachnida 等)
     │
     ├─ 取置信度最高的节肢门候选
     │
     ▼
Wikipedia REST  /page/summary/{title}
     │  先尝试 zh.wikipedia.org，404 则回退 en.wikipedia.org
     │
     ▼
返回 InsectAnalysisResult JSON
     │
     ▼
前端 ResultCard 渲染（图片 + 中英文名 + 置信度条 + 百科摘要 + 外链）
```

---

## 项目结构

```
.
├── src/                     # React 前端
│   ├── App.tsx              # 状态机：idle → scanning → result/error
│   ├── components/          # HeroSection / UploadSection / ScanningOverlay / ResultCard / FeaturesSection
│   └── lib/api.ts           # identifyInsect() — 调 /api/identify
├── server/
│   └── index.ts             # Express 后端：iNat CV + Wikipedia
├── python/                  # 独立 Python 实现（可选）
│   ├── identifier.py        # 本地 ViT 后端，32 类，无需网络/token
│   ├── inat_cv.py           # iNat CV 后端，~85k 物种
│   ├── app.py               # Flask UI，端口 5005
│   └── requirements.txt
├── vite.config.ts           # /api → :8787 代理
├── .env.example
└── package.json
```

---

## API 契约

### `POST /api/identify`

请求：multipart/form-data，字段 `image` 为 JPEG/PNG 文件，≤ 15 MB。

响应（`application/json`）：

```jsonc
{
  "id": "inat-48662",
  "name": "君主斑蝶",
  "scientificName": "Danaus plexippus",
  "confidence": 0.987,
  "description": "君主斑蝶（学名：Danaus plexippus）... ",
  "photoUrl": "https://inaturalist-open-data.s3.amazonaws.com/...",
  "wikipediaUrl": "https://en.wikipedia.org/wiki/Monarch_butterfly",
  "inatUrl": "https://www.inaturalist.org/taxa/48662"
}
```

字段 `habitat`、`funFact` 已弃用；前端 ResultCard 在缺省时自动不渲染对应卡片。

### `GET /api/health`

```jsonc
{ "ok": true, "inatToken": true }
```

便于排查 401。

---

## Python 离线模式（可选）

`python/` 下是完全独立的实现，可在没有 Node 环境的机器上跑：

```bash
cd python
pip install -r requirements.txt

# 本地 ViT 后端（32 类，无网络/token）
python identifier.py /path/to/bug.jpg

# iNat CV 后端（~85k 物种，需 token）
export INAT_TOKEN="..."
python inat_cv.py /path/to/bug.jpg

# Flask Web UI（端口 5005，有 token 自动选 iNat，否则降级到 ViT）
python app.py
```

---

## 常见问题

- **`iNat 401: INAT_TOKEN missing or expired`**  
  Token 24 小时过期，刷新即可。如果刚拿就 401，确认 `.env.local` 在仓库根目录、变量名是 `INAT_TOKEN`（不要写成 `INATURALIST_TOKEN`）。

- **识别结果总是某种鸟/植物**  
  后端会自动过滤到 `Insecta` / `Arachnida` 的候选；如果都不是节肢门，会返回置信度最高的那一个。

- **`description` 显示英文摘要**  
  说明这个物种的中文维基词条不存在（罕见物种常见情况）。回退是 en.wikipedia，仍然有内容。
