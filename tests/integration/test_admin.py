"""Integration tests for admin API endpoints."""

import json
from pathlib import Path
from unittest.mock import patch, AsyncMock

import pytest


# ---------------------------------------------------------------------------
# Model settings endpoints
# ---------------------------------------------------------------------------

class TestGetModelSettings:
    def test_requires_auth(self, client):
        resp = client.get("/admin/models")
        assert resp.status_code == 401

    def test_regular_user_is_forbidden(self, client, user_headers):
        resp = client.get("/admin/models", headers=user_headers)
        assert resp.status_code == 403

    def test_admin_gets_model_list(self, client, admin_headers):
        resp = client.get("/admin/models", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "enabled_models" in body
        assert "accessible_models" in body
        assert "default_model" in body

    def test_accessible_models_include_app_state(self, client, admin_headers):
        """accessible_models must come from app.state, not the old module cache."""
        resp = client.get("/admin/models", headers=admin_headers)
        body = resp.json()
        # Our conftest sets gpt-4o-mini and gpt-4o in app.state.accessible_models
        assert "gpt-4o-mini" in body["accessible_models"]
        assert "gpt-4o" in body["accessible_models"]


class TestUpdateModelSettings:
    def test_requires_auth(self, client):
        resp = client.put("/admin/models", json={"enabled_models": ["gpt-4o-mini"]})
        assert resp.status_code == 401

    def test_regular_user_is_forbidden(self, client, user_headers):
        resp = client.put(
            "/admin/models",
            json={"enabled_models": ["gpt-4o-mini"], "default_model": "gpt-4o-mini"},
            headers=user_headers,
        )
        assert resp.status_code == 403

    def test_admin_can_update_models(self, client, admin_headers, tmp_path):
        settings_file = tmp_path / "model_settings.json"
        with patch("app.services.model_settings.SETTINGS_FILE", settings_file):
            resp = client.put(
                "/admin/models",
                json={"enabled_models": ["gpt-4o-mini"], "default_model": "gpt-4o-mini"},
                headers=admin_headers,
            )
        assert resp.status_code == 200
        body = resp.json()
        assert "gpt-4o-mini" in body["enabled_models"]

    def test_invalid_model_id_returns_400(self, client, admin_headers):
        resp = client.put(
            "/admin/models",
            json={"enabled_models": ["totally-fake-model"], "default_model": "totally-fake-model"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_default_model_must_be_in_enabled(self, client, admin_headers):
        resp = client.put(
            "/admin/models",
            json={"enabled_models": ["gpt-4o-mini"], "default_model": "gpt-4o"},
            headers=admin_headers,
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# User management endpoints
# ---------------------------------------------------------------------------

class TestAdminUsers:
    def test_list_users_requires_admin(self, client, user_headers):
        resp = client.get("/admin/users", headers=user_headers)
        assert resp.status_code == 403

    def test_admin_can_list_users(self, client, admin_headers):
        resp = client.get("/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        usernames = [u["username"] for u in body]
        assert "testadmin" in usernames

    def test_create_user(self, client, admin_headers):
        resp = client.post(
            "/admin/users",
            json={
                "username": "newuser",
                "email": "newuser@test.local",
                "password": "NewPass1!",
                "role": "user",
            },
            headers=admin_headers,
        )
        assert resp.status_code in (200, 201)
        assert resp.json()["username"] == "newuser"

    def test_duplicate_username_returns_error(self, client, admin_headers):
        resp = client.post(
            "/admin/users",
            json={
                "username": "testadmin",  # already exists
                "email": "other@test.local",
                "password": "Pass1234!",
                "role": "user",
            },
            headers=admin_headers,
        )
        assert resp.status_code in (400, 409, 422)


# ---------------------------------------------------------------------------
# Provider settings endpoints
# ---------------------------------------------------------------------------

class TestProviderSettings:
    def test_get_providers_requires_admin(self, client, user_headers):
        resp = client.get("/admin/providers", headers=user_headers)
        assert resp.status_code == 403

    def test_admin_gets_provider_settings(self, client, admin_headers, tmp_path):
        providers_file = tmp_path / "provider_settings.json"
        with patch("app.services.provider_settings.PROVIDERS_FILE", providers_file):
            resp = client.get("/admin/providers", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "openai_api_key_set" in body
        assert "ollama_base_url" in body

    def test_put_providers_triggers_reprobe(self, client, admin_headers, tmp_path):
        providers_file = tmp_path / "provider_settings.json"
        with (
            patch("app.services.provider_settings.PROVIDERS_FILE", providers_file),
            patch("app.api.admin.build_accessible_chat_models", new_callable=AsyncMock) as mock_build,
            patch("app.api.admin.get_ollama_models", new_callable=AsyncMock) as mock_ollama,
        ):
            mock_build.return_value = [
                {"id": "gpt-4o-mini", "object": "model", "owned_by": "openai", "created": 0}
            ]
            mock_ollama.return_value = []
            resp = client.put(
                "/admin/providers",
                json={"openai_api_key": None, "ollama_base_url": None},
                headers=admin_headers,
            )
        assert resp.status_code == 200
        mock_build.assert_called_once()
        mock_ollama.assert_called_once()
