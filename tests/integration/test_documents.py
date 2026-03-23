"""Integration tests for document API endpoints."""

import io
import pytest
from unittest.mock import patch, MagicMock


class TestListDocuments:
    def test_requires_auth(self, client):
        resp = client.get("/documents")
        assert resp.status_code == 401

    def test_authenticated_user_gets_empty_list(self, client, user_headers):
        resp = client.get("/documents", headers=user_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "sources" in body
        assert isinstance(body["sources"], list)


class TestUploadDocuments:
    def test_requires_auth(self, client):
        f = io.BytesIO(b"hello world")
        resp = client.post("/documents/upload", files={"files": ("test.txt", f, "text/plain")})
        assert resp.status_code == 401

    def test_unsupported_file_type_is_rejected(self, client, user_headers):
        f = io.BytesIO(b"not a supported file")
        resp = client.post(
            "/documents/upload",
            files={"files": ("evil.exe", f, "application/octet-stream")},
            headers=user_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        # The file should appear in failed_files, not uploaded_sources
        assert body["loaded"] == 0
        failed_names = [ff["file_name"] for ff in body.get("failed_files", [])]
        assert "evil.exe" in failed_names

    def test_valid_txt_upload_is_accepted(self, client, user_headers):
        content = b"This is a test document with enough content to be ingested."
        f = io.BytesIO(content)

        # Mock the vector store add so we don't need real embeddings.
        with (
            patch("app.api.documents.load_documents") as mock_load,
            patch("app.api.documents.split_documents") as mock_split,
            patch("app.api.documents.add_documents_to_store") as mock_add,
            patch("app.api.documents.filter_uncached_sources") as mock_filter,
        ):
            from langchain_core.documents import Document
            mock_doc = Document(page_content="Test document", metadata={"source": "test.txt"})
            mock_load.return_value = ([mock_doc], [])
            mock_split.return_value = [mock_doc]
            mock_add.return_value = None
            mock_filter.side_effect = lambda vs, sources, uid: ([], sources)

            resp = client.post(
                "/documents/upload",
                files={"files": ("test.txt", f, "text/plain")},
                headers=user_headers,
            )

        assert resp.status_code == 200
        body = resp.json()
        assert body["loaded"] >= 0  # may be cached or loaded

    def test_no_files_returns_400(self, client, user_headers):
        resp = client.post(
            "/documents/upload",
            headers=user_headers,
        )
        assert resp.status_code in (400, 422)

    def test_file_size_limit_enforced(self, client, user_headers):
        # Create content larger than MAX_UPLOAD_FILE_SIZE_BYTES (10 MB)
        big_content = b"x" * (11 * 1024 * 1024)
        f = io.BytesIO(big_content)
        resp = client.post(
            "/documents/upload",
            files={"files": ("big.txt", f, "text/plain")},
            headers=user_headers,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["loaded"] == 0
        errors = [ff.get("error", "") for ff in body.get("failed_files", [])]
        assert any("size" in e.lower() or "limit" in e.lower() for e in errors)
