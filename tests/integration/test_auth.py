"""Integration tests for authentication endpoints."""

import pytest


class TestLogin:
    def test_valid_login_returns_token(self, client):
        resp = client.post("/auth/login", json={
            "username": "testadmin",
            "password": "Adminpass1!",
        })
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"
        assert body["user"]["username"] == "testadmin"

    def test_wrong_password_returns_401(self, client):
        resp = client.post("/auth/login", json={
            "username": "testadmin",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_unknown_user_returns_401(self, client):
        resp = client.post("/auth/login", json={
            "username": "nobody",
            "password": "anything",
        })
        assert resp.status_code == 401

    def test_missing_fields_returns_422(self, client):
        resp = client.post("/auth/login", json={"username": "testadmin"})
        assert resp.status_code == 422


class TestMe:
    def test_me_without_token_returns_401(self, client):
        resp = client.get("/auth/me")
        assert resp.status_code == 401

    def test_me_with_valid_token_returns_user(self, client, admin_headers):
        resp = client.get("/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "testadmin"
        assert body["role"] == "admin"

    def test_me_with_invalid_token_returns_401(self, client):
        resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
        assert resp.status_code == 401

    def test_regular_user_can_also_get_me(self, client, user_headers):
        resp = client.get("/auth/me", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["role"] == "user"


class TestHealthCheck:
    def test_health_endpoint_is_public(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
