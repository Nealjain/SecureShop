from fastapi import Depends, HTTPException
from core.dependencies import get_current_user

ROLE_PERMISSIONS = {
    "admin": [
        "users:read", "users:write", "users:delete",
        "orders:read_all", "orders:write_all", "orders:delete",
        "products:read", "products:write", "products:delete",
        "audit_logs:read", "token_vault:read",
        "integrity:run_report", "sessions:invalidate_any",
    ],
    "customer": [
        "orders:read_own", "orders:write_own",
        "products:read", "sessions:invalidate_own",
        "token_vault:read_own",
    ]
}

def require_permission(permission: str):
    async def _check(current_user: dict = Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(current_user.get("role", "customer"), [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Permission '{permission}' required. Your role: {current_user.get('role')}"
            )
        return current_user
    return Depends(_check)
