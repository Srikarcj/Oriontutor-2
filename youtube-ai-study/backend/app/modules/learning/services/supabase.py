import os
from typing import Any, Dict, List, Optional

import httpx


class SupabaseError(RuntimeError):
    pass


class SupabaseClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not self.base_url or not self.service_key:
            raise SupabaseError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured.")
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }

    async def get(self, table: str, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, params=params, headers=self.headers)
        if resp.status_code >= 400:
            raise SupabaseError(resp.text)
        return resp.json() or []

    async def insert(self, table: str, payload: Any, prefer: str = "return=representation") -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        headers = dict(self.headers)
        headers["Prefer"] = prefer
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
        if resp.status_code >= 400:
            raise SupabaseError(resp.text)
        return resp.json() or []

    async def upsert(
        self,
        table: str,
        payload: Any,
        on_conflict: Optional[str] = None,
        prefer: str = "return=representation",
    ) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        headers = dict(self.headers)
        headers["Prefer"] = prefer
        if on_conflict:
            headers["Prefer"] = f"resolution=merge-duplicates,{prefer}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, params={"on_conflict": on_conflict} if on_conflict else None, json=payload, headers=headers)
        if resp.status_code >= 400:
            raise SupabaseError(resp.text)
        return resp.json() or []

    async def update(self, table: str, payload: Dict[str, Any], match: Dict[str, Any]) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        params = {key: f"eq.{value}" for key, value in match.items()}
        headers = dict(self.headers)
        headers["Prefer"] = "return=representation"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(url, params=params, json=payload, headers=headers)
        if resp.status_code >= 400:
            raise SupabaseError(resp.text)
        return resp.json() or []

