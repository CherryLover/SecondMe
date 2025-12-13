"""日志配置"""
import logging
import sys
from datetime import datetime
from pathlib import Path

from config import DATA_DIR

# 日志目录
LOG_DIR = DATA_DIR / "logs"
LOG_DIR.mkdir(exist_ok=True)

# 日志文件路径（按日期）
def get_log_file():
    return LOG_DIR / f"{datetime.now().strftime('%Y-%m-%d')}.log"


# 日志格式
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def setup_logger(name: str = "secondme") -> logging.Logger:
    """配置并返回 logger"""
    logger = logging.getLogger(name)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    # 控制台 handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(console_handler)

    # 文件 handler
    file_handler = logging.FileHandler(get_log_file(), encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(file_handler)

    return logger


# 全局 logger 实例
logger = setup_logger()
