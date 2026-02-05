"""Logging configuration for the application."""

import sys
import logging
from pathlib import Path
from ..config.settings import (
    APP_NAME,
    LOGS_DIRECTORY,
    LOG_LEVEL
)

def setup_logger(name: str = APP_NAME) -> logging.Logger:
    """
    Set up a logger for the application.
    
    Args:
        name: Logger name (use __name__ for module-specific logs)
        
    Returns:
        Configured logger instance
    """

    # Create logger
    logger = logging.getLogger(name)
    
    # Convert string level to logging constant
    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    # Avoid duplicate handlers if called multiple times
    if logger.hasHandlers():
        return logger

    # Create logs directory if it doesn't exist
    log_path = Path(LOGS_DIRECTORY) / "app.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)

    # Format for log messages
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # File handler - save logs to file
    file_handler = logging.FileHandler(log_path)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)

    # Console handler - output logs to console
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)

    # Add handlers to logger
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
