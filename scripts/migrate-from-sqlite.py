#!/usr/bin/env python3
"""One-off migration: portfolio.db (SQLite) -> Supabase (Postgres).

Run from wealthsync-web/:
    python scripts/migrate-from-sqlite.py

Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.
Reads SQLite from: ../WealthSync/portfolio.db
Pins all user-owned rows to the first auth.users row in Supabase.
"""
from __future__ import annotations

import json
import os
import sqlite3
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
SQLITE_DB = PROJECT_ROOT.parent / "WealthSync" / "portfolio.db"
ENV_FILE = PROJECT_ROOT / ".env.local"


def load_env() -> None:
    with open(ENV_FILE, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())


def http(method: str, url: str, body=None):
    headers = {
        "apikey": SERVICE_ROLE,
        "Authorization": f"Bearer {SERVICE_ROLE}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = Request(url, method=method, data=data, headers=headers)
    try:
        with urlopen(req) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else None
    except HTTPError as e:
        err = e.read().decode() if hasattr(e, "read") else str(e)
        print(f"\n  !! HTTP {e.code} on {method} {url}\n  !! {err[:500]}")
        raise


def to_date(value) -> str | None:
    """SQLite stores dates as ISO text; truncate to YYYY-MM-DD."""
    if not value:
        return None
    return str(value)[:10]


def to_ts(value) -> str | None:
    """Return ISO timestamp for timestamptz columns."""
    if not value:
        return None
    return str(value)


def insert_chunked(table: str, rows: list[dict], chunk: int = 500) -> list[dict]:
    if not rows:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    out: list[dict] = []
    for i in range(0, len(rows), chunk):
        piece = rows[i : i + chunk]
        result = http("POST", url, piece) or []
        out.extend(result)
    return out


def dedupe_by(rows: list[dict], keys: tuple[str, ...]) -> list[dict]:
    """Keep only the last row per composite key tuple."""
    seen: dict[tuple, dict] = {}
    for r in rows:
        k = tuple(r.get(key) for key in keys)
        seen[k] = r
    return list(seen.values())


def get_user_uuid() -> str:
    url = f"{SUPABASE_URL}/auth/v1/admin/users"
    data = http("GET", url) or {}
    users = data.get("users", [])
    if not users:
        print("No auth users found. Register an account first.")
        sys.exit(1)
    if len(users) > 1:
        print(f"  !! Multiple users found ({len(users)}). Using first.")
    return users[0]["id"]


def truncate_all(tables: list[str]) -> None:
    """Idempotency: wipe migration targets so re-runs don't duplicate."""
    # Use DELETE via REST — Supabase doesn't expose TRUNCATE over HTTP
    for t in tables:
        url = f"{SUPABASE_URL}/rest/v1/{t}?id=gt.0"
        http("DELETE", url)


def main() -> None:
    load_env()
    global SUPABASE_URL, SERVICE_ROLE
    SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
    SERVICE_ROLE = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not SERVICE_ROLE:
        print("SUPABASE_SERVICE_ROLE_KEY missing from .env.local")
        sys.exit(1)

    print(f"Supabase: {SUPABASE_URL}")
    print("Fetching user UUID...")
    user_id = get_user_uuid()
    print(f"  -> {user_id}")

    print(f"\nSQLite: {SQLITE_DB}")
    if not SQLITE_DB.exists():
        print("  !! portfolio.db not found")
        sys.exit(1)

    # Fresh start — clear any partial migration from prior attempts
    print("\nClearing any existing migration data in Supabase...")
    truncate_all(
        [
            "box3_snapshots",
            "retirement_scenarios",
            "price_alerts",
            "dividend_payments",
            "goals",
            "transactions",
            "asset_sectors",
            "asset_price_history",
            "portfolio_snapshots",
            "portfolio_history",
            "assets",
            "benchmark_history",
            "benchmarks",
        ]
    )

    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # ---- benchmarks (shared) ----
    print("\n[1/11] benchmarks ...")
    c.execute("SELECT id, name, symbol, description, is_active FROM benchmarks")
    rows = [dict(r) for r in c.fetchall()]
    old_bench_id: dict[int, int] = {}
    for r in rows:
        old_id = r.pop("id")
        r["is_active"] = bool(r["is_active"])
        inserted = insert_chunked("benchmarks", [r])
        old_bench_id[old_id] = inserted[0]["id"]
    print(f"  -> {len(rows)} inserted")

    # ---- benchmark_history (shared) ----
    print("\n[2/11] benchmark_history ...")
    c.execute("SELECT benchmark_id, symbol, price, date FROM benchmark_history ORDER BY date")
    rows = []
    for r in c.fetchall():
        new_bid = old_bench_id.get(r["benchmark_id"])
        if new_bid is None:
            continue
        rows.append(
            {
                "benchmark_id": new_bid,
                "symbol": r["symbol"],
                "price": r["price"],
                "date": to_date(r["date"]),
            }
        )
    # Some SQLite rows have timestamps; truncating to date can produce duplicates.
    # Keep the latest per (benchmark_id, date) — ORDER BY date above ensures "latest".
    rows = dedupe_by(rows, ("benchmark_id", "date"))
    insert_chunked("benchmark_history", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- assets (per-user) ----
    print("\n[3/11] assets ...")
    c.execute(
        """SELECT id, name, symbol, type, amount, value, purchase_price, notes,
                  source, dividend_yield, next_ex_date, payment_frequency,
                  sector, geography, last_updated
             FROM assets"""
    )
    old_asset_id: dict[int, int] = {}
    rows = []
    sqlite_assets = list(c.fetchall())
    for r in sqlite_assets:
        rows.append(
            {
                "user_id": user_id,
                "name": r["name"],
                "symbol": r["symbol"],
                "type": r["type"],
                "amount": r["amount"],
                "value": r["value"],
                "purchase_price": r["purchase_price"],
                "notes": r["notes"] or "",
                "source": r["source"] or "manual",
                "dividend_yield": r["dividend_yield"],
                "next_ex_date": to_date(r["next_ex_date"]),
                "payment_frequency": r["payment_frequency"],
                "sector": r["sector"],
                "geography": r["geography"],
                "last_updated": to_ts(r["last_updated"]),
            }
        )
    inserted_assets = insert_chunked("assets", rows)
    symbol_to_new_asset: dict[str, int] = {}
    for old_row, new_row in zip(sqlite_assets, inserted_assets):
        old_asset_id[old_row["id"]] = new_row["id"]
        symbol_to_new_asset[old_row["symbol"]] = new_row["id"]
    print(f"  -> {len(rows)} inserted")

    # ---- portfolio_history ----
    print("\n[4/11] portfolio_history ...")
    c.execute(
        """SELECT date, total_value, etf_value, crypto_value, commodity_value,
                  COALESCE(stock_value, 0) AS stock_value
             FROM portfolio_history"""
    )
    rows = [
        {
            "user_id": user_id,
            "date": to_date(r["date"]),
            "total_value": r["total_value"],
            "etf_value": r["etf_value"],
            "crypto_value": r["crypto_value"],
            "commodity_value": r["commodity_value"],
            "stock_value": r["stock_value"],
        }
        for r in c.fetchall()
    ]
    rows = dedupe_by(rows, ("user_id", "date"))
    insert_chunked("portfolio_history", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- portfolio_snapshots ----
    print("\n[5/11] portfolio_snapshots ...")
    c.execute(
        """SELECT date, total_value, total_invested, cash_flow,
                  benchmark_value, notes
             FROM portfolio_snapshots"""
    )
    rows = [
        {
            "user_id": user_id,
            "date": to_date(r["date"]),
            "total_value": r["total_value"],
            "total_invested": r["total_invested"],
            "cash_flow": r["cash_flow"],
            "benchmark_value": r["benchmark_value"],
            "notes": r["notes"],
        }
        for r in c.fetchall()
    ]
    rows = dedupe_by(rows, ("user_id", "date"))
    insert_chunked("portfolio_snapshots", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- asset_price_history ----
    # SQLite asset_ids here can be stale (orphaned from prior deletions), so map
    # by symbol as a fallback.
    print("\n[6/11] asset_price_history ...")
    c.execute("SELECT asset_id, symbol, price, date FROM asset_price_history")
    rows = []
    skipped = 0
    for r in c.fetchall():
        new_aid = old_asset_id.get(r["asset_id"]) or symbol_to_new_asset.get(r["symbol"])
        if new_aid is None:
            skipped += 1
            continue
        rows.append(
            {
                "user_id": user_id,
                "asset_id": new_aid,
                "symbol": r["symbol"],
                "price": r["price"],
                "date": to_ts(r["date"]),
            }
        )
    insert_chunked("asset_price_history", rows)
    print(f"  -> {len(rows)} inserted ({skipped} skipped — no matching symbol)")

    # ---- transactions ----
    print("\n[7/11] transactions ...")
    c.execute(
        """SELECT asset_id, type, symbol, quantity, price_per_unit,
                  total_value, currency, fees, notes, transaction_date,
                  tax_lot_id, wash_sale_disallowed, is_reinvested_dividend
             FROM transactions"""
    )
    rows = []
    for r in c.fetchall():
        rows.append(
            {
                "user_id": user_id,
                "asset_id": old_asset_id.get(r["asset_id"]),
                "type": r["type"],
                "symbol": r["symbol"],
                "quantity": r["quantity"],
                "price_per_unit": r["price_per_unit"],
                "total_value": r["total_value"],
                "currency": r["currency"] or "EUR",
                "fees": r["fees"] or 0,
                "notes": r["notes"],
                "transaction_date": to_date(r["transaction_date"]),
                "tax_lot_id": r["tax_lot_id"],
                "wash_sale_disallowed": r["wash_sale_disallowed"] or 0,
                "is_reinvested_dividend": bool(r["is_reinvested_dividend"]),
            }
        )
    insert_chunked("transactions", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- goals ----
    print("\n[8/11] goals ...")
    c.execute(
        """SELECT name, target_amount, current_amount, target_date,
                  status, completed_at
             FROM goals"""
    )
    rows = [
        {
            "user_id": user_id,
            "name": r["name"],
            "target_amount": r["target_amount"],
            "current_amount": r["current_amount"],
            "target_date": to_date(r["target_date"]),
            "status": r["status"] or "active",
            "completed_at": to_ts(r["completed_at"]),
        }
        for r in c.fetchall()
    ]
    insert_chunked("goals", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- box3_snapshots ----
    print("\n[9/11] box3_snapshots ...")
    c.execute(
        """SELECT snapshot_date, year, total_wealth, tax_free_allowance,
                  taxable_wealth, bracket1_amount, bracket1_rate,
                  bracket2_amount, bracket2_rate, bracket3_amount, bracket3_rate,
                  deemed_return, tax_rate, estimated_tax, notes
             FROM box3_snapshots"""
    )
    rows = [
        {
            "user_id": user_id,
            "snapshot_date": to_date(r["snapshot_date"]),
            "year": r["year"],
            "total_wealth": r["total_wealth"],
            "tax_free_allowance": r["tax_free_allowance"],
            "taxable_wealth": r["taxable_wealth"],
            "bracket1_amount": r["bracket1_amount"],
            "bracket1_rate": r["bracket1_rate"],
            "bracket2_amount": r["bracket2_amount"],
            "bracket2_rate": r["bracket2_rate"],
            "bracket3_amount": r["bracket3_amount"],
            "bracket3_rate": r["bracket3_rate"],
            "deemed_return": r["deemed_return"],
            "tax_rate": r["tax_rate"],
            "estimated_tax": r["estimated_tax"],
            "notes": r["notes"],
        }
        for r in c.fetchall()
    ]
    rows = dedupe_by(rows, ("user_id", "snapshot_date"))
    insert_chunked("box3_snapshots", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- asset_sectors (no user_id column; scoped via RLS to owning asset) ----
    print("\n[10/11] asset_sectors ...")
    c.execute("SELECT asset_id, sector, industry, geography, last_updated FROM asset_sectors")
    rows = []
    for r in c.fetchall():
        new_aid = old_asset_id.get(r["asset_id"])
        if new_aid is None:
            continue
        rows.append(
            {
                "asset_id": new_aid,
                "sector": r["sector"],
                "industry": r["industry"],
                "geography": r["geography"],
                "last_updated": to_ts(r["last_updated"]),
            }
        )
    rows = dedupe_by(rows, ("asset_id",))
    insert_chunked("asset_sectors", rows)
    print(f"  -> {len(rows)} inserted")

    # ---- dividend_payments ----
    print("\n[11/11] dividend_payments ...")
    c.execute(
        """SELECT asset_id, symbol, amount_per_share, total_amount, payment_date,
                  ex_dividend_date, record_date, currency, dividend_type,
                  source_country, withholding_tax_rate, withholding_tax_amount,
                  net_amount, notes
             FROM dividend_payments"""
    )
    rows = []
    for r in c.fetchall():
        new_aid = old_asset_id.get(r["asset_id"])
        if new_aid is None:
            continue
        rows.append(
            {
                "user_id": user_id,
                "asset_id": new_aid,
                "symbol": r["symbol"],
                "amount_per_share": r["amount_per_share"],
                "total_amount": r["total_amount"],
                "payment_date": to_date(r["payment_date"]),
                "ex_dividend_date": to_date(r["ex_dividend_date"]),
                "record_date": to_date(r["record_date"]),
                "currency": r["currency"] or "EUR",
                "dividend_type": r["dividend_type"] or "regular",
                "source_country": r["source_country"] or "NL",
                "withholding_tax_rate": r["withholding_tax_rate"] or 0,
                "withholding_tax_amount": r["withholding_tax_amount"] or 0,
                "net_amount": r["net_amount"],
                "notes": r["notes"],
            }
        )
    insert_chunked("dividend_payments", rows)
    print(f"  -> {len(rows)} inserted")

    conn.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
