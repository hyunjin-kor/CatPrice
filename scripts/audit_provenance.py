"""Audit tracked JSON provenance without copying local proprietary extracts."""

import argparse
import asyncio
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

import httpx

ROOT = Path(__file__).resolve().parents[1]
URL_RE = re.compile(r"https?://[^\s<>\"'\\]+")
DOI_RE = re.compile(r"10\.\d{4,9}/[^\s<>\"'?#&\\]+", re.IGNORECASE)
SOURCE_KEYS = {
    "source", "quote_source", "citation", "citations", "references", "reference",
    "primary_reference", "report", "url", "doi", "data_origin", "provenance", "sources",
}


def clean_identifier(value):
    value = value.rstrip(".,;:")
    while value.endswith(")") and value.count(")") > value.count("("):
        value = value[:-1]
    return value


def source_key(key):
    key = key.lower()
    return key in SOURCE_KEYS or key.endswith(("_source", "_url", "_urls", "_doi"))


def strings(value, pointer=""):
    if isinstance(value, str):
        yield pointer, value
    elif isinstance(value, dict):
        for key, child in value.items():
            token = key.replace("~", "~0").replace("/", "~1")
            yield from strings(child, f"{pointer}/{token}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from strings(child, f"{pointer}/{index}")


def inventory():
    tracked = subprocess.check_output(
        ["git", "ls-files", "-z", "backend/data"], cwd=ROOT
    ).decode().split("\0")
    files, records, urls, dois = [], [], defaultdict(list), defaultdict(list)
    for name in sorted(path for path in tracked if path.endswith(".json")):
        path = ROOT / name
        raw = path.read_bytes()
        data = json.loads(raw.decode("utf-8-sig"))
        file_records = []
        citation_ids = {
            item["id"] for key in ("citations", "catalog_quotes")
            for item in data.get(key, []) if isinstance(item, dict) and "id" in item
        }

        def visit(value, pointer="", ancestor_source=False):
            if isinstance(value, dict):
                fields = sorted(key for key, child in value.items() if source_key(key) and child)
                refs = [identifier for key in ("literature_basis_ids", "catalog_quote_ids")
                        for identifier in value.get(key, [])]
                record = {
                    "file": name, "pointer": pointer or "/", "source_fields": fields,
                    "quote_source": bool(value.get("quote_source")),
                    "reference_url": bool(value.get("reference_url") or value.get("reference_urls")),
                    "doi_field": bool(value.get("doi") or value.get("DOI")),
                    "citation_ids": refs,
                    "unresolved_citation_ids": [ref for ref in refs if ref not in citation_ids],
                    "has_direct_source": bool(fields),
                    "has_ancestor_source": ancestor_source,
                    "has_resolved_citation": bool(refs) and all(ref in citation_ids for ref in refs),
                }
                file_records.append(record)
                for key, child in value.items():
                    token = key.replace("~", "~0").replace("/", "~1")
                    visit(child, f"{pointer}/{token}", ancestor_source or bool(fields))
            elif isinstance(value, list):
                for index, child in enumerate(value):
                    visit(child, f"{pointer}/{index}", ancestor_source)

        visit(data)
        for pointer, value in strings(data):
            location = {"file": name, "pointer": pointer}
            for url in sorted({clean_identifier(match) for match in URL_RE.findall(value)}):
                urls[url].append(location)
            for doi in sorted({clean_identifier(match).lower() for match in DOI_RE.findall(unquote(value))}):
                dois[doi].append(location)
        records.extend(file_records)
        files.append({
            "file": name, "sha256": hashlib.sha256(raw).hexdigest(),
            "records": len(file_records),
            **{key: sum(bool(record[key]) for record in file_records) for key in (
                "quote_source", "reference_url", "doi_field", "has_direct_source",
                "has_ancestor_source", "has_resolved_citation")},
            "without_direct_source": sum(not record["has_direct_source"] for record in file_records),
            "unresolved_citation_ids": sum(bool(record["unresolved_citation_ids"]) for record in file_records),
        })
    return files, records, dict(sorted(urls.items())), dict(sorted(dois.items()))


async def check_all(urls, dois, timeout, concurrency, reused, retry_dois=False):
    semaphore = asyncio.Semaphore(concurrency)
    hosts = defaultdict(lambda: asyncio.Semaphore(2))
    headers = {"User-Agent": "COMET-provenance-audit/1.0 (https://github.com/hyunjin-kor/COMET)"}
    results = {"urls": {}, "dois": {}}
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers) as client:

        async def check(kind, identifier):
            previous = reused.get(kind, {}).get(identifier)
            if previous and not (retry_dois and kind == "dois" and previous["status"] != "crossref_verified"):
                results[kind][identifier] = previous
                return
            url = ("https://api.crossref.org/works/" + quote(identifier, safe="")
                   if kind == "dois" else identifier)
            result = {"request_url": url}
            if previous:
                result["previous_attempts"] = [previous]
            async with hosts[urlsplit(url).netloc], semaphore:
                result["checked_at_utc"] = datetime.now(UTC).isoformat()
                try:
                    async with client.stream("GET", url) as response:
                        result.update({"http_status": response.status_code, "final_url": str(response.url),
                                       "redirect_statuses": [r.status_code for r in response.history]})
                        if 200 <= response.status_code < 300:
                            result["status"] = "reachable"
                            if kind == "dois":
                                await response.aread()
                                message = response.json().get("message", {})
                                result.update({"registered_doi": message.get("DOI"),
                                               "title": message.get("title", []),
                                               "publisher": message.get("publisher"),
                                               "container_title": message.get("container-title", [])})
                                result["status"] = ("crossref_verified" if str(message.get("DOI", "")).lower() == identifier
                                                    else "crossref_mismatch")
                        elif response.status_code in (404, 410):
                            result["status"] = "crossref_not_found" if kind == "dois" else "http_not_found"
                        else:
                            result["status"] = "unverified_http"
                except (httpx.HTTPError, ValueError) as error:
                    result.update({"status": "unverified_network", "error_type": type(error).__name__,
                                   "error": str(error)[:300]})
            results[kind][identifier] = result

        await asyncio.gather(*(check(kind, key) for kind, values in (("urls", urls), ("dois", dois)) for key in values))
    return {kind: dict(sorted(values.items())) for kind, values in results.items()}


