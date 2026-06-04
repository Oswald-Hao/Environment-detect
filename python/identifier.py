"""Insect identifier core.

Pipeline:
  1) Local image classification using a HuggingFace ViT model
     (google/vit-base-patch16-224, trained on ImageNet-1k which
     contains dozens of insect classes).
  2) Filter predictions down to the insect / arachnid classes.
  3) Enrich each candidate with rich species data from the
     iNaturalist open taxonomy database (public, no auth required):
       https://api.inaturalist.org/v1/taxa
     iNaturalist tracks > 100k insect taxa contributed by a global
     community of biologists, so we use it as the "database".
"""

from __future__ import annotations

import os

# Force PyTorch-only backend before importing transformers. The host env
# may have broken TF/Flax installs; we don't need either.
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("USE_FLAX", "0")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

import io
import json
import logging
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

import requests
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification

log = logging.getLogger("insect_identifier")

# ImageNet-1k class indices that are insects / arachnids.
# Sourced from the ImageNet synset list (n02xxxx ranges).
IMAGENET_INSECT_IDS: dict[int, str] = {
    300: "tiger beetle",
    301: "ladybug",
    302: "ground beetle",
    303: "long-horned beetle",
    304: "leaf beetle",
    305: "dung beetle",
    306: "rhinoceros beetle",
    307: "weevil",
    308: "fly",
    309: "bee",
    310: "ant",
    311: "grasshopper",
    312: "cricket",
    313: "walking stick",
    314: "cockroach",
    315: "mantis",
    316: "cicada",
    317: "leafhopper",
    318: "lacewing",
    319: "dragonfly",
    320: "damselfly",
    321: "admiral butterfly",
    322: "ringlet butterfly",
    323: "monarch butterfly",
    324: "cabbage butterfly",
    325: "sulphur butterfly",
    326: "lycaenid butterfly",
    # Arachnids — commonly mistaken for insects, included for usability.
    72: "scorpion",
    73: "garden spider",
    74: "barn spider",
    75: "black widow",
    76: "tarantula",
    77: "wolf spider",
}


@dataclass
class Candidate:
    label: str
    confidence: float
    scientific_name: str | None = None
    common_name: str | None = None
    rank: str | None = None
    taxonomy: list[str] | None = None
    wikipedia_url: str | None = None
    inat_url: str | None = None
    photo_url: str | None = None

    def to_dict(self) -> dict:
        return asdict(self)


class InsectIdentifier:
    INAT_TAXA_URL = "https://api.inaturalist.org/v1/taxa"

    def __init__(
        self,
        model_id: str = "google/vit-base-patch16-224",
        device: str | None = None,
        top_k: int = 5,
    ) -> None:
        self.top_k = top_k
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        log.info("loading model %s on %s", model_id, self.device)
        self.processor = AutoImageProcessor.from_pretrained(model_id, use_fast=True)
        self.model = AutoModelForImageClassification.from_pretrained(model_id)
        self.model.to(self.device).eval()

    def _open(self, image: str | Path | Image.Image | bytes) -> Image.Image:
        if isinstance(image, Image.Image):
            return image.convert("RGB")
        if isinstance(image, bytes):
            return Image.open(io.BytesIO(image)).convert("RGB")
        return Image.open(image).convert("RGB")

    @torch.inference_mode()
    def classify(self, image: str | Path | Image.Image | bytes) -> list[Candidate]:
        img = self._open(image)
        inputs = self.processor(images=img, return_tensors="pt").to(self.device)
        logits = self.model(**inputs).logits[0]
        probs = torch.softmax(logits, dim=-1)

        insect_ids = list(IMAGENET_INSECT_IDS.keys())
        insect_probs = probs[insect_ids]
        if insect_probs.sum().item() < 1e-6:
            return []

        # Rank insect classes by probability.
        k = min(self.top_k, len(insect_ids))
        top = torch.topk(insect_probs, k=k)
        candidates: list[Candidate] = []
        for score, idx in zip(top.values.tolist(), top.indices.tolist()):
            cid = insect_ids[idx]
            candidates.append(
                Candidate(label=IMAGENET_INSECT_IDS[cid], confidence=float(score))
            )
        return candidates

    def enrich(self, candidates: Iterable[Candidate]) -> list[Candidate]:
        out: list[Candidate] = []
        for c in candidates:
            try:
                self._lookup_inat(c)
            except Exception as e:  # network failures shouldn't break the run
                log.warning("iNat lookup failed for %s: %s", c.label, e)
            out.append(c)
        return out

    def _lookup_inat(self, c: Candidate, timeout: float = 8.0) -> None:
        r = requests.get(
            self.INAT_TAXA_URL,
            params={"q": c.label, "per_page": 1, "is_active": "true"},
            timeout=timeout,
            headers={"User-Agent": "insect-identifier/1.0"},
        )
        r.raise_for_status()
        data = r.json().get("results") or []
        if not data:
            return
        t = data[0]
        c.scientific_name = t.get("name")
        c.common_name = t.get("preferred_common_name") or c.label
        c.rank = t.get("rank")
        ancestors = t.get("ancestors") or []
        c.taxonomy = [a.get("name") for a in ancestors if a.get("name")]
        c.wikipedia_url = t.get("wikipedia_url")
        c.inat_url = f"https://www.inaturalist.org/taxa/{t.get('id')}" if t.get("id") else None
        default_photo = t.get("default_photo") or {}
        c.photo_url = default_photo.get("medium_url") or default_photo.get("square_url")

    def identify(self, image: str | Path | Image.Image | bytes) -> list[Candidate]:
        return self.enrich(self.classify(image))


def format_report(candidates: list[Candidate]) -> str:
    if not candidates:
        return "No insect-like subject was confidently detected in the image."
    lines = []
    for i, c in enumerate(candidates, 1):
        head = f"{i}. {c.common_name or c.label}"
        if c.scientific_name:
            head += f"  ({c.scientific_name})"
        head += f"  — {c.confidence * 100:.1f}%"
        lines.append(head)
        if c.rank:
            lines.append(f"   rank: {c.rank}")
        if c.taxonomy:
            lines.append(f"   taxonomy: {' > '.join(c.taxonomy[-5:])}")
        if c.wikipedia_url:
            lines.append(f"   wiki: {c.wikipedia_url}")
        if c.inat_url:
            lines.append(f"   iNat: {c.inat_url}")
        lines.append("")
    return "\n".join(lines).rstrip()


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser(description="Identify insects in an image.")
    p.add_argument("image", help="Path or URL to image file")
    p.add_argument("--top-k", type=int, default=5)
    p.add_argument("--json", action="store_true", help="Emit JSON")
    args = p.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    src: str | bytes = args.image
    if args.image.startswith(("http://", "https://")):
        src = requests.get(args.image, timeout=15).content

    ident = InsectIdentifier(top_k=args.top_k)
    results = ident.identify(src)
    if args.json:
        print(json.dumps([c.to_dict() for c in results], ensure_ascii=False, indent=2))
    else:
        print(format_report(results))
