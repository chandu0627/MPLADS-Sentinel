from fastapi import APIRouter, HTTPException

from ..database.database import get_connection


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects() -> list[dict]:
	with get_connection() as connection:
		rows = connection.execute(
			"SELECT id, name, description, state, district, status "
			"FROM projects ORDER BY id"
		).fetchall()

	return [dict(row) for row in rows]


@router.get("/{project_id}")
def get_project(project_id: int) -> dict:
	with get_connection() as connection:
		row = connection.execute(
			"SELECT id, name, description, state, district, status "
			"FROM projects WHERE id = ?",
			(project_id,),
		).fetchone()

	if row is None:
		raise HTTPException(status_code=404, detail="Project not found")

	return dict(row)
