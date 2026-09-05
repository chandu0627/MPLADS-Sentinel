import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from starlette.requests import Request

from backend import data_access
from backend.routes.datasets import dataset, dataset_records, dataset_summary


class DatasetApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        self.dataset_dir = Path(self.temp_directory.name)
        (self.dataset_dir / "allocation_cleaned.csv").write_text(
            "State,Year,Allocated Amount\nDelhi,2023,100\nKerala,2024,200\n",
            encoding="utf-8",
        )
        (self.dataset_dir / "annexure_cleaned.csv").write_text(
            "State,District,Completed Works\nDelhi,Central,4\nKerala,Ernakulam,7\n",
            encoding="utf-8",
        )
        (self.dataset_dir / "data_quality_summary.txt").write_text(
            "Reporting period: 2023-24\nWhitespace was cleaned.",
            encoding="utf-8",
        )
        self.data_dir_patch = patch.object(data_access, "DATA_DIR", self.dataset_dir)
        self.data_dir_patch.start()

    def tearDown(self) -> None:
        self.data_dir_patch.stop()
        self.temp_directory.cleanup()

    @staticmethod
    def request(query_string: str = "") -> Request:
        return Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/datasets/allocation/records",
                "query_string": query_string.encode(),
                "headers": [],
                "scheme": "http",
                "server": ("testserver", 80),
                "client": ("testclient", 50000),
            }
        )

    def test_dataset_loading_reports_columns_types_and_grain(self) -> None:
        loaded = data_access.load_dataset("allocation")

        self.assertEqual(loaded["row_count"], 2)
        self.assertEqual(loaded["grain"], "Aggregate-level data; not project-level")
        self.assertEqual(loaded["reporting_period"], "2023-24")
        self.assertEqual(
            loaded["columns"],
            [
                {"name": "State", "type": "string"},
                {"name": "Year", "type": "integer"},
                {"name": "Allocated Amount", "type": "integer"},
            ],
        )

    def test_summary_and_records_response(self) -> None:
        summary = dataset_summary("allocation")
        records = dataset_records("allocation", self.request(), offset=0, limit=1000)

        self.assertEqual(summary["row_count"], 2)
        self.assertTrue(summary["quality_notes"])
        self.assertEqual(len(records["records"]), 2)
        self.assertEqual(records["records"][0]["State"], "Delhi")

    def test_filtering_uses_only_columns_from_that_dataset(self) -> None:
        allocation = dataset_records(
            "allocation", self.request("State=Delhi"), offset=0, limit=1000
        )
        annexure = dataset_records(
            "annexure",
            Request(
                {
                    "type": "http",
                    "method": "GET",
                    "path": "/datasets/annexure/records",
                    "query_string": b"District=Ernakulam",
                    "headers": [],
                }
            ),
            offset=0,
            limit=1000,
        )

        self.assertEqual(len(allocation["records"]), 1)
        self.assertEqual(allocation["records"][0]["State"], "Delhi")
        self.assertEqual(annexure["records"][0]["District"], "Ernakulam")
        with self.assertRaises(HTTPException) as error:
            dataset_records(
                "allocation", self.request("District=Central"), offset=0, limit=1000
            )
        self.assertEqual(error.exception.status_code, 400)

    def test_allocation_and_annexure_are_not_cross_joined(self) -> None:
        allocation = dataset("allocation")
        annexure = dataset("annexure")

        self.assertEqual(allocation["dataset_name"], "allocation")
        self.assertEqual(annexure["dataset_name"], "annexure")
        self.assertIn("Allocated Amount", allocation["records"][0])
        self.assertIn("Completed Works", annexure["records"][0])
        self.assertNotEqual(allocation["records"], annexure["records"])

    def test_empty_dataset_is_served_as_empty(self) -> None:
        (self.dataset_dir / "allocation_cleaned.csv").write_text(
            "State,Amount\n", encoding="utf-8"
        )

        response = dataset_records("allocation", self.request(), offset=0, limit=1000)

        self.assertEqual(response["row_count"], 0)
        self.assertEqual(response["records"], [])

    def test_missing_and_malformed_dataset_errors(self) -> None:
        (self.dataset_dir / "allocation_cleaned.csv").unlink()
        with self.assertRaises(HTTPException) as missing_error:
            dataset_summary("allocation")
        self.assertEqual(missing_error.exception.status_code, 503)

        (self.dataset_dir / "allocation_cleaned.csv").write_text(
            "State,Amount\nDelhi,100,unexpected\n", encoding="utf-8"
        )
        with self.assertRaises(HTTPException) as malformed_error:
            dataset_records("allocation", self.request(), offset=0, limit=1000)
        self.assertEqual(malformed_error.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
