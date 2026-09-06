"""Monte Carlo uncertainty analysis for catalyst cost estimation.

Inspired by BioSTEAM's uncertainty analysis approach.
Provides probabilistic cost ranges instead of single-point estimates.
"""

from __future__ import annotations

import numpy as np

from backend.core.cost_engine import estimate_catalyst_cost
from backend.schemas.cost_input import CostCalculationRequest


def run_monte_carlo(
    base_params: dict,
    uncertainties: dict[str, tuple[float, float]] | None = None,
    n_simulations: int = 1000,
    seed: int | None = None,
) -> dict:
    """Run Monte Carlo simulation on catalyst cost estimation.

    Args:
        base_params: Base parameters for estimate_catalyst_cost().
        uncertainties: Dict mapping parameter name to (low_factor, high_factor)
                       relative to base value. E.g. {"metal_price": (0.8, 1.2)}
                       means metal price varies from 80% to 120% of base.
        n_simulations: Number of Monte Carlo iterations.
        seed: Random seed for reproducibility.

    Returns:
        Dict with statistical summary and raw results.
    """
    rng = np.random.default_rng(seed)

    if uncertainties is None:
        uncertainties = {
            "metal_price": (0.8, 1.2),
            "support_price_per_lb": (0.9, 1.1),
            "order_size_tons": (0.8, 1.2),
        }

    results = []
    for _ in range(n_simulations):
        params = dict(base_params)
        for param, (lo, hi) in uncertainties.items():
            if param in params:
                base_val = base_params[param]
                factor = rng.uniform(lo, hi)
                params[param] = base_val * factor

        try:
            result = estimate_catalyst_cost(**params)
            results.append(result["summary"]["estimated_price_per_lb"])
        except (ValueError, KeyError):
            continue

    if not results:
        raise ValueError("All simulations failed")

    arr = np.array(results)

    return {
        "n_simulations": n_simulations,
        "n_successful": len(results),
        "mean": round(float(np.mean(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "p5": round(float(np.percentile(arr, 5)), 4),
        "p25": round(float(np.percentile(arr, 25)), 4),
        "p75": round(float(np.percentile(arr, 75)), 4),
        "p95": round(float(np.percentile(arr, 95)), 4),
        "unit": "$/lb",
        "uncertainties_applied": uncertainties,
    }


def run_cost_request_monte_carlo(
    *,
    req: CostCalculationRequest,
    context: dict,
    uncertainties: dict[str, tuple[float, float]] | None = None,
    n_simulations: int = 1000,
    seed: int | None = None,
) -> dict:
    """Run Monte Carlo analysis from the full calculator request."""

    rng = np.random.default_rng(seed)

    if uncertainties is None:
        uncertainties = {
            "active_component_price": (0.7, 1.3),
            "promoter_price": (0.8, 1.2),
            "support_price": (0.8, 1.2),
            "electrode_adjunct_price": (0.85, 1.15),
            "order_size_tons": (0.8, 1.2),
        }

    baseline = estimate_catalyst_cost(
        components=context["resolved_components"],
        steps=context["steps"],
        catalyst_domain=req.catalyst_domain,
        application_family=context["application_family"],
        order_size_tons=req.order_size_tons,
        ga_overhead_pct=req.ga_overhead_pct,
        sard_pct=req.sard_pct,
        basis_year=req.basis_year,
        target_year=req.target_year,
        include_spent_value=req.include_spent_value,
        reactor_type=req.reactor_type,
        catalyst_bulk_density=req.catalyst_bulk_density,
        electrode_input=context["electrode_payload"],
        route_summary=context["route_summary"],
        resolved_materials=context["resolved_materials"],
    )

    bounds = np.array([uncertainties.get(key, (1.0, 1.0)) for key in (
        "active_component_price", "promoter_price", "support_price",
        "electrode_adjunct_price", "order_size_tons",
    )])
    factors = rng.uniform(bounds[:, 0], bounds[:, 1], size=(n_simulations, 5))
    results = []
    for factor_row in factors:
        active_factor, promoter_factor, support_factor, adjunct_factor, order_factor = map(float, factor_row)
        varied_components = [dict(component) for component in context["resolved_components"]]
        varied_electrode = dict(context["electrode_payload"]) if context["electrode_payload"] is not None else None
        order_size = req.order_size_tons

        for component in varied_components:
            base_price = float(component.get("price_per_lb", 0.0))
            if base_price <= 0:
                continue
            if component["role"] in {"active_metal", "active_catalyst"}:
                component["price_per_lb"] = base_price * active_factor
            elif component["role"] == "promoter":
                component["price_per_lb"] = base_price * promoter_factor
            elif component["role"] == "support":
                component["price_per_lb"] = base_price * support_factor

        if varied_electrode is not None:
            if "catalyst_price_per_lb" in varied_electrode:
                varied_electrode["catalyst_price_per_lb"] = (
                    float(varied_electrode["catalyst_price_per_lb"]) * active_factor
                )
            for key in (
                "ionomer_price_per_ml",
                "ionomer_price_per_kg_solids",
                "substrate_cost_per_cm2",
                "membrane_cost_per_cm2",
            ):
                if key in varied_electrode:
                    varied_electrode[key] = float(varied_electrode[key]) * adjunct_factor

        order_size *= order_factor

        try:
            result = estimate_catalyst_cost(
                components=varied_components,
                steps=context["steps"],
                catalyst_domain=req.catalyst_domain,
                application_family=context["application_family"],
                order_size_tons=order_size,
                ga_overhead_pct=req.ga_overhead_pct,
                sard_pct=req.sard_pct,
                basis_year=req.basis_year,
                target_year=req.target_year,
                include_spent_value=req.include_spent_value,
                reactor_type=req.reactor_type,
                catalyst_bulk_density=req.catalyst_bulk_density,
                electrode_input=varied_electrode,
                route_summary=context["route_summary"],
                resolved_materials=context["resolved_materials"],
            )
            results.append(result["summary"]["estimated_price_per_lb"])
        except (ValueError, KeyError):
            continue

    if not results:
        raise ValueError("All simulations failed")

    arr = np.array(results)

    return {
        "n_simulations": n_simulations,
        "n_successful": len(results),
        "mean": round(float(np.mean(arr)), 4),
        "median": round(float(np.median(arr)), 4),
        "std": round(float(np.std(arr)), 4),
        "min": round(float(np.min(arr)), 4),
        "max": round(float(np.max(arr)), 4),
        "p5": round(float(np.percentile(arr, 5)), 4),
        "p25": round(float(np.percentile(arr, 25)), 4),
        "p75": round(float(np.percentile(arr, 75)), 4),
        "p95": round(float(np.percentile(arr, 95)), 4),
        "unit": "$/lb",
        "baseline_price_per_lb": round(float(baseline["summary"]["estimated_price_per_lb"]), 4),
        "baseline_price_per_kg": round(float(baseline["summary"]["estimated_price_per_kg"]), 4),
        "composition": str(baseline["input_summary"]["composition"]),
        "catalyst_domain": req.catalyst_domain,
        "application_family": context["application_family"],
        "uncertainties_applied": uncertainties,
    }
