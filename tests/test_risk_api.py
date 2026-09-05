import math

from fastapi.testclient import TestClient

from backend.app import app


client = TestClient(app)


def test_allocation_risk_endpoint() -> None:
    response = client.get("/risk/allocation")

    assert response.status_code == 200
    records = response.json()
    assert len(records) == 543

    missing_records = [
        record
        for record in records
        if record["assessment_status"] == "not_assessed_missing_value"
    ]
    assert len(missing_records) == 1
    assert missing_records[0]["anomaly_score"] is None
    assert missing_records[0]["risk_level"] == "NOT_ASSESSED"

    assessed_records = [record for record in records if record["assessment_status"] == "assessed"]
    assert len(assessed_records) == 542
    assert all(math.isfinite(record["anomaly_score"]) for record in assessed_records)
    assert all(record["risk_level"] in {"LOW", "MEDIUM", "HIGH", "NOT_ASSESSED"} for record in records)


def test_annexure_risk_endpoint() -> None:
    response = client.get("/risk/annexure")

    assert response.status_code == 200
    records = response.json()
    assert len(records) == 38

    state_records = [record for record in records if record["record_type"] == "state_aggregate"]
    summary_records = [record for record in records if record["record_type"] != "state_aggregate"]
    assert len(state_records) == 36
    assert all(record["assessment_status"] == "assessed" for record in state_records)
    assert all(math.isfinite(record["anomaly_score"]) for record in state_records)
    assert len(summary_records) == 2
    assert all(record["anomaly_score"] is None for record in summary_records)
    assert all(record["risk_level"] == "NOT_ASSESSED" for record in summary_records)
    assert all(
        record["assessment_status"] == "not_assessed_summary_row"
        for record in summary_records
    )


def test_existing_dataset_and_health_endpoints() -> None:
    assert client.get("/projects").status_code == 200
    assert client.get("/health").json() == {"status": "healthy"}