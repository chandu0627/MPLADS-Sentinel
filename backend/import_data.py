import argparse
import csv
import math
import re
import sqlite3
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .database.database import get_connection, initialize_database


FIELD_ALIASES = {
    "project_id": ("project_id", "project id", "project number", "project code"),
    "state": ("state", "state name"),
    "district": ("district", "district name"),
    "project_type": ("project_type", "project type", "type", "work type"),
    "approved_amount": (
        "approved_amount",
        "approved amount",
        "sanctioned amount",
        "sanctioned_amount",
        "approved cost",
    ),
    "expenditure": (
        "expenditure",
        "expenditure amount",
        "amount spent",
        "spent amount",
    ),
    "status": ("status", "project status"),
}

REQUIRED_FIELDS = tuple(FIELD_ALIASES)


def normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.strip().lower()).strip()


def resolve_columns(fieldnames: list[str]) -> dict[str, str]:
    normalized_headers = {
        normalize_header(fieldname): fieldname
        for fieldname in fieldnames
        if fieldname
    }
    resolved = {}

    for field, aliases in FIELD_ALIASES.items():
        for alias in aliases:
            source_header = normalized_headers.get(normalize_header(alias))
            if source_header is not None:
                resolved[field] = source_header
                break

    return resolved


def clean_amount(value: str) -> float:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("amount is empty")

    if cleaned.startswith("(") and cleaned.endswith(")"):
        cleaned = "-" + cleaned[1:-1]

    cleaned = re.sub(r"[₹$€£,\s]", "", cleaned)
    try:
        amount = Decimal(cleaned)
    except InvalidOperation as error:
        raise ValueError("amount is not numeric") from error

    amount_as_float = float(amount)
    if not math.isfinite(amount_as_float):
        raise ValueError("amount is not finite")

    return amount_as_float


def ensure_import_columns(connection: sqlite3.Connection) -> None:
    existing_columns = {
        row[1] for row in connection.execute("PRAGMA table_info(projects)")
    }
    columns_to_add = {
        "project_id": "TEXT",
        "project_type": "TEXT",
        "approved_amount": "REAL",
        "expenditure": "REAL",
    }

    for column_name, column_type in columns_to_add.items():
        if column_name not in existing_columns:
            connection.execute(
                f"ALTER TABLE projects ADD COLUMN {column_name} {column_type}"
            )

    connection.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS "
        "idx_projects_project_id ON projects(project_id)"
    )


def import_csv(csv_path: Path) -> int:
    rows_read = 0
    rows_inserted = 0
    rows_skipped = 0
    duplicate_project_ids = 0
    invalid_rows = 0

    initialize_database()

    with csv_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        fieldnames = reader.fieldnames or []
        column_map = resolve_columns(fieldnames)
        missing_fields = [
            field for field in REQUIRED_FIELDS if field not in column_map
        ]

        if missing_fields:
            print("Import could not start: required CSV columns are missing.")
            print("Missing fields:", ", ".join(missing_fields))
            print("Rows read: 0")
            print("Rows inserted: 0")
            print("Rows skipped: 0")
            print("Duplicate project IDs: 0")
            print("Invalid rows: 0")
            return 1

        with get_connection() as connection:
            ensure_import_columns(connection)

            for row_number, row in enumerate(reader, start=2):
                rows_read += 1
                try:
                    values = {
                        field: (row.get(source_header) or "").strip()
                        for field, source_header in column_map.items()
                    }
                    empty_fields = [
                        field for field in REQUIRED_FIELDS if not values[field]
                    ]
                    if empty_fields:
                        raise ValueError(
                            "empty required field(s): " + ", ".join(empty_fields)
                        )

                    approved_amount = clean_amount(values["approved_amount"])
                    expenditure = clean_amount(values["expenditure"])

                    existing = connection.execute(
                        "SELECT 1 FROM projects WHERE project_id = ?",
                        (values["project_id"],),
                    ).fetchone()
                    if existing is not None:
                        duplicate_project_ids += 1
                        rows_skipped += 1
                        continue

                    connection.execute(
                        """
                        INSERT INTO projects (
                            name,
                            state,
                            district,
                            status,
                            project_id,
                            project_type,
                            approved_amount,
                            expenditure
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            values["project_type"],
                            values["state"],
                            values["district"],
                            values["status"],
                            values["project_id"],
                            values["project_type"],
                            approved_amount,
                            expenditure,
                        ),
                    )
                    rows_inserted += 1
                except (KeyError, ValueError, sqlite3.IntegrityError) as error:
                    invalid_rows += 1
                    rows_skipped += 1
                    print(f"Skipped row {row_number}: {error}")

    print("Import completed.")
    print()
    print(f"Rows read: {rows_read}")
    print(f"Rows inserted: {rows_inserted}")
    print(f"Rows skipped: {rows_skipped}")
    print(f"Duplicate project IDs: {duplicate_project_ids}")
    print(f"Invalid rows: {invalid_rows}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import real MPLADS project data from CSV into SQLite."
    )
    parser.add_argument("csv_path", type=Path, help="Path to the source CSV file")
    arguments = parser.parse_args()

    if not arguments.csv_path.is_file():
        parser.error(f"CSV file not found: {arguments.csv_path}")

    return import_csv(arguments.csv_path)


if __name__ == "__main__":
    raise SystemExit(main())
