#!/bin/bash
# StarRocks Manager — 启动脚本
# 用法: ./scripts/start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PID_FILE="$PROJECT_DIR/app.pid"
LOG_DIR="$PROJECT_DIR/logs"

cd "$PROJECT_DIR"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "服务已在运行 (PID: $PID)"
    exit 1
  else
    rm -f "$PID_FILE"
  fi
fi

# 确保配置文件存在
if [ ! -f "config.yaml" ] && [ ! -f "config.yml" ]; then
  if [ -f "config.example.yaml" ]; then
    cp config.example.yaml config.yaml
    echo "已从 config.example.yaml 创建 config.yaml，请根据需要修改配置"
  else
    echo "错误: 未找到 config.yaml 配置文件"
    exit 1
  fi
fi

# 确保日志目录存在
mkdir -p "$LOG_DIR"

# 确保数据目录存在
mkdir -p "$PROJECT_DIR/data"

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "安装依赖..."
  npm install --production
fi

# 构建 (如果 .next 不存在或需要重建)
if [ ! -d ".next" ] || [ "$1" = "--rebuild" ]; then
  echo "构建项目..."
  npm run build
fi

# 初始化数据库 (首次启动时自动执行)
echo "检查数据库..."
node -e "require('./src/lib/local-db').getLocalDb()" 2>/dev/null || node -e "
  const path = require('path');
  process.env.NODE_PATH = path.join('$PROJECT_DIR', 'node_modules');
  require('module')._initPaths();
  require('./.next/server/chunks/lib/local-db').getLocalDb();
" 2>/dev/null || echo "数据库将在首次请求时自动初始化"

# 读取端口 (从 config.yaml)
PORT=$(node -e "
  try {
    const yaml = require('js-yaml');
    const fs = require('fs');
    const cfg = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    console.log(cfg.server?.port || 3000);
  } catch { console.log(3000); }
" 2>/dev/null || echo "3000")

# 启动服务
echo "启动 StarRocks Manager (端口: $PORT)..."
NODE_ENV=production PORT="$PORT" nohup node .next/standalone/server.js > "$LOG_DIR/server.log" 2>&1 &
APP_PID=$!
echo "$APP_PID" > "$PID_FILE"

# 等待启动
sleep 2
if kill -0 "$APP_PID" 2>/dev/null; then
  echo "✅ 服务已启动 (PID: $APP_PID)"
  echo "   地址: http://localhost:$PORT"
  echo "   日志: $LOG_DIR/server.log"
  echo "   停止: ./scripts/stop.sh"
else
  echo "❌ 服务启动失败，请查看日志: $LOG_DIR/server.log"
  rm -f "$PID_FILE"
  exit 1
fi
