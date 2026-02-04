"""
Citation extraction and validation for RAG responses.

This module ensures all answers are grounded in retrieved sources.
"""

import re
from typing import List, Tuple, Set
from langchain_core.documents import Document
from utils.logger import setup_logger

logger = setup_logger(__name__)


def extract_citation_numbers(text: str) -> Set[int]:
    """
    Extract all citation numbers from text.
    
    Looks for patterns like [1], [2], [3] etc.
    
    Args:
        text: The answer text to parse
        
    Returns:
        Set of citation numbers found (e.g., {1, 2, 3})
    """
    # Find all [N] patterns where N is a digit
    matches = re.findall(r'\[(\d+)\]', text)
    citation_numbers = set(int(m) for m in matches)
    return citation_numbers


def build_source_map(retrieved_docs: List[Document]) -> dict:
    """
    Create a map of citation number → source info.
    
    Args:
        retrieved_docs: List of retrieved documents (in order)
        
    Returns:
        Dictionary: {1: "source1", 2: "source2", ...}
    """
    source_map = {}
    for i, doc in enumerate(retrieved_docs, start=1):
        metadata = doc.metadata or {}
        source = metadata.get("source", "unknown")
        file_name = metadata.get("file_name")
        page = metadata.get("page")
        
        # Build readable source label
        if file_name:
            label = file_name
            if page is not None:
                label += f" (page {page})"
        elif source.startswith("http"):
            label = source
        else:
            label = source
        
        source_map[i] = label
    
    return source_map


def validate_citations(answer: str, retrieved_docs: List[Document]) -> Tuple[bool, Set[int], List[str]]:
    """
    Validate that all cited sources exist in retrieved docs.
    
    Args:
        answer: The model's answer text
        retrieved_docs: List of documents that were retrieved
        
    Returns:
        Tuple of (is_valid, cited_numbers, error_messages)
        - is_valid: True if all citations are valid or no citations needed
        - cited_numbers: Set of citation numbers found in answer
        - error_messages: List of validation errors (empty if valid)
    """
    errors = []
    cited_numbers = extract_citation_numbers(answer)
    
    # Check if answer has no citations
    if not cited_numbers:
        errors.append("No citations found in answer")
        return False, cited_numbers, errors
    
    # Build source map
    source_map = build_source_map(retrieved_docs)
    num_sources = len(source_map)
    
    # Check each cited number
    for citation_num in cited_numbers:
        if citation_num < 1 or citation_num > num_sources:
            errors.append(
                f"Citation [{citation_num}] is invalid "
                f"(only {num_sources} sources available)"
            )
    
    is_valid = len(errors) == 0
    return is_valid, cited_numbers, errors


def build_sources_section(cited_numbers: Set[int], retrieved_docs: List[Document]) -> str:
    """
    Build a "Sources" section with only cited sources.
    
    Args:
        cited_numbers: Set of citation numbers to include
        retrieved_docs: Full list of retrieved documents
        
    Returns:
        Formatted sources text
    """
    if not cited_numbers:
        return "Sources: None"
    
    source_map = build_source_map(retrieved_docs)
    
    # Sort citations for readability
    sorted_citations = sorted(cited_numbers)
    sources_text = "Sources:\n"
    for citation_num in sorted_citations:
        if citation_num in source_map:
            sources_text += f"- [{citation_num}] {source_map[citation_num]}\n"
    
    return sources_text.rstrip()


def ensure_citations(answer: str, retrieved_docs: List[Document]) -> Tuple[str, bool]:
    """
    Ensure answer has valid citations. If missing, add them.
    
    Args:
        answer: The model's answer text
        retrieved_docs: List of retrieved documents
        
    Returns:
        Tuple of (processed_answer, has_valid_citations)
    """
    is_valid, cited_numbers, errors = validate_citations(answer, retrieved_docs)
    
    if not is_valid:
        logger.warning(f"Citation validation failed: {errors}")
        
        # If no citations, append most relevant source
        if not cited_numbers:
            logger.warning("No citations found. Adding citation to top source [1].")
            answer = answer.rstrip() + " [1]"
            cited_numbers = {1}
    
    # Rebuild sources section with only cited sources
    sources_section = build_sources_section(cited_numbers, retrieved_docs)
    
    # Append sources if not already there
    if "Sources:" not in answer:
        answer = answer.rstrip() + "\n\n" + sources_section
    
    return answer, len(errors) == 0
