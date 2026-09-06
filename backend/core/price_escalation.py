"""Price escalation using ChemPPI and CEPCI indices.

Adjusts costs between reference years using producer price indices.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from backend.paths import data_dir

_DATA_DIR = data_dir()


def _coerce_index_value(index_type: str, value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, dict):
        if index_type == "cepci":
            for key in ("CEPCI_equip", "CEPCI"):
                if key in value and value[key] not in (None, ""):
                    return float(value[key])
        for nested_value in value.values():
            if nested_value not in (None, ""):
                return float(nested_value)
    raise TypeError(f"Unsupported {index_type} index value: {value!r}")


def _load_index(index_type: str) -> dict[str, float]:
    """Load index data from JSON file."""
    filepath = _DATA_DIR / f"{index_type}.json"
    stat = filepath.stat()
    return dict(_read_index(filepath, index_type, stat.st_mtime_ns, stat.st_size))


@lru_cache(maxsize=8)
def _read_index(filepath: Path, index_type: str, _mtime_ns: int, _size: int) -> dict[str, float]:
    """Reuse parsed indices until a file changes, including after a BLS update."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)
    return {str(k): _coerce_index_value(index_type, v) for k, v in data["annual"].items()}


def latest_index_year(index_type: str = "chemppi") -> int:
    """Latest year covered by the shipped index — the natural escalation target.

    Reading it from the data keeps "today's basis" current whenever the index
    file gains a new year (e.g. via the BLS updater) instead of trailing a
    hardcoded constant.
    """
    return max(int(year) for year in _load_index(index_type))


def escalate_cost(
    cost: float,
    from_year: int,
    to_year: int,
    index_type: str = "chemppi",
    index_data: dict[str, float] | None = None,
) -> float:
    """Escalate a cost from one year to another using a price index.

    Args:
        cost: Original cost value.
        from_year: Year of the original cost basis.
        to_year: Target year for escalation.
        index_type: "chemppi" for operating/materials costs,
                    "cepci" for equipment/capital costs.
        index_data: Optional pre-loaded index dict. If None, loads from file.

    Returns:
        Escalated cost value.

    Raises:
        KeyError: If a year is not found in the index data.
    """
    if from_year == to_year:
        return cost

    if index_data is None:
        index_data = _load_index(index_type)

    from_key = str(from_year)
    to_key = str(to_year)

    if from_key not in index_data:
        raise KeyError(f"Year {from_year} not found in {index_type} index data")
    if to_key not in index_data:
        raise KeyError(f"Year {to_year} not found in {index_type} index data")
    if index_data[from_key] == 0:
        raise ValueError(
            f"{index_type} index for {from_year} is zero; cannot escalate from a zero base"
        )

    return cost * (index_data[to_key] / index_data[from_key])


def get_escalation_factor(
    from_year: int,
    to_year: int,
    index_type: str = "chemppi",
) -> float:
    """Get the escalation factor between two years.

    Args:
        from_year: Base year.
        to_year: Target year.
        index_type: "chemppi" or "cepci".

    Returns:
        Multiplicative escalation factor.
    """
    if from_year == to_year:
        return 1.0
    index_data = _load_index(index_type)
    from_key = str(from_year)
    if index_data[from_key] == 0:
        raise ValueError(
            f"{index_type} index for {from_year} is zero; cannot compute escalation factor"
        )
    return index_data[str(to_year)] / index_data[from_key]
