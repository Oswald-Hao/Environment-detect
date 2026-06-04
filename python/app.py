"""Minimal Flask web UI for the insect identifier."""

from __future__ import annotations

import io
import logging
import os
from pathlib import Path

from flask import Flask, request, render_template_string, jsonify
from PIL import Image

from identifier import InsectIdentifier, format_report

logging.basicConfig(level=logging.INFO, format="%(message)s")

# Backend selection: "inat" uses iNaturalist CV API (~85k taxa, needs
# INAT_TOKEN); "vit" uses the local ImageNet ViT (32 broad classes).
BACKEND = os.environ.get("BACKEND", "inat" if os.environ.get("INAT_TOKEN") else "vit")

app = Flask(__name__)
ident = None


def get_identifier():
    global ident
    if ident is None:
        if BACKEND == "inat":
            from inat_cv import INatCVIdentifier
            ident = INatCVIdentifier(top_k=5)
        else:
            ident = InsectIdentifier()
    return ident


PAGE = """
<!doctype html>
<html lang="zh">
<head>
<meta charset="utf-8">
<title>昆虫识别 · Insect Identifier</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; max-width: 760px;
         margin: 40px auto; padding: 0 20px; color: #222; }
  h1 { margin-bottom: 4px; }
  .sub { color: #666; margin-bottom: 24px; }
  form { border: 2px dashed #bbb; border-radius: 12px; padding: 24px;
         text-align: center; background: #fafafa; }
  input[type=file] { margin: 12px 0; }
  button { background: #1f7a3a; color: white; border: 0; padding: 10px 22px;
           border-radius: 8px; font-size: 15px; cursor: pointer; }
  .card { border: 1px solid #e3e3e3; border-radius: 10px; padding: 16px;
          margin: 12px 0; display: flex; gap: 16px; }
  .card img { width: 96px; height: 96px; object-fit: cover; border-radius: 6px; }
  .name { font-size: 17px; font-weight: 600; }
  .sci { color: #555; font-style: italic; }
  .meta { color: #444; font-size: 13px; margin-top: 4px; line-height: 1.5; }
  .bar { background: #eee; height: 6px; border-radius: 3px; margin-top: 6px;
         overflow: hidden; }
  .bar > div { background: #1f7a3a; height: 100%; }
  .empty { color: #a00; }
</style>
</head>
<body>
  <h1>🐞 昆虫识别</h1>
  <div class="sub">上传一张图片，识别可能的昆虫种类，并从 iNaturalist 拉取分类与百科信息。</div>
  <form method="post" enctype="multipart/form-data" action="/identify">
    <div>选择一张昆虫照片</div>
    <input type="file" name="image" accept="image/*" required>
    <br><button type="submit">识别</button>
  </form>
  {% if results is not none %}
    <h2>识别结果</h2>
    {% if not results %}
      <p class="empty">未在图像中检测到明显的昆虫主体。</p>
    {% endif %}
    {% for c in results %}
      <div class="card">
        {% if c.photo_url %}<img src="{{ c.photo_url }}" alt="">{% endif %}
        <div style="flex:1">
          <div class="name">{{ c.common_name or c.label }}
            {% if c.scientific_name %}<span class="sci">({{ c.scientific_name }})</span>{% endif %}
          </div>
          <div class="bar"><div style="width: {{ (c.confidence * 100)|round(1) }}%"></div></div>
          <div class="meta">置信度 {{ (c.confidence * 100)|round(1) }}%</div>
          {% if c.rank %}<div class="meta">分类级别：{{ c.rank }}</div>{% endif %}
          {% if c.taxonomy %}<div class="meta">分类：{{ ' > '.join(c.taxonomy[-5:]) }}</div>{% endif %}
          <div class="meta">
            {% if c.wikipedia_url %}<a href="{{ c.wikipedia_url }}" target="_blank">维基百科</a>{% endif %}
            {% if c.inat_url %} · <a href="{{ c.inat_url }}" target="_blank">iNaturalist</a>{% endif %}
          </div>
        </div>
      </div>
    {% endfor %}
  {% endif %}
</body>
</html>
"""


@app.route("/", methods=["GET"])
def index():
    return render_template_string(PAGE, results=None)


@app.route("/identify", methods=["POST"])
def identify():
    file = request.files.get("image")
    if not file:
        return render_template_string(PAGE, results=[])
    data = file.read()
    Image.open(io.BytesIO(data))  # validate
    results = get_identifier().identify(data)
    if request.headers.get("Accept") == "application/json":
        return jsonify([c.to_dict() for c in results])
    return render_template_string(PAGE, results=results)


@app.route("/api/identify", methods=["POST"])
def api_identify():
    file = request.files.get("image")
    if not file:
        return jsonify({"error": "image field required"}), 400
    results = get_identifier().identify(file.read())
    return jsonify([c.to_dict() for c in results])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005, debug=False)
