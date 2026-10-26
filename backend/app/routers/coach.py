"""/coach endpoint."""

from fastapi import APIRouter

from ..coach import answer
from ..schemas import CoachRequest, CoachResponse

router = APIRouter(tags=["coach"])


@router.post("/coach", response_model=CoachResponse)
async def coach(req: CoachRequest) -> CoachResponse:
    return await answer(req)
