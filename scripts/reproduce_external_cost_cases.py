"""Reproduce the external-cost evidence screen, without inventing missing inputs.

This is a comparability audit and catalog-unit normalization, not a calibration
of COMET. A catalog pack price is not an observed manufacturing cost.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "docs/sources/external-cost-evidence-2026-09-07.json"
REQUIREMENTS = (
    "composition_and_grade",
    "quantity_and_production_scale",
    "price_date_and_currency",
    "manufacturing_route_and_yield",
    "cost_boundary",
)


def positive_number(value: object) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(value)
        and value > 0
    )


def audit_registry(registry: dict) -> dict:
    sources = {source["id"]: source for source in registry["sources"]}
    rows = []
    ids = set()
    for case in registry["cases"]:
        if case["id"] in ids:
            raise ValueError("Duplicate case id")
        ids.add(case["id"])
        if not case["source_ids"] or any(s not in sources for s in case["source_ids"]):
            raise ValueError("Each case needs a registered source")
        matches = case["match_requirements"]
        if set(matches) != set(REQUIREMENTS):
            raise ValueError("Every comparison requirement must be explicit")
        if any(value not in {"matched", "unknown", "mismatched"} for value in matches.values()):
            raise ValueError("Unknown comparison status")
        if not case["exclusion_reasons"]:
            raise ValueError("This screened registry requires explicit exclusions")
        if all(value == "matched" for value in matches.values()):
            raise ValueError("A newly matched case needs an independently sourced COMET comparison")
        observation = case.get("observation") or {}
        normalized = None
        if observation.get("unit") == "USD/pack":
            price, mass = observation.get("price"), observation.get("pack_mass_kg")
            if not positive_number(price) or not positive_number(mass):
                raise ValueError("Catalog normalization needs positive finite price and mass")
            if not observation.get("selected_pack_verified") or observation.get("currency") != "USD":
                raise ValueError("Do not infer selected pack or dollar currency")
            normalized = round(price / mass, 6)
        rows.append({
            "id": case["id"],
            "evidence_kind": case["evidence_kind"],
            "catalog_price_usd_per_kg": normalized,
            "full_cost_comparison_eligible": False,
            "unmatched_requirements": [key for key in REQUIREMENTS if matches[key] != "matched"],
            "exclusion_reasons": case["exclusion_reasons"],
            "comet_prediction": None,
            "relative_error_pct": None,
        })
    kinds = Counter(row["evidence_kind"] for row in rows)
    return {
        "audit_date": registry["audit_date"],
        "scope": "External source comparability and catalog-unit normalization only",
        "summary": {
            "candidate_case_count": len(rows),
            "catalog_pack_price_count": kinds["public_catalog_offer"],
            "contract_price_count": kinds["signed_contract_price_schedule"],
            "observed_manufacturing_cost_count": 0,
            "matched_full_cost_case_count": 0,
            "empirical_mape_pct": None,
            "paid_data_acquisitions": 0,
        },
        "cases": rows,
        "interpretation": "No matched full-cost observation: external manufacturing accuracy remains unquantified.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    raw = args.registry.read_bytes()
    result = audit_registry(json.loads(raw))
    result["registry_sha256"] = hashlib.sha256(raw).hexdigest()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(result["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
