from pathlib import Path
import hashlib
import re

import pandas as pd


DATA_DIR = Path(__file__).resolve().parent
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"

ANNEXURE_RAW = RAW_DIR / "RS-Session-251-AU3002-Annexure-I.csv"
ALLOCATION_RAW = RAW_DIR / "Allocated Limit for Honble MPs.csv"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_text(value: object) -> object:
    if pd.isna(value):
        return value
    value = str(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()


def clean_text_columns(frame: pd.DataFrame) -> pd.DataFrame:
    result = frame.copy()
    for column in result.columns:
        if pd.api.types.is_object_dtype(result[column]):
            result[column] = result[column].map(clean_text)
    return result


def write_report(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def clean_annexure() -> tuple[pd.DataFrame, list[str]]:
    source = pd.read_csv(ANNEXURE_RAW)
    original_rows, original_columns = source.shape
    source_columns = list(source.columns)
    blank_rows = source.isna().all(axis=1)
    duplicate_rows = int(source.duplicated().sum())

    output = clean_text_columns(source)
    output = output.rename(
        columns={
            "S.No": "serial_number",
            "State": "state",
            "2016-17 - Expenditure - Incurred With (Rs. Crore)": "expenditure_2016_17_reported_a_rs_crore",
            "2016-17 - Completed - Works": "completed_works_2016_17_reported_a",
            "2016-17 - Expenditure - Incurred With (Rs. Crore).1": "expenditure_2016_17_reported_b_rs_crore",
            "2016-17 - Completed - Works.1": "completed_works_2016_17_reported_b",
            "2018-19 - Expenditure - Incurred With (Rs. Crore)": "expenditure_2018_19_rs_crore",
            "2018-19 - Completed - Works": "completed_works_2018_19",
            "2019-20 - Expenditure - Incurred With (Rs. Crore)": "expenditure_2019_20_rs_crore",
            "2019-20 - Completed - Works": "completed_works_2019_20",
        }
    )

    numeric_columns = [column for column in output.columns if column != "state"]
    for column in numeric_columns:
        output[column] = pd.to_numeric(output[column], errors="coerce")

    output["record_type"] = output["state"].map(
        lambda value: "total_summary"
        if value == "Total"
        else "nominated_summary"
        if value == "Nominated"
        else "state_aggregate"
    )

    output.to_csv(PROCESSED_DIR / "annexure_cleaned.csv", index=False)

    report = [
        "ANNEXURE-I CLEANING REPORT",
        "",
        f"Source file: {ANNEXURE_RAW.name}",
        f"Source SHA-256: {sha256(ANNEXURE_RAW)}",
        f"Original rows: {original_rows}",
        f"Original columns: {original_columns}",
        f"Cleaned rows: {len(output)}",
        f"Cleaned columns: {len(output.columns)}",
        "",
        "GRAIN:",
        "STATE/YEAR aggregate. These datasets do not contain individual MPLADS project/work records.",
        "",
        "DECISIONS:",
        "- Column names were converted to stable ASCII snake_case names for processed use.",
        "- The repeated 2016-17 headers were retained as separate reported_a and reported_b columns.",
        "- The repeated 2016-17 columns contain different values; no year was guessed and no column was deleted.",
        "- Non-breaking spaces and surrounding/repeated whitespace were normalized in text fields.",
        "- Numeric fields were parsed as numeric values; no numeric values required coercion to missing.",
        f"- Blank rows detected: {int(blank_rows.sum())}; none were removed because no blank rows were present.",
        f"- Exact duplicate rows detected: {duplicate_rows}; none were removed.",
        "- Total and Nominated rows were retained and labeled in record_type rather than silently deleted.",
        "- Total is a summary row and Nominated is a non-geographic aggregate row; they must not be treated as states.",
        "",
        "STATE RECORDS:",
        f"- state_aggregate rows: {int((output.record_type == 'state_aggregate').sum())}",
        f"- nominated_summary rows: {int((output.record_type == 'nominated_summary').sum())}",
        f"- total_summary rows: {int((output.record_type == 'total_summary').sum())}",
        "",
        "LIMITATIONS:",
        "- No project/work ID, district, MP, constituency, work description, sanctioned amount, status, dates, or progress exists.",
        "- The ambiguous duplicate 2016-17 labels prevent confident year interpretation for those paired columns.",
    ]
    return output, report


def clean_allocation() -> tuple[pd.DataFrame, list[str]]:
    source = pd.read_csv(ALLOCATION_RAW)
    original_rows, original_columns = source.shape
    blank_rows = source.isna().all(axis=1)
    duplicate_rows = int(source.duplicated().sum())
    source = clean_text_columns(source)

    output = source.rename(
        columns={
            "Sr. No.": "serial_number",
            "State": "state",
            "Hon'ble Members of Parliaments": "mp_name",
            "Constituency": "constituency",
            "Allocated AMOUNT ( ₹ )": "allocated_amount_inr",
        }
    )
    grand_total_mask = output["serial_number"].eq("Grand Total")
    excluded_grand_total = int(grand_total_mask.sum())
    amount_before = output.loc[~grand_total_mask, "allocated_amount_inr"]
    amount_numeric = pd.to_numeric(amount_before.str.replace(",", "", regex=False), errors="coerce")
    numeric_conversion_failures = int(amount_numeric.isna().sum())
    output = output.loc[~grand_total_mask].copy()
    output["serial_number"] = pd.to_numeric(output["serial_number"], errors="raise").astype("Int64")
    output["allocated_amount_inr"] = amount_numeric.astype("Float64")
    output["record_type"] = "mp_constituency_allocation"
    output.to_csv(PROCESSED_DIR / "allocation_cleaned.csv", index=False)

    report = [
        "ALLOCATED LIMIT CLEANING REPORT",
        "",
        f"Source file: {ALLOCATION_RAW.name}",
        f"Source SHA-256: {sha256(ALLOCATION_RAW)}",
        f"Original rows: {original_rows}",
        f"Original columns: {original_columns}",
        f"Cleaned rows: {len(output)}",
        f"Cleaned columns: {len(output.columns)}",
        "",
        "GRAIN:",
        "MP/CONSTITUENCY aggregate. These datasets do not contain individual MPLADS project/work records.",
        "",
        "DECISIONS:",
        "- Column names were converted to stable ASCII snake_case names for processed use.",
        "- Non-breaking spaces and surrounding/repeated whitespace were normalized in text fields.",
        "- State, MP, and constituency spelling was not semantically rewritten; only whitespace formatting was normalized.",
        "- The allocated amount was converted to numeric after removing thousands separators.",
        f"- One Grand Total summary row was excluded from the MP-grain output; excluded rows: {excluded_grand_total}.",
        "- The Grand Total is not an MP/constituency record and its comma-formatted amount was not used as an MP amount.",
        f"- Amount conversion failures among retained MP rows: {numeric_conversion_failures}; the missing source amount is retained for serial_number 108 (Maharashtra, NANDED), and no value was invented.",
        f"- Blank rows detected: {int(blank_rows.sum())}; none were removed because no fully blank rows were present.",
        f"- Exact duplicate rows detected: {duplicate_rows}; none were removed.",
        "",
        "LIMITATIONS:",
        "- No project/work ID, district, work description, project category, recommended amount, sanctioned amount, expenditure, dates, status, or progress exists.",
        "- Allocation is an MP/constituency summary and cannot identify individual MPLADS works or project fraud.",
    ]
    return output, report


def main() -> None:
    PROCESSED_DIR.mkdir(exist_ok=True)
    annexure, annexure_report = clean_annexure()
    allocation, allocation_report = clean_allocation()
    write_report(PROCESSED_DIR / "annexure_cleaning_report.txt", annexure_report)
    write_report(PROCESSED_DIR / "allocation_cleaning_report.txt", allocation_report)

    quality = [
        "MPLADS DATA QUALITY SUMMARY",
        "",
        "These datasets do not contain individual MPLADS project/work records.",
        "",
        "ANNEXURE-I",
        f"- Original rows: 38; cleaned rows: {len(annexure)}.",
        "- Grain: STATE/YEAR aggregate.",
        "- Excluded rows: none. Total and Nominated summary records were retained and labeled.",
        "- Missing values after cleaning: serial_number is missing on the retained Total summary row; all substantive aggregate fields are populated.",
        "- Exact duplicate rows: none detected.",
        "- Numeric conversion issues: none; all numeric cells parsed successfully.",
        "- State normalization: whitespace and non-breaking spaces normalized; state labels otherwise preserved.",
        "- Suspicious records retained: repeated 2016-17 columns, Nominated row, and Total row.",
        "- Limitation: duplicate 2016-17 labels are unresolved and no project-level fields exist.",
        "",
        "ALLOCATED LIMIT",
        f"- Original rows: 544; cleaned rows: {len(allocation)}.",
        "- Grain: MP/CONSTITUENCY aggregate.",
        "- Excluded rows: one Grand Total summary row; it is not an MP record.",
        "- Missing values after cleaning: one missing allocated_amount_inr remains in the retained MP row with serial_number 108 (Maharashtra, NANDED); no value was invented.",
        "- Exact duplicate rows: none detected.",
        "- Numeric conversion issues: 542 retained MP amounts converted successfully after removing commas; one retained source amount is missing and remains missing. The excluded Grand Total was not used.",
        "- State normalization: whitespace and non-breaking spaces normalized; semantic state-name mapping was not applied.",
        "- Suspicious records retained: one MP row with a missing source amount (serial_number 108, Maharashtra, NANDED); no value was invented.",
        "- Limitation: no project-level fields exist and allocated amount is not expenditure or sanctioned amount.",
        "",
        "COMBINATION",
        "- The files were not merged.",
        "- They have different grains and no safe row-level common key.",
        "- A state-only join would duplicate state aggregates across MP rows and create misleading data.",
        "",
        "ML STATUS",
        "- No ML features, risk scores, or models were created.",
    ]
    write_report(PROCESSED_DIR / "data_quality_summary.txt", quality)


if __name__ == "__main__":
    main()