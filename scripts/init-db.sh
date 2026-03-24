#!/bin/bash
# StarRocks Manager — 数据库初始化脚本
# 用法: ./scripts/init-db.sh [--force]
# --force: 删除已有数据库并重新初始化

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# 检查配置
if [ ! -f "config.yaml" ] && [ ! -f "config.yml" ]; then
  if [ -f "config.example.yaml" ]; then
    cp config.example.yaml config.yaml
    echo "已从 config.example.yaml 创建 config.yaml"
  else
    echo "错误: 未找到配置文件"
    exit 1
  fi
fi

# 读取数据库类型和路径
DB_TYPE=$(node -e "
  const yaml = require('js-yaml');
  const fs = require('fs');
  const cfg = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
  console.log(cfg.database?.type || 'sqlite');
")

echo "数据库类型: $DB_TYPE"

if [ "$DB_TYPE" = "sqlite" ]; then
  DB_PATH=$(node -e "
    const yaml = require('js-yaml');
    const fs = require('fs');
    const path = require('path');
    const cfg = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    const p = cfg.database?.sqlite?.path || './data/starrocks-tools.db';
    console.log(path.isAbsolute(p) ? p : path.join(process.cwd(), p));
  ")
  
  if [ "$1" = "--force" ] && [ -f "$DB_PATH" ]; then
    echo "删除已有数据库: $DB_PATH"
    rm -f "$DB_PATH"
  fi
  
  echo "初始化 SQLite 数据库: $DB_PATH"
  mkdir -p "$(dirname "$DB_PATH")"
  
  # 执行 migration SQL
  SQL_FILE="$PROJECT_DIR/db/migrations/001_init_sqlite.sql"
  if [ -f "$SQL_FILE" ]; then
    sqlite3 "$DB_PATH" < "$SQL_FILE"
    echo "✅ 表结构初始化完成"
  else
    echo "错误: 未找到 migration 文件: $SQL_FILE"
    exit 1
  fi
  
  # 创建初始管理员
  ADMIN_PWD=$(node -e "
    const yaml = require('js-yaml');
    const fs = require('fs');
    const cfg = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    const bcrypt = require('bcryptjs');
    console.log(bcrypt.hashSync(cfg.admin?.password || 'Admin@2024', 10));
  ")
  
  sqlite3 "$DB_PATH" "INSERT OR IGNORE INTO sys_users (username, password_hash, display_name, role) VALUES ('admin', '$ADMIN_PWD', '管理员', 'admin');"
  echo "✅ 管理员账号初始化完成"

elif [ "$DB_TYPE" = "mysql" ]; then
  echo "初始化 MySQL 数据库..."
  
  MYSQL_HOST=$(node -e "const y=require('js-yaml'),f=require('fs');const c=y.load(f.readFileSync('config.yaml','utf8'));console.log(c.database?.mysql?.host||'127.0.0.1')")
  MYSQL_PORT=$(node -e "const y=require('js-yaml'),f=require('fs');const c=y.load(f.readFileSync('config.yaml','utf8'));console.log(c.database?.mysql?.port||3306)")
  MYSQL_USER=$(node -e "const y=require('js-yaml'),f=require('fs');const c=y.load(f.readFileSync('config.yaml','utf8'));console.log(c.database?.mysql?.user||'root')")
  MYSQL_PWD=$(node -e "const y=require('js-yaml'),f=require('fs');const c=y.load(f.readFileSync('config.yaml','utf8'));console.log(c.database?.mysql?.password||'')")
  MYSQL_DB=$(node -e "const y=require('js-yaml'),f=require('fs');const c=y.load(f.readFileSync('config.yaml','utf8'));console.log(c.database?.mysql?.database||'starrocks_tools')")
  
  # 创建数据库
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" ${MYSQL_PWD:+-p"$MYSQL_PWD"} -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\` DEFAULT CHARACTER SET utf8mb4;"
  
  # 执行 migration SQL
  SQL_FILE="$PROJECT_DIR/db/migrations/001_init_mysql.sql"
  if [ -f "$SQL_FILE" ]; then
    mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" ${MYSQL_PWD:+-p"$MYSQL_PWD"} "$MYSQL_DB" < "$SQL_FILE"
    echo "✅ 表结构初始化完成"
  else
    echo "错误: 未找到 migration 文件: $SQL_FILE"
    exit 1
  fi
  
  # 创建初始管理员
  ADMIN_HASH=$(node -e "
    const yaml = require('js-yaml');
    const fs = require('fs');
    const cfg = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
    const bcrypt = require('bcryptjs');
    console.log(bcrypt.hashSync(cfg.admin?.password || 'Admin@2024', 10));
  ")
  
  mysql -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER" ${MYSQL_PWD:+-p"$MYSQL_PWD"} "$MYSQL_DB" \
    -e "INSERT IGNORE INTO sys_users (username, password_hash, display_name, role) VALUES ('admin', '$ADMIN_HASH', '管理员', 'admin');"
  echo "✅ 管理员账号初始化完成"
fi

echo ""
echo "初始化完成！可以使用 ./scripts/start.sh 启动服务"
