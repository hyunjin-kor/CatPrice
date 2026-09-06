"""Synthetic provider contracts exercise HTTP boundaries without sending network requests."""

import asyncio
import json
from datetime import date
from urllib.parse import parse_qs

import httpx
import pytest

from backend.core import price_fetcher as fetcher


def mock_http(monkeypatch, handler):
    client = httpx.AsyncClient
    monkeypatch.setattr(fetcher.httpx, "AsyncClient", lambda **kwargs: client(transport=httpx.MockTransport(handler), **kwargs))


def test_yahoo_keeps_successful_quotes_when_one_request_fails(monkeypatch):
    def handle(request):
        if "PA=F" in str(request.url):
            return httpx.Response(503)
        return httpx.Response(200, json={"chart": {"result": [{"meta": {"regularMarketPrice": 2204.62, "regularMarketTime": 1710000000}}]}})

    mock_http(monkeypatch, handle)
    result = asyncio.run(fetcher.fetch_yfinance())
    assert len(result) == 5
    assert "Pd" not in result
    assert result["Al"]["price"] == 1
    assert result["Cu"]["unit"] == "$/lb"


def test_paid_provider_keys_are_required_and_inverse_rates_are_normalized(monkeypatch):
    monkeypatch.setattr(fetcher.settings, "metals_dev_api_key", "")
    monkeypatch.setattr(fetcher.settings, "metalprice_api_key", "")
    for function in (fetcher.fetch_metals_dev, fetcher.fetch_metalprice_api):
        with pytest.raises(ValueError, match="not set"):
            asyncio.run(function())

    def handle(request):
        assert request.url.params["api_key"] == "synthetic-test-key"
        payload = {"metals": {"gold": 1000, "silver": None}} if request.url.host == "api.metals.dev" else {"rates": {"USDXAU": 0.001, "XPT": 0.002, "XPD": 0}}
        return httpx.Response(200, json=payload)

    mock_http(monkeypatch, handle)
    monkeypatch.setattr(fetcher.settings, "metals_dev_api_key", "synthetic-test-key")
    monkeypatch.setattr(fetcher.settings, "metalprice_api_key", "synthetic-test-key")
    metals = asyncio.run(fetcher.fetch_metals_dev())
    inverse = asyncio.run(fetcher.fetch_metalprice_api())
    assert set(metals) == {"Au"}
    assert metals["Au"]["price"] == inverse["Au"]["price"] == 1000
    assert inverse["Pt"]["price"] == 500
    assert "Pd" not in inverse


def test_kitco_mid_bid_ask_and_missing_quotes(monkeypatch):
    quotes = {"gold": {"results": [{"mid": 100}]}, "silver": {"results": [{"bid": 10, "ask": 12}]}, "platinum": {"results": [{"bid": 50}]}, "palladium": {"results": [{"bid": 0}]}}
    payload = {"props": {"pageProps": {"dehydratedState": {"queries": [{"queryKey": ["ignored"]}, {"queryKey": ["allMetalsQuote"], "state": {"data": quotes}}]}}}}
    page = '<script id="__NEXT_DATA__" type="application/json">' + json.dumps(payload) + "</script>"
    mock_http(monkeypatch, lambda _request: httpx.Response(200, text=page))
    result = asyncio.run(fetcher.fetch_kitco())
    assert {symbol: q["price"] for symbol, q in result.items()} == {"Au": 100, "Ag": 11, "Pt": 50}


@pytest.mark.parametrize("page", ["no embedded data", '<script id="__NEXT_DATA__" type="application/json">{}</script>', '<script id="__NEXT_DATA__" type="application/json">invalid</script>'])
def test_kitco_incomplete_markup_returns_no_fabricated_quote(monkeypatch, page):
    mock_http(monkeypatch, lambda _request: httpx.Response(200, text=page))
    assert asyncio.run(fetcher.fetch_kitco()) == {}


def test_jm_history_posts_date_window_and_retains_daily_observations(monkeypatch):
    seen = []

    def handle(request):
        seen.append(request)
        if request.method == "GET":
            return httpx.Response(200, text='<input id="getPortletId" value="prefix_"/><div id="getUrl">https://example.test/history?a=1&amp;b=2</div>')
        fields = parse_qs(request.content.decode())
        assert fields["prefix_start_Date"] == ["01-07-2026"]
        assert fields["prefix_end_Date"] == ["31-07-2026"]
        assert fields["prefix_selectedMetal0"] == ["Ru"]
        assert request.url.params["b"] == "2"
        return httpx.Response(200, json={"metalList": [{"metalCode": "Ru", "metalValueDate": "02/07/2026", "price": "10"}, {"metalCode": "Ru", "metalValueDate": "01/07/2026", "price": "8"}]})

    mock_http(monkeypatch, handle)
    result = asyncio.run(fetcher.fetch_johnson_matthey_history(date(2026, 7, 1), date(2026, 7, 31)))
    assert result["Ru"] == [{"date": "2026-07-01", "price": 8}, {"date": "2026-07-02", "price": 10}]
    assert [r.method for r in seen] == ["GET", "POST"]


