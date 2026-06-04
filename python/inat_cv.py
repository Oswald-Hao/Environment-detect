"""iNaturalist Computer Vision backend.

Uses the official endpoint
    POST https://api.inaturalist.org/v1/computervision/score_image
which routes the image through iNaturalist's production CV model
(trained on ~85k taxa, updated periodically with community
observations). Far broader and finer-grained than ImageNet.

Auth: a JWT bearer token is required. Get one (24-hour lifetime) at
    https://www.inaturalist.org/users/api_token
after creating a free iNaturalist account. Pass via the INAT_TOKEN
environment variable or the `token` constructor argument.
"""

from __future__ import annotations

import io
import os
from pathlib import Path
from typing import Iterable

import requests
from PIL import Image

# Reuse the same dataclass / formatter so CLI + Flask UI work unchanged.
from identifier import Candidate, format_report  # noqa: F401


# ImageNet 'class' (informal): top-level taxa we still want to surface
# even though iNat CV may suggest broader things like "Aves". We bias
# toward Arthropoda since this app is for insects, but never drop
# results — just annotate them.
INSECT_ROOT_TAXON_NAMES = {"Insecta", "Arachnida", "Arthropoda"}


class INatCVIdentifier:
    SCORE_URL = "https://api.inaturalist.org/v1/computervision/score_image"

    def __init__(
        self,
        token: str | None = None,
        top_k: int = 5,
        insects_only: bool = True,
        timeout: float = 30.0,
    ) -> None:
        self.token = token or os.environ.get("INAT_TOKEN")
        if not self.token:
            raise RuntimeError(
                "iNaturalist JWT token required. Set INAT_TOKEN env var or pass "
                "token=. Obtain one at https://www.inaturalist.org/users/api_token"
            )
        self.top_k = top_k
        self.insects_only = insects_only
        self.timeout = timeout

    def _open_bytes(self, image: str | Path | Image.Image | bytes) -> tuple[bytes, str]:
        if isinstance(image, (str, Path)):
            p = Path(image)
            return p.read_bytes(), p.name or "image.jpg"
        if isinstance(image, Image.Image):
            buf = io.BytesIO()
            image.convert("RGB").save(buf, format="JPEG", quality=92)
            return buf.getvalue(), "image.jpg"
        if isinstance(image, (bytes, bytearray)):
            return bytes(image), "image.jpg"
        raise TypeError(f"unsupported image type: {type(image)}")

    def identify(self, image: str | Path | Image.Image | bytes) -> list[Candidate]:
        data, fname = self._open_bytes(image)
        r = requests.post(
            self.SCORE_URL,
            headers={
                "Authorization": f"Bearer {self.token}",
                "User-Agent": "insect-identifier/1.0",
            },
            files={"image": (fname, data, "image/jpeg")},
            timeout=self.timeout,
        )
        if r.status_code == 401:
            raise RuntimeError(
                "iNat CV returned 401. Token is missing/expired — refresh at "
                "https://www.inaturalist.org/users/api_token"
            )
        r.raise_for_status()
        payload = r.json()
        results = payload.get("results") or []

        # iNat CV scores are 0..100 (combined). Normalize to 0..1 across
        # the returned (already-ranked) candidates so the UI confidence
        # bar reads naturally.
        total = sum((it.get("combined_score") or 0.0) for it in results) or 1.0

        candidates: list[Candidate] = []
        for item in results:
            taxon = item.get("taxon") or {}
            if self.insects_only and not self._is_arthropod(taxon):
                continue
            score = (item.get("combined_score") or 0.0) / total
            default_photo = taxon.get("default_photo") or {}
            iconic = taxon.get("iconic_taxon_name")
            candidates.append(
                Candidate(
                    label=taxon.get("preferred_common_name") or taxon.get("name") or "Unknown",
                    confidence=float(score),
                    scientific_name=taxon.get("name"),
                    common_name=taxon.get("preferred_common_name"),
                    rank=taxon.get("rank"),
                    # CV endpoint returns only ancestor *ids*; show the
                    # iconic-taxon name (Insecta / Arachnida / …) instead.
                    taxonomy=[iconic] if iconic else None,
                    wikipedia_url=taxon.get("wikipedia_url"),
                    inat_url=f"https://www.inaturalist.org/taxa/{taxon.get('id')}"
                    if taxon.get("id")
                    else None,
                    photo_url=default_photo.get("medium_url")
                    or default_photo.get("square_url"),
                )
            )
            if len(candidates) >= self.top_k:
                break
        return candidates

    @staticmethod
    def _is_arthropod(taxon: dict) -> bool:
        # The score_image endpoint returns iconic_taxon_name (one of
        # Insecta / Arachnida / Mollusca / Aves / …). Use it directly.
        return taxon.get("iconic_taxon_name") in {"Insecta", "Arachnida"}


if __name__ == "__main__":
    import argparse
    import json

    p = argparse.ArgumentParser(description="iNat CV insect identifier")
    p.add_argument("image", help="image path or URL")
    p.add_argument("--top-k", type=int, default=5)
    p.add_argument("--all", action="store_true",
                   help="Include non-arthropod predictions too")
    p.add_argument("--json", action="store_true")
    args = p.parse_args()

    src: str | bytes = args.image
    if args.image.startswith(("http://", "https://")):
        src = requests.get(
            args.image,
            headers={"User-Agent": "insect-identifier/1.0"},
            timeout=20,
        ).content

    ident = INatCVIdentifier(top_k=args.top_k, insects_only=not args.all)
    results = ident.identify(src)
    if args.json:
        print(json.dumps([c.to_dict() for c in results],
                         ensure_ascii=False, indent=2))
    else:
        print(format_report(results))
