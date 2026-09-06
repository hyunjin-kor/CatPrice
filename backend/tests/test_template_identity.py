"""Preparation-card costs and metadata survive calculator requests."""

import pytest


def test_all_thermal_cards_keep_identity_and_processing_cost_at_each_scale(client):
    templates = client.get("/api/templates?catalyst_domain=thermal").json()
    by_id = {item["id"]: item for item in templates if item["steps"]}
    assert len(by_id) == 28
    for tons in (2, 20, 200):
        costs = client.get(f"/api/templates/costs?order_size_tons={tons}&catalyst_domain=thermal").json()
        for card in costs["templates"]:
            response = client.post("/api/calculate", json={
                "catalyst_domain": "thermal", "template_id": card["id"],
                "steps": card["steps_fitted"], "order_size_tons": tons,
                "components": [
                    {"role": "active_metal", "name": "Ni", "wt_pct": 20, "price_per_lb": 7.5},
                    {"role": "support", "name": "Al2O3", "wt_pct": 80, "price_per_lb": 0.5},
                ],
            })
            assert response.status_code == 200, card["id"]
            result = response.json()
            assert result["route_summary"]["template_id"] == card["id"]
            assert result["route_summary"]["name"] == by_id[card["id"]]["name"]
            assert result["step_method"]["processing_cost_per_lb"] == pytest.approx(card["processing_cost_per_lb"], abs=0.0001)
            assert result.get("electrode_model") is None
