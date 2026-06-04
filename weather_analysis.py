#!/usr/bin/env python3
"""
Analyse weather log series — JSON stdin → JSON stdout.
Input: {"records": [{"temperature": 32, "humidity": 55, "wind_speed": 3.2}, ...]}
"""
from __future__ import annotations

import json
import statistics
import sys


def trend(values: list[float]) -> str:
    if len(values) < 2:
        return "stable"
    mid = len(values) // 2
    first = statistics.mean(values[:mid])
    last = statistics.mean(values[mid:])
    diff = last - first
    if diff > 1:
        return "rising"
    if diff < -1:
        return "falling"
    return "stable"


def safe_stat(values: list[float], fn):
    try:
        return round(fn(values), 2)
    except statistics.StatisticsError:
        return None


def main() -> None:
    try:
        payload = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError as exc:
        print(json.dumps({"success": False, "error": f"Invalid JSON: {exc}"}))
        sys.exit(1)

    records = payload.get("records", [])
    if not records:
        print(json.dumps({"success": False, "error": "Empty records array"}))
        sys.exit(1)

    temps = [float(r["temperature"]) for r in records if r.get("temperature") is not None]
    hums = [float(r["humidity"]) for r in records if r.get("humidity") is not None]
    winds = [float(r["wind_speed"]) for r in records if r.get("wind_speed") is not None]

    result = {
        "success": True,
        "record_count": len(records),
        "temperature": {
            "mean": safe_stat(temps, statistics.mean),
            "min": round(min(temps), 2) if temps else None,
            "max": round(max(temps), 2) if temps else None,
            "stdev": safe_stat(temps, statistics.stdev) if len(temps) > 1 else 0,
            "trend": trend(temps),
        },
        "humidity": {
            "mean": safe_stat(hums, statistics.mean),
            "min": round(min(hums), 2) if hums else None,
            "max": round(max(hums), 2) if hums else None,
            "trend": trend(hums),
        },
        "wind_speed": {
            "mean": safe_stat(winds, statistics.mean),
            "max": round(max(winds), 2) if winds else None,
            "trend": trend(winds),
        },
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
