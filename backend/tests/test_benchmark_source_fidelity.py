"""Source attribution is complete and remains separate from price-based scoring."""

from copy import deepcopy

import pytest

from backend.core import decision_engine
from backend.core.price_fetcher import get_reference_prices

FAMILIES = ("co2-methanol", "hydrogen-evolution-reaction")


@pytest.mark.parametrize("family", FAMILIES)
def test_benchmark_source_ids_resolve_without_duplicates(family):
    catalog = decision_engine._load_catalogs()[family]
    citations = {row["id"]: row for row in catalog["citations"]}
    quotes = {row["id"]: row for row in catalog["catalog_quotes"]}
    assert len(citations) == len(catalog["citations"])
    for candidate in catalog["candidates"]:
        assert len(candidate["literature_basis_ids"]) == len(set(candidate["literature_basis_ids"]))
        assert set(candidate["literature_basis_ids"]) <= citations.keys()
        assert set(candidate["catalog_quote_ids"]) <= quotes.keys()


def test_primary_citations_match_reaction_and_original_article():
    catalogs = decision_engine._load_catalogs()
    her = catalogs["hydrogen-evolution-reaction"]
    citations = {row["id"]: row for row in her["citations"]}
    candidates = {row["slug"]: row for row in her["candidates"]}
    assert citations["li-mos2-basal-natmater-2016"]["url"] == "https://doi.org/10.1038/nmat4465"
    assert citations["mckone-nimo-acscatal-2013"]["url"] == "https://doi.org/10.1021/cs300691m"
    assert "mckone-nimo-acscatal-2013" in candidates["nimo-alkaline-her-cathode"]["literature_basis_ids"]
    assert "gong-nio-her-ncomms-2014" not in candidates["nimo-alkaline-her-cathode"]["literature_basis_ids"]
    assert "stamenkovic-pt-bimetallic-natmater-2007" not in candidates["pt-carbon-her-cathode"]["literature_basis_ids"]
    methanol = catalogs["co2-methanol"]
    oxide = next(row for row in methanol["candidates"] if row["slug"] == "in2o3-zro2-lowtemp")
    assert "in2o3-dynamics-ncomms-2022" not in oxide["literature_basis_ids"]


@pytest.mark.parametrize("family", FAMILIES)
@pytest.mark.parametrize("profile", ("balanced", "cost-first", "evidence-first"))
def test_source_narrative_does_not_change_costs_scores_or_ranking(session, monkeypatch, family, profile):
    # Synthetic, fixed prices isolate metadata from market and database changes.
    prices = {symbol: {**row, "price": 10.0, "unit": "$/lb"}
              for symbol, row in get_reference_prices().items()}
    before = decision_engine.evaluate_benchmark_family(
        session=session, family=family, profile=profile, prices=prices, basis="reference",
    )
    catalogs = deepcopy(decision_engine._load_catalogs())
    catalog = catalogs[family]
    for citation in catalog["citations"]:
        citation["note"] = "Synthetic attribution revision."
    for route in catalog["route_templates"]:
        route["route_note"] = "Synthetic manufacturing context."
    for candidate in catalog["candidates"]:
        candidate["summary"] = "Synthetic screening context."
        candidate["decision_notes"] = ["Synthetic limitation."]
        candidate["literature_basis_ids"] = [catalog["citations"][0]["id"]]
        for component in candidate["components"]:
            component["pricing"]["note"] = "Synthetic price provenance note."
    monkeypatch.setattr(decision_engine, "_load_catalogs", lambda: catalogs)
    after = decision_engine.evaluate_benchmark_family(
        session=session, family=family, profile=profile, prices=prices, basis="reference",
    )
    assert after["winner"]["slug"] == before["winner"]["slug"]
    assert [(row["slug"], row["summary"], row["scores"], row["evidence_summary"])
            for row in after["candidates"]] == [
                (row["slug"], row["summary"], row["scores"], row["evidence_summary"])
                for row in before["candidates"]
            ]
