"""Primary market boards and Yahoo fallback selection stay consistent across polls."""

import asyncio
from datetime import UTC, datetime

import pytest
from sqlmodel import select

from backend.core import price_fetcher
from backend.models.metal_price import MetalPrice
from backend.services import price_scheduler


def quote(symbol, source, price=10):
    return {"name": symbol, "price": price, "unit": "$/lb", "source": source,
            "fetched_at": "2026-09-03T00:00:00+00:00"}


@pytest.mark.parametrize("primary_available", [True, False])
def test_full_refresh_prefers_jm_and_westmetall_then_yahoo(monkeypatch, primary_available):
    symbols = ("Pt", "Pd", "Cu", "Al")

    async def yahoo():
        return {symbol: quote(symbol, "Yahoo Finance (live)", 10) for symbol in symbols}

    async def jm():
        return {symbol: quote(symbol, "Johnson Matthey (live)", 11) for symbol in ("Pt", "Pd")} if primary_available else {}

    async def westmetall():
        return {symbol: quote(symbol, "Westmetall (LME settlement)", 12) for symbol in ("Cu", "Al")} if primary_available else {}

    async def no_data():
        return {}

    monkeypatch.setattr(price_fetcher, "fetch_yfinance", yahoo)
    monkeypatch.setattr(price_fetcher, "fetch_johnson_matthey", jm)
    monkeypatch.setattr(price_fetcher, "fetch_westmetall", westmetall)
    monkeypatch.setattr(price_fetcher, "fetch_kitco", no_data)
    monkeypatch.setattr(price_fetcher, "fetch_markets_insider", no_data)
    monkeypatch.setattr(price_fetcher.settings, "metals_dev_api_key", "")
    monkeypatch.setattr(price_fetcher.settings, "metalprice_api_key", "")
    prices = asyncio.run(price_fetcher.fetch_all_prices())
    for symbol in symbols:
        expected = price_scheduler.YAHOO_PRIMARY_SOURCES[symbol] if primary_available else "Yahoo Finance"
        assert prices[symbol]["source"].startswith(expected)
    assert prices["Mo"]["price"] == 23.13


def test_full_refresh_keeps_anchors_when_network_sources_fail(monkeypatch):
    async def unavailable():
        raise RuntimeError("offline fixture")

    for name in ("fetch_yfinance", "fetch_johnson_matthey", "fetch_westmetall", "fetch_kitco", "fetch_markets_insider"):
        monkeypatch.setattr(price_fetcher, name, unavailable)
    monkeypatch.setattr(price_fetcher.settings, "metals_dev_api_key", "")
    monkeypatch.setattr(price_fetcher.settings, "metalprice_api_key", "")
    assert asyncio.run(price_fetcher.fetch_all_prices()) == price_fetcher.get_reference_prices()


def test_westmetall_current_feed_includes_copper_and_aluminum(monkeypatch):
    called = []

    async def history(symbol):
        called.append(symbol)
        return [{"date": "2026-09-03", "price": 5.0}]

    monkeypatch.setattr(price_fetcher, "fetch_westmetall_history", history)
    prices = asyncio.run(price_fetcher.fetch_westmetall())
    assert set(called) == {"Cu", "Al", "Ni", "Zn", "Sn"}
    assert price_fetcher.WESTMETALL_FIELDS["Cu"] == "LME_Cu_cash"
    assert price_fetcher.WESTMETALL_FIELDS["Al"] == "LME_Al_cash"
    assert prices["Al"]["unit"] == "$/lb"


def test_yahoo_poll_preserves_selected_primary_sources(session, monkeypatch):
    for symbol, source in price_scheduler.YAHOO_PRIMARY_SOURCES.items():
        session.add(MetalPrice(symbol=symbol, name=symbol, price=10, unit="$/lb",
                               source=source, basis="live", fetched_at=datetime(2026, 9, 3, tzinfo=UTC)))
    session.commit()

    async def yahoo():
        return {symbol: quote(symbol, "Yahoo Finance (live)", 11)
                for symbol in ("Pt", "Pd", "Cu", "Al", "Au", "Ag")}

    monkeypatch.setattr(price_scheduler, "engine", session.bind)
    monkeypatch.setattr(price_scheduler, "fetch_yfinance", yahoo)
    result = asyncio.run(price_scheduler.collect_prices(source="yahoo"))
    assert set(result) == {"Au", "Ag"}
    assert len(session.exec(select(MetalPrice)).all()) == 6
    latest = price_scheduler._latest_by_symbol(session, ["Pt", "Pd", "Cu", "Al"])
    assert all(row.price == 10 for row in latest.values())


def test_yahoo_poll_continues_a_fallback_selected_by_full_refresh(session, monkeypatch):
    session.add(MetalPrice(symbol="Cu", name="Copper", price=10, unit="$/lb",
                           source="Yahoo Finance (live)", basis="live", fetched_at=datetime(2026, 9, 3, tzinfo=UTC)))
    session.commit()

    async def yahoo():
        return {"Cu": quote("Cu", "Yahoo Finance (live)", 11)}

    monkeypatch.setattr(price_scheduler, "engine", session.bind)
    monkeypatch.setattr(price_scheduler, "fetch_yfinance", yahoo)
    assert asyncio.run(price_scheduler.collect_prices(source="yahoo"))["Cu"]["price"] == 11
    assert price_scheduler._latest_by_symbol(session, ["Cu"])["Cu"].price == 11
