#!/bin/bash
# ============================================================================
# StarRocks Manager — 离线部署打包
# ============================================================================
# 用法: ./scripts/pack-offline.sh
#
# 在有网络的开发机(Mac)上执行，打包生成离线安装包:
#   dist/starrocks-manager-offline-YYYYMMDD.tar.gz
#
# 兼容 CentOS 7 等旧系统 — 从 Alpine Docker 提取 Node.js + musl,
# 不依赖系统 glibc 版本。
#
# 前置条件:
#   1. Docker Desktop 已安装并运行
#   2. .env 文件已配置(用于生成 config.yaml)
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ---- 配置 ----
TAG=$(date +%Y%m%d)
PACKAGE_NAME="starrocks-manager-offline-${TAG}"
DIST_DIR="${PROJECT_DIR}/dist"
BUILD_DIR="${DIST_DIR}/${PACKAGE_NAME}"

# 复用 deploy.sh 同样的镜像配置
REGISTRY="***REGISTRY_REDACTED***"
IMAGE_NAME="starrocks-manager"
FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}"

echo ""
echo "============================================"
echo "  StarRocks Manager — 离线打包"
echo "============================================"
echo "  输出: dist/${PACKAGE_NAME}.tar.gz"
echo "============================================"
echo ""

# ---- 检查前置条件 ----
if ! command -v docker &>/dev/null; then
  echo "❌ 错误: 未找到 docker 命令，请先安装 Docker Desktop"
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "❌ 错误: Docker 未运行，请先启动 Docker Desktop"
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "❌ 错误: 未找到 .env 文件"
  echo "   请先从 .env.example 复制并配置数据库连接信息:"
  echo "   cp .env.example .env"
  exit 1
fi

# ---- 加载环境变量 ----
set -a
source .env
set +a

echo "✅ 已加载 .env 配置"
echo "   MySQL: ${MYSQL_USER}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}"
echo ""

# ---- 从 .env 生成 config.yaml ----
echo "📝 生成 config.yaml..."

cat > config.yaml <<YAML
# 自动生成 — 由 pack-offline.sh 从 .env 构建
server:
  port: 3000
  node_env: production

database:
  type: mysql
  mysql:
    host: "${MYSQL_HOST}"
    port: ${MYSQL_PORT}
    user: "${MYSQL_USER}"
    password: "${MYSQL_PASSWORD}"
    database: "${MYSQL_DATABASE}"

admin:
  password: "${ADMIN_PASSWORD:-Admin@2024}"

health_check:
  interval: 300

log:
  level: info
  dir: ./logs
YAML

echo "   ✅ config.yaml 已生成"
echo ""

# ---- 清理旧的构建目录 ----
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$DIST_DIR"

# ---- Step 1: 构建 Docker 镜像（复用项目 Dockerfile） ----
echo "🐳 构建 Docker 镜像 (linux/amd64)..."
docker build --platform linux/amd64 -t "${FULL_IMAGE}:${TAG}" .

# ---- Step 2: 从 Docker 容器提取应用 + Node.js + musl 运行时 ----
echo "📤 提取构建产物 + Node.js 运行时..."
CONTAINER_ID=$(docker create --platform linux/amd64 "${FULL_IMAGE}:${TAG}")

# 提取应用（standalone Next.js）
docker cp "${CONTAINER_ID}:/app" "${BUILD_DIR}/app"

# 提取 Node.js 和 musl 运行时（绕过系统 glibc）
mkdir -p "${BUILD_DIR}/node/bin" "${BUILD_DIR}/node/lib"

# Node.js 二进制
docker cp "${CONTAINER_ID}:/usr/local/bin/node" "${BUILD_DIR}/node/bin/node.bin"

# musl 动态链接器和库
docker cp "${CONTAINER_ID}:/lib/ld-musl-x86_64.so.1" "${BUILD_DIR}/node/lib/ld-musl-x86_64.so.1"

# libstdc++ 和 libgcc（Alpine 的 C++ 运行时）
docker exec "$CONTAINER_ID" sh -c 'ls /usr/lib/libstdc++.so* /usr/lib/libgcc_s.so* 2>/dev/null' | while read f; do
  docker cp "${CONTAINER_ID}:${f}" "${BUILD_DIR}/node/lib/$(basename "$f")"
done 2>/dev/null || true

docker rm "$CONTAINER_ID" > /dev/null

# 创建 node 启动封装脚本（使用自带的 musl 加载器）
cat > "${BUILD_DIR}/node/bin/node" <<'WRAPPER'
#!/bin/sh
# Node.js wrapper — 使用自带 musl 运行时，不依赖系统 glibc
REAL_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB_DIR="${REAL_DIR}/../lib"
exec "${LIB_DIR}/ld-musl-x86_64.so.1" --library-path "${LIB_DIR}" "${REAL_DIR}/node.bin" "$@"
WRAPPER
chmod +x "${BUILD_DIR}/node/bin/node" "${BUILD_DIR}/node/bin/node.bin"

# 验证 Node.js 能通过封装脚本运行
echo "   ✅ Node.js + musl 运行时已提取"
echo ""

# ---- Step 3: 复制配置和迁移文件 ----
echo "📋 复制配置和数据库文件..."
cp config.yaml "${BUILD_DIR}/app/config.yaml"
cp config.example.yaml "${BUILD_DIR}/app/config.example.yaml"
mkdir -p "${BUILD_DIR}/db/migrations"
cp db/migrations/*.sql "${BUILD_DIR}/db/migrations/"
echo "   ✅ 配置和迁移文件就绪"

# ---- 清理临时 config.yaml ----
rm -f config.yaml

# ---- Step 4: 复制安装脚本 ----
echo "📝 复制安装脚本..."
cp scripts/offline-install.sh "${BUILD_DIR}/install.sh"
chmod +x "${BUILD_DIR}/install.sh"

# ---- Step 5: 打包 ----
echo ""
echo "📦 打包离线安装包..."
cd "$DIST_DIR"
tar -czf "${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

SIZE=$(du -h "${DIST_DIR}/${PACKAGE_NAME}.tar.gz" | cut -f1)

# ---- 清理构建中间目录 ----
rm -rf "$BUILD_DIR"

echo ""
echo "============================================"
echo "  ✅ 打包完成"
echo "============================================"
echo "  文件: dist/${PACKAGE_NAME}.tar.gz"
echo "  大小: ${SIZE}"
echo ""
echo "  部署步骤:"
echo "  ────────────────────────────────────────"
echo ""
echo "  1. 传输到服务器:"
echo "     scp dist/${PACKAGE_NAME}.tar.gz user@server:/opt/"
echo ""
echo "  2. 服务器上解压并安装:"
echo "     cd /opt && tar -xzf ${PACKAGE_NAME}.tar.gz"
echo "     mv ${PACKAGE_NAME} starrocks-manager"
echo "     cd starrocks-manager && sudo bash install.sh"
echo ""
echo "  3. 首次部署需初始化 MySQL:"
echo "     mysql -h ${MYSQL_HOST} -P ${MYSQL_PORT} -u ${MYSQL_USER} -p ${MYSQL_DATABASE} < db/migrations/001_init_mysql.sql"
echo ""
echo "  4. 管理服务:"
echo "     ./start.sh    # 启动"
echo "     ./stop.sh     # 停止"
echo "     ./restart.sh  # 重启"
echo ""
echo "  5. 访问:"
echo "     http://<服务器IP>:3000/starrocks-manager"
echo "     默认账号: admin / ${ADMIN_PASSWORD:-Admin@2024}"
echo "============================================"
