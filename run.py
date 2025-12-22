#!/usr/bin/env python3
"""
SecondMe 开发环境启动脚本
一条命令同时启动 Vite 前端开发服务器和 FastAPI 后端服务器
"""

import subprocess
import sys
import os
import signal
import time
from pathlib import Path

# 项目根目录
ROOT_DIR = Path(__file__).parent
WEB_DIR = ROOT_DIR / "web"
SERVER_DIR = ROOT_DIR / "server"

# 进程列表
processes = []


def signal_handler(sig, frame):
    """处理 Ctrl+C，优雅地终止所有子进程"""
    print("\n\n🛑 正在停止所有服务...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except Exception:
            p.kill()
    print("👋 所有服务已停止")
    sys.exit(0)


def check_node():
    """检查 Node.js 是否安装"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        print(f"✅ Node.js {result.stdout.strip()}")
        return True
    except FileNotFoundError:
        print("❌ 未找到 Node.js，请先安装 Node.js")
        return False


def check_python_deps():
    """检查 Python 依赖"""
    try:
        import fastapi
        import uvicorn
        print("✅ Python 依赖已安装")
        return True
    except ImportError as e:
        print(f"❌ 缺少 Python 依赖: {e}")
        print("   请运行: pip install -r server/requirements.txt")
        return False


def check_node_modules():
    """检查前端依赖"""
    node_modules = WEB_DIR / "node_modules"
    if not node_modules.exists():
        print("📦 正在安装前端依赖...")
        result = subprocess.run(
            ["npm", "install"],
            cwd=WEB_DIR,
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            print(f"❌ 前端依赖安装失败: {result.stderr}")
            return False
        print("✅ 前端依赖安装完成")
    else:
        print("✅ 前端依赖已存在")
    return True


def start_vite():
    """启动 Vite 开发服务器"""
    print("🚀 启动 Vite 开发服务器 (http://localhost:5173)...")
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=WEB_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(process)
    return process


def start_fastapi():
    """启动 FastAPI 后端服务器"""
    print("🚀 启动 FastAPI 后端服务器 (http://localhost:8000)...")
    process = subprocess.Popen(
        [sys.executable, "main.py"],
        cwd=SERVER_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    processes.append(process)
    return process


def stream_output(process, prefix):
    """流式输出进程日志"""
    try:
        for line in iter(process.stdout.readline, ''):
            if line:
                print(f"{prefix} {line.rstrip()}")
    except Exception:
        pass


def main():
    print("""
╔═══════════════════════════════════════════════╗
║        SecondMe 开发环境启动器                ║
╚═══════════════════════════════════════════════╝
""")

    # 注册信号处理
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # 环境检查
    print("🔍 检查环境...")
    if not check_node():
        sys.exit(1)
    if not check_python_deps():
        sys.exit(1)
    if not check_node_modules():
        sys.exit(1)

    print()
    print("=" * 50)
    print()

    # 启动服务
    vite_process = start_vite()
    time.sleep(1)  # 等待 Vite 启动
    fastapi_process = start_fastapi()

    print()
    print("=" * 50)
    print()
    print("✨ 服务已启动!")
    print()
    print("   📱 前端:  http://localhost:5173")
    print("   🔧 后端:  http://localhost:8000")
    print("   📚 API:   http://localhost:8000/docs")
    print()
    print("   按 Ctrl+C 停止所有服务")
    print()
    print("=" * 50)
    print()

    # 使用线程读取输出
    import threading

    vite_thread = threading.Thread(
        target=stream_output,
        args=(vite_process, "[Vite]"),
        daemon=True
    )
    fastapi_thread = threading.Thread(
        target=stream_output,
        args=(fastapi_process, "[API] "),
        daemon=True
    )

    vite_thread.start()
    fastapi_thread.start()

    # 等待进程结束
    try:
        while True:
            # 检查进程是否还在运行
            if vite_process.poll() is not None:
                print("⚠️ Vite 进程已退出")
                break
            if fastapi_process.poll() is not None:
                print("⚠️ FastAPI 进程已退出")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        signal_handler(None, None)


if __name__ == "__main__":
    main()
