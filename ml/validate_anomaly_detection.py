import math
import unittest
from pathlib import Path

from ml.anomaly_detection import (
    ANNEXURE_FEATURES,
    ANNEXURE_NOT_ASSESSED,
    REQUIRED_COLUMNS,
    RISK_LEVELS,
    detect_allocation_anomalies,
    detect_annexure_anomalies,
    load_annexure_csv,
    load_allocation_csv,
)


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "allocation_cleaned.csv"
ANNEXURE_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "annexure_cleaned.csv"
OUTPUT_COLUMNS = set(REQUIRED_COLUMNS) | {"anomaly_score", "risk_level", "explanation"}
ANNEXURE_OUTPUT_COLUMNS = {
    "serial_number",
    "state",
    "record_type",
    "anomaly_score",
    "risk_level",
    "explanation",
    "assessment_status",
}


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

    def test_real_annexure_dataset_and_reproducible_output(self) -> None:
        rows = load_annexure_csv(ANNEXURE_PATH)
        first_run = detect_annexure_anomalies(ANNEXURE_PATH)
        second_run = detect_annexure_anomalies(ANNEXURE_PATH)

        self.assertEqual(len(rows), 38)
        self.assertEqual(sum(row["record_type"] == "state_aggregate" for row in rows), 36)
        self.assertEqual(sum(row["record_type"] != "state_aggregate" for row in rows), 2)
        self.assertEqual(len(first_run), 38)
        self.assertEqual(first_run, second_run)

        for result in first_run:
            self.assertTrue(ANNEXURE_OUTPUT_COLUMNS <= result.keys())
            if result["record_type"] == "state_aggregate":
                self.assertEqual(result["assessment_status"], "assessed")
                self.assertIsNotNone(result["anomaly_score"])
                self.assertTrue(math.isfinite(result["anomaly_score"]))
                self.assertIn(result["risk_level"], RISK_LEVELS)
            else:
                self.assertIsNone(result["anomaly_score"])
                self.assertEqual(result["risk_level"], ANNEXURE_NOT_ASSESSED)
                self.assertEqual(result["assessment_status"], "not_assessed_summary_row")

        self.assertEqual(sum(result["assessment_status"] == "assessed" for result in first_run), 36)
        self.assertEqual(sum(result["risk_level"] == ANNEXURE_NOT_ASSESSED for result in first_run), 2)


if __name__ == "__main__":
    unittest.main()
