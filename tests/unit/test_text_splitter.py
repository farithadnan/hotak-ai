"""Unit tests for app.utils.text_splitter."""

import pytest
from langchain_core.documents import Document

from app.utils.text_splitter import split_documents


def _doc(content: str, source: str = "test.txt") -> Document:
    return Document(page_content=content, metadata={"source": source})


class TestSplitDocuments:
    def test_single_short_document_returns_one_chunk(self):
        docs = [_doc("Short document content.")]
        splits = split_documents(docs)
        assert len(splits) == 1
        assert splits[0].page_content == "Short document content."

    def test_long_document_splits_into_multiple_chunks(self):
        # ~3000 chars → should produce multiple chunks with default CHUNK_SIZE=1000
        content = ("word " * 600).strip()
        docs = [_doc(content)]
        splits = split_documents(docs)
        assert len(splits) > 1

    def test_metadata_preserved_in_splits(self):
        docs = [_doc("Some text " * 200, source="myfile.txt")]
        splits = split_documents(docs)
        for chunk in splits:
            assert chunk.metadata["source"] == "myfile.txt"

    def test_multiple_documents_all_chunked(self):
        docs = [_doc(f"Document {i}: " + "content " * 10) for i in range(5)]
        splits = split_documents(docs)
        assert len(splits) >= 5

    def test_empty_documents_list_raises(self):
        with pytest.raises(ValueError, match="(?i)empty|no.*split"):
            split_documents([])

    def test_whitespace_only_document_raises(self):
        with pytest.raises((ValueError, Exception)):
            split_documents([_doc("   ")])

    def test_invalid_chunk_settings_raises(self, monkeypatch):
        import app.utils.text_splitter as ts
        monkeypatch.setattr(ts, "CHUNK_SIZE", 0)
        with pytest.raises(ValueError, match="(?i)invalid chunk"):
            split_documents([_doc("Some content")])

    def test_chunk_overlap_invalid_raises(self, monkeypatch):
        import app.utils.text_splitter as ts
        monkeypatch.setattr(ts, "CHUNK_SIZE", 100)
        monkeypatch.setattr(ts, "CHUNK_OVERLAP", 100)  # overlap == size → invalid
        with pytest.raises(ValueError, match="(?i)invalid chunk"):
            split_documents([_doc("Some content")])
