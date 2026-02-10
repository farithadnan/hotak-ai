"""Query-related API routes."""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..agents.rag_agent import validate_and_format_response
from ..utils.logger import setup_logger

logger = setup_logger(__name__)
router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


class QueryRequest(BaseModel):
    """Request model for query endpoint."""
    question: str


@router.post("/query")
async def query_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle user queries."""
    try:
        logger.info(f"Processing query: {request.question}")

        response = http_request.app.state.rag_agent.invoke(
            {"messages": [{"role": "user", "content": request.question}]}
        )

        final_message = response["messages"][-1]

        full_response = ""
        if hasattr(final_message, "content"):
            content = final_message.content
            if isinstance(content, str):
                full_response = content

        top_docs = http_request.app.state.vector_store.similarity_search(request.question, k=5)

        validated_response = full_response
        citation_info = "No citations validated"

        if top_docs and full_response:
            validated_response, citation_info = validate_and_format_response(
                full_response, top_docs
            )
            logger.info(f"Citation check: {citation_info}")

        logger.info("Query processed successfully.")

        return {
            "answer": validated_response,
            "citation_info": citation_info
        }

    except Exception as e:
        logger.error(f"Agent failed to process query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query/stream")
async def query_stream_endpoint(request: QueryRequest, http_request: Request):
    """Endpoint to handle streaming user queries."""
    try:
        logger.info(f"Processing streaming query: {request.question}")

        async def event_generator():
            async for event in http_request.app.state.rag_agent.stream(
                {"messages": [{"role": "user", "content": request.question}]},
                stream_mode="values",
            ):
                last_message = event["messages"][-1]
                if hasattr(last_message, "content"):
                    content = last_message.content
                    if isinstance(content, str):
                        yield content

        return StreamingResponse(event_generator(), media_type="text/plain")

    except Exception as e:
        logger.error(f"Agent failed to process streaming query: {e}")
        raise HTTPException(status_code=500, detail=str(e))
