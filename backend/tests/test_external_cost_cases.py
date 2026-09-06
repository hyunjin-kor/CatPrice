"""Prevent unmatched public prices from becoming empirical accuracy claims."""

import copy
import json

import pytest

from scripts.reproduce_external_cost_cases import DEFAULT_REGISTRY, audit_registry


@pytest.fixture
def registry():
    return json.loads(DEFAULT_REGISTRY.read_text(encoding="utf-8"))


def test_public_cost_screen_does_not_claim_manufacturing_accuracy(registry):
    result = audit_registry(registry)
    assert result["summary"]["candidate_case_count"] == 10
    assert result["summary"]["catalog_pack_price_count"] == 3
    assert result["summary"]["contract_price_count"] == 1
    assert result["summary"]["matched_full_cost_case_count"] == 0
    assert result["summary"]["empirical_mape_pct"] is None
    assert all(row["relative_error_pct"] is None for row in result["cases"])


def test_catalog_normalization_keeps_retail_boundary(registry):
    rows = {row["id"]: row for row in audit_registry(registry)["cases"]}
    assert rows["E02"]["catalog_price_usd_per_kg"] == 129000
    assert rows["E03"]["catalog_price_usd_per_kg"] == 140000
    assert rows["E04"]["catalog_price_usd_per_kg"] == 145000
    assert all(not rows[key]["full_cost_comparison_eligible"] for key in ("E02", "E03", "E04"))


@pytest.mark.parametrize("value", [0, -1, True, float("nan"), float("inf")])
def test_invalid_catalog_mass_is_rejected(registry, value):
    registry["cases"][1]["observation"]["pack_mass_kg"] = value
    with pytest.raises(ValueError, match="positive finite"):
        audit_registry(registry)


def test_missing_currency_or_selected_pack_is_not_inferred(registry):
    for field, value in (("currency", None), ("selected_pack_verified", False)):
        invalid = copy.deepcopy(registry)
        invalid["cases"][1]["observation"][field] = value
        with pytest.raises(ValueError, match="Do not infer"):
            audit_registry(invalid)


def test_new_match_requires_real_comparison_instead_of_silent_zero_error(registry):
    registry["cases"][0]["match_requirements"] = dict.fromkeys(
        registry["cases"][0]["match_requirements"], "matched"
    )
    with pytest.raises(ValueError, match="independently sourced"):
        audit_registry(registry)


def test_omitted_comparison_dimension_is_rejected(registry):
    del registry["cases"][0]["match_requirements"]["cost_boundary"]
    with pytest.raises(ValueError, match="Every comparison requirement"):
        audit_registry(registry)


def test_source_reference_must_exist(registry):
    registry["cases"][0]["source_ids"] = ["unregistered"]
    with pytest.raises(ValueError, match="registered source"):
        audit_registry(registry)
