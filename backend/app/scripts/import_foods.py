"""Import or update foods (or tips) from a CSV file.

Usage (from the backend folder):
    python -m app.scripts.import_foods data/foods_seed.csv
    python -m app.scripts.import_foods data/tips_seed.csv --tips
"""

from __future__ import annotations

import argparse
from pathlib import Path

from sqlmodel import Session

from app.db import engine, init_db
from app.seed import import_csv


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", type=Path)
    ap.add_argument("--tips", action="store_true", help="import tips instead of foods")
    args = ap.parse_args()

    init_db()
    with Session(engine) as session:
        n = import_csv(session, args.csv, "tip" if args.tips else "food")
    print(f"Imported {n} {'tips' if args.tips else 'foods'} from {args.csv}")


if __name__ == "__main__":
    main()