def cell(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def markdown(result, evidence_name):
    summary = result["summary"]
    lines = [
        f"# Data provenance audit — {result['audit_date']}", "",
        f"Evidence: [{evidence_name}]({evidence_name}). Generated by `scripts/audit_provenance.py`.", "",
        "## Scope and interpretation", "",
        "All Git-tracked `backend/data/**/*.json` files are covered, including process templates. "
        "Ignored or untracked files, including the local proprietary `_catcost_raw_extract.json`, "
        "are excluded and no original workbook contents are reproduced. Input SHA-256 values are in the evidence file.", "",
        "A record is every JSON object, including nested objects and metadata/configuration maps; "
        "a primitive map (for example annual index values) is one record. These counts are structural "
        "coverage counts, not counts of independent measurements. The record table identifies every "
        "object by RFC 6901 JSON pointer. Direct source fields, ancestor-level context, and resolved "
        "benchmark citation IDs are reported separately. An ancestor citation list is only context; "
        "it does not establish support for each nested value. A source field or reachable URL never "
        "proves the scientific claim, price, licensing status, or citation relevance.", "",
        "Every HTTP(S) URL in every string (including notes) receives a GET with redirects. Every "
        "unique DOI receives a Crossref `/works/{doi}` query and an exact identifier comparison. "
        "`http_not_found` means observed 404/410, not a proven permanently dead source. Other HTTP "
        "errors (including 403/429), timeouts, and connection errors mean **확인 못 함**. A Crossref "
        "404 can mean another registration agency, particularly for Zenodo/DataCite DOIs.", "",
        f"Files: **{summary['files']}**; JSON object records: **{summary['records']}**; "
        f"without a direct source field: **{summary['without_direct_source']}**; "
        f"unique URLs: **{summary['unique_urls']}**; unique DOIs: **{summary['unique_dois']}**.", "",
        f"URL outcomes: `{json.dumps(summary['url_statuses'], sort_keys=True)}`. "
        f"DOI outcomes: `{json.dumps(summary['doi_statuses'], sort_keys=True)}`.", "",
        "## Per-file field coverage", "",
        "| File | Objects | quote_source | reference_url(s) | DOI field | Any direct source | Ancestor context | Resolved citation IDs | No direct source |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for row in result["files"]:
        values = [row[key] for key in ("file", "records", "quote_source", "reference_url", "doi_field",
                  "has_direct_source", "has_ancestor_source", "has_resolved_citation", "without_direct_source")]
        lines.append("| " + " | ".join(map(cell, values)) + " |")
    lines += ["", "## Observed not-found URLs for human review", "",
              "These are the HTTP 404/410 responses observed in this run. No source data were changed.", ""]
    missing = [(url, check) for url, check in result["checks"]["urls"].items()
               if check["status"] == "http_not_found"]
    for url, check in missing:
        lines.append(f"- [{url}]({url}) — HTTP {check['http_status']}.")
    if not missing:
        lines.append("None observed.")
    for kind, title in (("urls", "Exhaustive URL response inventory"), ("dois", "Exhaustive Crossref DOI inventory")):
        lines += ["", f"## {title}", "", "| Identifier | Occurrences | Outcome | HTTP | Final URL / registered title |",
                  "| --- | ---: | --- | ---: | --- |"]
        for identifier, check in result["checks"][kind].items():
            detail = ("; ".join(check.get("title", [])) if kind == "dois" else check.get("final_url", ""))
            detail = detail or check.get("error_type", "")
            values = [identifier, len(result["occurrences"][kind][identifier]), check["status"], check.get("http_status", "—"), detail]
            lines.append("| " + " | ".join(map(cell, values)) + " |")
    lines += ["", "## Per-record field coverage", "",
              "The compact flags are Q=quote_source, U=reference_url(s), D=DOI field, "
              "A=ancestor source context, C=resolved citation IDs. A dash means absent. "
              "Full identifiers and unresolved citation IDs are retained in the JSON evidence.", ""]
    for row in result["files"]:
        lines += [f"### {row['file']}", "", "| JSON pointer | Direct source fields | Q/U/D/A/C |", "| --- | --- | --- |"]
        for record in result["records"]:
            if record["file"] != row["file"]:
                continue
            flags = "/".join(flag if record[key] else "—" for flag, key in (
                ("Q", "quote_source"), ("U", "reference_url"), ("D", "doi_field"),
                ("A", "has_ancestor_source"), ("C", "has_resolved_citation")))
            values = [record["pointer"], ", ".join(record["source_fields"]) or "—", flags]
            lines.append("| " + " | ".join(map(cell, values)) + " |")
        lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", default=datetime.now(UTC).date().isoformat())
    parser.add_argument("--timeout", type=float, default=15)
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--reuse-checks", type=Path, help="Reuse dated HTTP evidence for unchanged identifiers")
    parser.add_argument("--retry-dois", action="store_true", help="Retry unverified DOI checks in reused evidence")
    args = parser.parse_args()
    started = datetime.now(UTC)
    files, records, urls, dois = inventory()
    print(f"Checking {len(files)} files, {len(records)} objects, {len(urls)} URLs, {len(dois)} DOIs", flush=True)
    reused = json.loads(args.reuse_checks.read_text(encoding="utf-8"))["checks"] if args.reuse_checks else {}
    checks = asyncio.run(check_all(urls, dois, args.timeout, args.concurrency, reused, args.retry_dois))
    result = {
        "audit_date": args.date, "started_at_utc": started.isoformat(),
        "finished_at_utc": datetime.now(UTC).isoformat(),
        "scope": "git-tracked backend/data/**/*.json; object-level structural provenance; no value verification",
        "summary": {"files": len(files), "records": len(records),
                    "without_direct_source": sum(not record["has_direct_source"] for record in records),
                    "unique_urls": len(urls), "unique_dois": len(dois),
                    "url_statuses": dict(Counter(check["status"] for check in checks["urls"].values())),
                    "doi_statuses": dict(Counter(check["status"] for check in checks["dois"].values()))},
        "files": files, "records": records, "occurrences": {"urls": urls, "dois": dois}, "checks": checks,
    }
    output = ROOT / "docs" / "sources"
    output.mkdir(parents=True, exist_ok=True)
    evidence = output / f"provenance-{args.date}.json"
    evidence.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / f"provenance-{args.date}.md").write_text(markdown(result, evidence.name), encoding="utf-8")
    print(json.dumps(result["summary"], sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
