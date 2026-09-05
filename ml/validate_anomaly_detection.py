import math
import unittest
from pathlib import Path

from ml.anomaly_detection import (
    REQUIRED_COLUMNS,
    RISK_LEVELS,
    detect_allocation_anomalies,
    load_allocation_csv,
)


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "allocation_cleaned.csv"
OUTPUT_COLUMNS = set(REQUIRED_COLUMNS) | {"anomaly_score", "risk_level", "explanation"}


class AllocationAnomalyValidation(unittest.TestCase):
    def test_real_allocation_dataset_and_reproducible_output(self) -> None:
        rows = load_allocation_csv(DATA_PATH)
        first_run = detect_allocation_anomalies(DATA_PATH)
        second_run = detect_allocation_anomalies(DATA_PATH)

        self.assertEqual(len(rows), 543)
        self.assertEqual(len(first_run), 543)
        self.assertEqual(sum(not row["allocated_amount_inr"].strip() for row in rows), 1)
        self.assertEqual(sum(row["assessment_status"] == "assessed" for row in first_run), 542)
        self.assertEqual(first_run, second_run)

        for result in first_run:
            self.assertTrue(OUTPUT_COLUMNS <= result.keys())
            self.assertTrue(math.isfinite(result["anomaly_score"]))
            self.assertIn(result["risk_level"], RISK_LEVELS)
            self.assertTrue(result["explanation"])

        missing = next(result for result in first_run if result["assessment_status"] == "not_assessed_missing_value")
        self.assertEqual(missing["anomaly_score"], 0.0)
        self.assertIn("remains unassessed", missing["explanation"])


if __name__ == "__main__":
    unittest.main()
