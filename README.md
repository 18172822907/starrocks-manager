# StarRocks Manager

一站式 StarRocks 集群管理平台，提供可视化的集群监控、数据库浏览、任务管理和权限管控能力。

## 功能概览

| 模块 | 功能 |
|------|------|
| **仪表盘** | 集群节点状态总览（FE/BE/CN/Broker）、活跃查询监控 |
| **数据管理** | 数据库浏览、Catalog 管理、物化视图管理、SQL 查询编辑器 |
| **任务管理** | Routine Load、Broker Load、Pipes、Submit Task、Task Runs |
| **权限管理** | 用户管理、角色管理、权限分配、资源组管理 |
| **集群管理** | 多集群注册与切换、实时健康监测、节点详情 |
| **系统管理** | 系统变量查看、Functions 浏览、系统用户管理 |

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                   前端 (React 19)                │
│  Next.js 16 App Router · Recharts · Lucide Icons │
└─────────────────┬───────────────────────────────┘
                  │ API Routes
┌─────────────────▼───────────────────────────────┐
│               服务端 (Node.js)                    │
│  Next.js API Routes · mysql2 连接池               │
│  HealthMonitor 单例 · bcryptjs 认证               │
└──────┬──────────────────────────────┬────────────┘
       │                              │
┌──────▼──────────┐        ┌──────────▼────────────┐
│  本地元数据库     │        │  StarRocks 集群        │
│  SQLite/MySQL    │        │  (mysql2 连接池)        │
│  (配置/缓存/会话) │        │  (数据查询/管理操作)     │
└─────────────────┘        └───────────────────────┘
```

### 技术栈

- **前端**: React 19 + Next.js 16 (App Router) + Recharts + Lucide Icons
- **后端**: Next.js API Routes (Node.js)
- **StarRocks 连接**: mysql2 连接池
- **本地存储**: SQLite (better-sqlite3) / MySQL (可配置)
- **认证**: bcryptjs 密码哈希 + Session Token
- **健康监测**: 服务端单例定时器 (间隔可配置)
- **配置管理**: YAML 格式配置文件

## 安装部署

### 环境要求

- **Node.js** ≥ 20
- **npm** ≥ 10
- **SQLite3** (默认模式，系统通常自带)
- **MySQL** (可选，用于元数据持久化)

### 开发环境

```bash
# 克隆项目
git clone <repository-url>
cd starrocks-tools

# 安装依赖
npm install

# 创建配置文件 (可选，使用默认配置可跳过)
cp config.example.yaml config.yaml

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000，默认管理员账号：`admin` / `Admin@2024`

### 生产环境部署

#### 1. 构建

```bash
npm install
npm run build
```

#### 2. 打包传输

```bash
# 打包必要文件
tar -czf starrocks-tools.tar.gz \
  .next/standalone .next/static public \
  db scripts config.example.yaml package.json

# 传输到服务器
scp starrocks-tools.tar.gz user@server:/opt/
```

#### 3. 服务器部署

```bash
# 解压
cd /opt && tar -xzf starrocks-tools.tar.gz -C starrocks-tools
cd starrocks-tools

# 复制静态资源到 standalone 目录
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public 2>/dev/null || true

# 安装 native 依赖 (如果构建机与生产机架构不同)
cd .next/standalone && npm install better-sqlite3 && cd ../..

# 创建并修改配置
cp config.example.yaml config.yaml
vi config.yaml
```

#### 4. 初始化数据库

```bash
# SQLite 模式 (默认，自动创建)
npm run init-db

# MySQL 模式 (需先在 config.yaml 中配置 MySQL 连接)
npm run init-db
```

#### 5. 启停服务

```bash
# 启动
npm run prod:start

# 停止
npm run prod:stop
```

### 配置说明

配置文件 `config.yaml`（从 `config.example.yaml` 复制）：

```yaml
server:
  port: 3000                     # 服务端口

database:
  type: sqlite                   # sqlite | mysql
  sqlite:
    path: ./data/starrocks-tools.db
  mysql:                         # type=mysql 时生效
    host: 127.0.0.1
    port: 3306
    user: root
    password: ""
    database: starrocks_tools

admin:
  password: Admin@2024           # 初始管理员密码

health_check:
  interval: 300                  # 集群健康检测间隔（秒）

log:
  level: info                    # debug | info | warn | error
  dir: ./logs                    # 日志文件目录
```

## 项目结构

```
├── config.example.yaml      # 配置模板
├── db/migrations/            # 数据库建表 SQL
│   ├── 001_init_sqlite.sql
│   └── 001_init_mysql.sql
├── scripts/                  # 部署脚本
│   ├── start.sh
│   ├── stop.sh
│   └── init-db.sh
├── src/
│   ├── app/
│   │   ├── api/              # API 路由
│   │   └── (authenticated)/  # 页面路由
│   ├── components/           # React 组件
│   ├── hooks/                # 自定义 Hooks
│   └── lib/                  # 核心库
│       ├── config.ts         # 配置管理
│       ├── db.ts             # StarRocks 连接池
│       ├── db-adapter.ts     # 数据库抽象层
│       ├── local-db.ts       # 本地元数据库
│       ├── health-monitor.ts # 健康监测单例
│       ├── logger.ts         # 日志模块
│       └── auth.ts           # 认证模块
└── package.json
```

## License

Private
