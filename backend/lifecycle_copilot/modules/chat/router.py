from fastapi import APIRouter, Depends, Response

from lifecycle_copilot.dependencies import require_admin
from lifecycle_copilot.modules.chat import service
from lifecycle_copilot.modules.chat.schemas import ChatAskRequest, ChatAskResponse, ChatMessage

router = APIRouter(
    prefix="/projects/{project_id}/chat",
    tags=["lifecycle-copilot-chat"],
)


@router.get("", response_model=list[ChatMessage])
def list_chat_messages(
    project_id: int,
    _admin=Depends(require_admin),
) -> list[ChatMessage]:
    return service.list_messages(project_id)


@router.post("/ask", response_model=ChatAskResponse)
def ask_chat(
    project_id: int,
    payload: ChatAskRequest,
    _admin=Depends(require_admin),
) -> ChatAskResponse:
    try:
        return service.ask_question(project_id, payload.question)
    except ValueError as exc:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("", status_code=204)
def clear_chat(
    project_id: int,
    _admin=Depends(require_admin),
) -> Response:
    service.clear_messages(project_id)
    return Response(status_code=204)
