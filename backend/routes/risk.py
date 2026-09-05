from pathlib import Path

from fastapi import APIRouter, HTTPException

from ml.anomaly_detection import (
    detect_allocation_anomalies,
    detect_annexure_anomalies,
)


router = APIRouter(prefix="/risk", tags=["risk"])

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
ALLOCATION_DATASET = REPOSITORY_ROOT / "data" / "processed" / "allocation_cleaned.csv"
ANNEXURE_DATASET = REPOSITORY_ROOT / "data" / "processed" / "annexure_cleaned.csv"


def _load_results(dataset_path: Path, detector) -> list[dict]:
    if not dataset_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"Risk dataset not found: {dataset_path}",
        )

    try:
        return detector(dataset_path)
    except (OSError, ValueError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Risk dataset could not be read or processed: {dataset_path}",
        ) from error


@router.get("/allocation")
def allocation_risk() -> list[dict]:
    results = _load_results(ALLOCATION_DATASET, detect_allocation_anomalies)
    for result in results:
        if result["assessment_status"] == "not_assessed_missing_value":
            result["anomaly_score"] = None
            result["risk_level"] = "NOT_ASSESSED"
    return results


@router.get("/annexure")
def annexure_risk() -> list[dict]:
    return _load_results(ANNEXURE_DATASET, detect_annexure_anomalies)