import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.sso_service import resolve_current_user_context

logger = logging.getLogger(__name__)

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.get("/current-user")
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the resolved domain user and workstation for the current client.
    Respects the SSO enable/disable toggle.
    """
    context = await resolve_current_user_context(request, db)
    return context
