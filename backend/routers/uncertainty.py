"""Monte Carlo uncertainty analysis endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlmodel import Session

from backend.core.uncertainty import run_cost_request_monte_carlo, run_monte_carlo
from backend.database import get_session
from backend.routers.calculator import _prepare_calculation_context
from backend.schemas.cost_input import CostCalculationRequest

router = APIRouter(prefix="/api", tags=["uncertainty"])


class UncertaintyRequest(BaseModel):
    calculation_input: CostCalculationRequest | None = None
    metal_symbol: str | None = None
    metal_price: float | None = Field(default=None, gt=0)
    metal_price_unit: str = "$/troy_oz"
    metal_loading_wt_pct: float | None = Field(default=None, gt=0, le=100)
    support_name: str = "Al2O3"
    support_price_per_lb: float = 0.50
    steps: list[str] = ["mixer_slurry", "incipient_wetness", "dryer_rotary_100_300C"]
    order_size_tons: float = 10.0
    n_simulations: int = Field(default=1000, ge=100, le=10000)
    seed: int | None = Field(default=None, ge=0)
    uncertainties: dict[str, list[float]] | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> "UncertaintyRequest":
        if self.uncertainties:
            for name, bounds in self.uncertainties.items():
                if len(bounds) != 2:
                    raise ValueError(
                        f"Uncertainty '{name}' must provide exactly two values: [low, high]"
                    )
                low, high = bounds
                if low <= 0 or high <= 0:
                    raise ValueError(
                        f"Uncertainty '{name}' must use strictly positive bounds"
                    )
                if low > high:
                    raise ValueError(
                        f"Uncertainty '{name}' must be a nondecreasing pair [low, high]"
                    )

        if self.calculation_input is not None:
            return self
        required = {
            "metal_symbol": self.metal_symbol,
            "metal_price": self.metal_price,
            "metal_loading_wt_pct": self.metal_loading_wt_pct,
        }
        missing = [name for name, value in required.items() if value in (None, "")]
        if missing:
            raise ValueError(
                "calculation_input is required unless legacy uncertainty fields are provided: "
                + ", ".join(missing)
            )
        return self


@router.post("/uncertainty")
def uncertainty_analysis(
    req: UncertaintyRequest,
    session: Session = Depends(get_session),
):
    """Run Monte Carlo simulation on cost estimation."""
    uncertainties = None
    if req.uncertainties:
        uncertainties = {k: tuple(v) for k, v in req.uncertainties.items()}

    try:
        if req.calculation_input is not None:
            context = _prepare_calculation_context(req.calculation_input, session)
            return run_cost_request_monte_carlo(
                req=req.calculation_input,
                context=context,
                uncertainties=uncertainties,
                n_simulations=req.n_simulations,
                seed=req.seed,
            )

        base_params = {
            "metal_symbol": req.metal_symbol,
            "metal_price": req.metal_price,
            "metal_price_unit": req.metal_price_unit,
            "metal_loading_wt_pct": req.metal_loading_wt_pct,
            "support_name": req.support_name,
            "support_price_per_lb": req.support_price_per_lb,
            "steps": req.steps,
            "order_size_tons": req.order_size_tons,
        }
        result = run_monte_carlo(
            base_params=base_params,
            uncertainties=uncertainties,
            n_simulations=req.n_simulations,
            seed=req.seed,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
