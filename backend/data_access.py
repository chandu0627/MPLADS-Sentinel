import csv
import re
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "processed"

DATASET_CONFIG = {
    "allocation": {
        "filename": "allocation_cleaned.csv",
        "source": "Official cleaned MPLADS allocation dataset",
        "grain": "Aggregate-level data; not project-level",
        "report_patterns": ("data_quality_summary.txt", "*allocation*cleaning_report.txt"),
    },
    "annexure": {
        "filename": "annexure_cleaned.csv",
        "source": "Official cleaned MPLADS annexure dataset",
        "grain": "Aggregate-level data; not project-level",
        "report_patterns": ("data_quality_summary.txt", "*annexure*cleaning_report.txt"),
    },
}


class DatasetNotFoundError(FileNotFoundError):
    pass


class MalformedDatasetError(ValueError):
    pass


def _dataset_config(dataset_name: str) -> dict:
    try:
        return DATASET_CONFIG[dataset_name]
    except KeyError as error:
        raise DatasetNotFoundError(f"Unknown dataset: {dataset_name}") from error


def _dataset_path(dataset_name: str) -> Path:
    config = _dataset_config(dataset_name)
    return DATA_DIR / config["filename"]


def _read_quality_notes(dataset_name: str) -> list[str]:
    config = _dataset_config(dataset_name)
    notes = []
    seen_paths = set()

    for pattern in config["report_patterns"]:
        for report_path in sorted(DATA_DIR.glob(pattern)):
            if report_path in seen_paths or not report_path.is_file():
                continue
            seen_paths.add(report_path)
            content = report_path.read_text(encoding="utf-8").strip()
            if content:
                notes.append(f"{report_path.name}: {content}")

    return notes


def _reporting_period(quality_notes: list[str]) -> str | None:
    period_pattern = re.compile(
        r"(?:reporting period|period)\s*[:=-]\s*([^\n]+)",
        re.IGNORECASE,
    )
    for note in quality_notes:
        match = period_pattern.search(note)
        if match:
            return match.group(1).strip()
    return None


def _read_rows(dataset_name: str) -> tuple[list[str], list[dict[str, str]]]:
    path = _dataset_path(dataset_name)
    if not path.is_file():
        raise DatasetNotFoundError(f"Dataset file is unavailable: {path.name}")

    try:
        with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
            reader = csv.DictReader(csv_file)
            columns = reader.fieldnames or []
            if not columns or any(not column.strip() for column in columns):
                raise MalformedDatasetError("Dataset must contain non-empty column names")

            rows = []
            for row_number, row in enumerate(reader, start=2):
                if None in row or any(value is None for value in row.values()):
                    raise MalformedDatasetError(f"Malformed row at line {row_number}")
                rows.append({column: row[column] for column in columns})
    except UnicodeDecodeError as error:
        raise MalformedDatasetError("Dataset is not valid UTF-8 CSV") from error
    except csv.Error as error:
        raise MalformedDatasetError("Dataset contains malformed CSV syntax") from error

    return columns, rows


def _column_type(values: list[str]) -> str:
    non_empty_values = [value for value in values if value.strip()]
    if not non_empty_values:
        return "string"
    if all(_is_integer(value) for value in non_empty_values):
        return "integer"
    if all(_is_number(value) for value in non_empty_values):
        return "number"
    return "string"


def _is_integer(value: str) -> bool:
    try:
        int(value.strip())
        return True
    except ValueError:
        return False


def _is_number(value: str) -> bool:
    try:
        float(value.strip())
        return True
    except ValueError:
        return False


def load_dataset(dataset_name: str) -> dict:
    columns, rows = _read_rows(dataset_name)
    config = _dataset_config(dataset_name)
    quality_notes = _read_quality_notes(dataset_name)

    return {
        "dataset_name": dataset_name,
        "source": config["source"],
        "reporting_period": _reporting_period(quality_notes),
        "row_count": len(rows),
        "grain": config["grain"],
        "columns": [
            {"name": column, "type": _column_type([row[column] for row in rows])}
            for column in columns
        ],
        "quality_notes": quality_notes,
        "records": rows,
    }


def filter_dataset(dataset_name: str, filters: dict[str, str]) -> dict:
    dataset = load_dataset(dataset_name)
    columns = [column["name"] for column in dataset["columns"]]
    columns_by_normalized_name = {column.strip().lower(): column for column in columns}
    invalid_filters = [
        field for field in filters if field.strip().lower() not in columns_by_normalized_name
    ]
    if invalid_filters:
        raise ValueError(
            "Unsupported filter column(s): " + ", ".join(sorted(invalid_filters))
        )

    normalized_filters = {
        columns_by_normalized_name[field.strip().lower()]: value
        for field, value in filters.items()
    }
    dataset["records"] = [
        row
        for row in dataset["records"]
        if all(row[column] == value for column, value in normalized_filters.items())
    ]
    dataset["row_count"] = len(dataset["records"])
    return dataset