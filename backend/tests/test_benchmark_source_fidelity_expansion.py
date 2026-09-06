"""Keep primary-study claims distinct from the four audited screening proxies."""

from copy import deepcopy

import pytest

from backend.core import decision_engine
from backend.core.price_fetcher import get_reference_prices

FAMILIES = ("ammonia-cracking", "olefin-metathesis", "hydrodeoxygenation", "nh3-scr")


def _candidate(family, slug):
    return next(row for row in decision_engine._load_catalogs()[family]["candidates"]
                if row["slug"] == slug)


@pytest.mark.parametrize("family", FAMILIES)
def test_audited_candidate_sources_resolve_and_scores_are_qualified(family):
    catalog = decision_engine._load_catalogs()[family]
    ids = {row["id"] for row in catalog["citations"]}
    assert len(ids) == len(catalog["citations"])
    for candidate in catalog["candidates"]:
        assert set(candidate["literature_basis_ids"]) <= ids
        assert len(set(candidate["literature_basis_ids"])) == len(candidate["literature_basis_ids"])
        assert "authored screening assessments" in " ".join(candidate["decision_notes"])


def test_ammonia_citations_do_not_assign_different_metals_or_light_to_thermal_proxy():
    baseline = _candidate("ammonia-cracking", "ni-alumina-baseline")
    assert "patched-ni-fe-ncomms-2015" not in baseline["literature_basis_ids"]
    assert "hea-ammonia-ncomms-2019" not in baseline["literature_basis_ids"]
    ru = _candidate("ammonia-cracking", "ru-mgo-premium")
    assert "gan-ru-ncomms-2024" not in ru["literature_basis_ids"]
    assert "Ru3(CO)12" in " ".join(ru["decision_notes"])
    assert "MgO(111)" in " ".join(ru["decision_notes"])
    interface = _candidate("ammonia-cracking", "ni-mgo-ceo2-interface")
    assert "thermal MgO formulation" in " ".join(interface["decision_notes"])
    co = _candidate("ammonia-cracking", "co-mgo-la2o3")
    assert "bell-ijhe-2020" not in co["literature_basis_ids"]
    assert "molar basis" in " ".join(co["decision_notes"])


def test_metathesis_molybdenum_and_tungsten_sources_match_architecture():
    tungsten = _candidate("olefin-metathesis", "wo3-silica-oct")
    assert "handzlik-mo-comparison-apcata-2006" not in tungsten["literature_basis_ids"]
    molybdenum = _candidate("olefin-metathesis", "mo-silica-alumina")
    assert "handzlik-mo-comparison-apcata-2006" in molybdenum["literature_basis_ids"]
    assert "leroux-w-alkane-adsc-2007" not in molybdenum["literature_basis_ids"]
    for slug, metal in (("wo3-silica-oct", "W"), ("mo-silica-alumina", "Mo"),
                        ("re2o7-alumina-mild", "Re")):
        assert f"elemental {metal}" in " ".join(
            _candidate("olefin-metathesis", slug)["decision_notes"])


def test_hdo_claims_preserve_substrate_and_catalyst_intake_distinctions():
    pt = _candidate("hydrodeoxygenation", "pt-silica-hdo")
    assert pt["literature_basis_ids"] == ["nie-mcresol-jcat-2014"]
    assert "arene selectivity is not assured" in pt["summary"]
    nimo = _candidate("hydrodeoxygenation", "nimo-carbon-hdo")
    notes = " ".join(nimo["decision_notes"])
    assert "1:3 Ni/Mo molar ratio" in notes
    assert "glucose-derived carbon" in notes
    assert "220-260 C" in notes
    ru = _candidate("hydrodeoxygenation", "ru-carbon-hdo")
    assert "90 wt% deoxygenation" not in ru["summary"]
    assert "after 4 h" in ru["summary"]
    assert "catalyst intake" in ru["summary"]


def test_scr_service_temperature_and_framework_scope_are_not_conflated():
    oxide = _candidate("nh3-scr", "v2o5-wo3-tio2")
    assert "around 200 C" in oxide["summary"]
    assert "3.51 wt% V2O5" in " ".join(oxide["decision_notes"])
    iron = _candidate("nh3-scr", "fe-zsm-5")
    assert "fe-smallpore-catalysts-2020" not in iron["literature_basis_ids"]
    assert "other framework types" in " ".join(iron["decision_notes"])


@pytest.mark.parametrize("family", FAMILIES)
@pytest.mark.parametrize("profile", ("balanced", "cost-first", "evidence-first"))
def test_attribution_edits_cannot_change_priced_outputs(session, monkeypatch, family, profile):
    prices = {symbol: {**row, "price": 10.0, "unit": "$/lb"}
              for symbol, row in get_reference_prices().items()}
    before = decision_engine.evaluate_benchmark_family(
        session=session, family=family, profile=profile, prices=prices, basis="reference",
    )
    catalogs = deepcopy(decision_engine._load_catalogs())
    catalog = catalogs[family]
    for citation in catalog["citations"]:
        citation["note"] = "Synthetic source qualification."
    for candidate in catalog["candidates"]:
        candidate["summary"] = "Synthetic narrative."
        candidate["decision_notes"] = ["Synthetic scope limitation."]
        candidate["literature_basis_ids"] = [catalog["citations"][0]["id"]]
        for component in candidate["components"]:
            component["pricing"]["note"] = "Synthetic source note."
    monkeypatch.setattr(decision_engine, "_load_catalogs", lambda: catalogs)
    after = decision_engine.evaluate_benchmark_family(
        session=session, family=family, profile=profile, prices=prices, basis="reference",
    )
    assert before["winner"]["slug"] == after["winner"]["slug"]
    assert [(row["slug"], row["summary"], row["scores"], row["evidence_summary"])
            for row in before["candidates"]] == [
                (row["slug"], row["summary"], row["scores"], row["evidence_summary"])
                for row in after["candidates"]
            ]
