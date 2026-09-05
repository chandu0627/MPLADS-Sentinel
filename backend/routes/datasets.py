from fastapi import APIRouter, HTTPException, Query, Request

from ..data_access import (
    DatasetNotFoundError,
    MalformedDatasetError,
    filter_dataset,
)


router = APIRouter(prefix="/datasets", tags=["datasets"])


def _load_or_raise(dataset_name: str, filters: dict[str, str] | None = None) -> dict:
    try:
        return filter_dataset(dataset_name, filters or {})
    except DatasetNotFoundError as error:
        if dataset_name not in ("allocation", "annexure"):
            raise HTTPException(status_code=404, detail=str(error)) from error
        raise HTTPException(status_code=503, detail=str(error)) from error
    except MalformedDatasetError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


def _metadata(dataset: dict) -> dict:
    return {key: value for key, value in dataset.items() if key != "records"}


@router.get("/{dataset_name}/summary")
def dataset_summary(dataset_name: str) -> dict:
    return _metadata(_load_or_raise(dataset_name))


@router.get("/{dataset_name}/records")
def dataset_records(
    dataset_name: str,
    request: Request,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=1000, ge=1, le=5000),
) -> dict:
    reserved_parameters = {"offset", "limit"}
    filters = {
        key: value
        for key, value in request.query_params.multi_items()
        if key not in reserved_parameters
    }
    dataset = _load_or_raise(dataset_name, filters)
    records = dataset.pop("records")[offset : offset + limit]
    return {**_metadata(dataset), "offset": offset, "limit": limit, "records": records}


@router.get("/{dataset_name}/metadata")
def dataset_metadata(dataset_name: str) -> dict:
    return _metadata(_load_or_raise(dataset_name))


@router.get("/{dataset_name}")
def dataset(dataset_name: str) -> dict:
    loaded = _load_or_raise(dataset_name)
    return {**_metadata(loaded), "records": loaded["records"]}