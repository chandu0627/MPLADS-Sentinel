import argparse
import csv
import json
import math
from pathlib import Path

import numpy as np
from sklearn.ensemble import IsolationForest


RANDOM_STATE = 42
RISK_LEVELS = ("LOW", "MEDIUM", "HIGH")
ALLOCATION_AMOUNT_FIELD = "allocated_amount_inr"
REQUIRED_COLUMNS = (
    "serial_number",
    "state",
    "mp_name",
    "constituency",
    ALLOCATION_AMOUNT_FIELD,
)


def load_allocation_csv(path: Path) -> list[dict[str, str]]:
    """Load the cleaned allocation CSV without changing source values."""
    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if not reader.fieldnames or any(column not in reader.fieldnames for column in REQUIRED_COLUMNS):
            raise ValueError(f"Allocation CSV is missing required columns: {path}")
        return [dict(row) for row in reader]


def _parse_amount(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    try:
        amount = float(value.strip())
    except ValueError:
        return None
    return amount if math.isfinite(amount) else None


def _min_max_scale(values: np.ndarray) -> np.ndarray:
    minimum = float(values.min())
    maximum = float(values.max())
    if maximum == minimum:
        return np.zeros(values.shape, dtype=float)
    return np.clip((values - minimum) / (maximum - minimum), 0.0, 1.0)


def _statistical_scores(amounts: np.ndarray) -> np.ndarray:
    """Calculate a bounded robust baseline using the median and MAD."""
    median = float(np.median(amounts))
    mad = float(np.median(np.abs(amounts - median)))
    scale = mad * 1.4826
    if scale == 0:
        scale = float(np.std(amounts)) or 1.0
    robust_z = np.abs((amounts - median) / scale)
    return np.clip(robust_z / 5.0, 0.0, 1.0)


def _isolation_forest_scores(amounts: np.ndarray) -> np.ndarray:
    """Return reproducible Isolation Forest indicators for allocation values."""
    model = IsolationForest(
        n_estimators=200,
        contamination="auto",
        random_state=RANDOM_STATE,
    )
    reshaped = amounts.reshape(-1, 1)
    raw_scores = -model.fit(reshaped).decision_function(reshaped)
    return _min_max_scale(raw_scores)


def _risk_level(score: float) -> str:
    if score >= 0.66:
        return "HIGH"
    if score >= 0.33:
        return "MEDIUM"
    return "LOW"


def _explanation(risk_level: str) -> str:
    if risk_level == "HIGH":
        return "Allocation is unusually high or low compared with other allocations in the available dataset. This is a statistical anomaly indicator, not a fraud finding."
    if risk_level == "MEDIUM":
        return "Allocation differs moderately from the available allocation distribution. This is a statistical anomaly indicator, not a fraud finding."
    return "Allocation falls within the lower anomaly range of the available records. This is a statistical anomaly indicator, not a fraud finding."


def detect_allocation_anomalies(path: Path) -> list[dict]:
    """Return one allocation anomaly result per source row.

    The score combines 60% Isolation Forest and 40% median/MAD baseline.
    Only allocated_amount_inr is used as a substantive feature. The one
    missing amount remains unassessed and is never imputed. This detects
    statistical indicators for MP/constituency aggregates, not fraud.
    """
    rows = load_allocation_csv(path)
    valid_positions = []
    valid_amounts = []
    results = [None] * len(rows)

    for position, row in enumerate(rows):
        amount = _parse_amount(row.get(ALLOCATION_AMOUNT_FIELD))
        if amount is None:
            results[position] = {
                **{column: row.get(column, "") for column in REQUIRED_COLUMNS},
                "anomaly_score": 0.0,
                "risk_level": "LOW",
                "explanation": "Allocation amount is missing, so this record remains unassessed. No value was invented or imputed.",
                "assessment_status": "not_assessed_missing_value",
            }
            continue
        valid_positions.append(position)
        valid_amounts.append(amount)

    if valid_amounts:
        amounts = np.asarray(valid_amounts, dtype=float)
        isolation_scores = _isolation_forest_scores(amounts)
        baseline_scores = _statistical_scores(amounts)
        combined_scores = np.clip((0.6 * isolation_scores) + (0.4 * baseline_scores), 0.0, 1.0)

        for index, position in enumerate(valid_positions):
            score = float(combined_scores[index])
            risk_level = _risk_level(score)
            row = rows[position]
            results[position] = {
                **{column: row.get(column, "") for column in REQUIRED_COLUMNS},
                "anomaly_score": round(score, 6),
                "risk_level": risk_level,
                "explanation": _explanation(risk_level),
                "assessment_status": "assessed",
            }

    return [result for result in results if result is not None]


def main() -> None:
    parser = argparse.ArgumentParser(description="Run allocation-level MPLADS anomaly detection.")
    parser.add_argument(
        "--input",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "processed" / "allocation_cleaned.csv",
    )
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    output = detect_allocation_anomalies(arguments.input)
    rendered = json.dumps(output, indent=2)
    if arguments.output:
        arguments.output.write_text(rendered + "\n", encoding="utf-8")
    else:
        print(rendered)


if __name__ == "__main__":
    main()
