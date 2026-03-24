#!/bin/bash
# StarRocks Manager — 停止脚本
# 用法: ./scripts/stop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/app.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "服务未在运行 (未找到 PID 文件)"
  exit 0
fi

PID=$(cat "$PID_FILE")

if kill -0 "$PID" 2>/dev/null; then
  echo "正在停止服务 (PID: $PID)..."
  kill "$PID"
  
  # 等待进程退出 (最多 10 秒)
  for i in $(seq 1 10); do
    if ! kill -0 "$PID" 2>/dev/null; then
      break
    fi
    sleep 1
  done
  
  # 如果还没退出，强制终止
  if kill -0 "$PID" 2>/dev/null; then
    echo "进程未响应，强制终止..."
    kill -9 "$PID"
  fi
  
  rm -f "$PID_FILE"
  echo "✅ 服务已停止"
else
  echo "进程 $PID 已不存在"
  rm -f "$PID_FILE"
fi
