"""Unit tests for document loader path-traversal guards and dispatch logic."""

import os
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fake_allowed_root(tmp_path: Path) -> str:
    return str(tmp_path.resolve()) + os.sep


# ---------------------------------------------------------------------------
# document_loader.py — unified dispatcher
# ---------------------------------------------------------------------------

class TestLoadDocumentDispatch:
    def test_url_routes_to_web_loader(self, tmp_path):
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", _fake_allowed_root(tmp_path)),
            patch("app.loaders.document_loader.load_web_document") as mock_web,
        ):
            mock_web.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document("https://example.com/page")
        mock_web.assert_called_once_with("https://example.com/page")

    def test_http_url_also_routes_to_web_loader(self, tmp_path):
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", _fake_allowed_root(tmp_path)),
            patch("app.loaders.document_loader.load_web_document") as mock_web,
        ):
            mock_web.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document("http://example.com/doc")
        mock_web.assert_called_once()

    def test_path_traversal_raises_value_error(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.document_loader._ALLOWED_ROOT", root):
            from app.loaders.document_loader import load_document
            with pytest.raises(ValueError, match="(?i)access denied"):
                load_document("../../etc/passwd")

    def test_unsupported_extension_raises_value_error(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        # Put a real file in tmp_path so the "file not found" check passes first
        bad_file = tmp_path / "evil.exe"
        bad_file.write_bytes(b"MZ")
        with patch("app.loaders.document_loader._ALLOWED_ROOT", root):
            from app.loaders.document_loader import load_document
            with pytest.raises(ValueError, match="(?i)unsupported"):
                load_document(str(bad_file))

    def test_pdf_routes_to_pdf_loader(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        pdf = tmp_path / "test.pdf"
        pdf.write_bytes(b"%PDF-1.4 fake")
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", root),
            patch("app.loaders.document_loader.load_pdf_document") as mock_pdf,
        ):
            mock_pdf.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document(str(pdf))
        mock_pdf.assert_called_once()

    def test_txt_routes_to_txt_loader(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        txt = tmp_path / "test.txt"
        txt.write_text("hello", encoding="utf-8")
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", root),
            patch("app.loaders.document_loader.load_txt_document") as mock_txt,
        ):
            mock_txt.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document(str(txt))
        mock_txt.assert_called_once()

    def test_md_routes_to_md_loader(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        md = tmp_path / "README.md"
        md.write_text("# Title", encoding="utf-8")
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", root),
            patch("app.loaders.document_loader.load_md_document") as mock_md,
        ):
            mock_md.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document(str(md))
        mock_md.assert_called_once()

    def test_docx_routes_to_docx_loader(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        docx = tmp_path / "doc.docx"
        docx.write_bytes(b"PK fake docx")
        with (
            patch("app.loaders.document_loader._ALLOWED_ROOT", root),
            patch("app.loaders.document_loader.load_docx_document") as mock_docx,
        ):
            mock_docx.return_value = [MagicMock()]
            from app.loaders.document_loader import load_document
            load_document(str(docx))
        mock_docx.assert_called_once()

    def test_nonexistent_file_raises_file_not_found(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.document_loader._ALLOWED_ROOT", root):
            from app.loaders.document_loader import load_document
            with pytest.raises(FileNotFoundError):
                load_document(str(tmp_path / "ghost.txt"))


# ---------------------------------------------------------------------------
# Individual loaders — path traversal
# ---------------------------------------------------------------------------

class TestTxtLoaderTraversal:
    def test_blocks_traversal(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.txt_loader._ALLOWED_ROOT", root):
            from app.loaders.txt_loader import load_txt_document
            with pytest.raises(ValueError, match="(?i)access denied"):
                load_txt_document("../../etc/passwd")

    def test_loads_valid_file(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        f = tmp_path / "hello.txt"
        f.write_text("Hello, world!", encoding="utf-8")
        with patch("app.loaders.txt_loader._ALLOWED_ROOT", root):
            from app.loaders.txt_loader import load_txt_document
            docs = load_txt_document(str(f))
        assert len(docs) == 1
        assert docs[0].page_content == "Hello, world!"
        assert docs[0].metadata["source_type"] == "txt"


class TestMdLoaderTraversal:
    def test_blocks_traversal(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.md_loader._ALLOWED_ROOT", root):
            from app.loaders.md_loader import load_md_document
            with pytest.raises(ValueError, match="(?i)access denied"):
                load_md_document("../../etc/shadow")

    def test_loads_valid_file(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        f = tmp_path / "readme.md"
        f.write_text("# Hello", encoding="utf-8")
        with patch("app.loaders.md_loader._ALLOWED_ROOT", root):
            from app.loaders.md_loader import load_md_document
            docs = load_md_document(str(f))
        assert docs[0].metadata["source_type"] == "md"


class TestPdfLoaderTraversal:
    def test_blocks_traversal(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.pdf_loader._ALLOWED_ROOT", root):
            from app.loaders.pdf_loader import load_pdf_document
            with pytest.raises(ValueError, match="(?i)access denied"):
                load_pdf_document("../../etc/passwd")


class TestDocxLoaderTraversal:
    def test_blocks_traversal(self, tmp_path):
        root = _fake_allowed_root(tmp_path)
        with patch("app.loaders.docx_loader._ALLOWED_ROOT", root):
            from app.loaders.docx_loader import load_docx_document
            with pytest.raises(ValueError, match="(?i)access denied"):
                load_docx_document("../../etc/passwd")
