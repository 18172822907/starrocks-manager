# StarRocks Manager

一站式 StarRocks 集群管理平台，提供可视化的集群监控、数据库浏览、任务管理和权限管控能力。

## 功能概览

| 模块 | 功能 |
|------|------|
| **仪表盘** | 集群节点状态总览（FE/BE/CN/Broker）、活跃查询监控 |
| **数据管理** | 数据库浏览、Catalog 管理、物化视图管理、SQL 查询编辑器 |
| **任务管理** | Routine Load、Broker Load、Pipes、Submit Task、Task Runs |
| **诊断分析** | SHOW PROC 高级诊断、Compaction Score 合并诊断 |
| **权限管理** | 用户/角色管理、权限分配、资源组管理 |
| **集群管理** | 多集群注册与切换、实时健康监测、节点详情 |
| **系统管理** | 系统变量、Functions 浏览、系统用户管理、操作审计 |

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
│  Flyway 风格数据库迁移引擎                         │
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
- **数据库迁移**: Flyway 风格版本化迁移 (SHA-256 校验)
- **配置管理**: YAML 格式配置文件

---

## 本地开发指南

### 环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 20 | 推荐使用 nvm 管理 |
| npm | ≥ 10 | 随 Node.js 安装 |
| Git | 任意 | 版本控制 |
| SQLite3 | 系统自带 | 开发模式默认使用 |

> **提示**: 开发模式使用 SQLite，无需安装 MySQL。生产部署推荐使用 MySQL。

### 快速开始

#### 1. 克隆项目

```bash
git clone <repository-url>
cd starrocks-manager
```

#### 2. 安装依赖

```bash
npm install
```

> 安装过程中 `better-sqlite3`（optional dependency）会自动编译本地二进制模块。如果编译失败，请确保已安装 C++ 编译工具链（macOS: Xcode Command Line Tools, Linux: build-essential）。

#### 3. 配置文件（可选）

```bash
# 从模板创建配置文件
cp config.example.yaml config.yaml
```

默认配置如下（不创建 `config.yaml` 也可以直接启动）：

```yaml
server:
  port: 3000
  node_env: production

database:
  type: sqlite                      # 开发模式默认 SQLite
  sqlite:
    path: ./data/starrocks-manager.db

admin:
  password: Admin@2024              # 初始管理员密码

health_check:
  interval: 300                     # 健康检测间隔（秒）

log:
  level: info
  dir: ./logs
```

#### 4. 启动开发服务器

```bash
npm run dev
```

访问地址：**http://localhost:3000/starrocks-manager**

默认管理员账号：
- 用户名：`admin`
- 密码：`Admin@2024`

> 首次启动时会自动执行数据库迁移（创建所有表）和管理员账号初始化。

#### 5. 添加 StarRocks 集群

登录后进入 **集群管理** 页面，添加你的 StarRocks 集群连接信息（FE 主机地址和端口）。

---

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产包 |
| `npm run lint` | ESLint 代码检查 |
| `npm run init-db` | 手动初始化数据库（含迁移 + 管理员） |
| `npm run db:migrate` | 执行待执行的数据库迁移 |
| `npm run db:info` | 查看数据库迁移状态 |
| `npm run db:validate` | 校验已执行迁移的 checksum |

### 数据库迁移

项目采用 **Flyway 风格**的数据库版本迁移管理，迁移文件位于 `db/migrations/`：

```
db/migrations/
├── V1__init_schema.mysql.sql      # MySQL 初始 schema
├── V1__init_schema.sqlite.sql     # SQLite 初始 schema
├── V2__xxx.mysql.sql              # 增量变更...
└── V2__xxx.sqlite.sql
```

**核心规则**：
- 命名格式：`V{版本号}__{描述}.{mysql|sqlite}.sql`
- 已执行的迁移文件 **禁止修改**（启动时 SHA-256 校验）
- 新变更必须创建新版本号的迁移文件
- 应用启动时自动执行所有待执行迁移

详细流程参见 [db-migration skill](.agent/skills/db-migration/SKILL.md)。

---

## 生产部署

### Docker / K8s 部署

> 生产环境使用 MySQL 作为元数据库，应用访问前缀为 `/starrocks-manager`。

#### 前置条件

1. Docker Desktop 已安装并运行
2. 已准备好 MySQL 数据库实例

#### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 填入实际的 MySQL 连接信息：

```env
DB_TYPE=mysql
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=starrocks_manager
ADMIN_PASSWORD=Admin@2024
```

#### 2. 一键构建 & 推送

```bash
./scripts/deploy.sh
```

`deploy.sh` 自动完成以下步骤：
1. 读取 `.env` 环境变量
2. 生成 `config.yaml`（MySQL 模式）并打入镜像
3. 使用 `docker build --platform linux/amd64` 构建
4. 推送到镜像仓库

> **注意**: 应用启动时会自动执行数据库迁移，无需手动执行 SQL 初始化脚本。

#### 3. Docker 本地测试

```bash
docker run -d --name starrocks-manager \
  -p 3000:3000 \
  <REGISTRY>/<NAMESPACE>/starrocks-manager:latest
```

访问 http://localhost:3000/starrocks-manager

#### 4. K8s 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: starrocks-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: starrocks-manager
  template:
    metadata:
      labels:
        app: starrocks-manager
    spec:
      containers:
      - name: starrocks-manager
        image: <REGISTRY>/<NAMESPACE>/starrocks-manager:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /starrocks-manager/api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: starrocks-manager
spec:
  selector:
    app: starrocks-manager
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: starrocks-manager
spec:
  rules:
  - http:
      paths:
      - path: /starrocks-manager
        pathType: Prefix
        backend:
          service:
            name: starrocks-manager
            port:
              number: 80
```

> 如需覆盖镜像内置的 `config.yaml`，创建 ConfigMap 并挂载到 `/app/config.yaml`。

#### 5. 更新版本

```bash
# 构建并推送新版
./scripts/deploy.sh

# 更新 K8s 部署
kubectl set image deployment/starrocks-manager \
  starrocks-manager=<REGISTRY>/<NAMESPACE>/starrocks-manager:$(date +%Y%m%d)
```

---

## 项目结构

```
├── config.example.yaml          # 配置模板
├── .env.example                 # Docker 部署环境变量模板
├── Dockerfile                   # Docker 多阶段构建
├── package.json                 # 依赖与脚本
│
├── db/migrations/               # 数据库迁移脚本 (Flyway 风格)
│   ├── V1__init_schema.mysql.sql
│   └── V1__init_schema.sqlite.sql
│
├── scripts/                     # 部署与运维脚本
│   ├── deploy.sh                # Docker 构建 & 推送
│   ├── init-db.sh               # 数据库初始化（迁移 + 管理员）
│   ├── grant-privileges.sql     # MySQL 权限授予参考
│   ├── start.sh                 # 生产环境启动
│   └── stop.sh                  # 生产环境停止
│
├── src/
│   ├── app/
│   │   ├── api/                 # API 路由 (Next.js Route Handlers)
│   │   ├── (authenticated)/     # 认证后页面路由
│   │   └── page.tsx             # 登录页
│   │
│   ├── components/              # React 组件
│   │   ├── AppShell.tsx         # 应用外壳（侧栏 + 内容区）
│   │   ├── Sidebar.tsx          # 侧栏导航
│   │   ├── ThemeProvider.tsx    # 主题管理
│   │   ├── Watermark.tsx        # 安全水印
│   │   └── ui/                  # 通用 UI 组件
│   │
│   ├── hooks/                   # 自定义 React Hooks
│   │
│   ├── lib/                     # 核心库
│   │   ├── config.ts            # YAML 配置管理
│   │   ├── db.ts                # StarRocks 连接池管理
│   │   ├── db-adapter.ts        # 本地数据库抽象层 (SQLite/MySQL)
│   │   ├── local-db.ts          # 本地元数据库 CRUD
│   │   ├── migrator.ts          # Flyway 风格迁移引擎
│   │   ├── auth.ts              # 认证与会话管理
│   │   ├── permissions.ts       # RBAC 权限控制
│   │   ├── health-monitor.ts    # 集群健康监测单例
│   │   ├── proc-metadata.ts     # SHOW PROC 元数据映射
│   │   ├── sql-sanitize.ts      # SQL 注入防护
│   │   ├── logger.ts            # 日志模块
│   │   └── utils.ts             # 通用工具函数
│   │
│   └── utils/                   # 前端工具函数
│
└── docs/changelog/              # 功能变更日志
```

---

## License

Private