def test_current_jm_and_markets_insider_sources_preserve_units(monkeypatch):
    def handle(request):
        if request.url.host == "matthey.com":
            return httpx.Response(200, text='<input id="currentMetalPrices" value="{&quot;currentMetalList&quot;:[{&quot;metalCode&quot;:&quot;Pt&quot;,&quot;price&quot;:&quot;100&quot;,&quot;metalValueDate&quot;:&quot;01/07/2026&quot;}]}"/>')
        return httpx.Response(200, text='<div class="price-section__current-value">2204.62</div>')

    mock_http(monkeypatch, handle)
    jm = asyncio.run(fetcher.fetch_johnson_matthey())
    mi = asyncio.run(fetcher.fetch_markets_insider())
    assert jm["Pt"]["unit"] == "$/troy_oz"
    assert jm["Pt"]["fetched_at"].startswith("2026-07-01")
    assert mi["Ni"]["price"] == 1
    assert mi["Ni"]["unit"] == "$/lb"


def test_history_clients_request_expected_series_and_units(monkeypatch):
    def handle(request):
        if request.url.host == "www.westmetall.com":
            assert request.url.params["field"] == "LME_Ni_cash"
            return httpx.Response(200, text="<tr><td>31. July 2026</td><td>2,204.62</td></tr>")
        if request.url.host == "api.imf.org":
            assert "PCOBA" in request.url.path
            assert request.url.params["startPeriod"] == "2026-07"
            return httpx.Response(200, text='<Obs TIME_PERIOD="2026-M07" OBS_VALUE="2204.62"/>')
        return httpx.Response(200, json={"chart": {"result": [{"timestamp": [1710000000], "indicators": {"quote": [{"close": [2204.62]}]}}]}})

    mock_http(monkeypatch, handle)
    assert asyncio.run(fetcher.fetch_westmetall_history("Ni"))[0]["price"] == 1
    assert asyncio.run(fetcher.fetch_imf_pcps_history("Co", date(2026, 7, 1)))[0]["price"] == 1
    assert asyncio.run(fetcher.fetch_history("Al"))[0]["price"] == 1
    assert asyncio.run(fetcher.fetch_westmetall_history("unknown")) == []
    assert asyncio.run(fetcher.fetch_imf_pcps_history("unknown", date(2026, 7, 1))) == []
    assert asyncio.run(fetcher.fetch_history("unknown")) == []


def test_comtrade_limits_periods_and_excludes_rows_without_weight(monkeypatch):
    def handle(request):
        assert len(request.url.params["period"].split(",")) == 12
        assert request.headers["Ocp-Apim-Subscription-Key"] == "synthetic-test-key"
        assert request.url.params["reporterCode"] == "842"
        return httpx.Response(200, json={"data": [{"period": "202607", "primaryValue": 10, "netWgt": 20}, {"period": "202607", "netWgt": 0}]})

    mock_http(monkeypatch, handle)
    assert asyncio.run(fetcher.fetch_comtrade_unit_values("281820", [], "synthetic-test-key")) == []
    points = asyncio.run(fetcher.fetch_comtrade_unit_values("281820", ["202607"] * 13, "synthetic-test-key"))
    assert points == [{"date": "2026-07-31", "price": 0.5}]


@pytest.mark.parametrize("name,args,empty", [
    ("fetch_johnson_matthey", (), {}), ("fetch_kitco", (), {}), ("fetch_markets_insider", (), {}),
    ("fetch_johnson_matthey_history", (date(2026, 7, 1), date(2026, 7, 31)), {}),
    ("fetch_westmetall_history", ("Ni",), []), ("fetch_imf_pcps_history", ("Co", date(2026, 7, 1)), []),
    ("fetch_history", ("Al",), []), ("fetch_comtrade_unit_values", ("281820", ["202607"], "synthetic-test-key"), []),
])
def test_http_failures_return_no_observations(monkeypatch, name, args, empty):
    def unavailable(request):
        raise httpx.ReadTimeout("synthetic offline failure", request=request)

    mock_http(monkeypatch, unavailable)
    assert asyncio.run(getattr(fetcher, name)(*args)) == empty


def test_reference_collection_averages_daily_jm_and_reports_missing_imf(monkeypatch):
    async def jm(_start, _end):
        return {symbol: [{"date": "2026-07-01", "price": 8}, {"date": "2026-07-31", "price": 12}, {"date": "2026-08-31", "price": 15}, {"date": "2026-09-01", "price": 500}] for symbol in fetcher.JM_HISTORY_SYMBOLS}

    async def imf(symbol, _start):
        if symbol == "Cu":
            raise ValueError("synthetic failed series")
        return [{"date": "2026-07-31", "price": 3}]

    monkeypatch.setattr(fetcher, "fetch_johnson_matthey_history", jm)
    monkeypatch.setattr(fetcher, "fetch_imf_pcps_history", imf)
    series, failures = asyncio.run(fetcher.fetch_reference_series(date(2026, 7, 1), date(2026, 9, 6)))
    assert series["Ru"]["points"] == [{"date": "2026-07-31", "price": 10}]
    assert all(s["last"] == "2026-07-31" for s in series.values())
    assert set(failures) == {"imf:Cu"}
    assert len(series) == 13


def test_reference_collection_reports_total_unavailability(monkeypatch):
    async def jm(_start, _end):
        raise httpx.ReadTimeout("synthetic offline failure")

    async def imf(_symbol, _start):
        return []

    monkeypatch.setattr(fetcher, "fetch_johnson_matthey_history", jm)
    monkeypatch.setattr(fetcher, "fetch_imf_pcps_history", imf)
    series, failures = asyncio.run(fetcher.fetch_reference_series(date(2026, 7, 1), date(2026, 9, 6)))
    assert series == {}
    assert len(failures) == 10
