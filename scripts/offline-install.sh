#!/bin/bash
# ============================================================================
# StarRocks Manager — 离线安装脚本
# ============================================================================
# 用法: sudo bash install.sh
#
# 执行此脚本前，请确保已解压离线安装包:
#   tar -xzf starrocks-manager-offline-YYYYMMDD.tar.gz
#   cd starrocks-manager-offline-YYYYMMDD
#   sudo bash install.sh
#
# 安装后管理:
#   ./start.sh    # 启动
#   ./stop.sh     # 停止
#   ./restart.sh  # 重启
# ============================================================================

set -e

# ---- 获取脚本所在目录（兼容 sh 和 bash） ----
SCRIPT_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$SCRIPT_DIR" ]; then
  SCRIPT_DIR="$(pwd)"
fi

# ---- 配置 ----
INSTALL_DIR="$SCRIPT_DIR"
APP_USER="starrocks-manager"
PORT=3000

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

echo ""
echo "============================================"
echo "  StarRocks Manager — 离线安装"
echo "============================================"
echo "  安装目录: ${INSTALL_DIR}"
echo "============================================"
echo ""

# ---- 检查 root ----
if [ "$(id -u)" -ne 0 ]; then
  error "请使用 root 权限运行: sudo bash install.sh"
fi

# ---- 检查安装包完整性 ----
for item in node app db; do
  if [ ! -d "${INSTALL_DIR}/${item}" ]; then
    error "安装包不完整: 缺少 ${INSTALL_DIR}/${item}/ 目录"
  fi
done

# ---- 验证 Node.js 可用 ----
echo "🔍 验证 Node.js..."
NODE_BIN="${INSTALL_DIR}/node/bin/node"
if ! "$NODE_BIN" --version >/dev/null 2>&1; then
  echo ""
  echo -e "${RED}❌ Node.js 无法运行${NC}"
  echo "   Node 路径: ${NODE_BIN}"
  echo "   请检查安装包是否完整，或联系管理员"
  exit 1
fi
info "Node.js $($NODE_BIN --version)"

# ---- 停止旧服务（如果存在） ----
if [ -f "${INSTALL_DIR}/app.pid" ]; then
  OLD_PID=$(cat "${INSTALL_DIR}/app.pid" 2>/dev/null)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⏹  停止旧版本 (PID: ${OLD_PID})..."
    kill "$OLD_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$OLD_PID" 2>/dev/null || true
    info "旧版本已停止"
  fi
fi

# ---- 创建系统用户 ----
if ! id "$APP_USER" &>/dev/null; then
  echo "👤 创建系统用户: ${APP_USER}..."
  useradd -r -s /sbin/nologin -d "$INSTALL_DIR" "$APP_USER" 2>/dev/null || true
  info "用户 ${APP_USER} 已创建"
else
  info "用户 ${APP_USER} 已存在"
fi

# ---- 创建 data 和 logs 目录 ----
mkdir -p "${INSTALL_DIR}/app/data" "${INSTALL_DIR}/app/logs"

# ---- 生成启动脚本 ----
cat > "${INSTALL_DIR}/start.sh" <<'STARTEOF'
#!/bin/bash
# StarRocks Manager — 启动
INSTALL_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$INSTALL_DIR" ]; then INSTALL_DIR="$(pwd)"; fi
NODE="${INSTALL_DIR}/node/bin/node"
APP_DIR="${INSTALL_DIR}/app"
PID_FILE="${INSTALL_DIR}/app.pid"
LOG_FILE="${INSTALL_DIR}/app/logs/stdout.log"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "⚠  服务已在运行 (PID: ${PID})"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

mkdir -p "$(dirname "$LOG_FILE")"

echo "🚀 启动 StarRocks Manager..."
cd "$APP_DIR"
NODE_ENV=production PORT=3000 nohup "$NODE" server.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 2
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "✅ 启动成功 (PID: $(cat "$PID_FILE"))"
  echo "   访问: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3000/starrocks-manager"
  echo "   日志: ${LOG_FILE}"
else
  echo "❌ 启动失败，请检查日志: ${LOG_FILE}"
  rm -f "$PID_FILE"
  exit 1
fi
STARTEOF

# ---- 生成停止脚本 ----
cat > "${INSTALL_DIR}/stop.sh" <<'STOPEOF'
#!/bin/bash
# StarRocks Manager — 停止
INSTALL_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$INSTALL_DIR" ]; then INSTALL_DIR="$(pwd)"; fi
PID_FILE="${INSTALL_DIR}/app.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "⚠  服务未在运行 (未找到 PID 文件)"
  exit 0
fi

PID=$(cat "$PID_FILE")
if ! kill -0 "$PID" 2>/dev/null; then
  echo "⚠  服务未在运行 (PID: ${PID} 不存在)"
  rm -f "$PID_FILE"
  exit 0
fi

echo "⏹  停止 StarRocks Manager (PID: ${PID})..."
kill "$PID"

# 等待进程退出（最多 10 秒）
for i in $(seq 1 10); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "✅ 已停止"
    rm -f "$PID_FILE"
    exit 0
  fi
  sleep 1
done

# 强制终止
echo "⚠  正在强制终止..."
kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "✅ 已强制停止"
STOPEOF

# ---- 生成重启脚本 ----
cat > "${INSTALL_DIR}/restart.sh" <<'RESTARTEOF'
#!/bin/bash
# StarRocks Manager — 重启
INSTALL_DIR="$(cd "$(dirname "$0")" 2>/dev/null && pwd)"
if [ -z "$INSTALL_DIR" ]; then INSTALL_DIR="$(pwd)"; fi
bash "${INSTALL_DIR}/stop.sh"
sleep 1
bash "${INSTALL_DIR}/start.sh"
RESTARTEOF

# ---- 设置权限 ----
chmod +x "${INSTALL_DIR}/start.sh" "${INSTALL_DIR}/stop.sh" "${INSTALL_DIR}/restart.sh"
chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"

# ---- 启动服务 ----
echo ""
echo "🚀 启动服务..."
su -s /bin/bash "$APP_USER" -c "bash ${INSTALL_DIR}/start.sh"

echo ""
echo "============================================"
echo "  ✅ 安装完成"
echo "============================================"
echo ""
echo "  管理命令:"
echo "    ${INSTALL_DIR}/start.sh      # 启动"
echo "    ${INSTALL_DIR}/stop.sh       # 停止"
echo "    ${INSTALL_DIR}/restart.sh    # 重启"
echo ""
echo "  日志:"
echo "    tail -f ${INSTALL_DIR}/app/logs/stdout.log"
echo ""
echo "  配置文件:"
echo "    ${INSTALL_DIR}/app/config.yaml"
echo ""
echo "  ⚠  首次部署请手动初始化 MySQL:"
echo "    mysql -h <HOST> -P <PORT> -u <USER> -p <DB> < ${INSTALL_DIR}/db/migrations/001_init_mysql.sql"
echo ""
echo "============================================"
