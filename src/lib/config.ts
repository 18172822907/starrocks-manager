import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// ─── Config shape ───

export interface AppConfig {
  server: {
    port: number;
    node_env: string;
  };
  database: {
    type: 'sqlite' | 'mysql';
    sqlite: {
      path: string;
    };
    mysql: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
  };
  admin: {
    password: string;
  };
  health_check: {
    interval: number;      // seconds
  };
  log: {
    level: 'debug' | 'info' | 'warn' | 'error';
    dir: string;
  };
}

// ─── Defaults ───

const DEFAULTS: AppConfig = {
  server: { port: 3000, node_env: 'development' },
  database: {
    type: 'sqlite',
    sqlite: { path: './data/starrocks-manager.db' },
    mysql: { host: '127.0.0.1', port: 3306, user: 'root', password: '', database: 'starrocks_manager' },
  },
  admin: { password: 'Admin@2024' },
  health_check: { interval: 300 },
  log: { level: 'info', dir: './logs' },
};

// ─── Load once ───

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function loadConfig(): AppConfig {
  const configPaths = [
    path.join(process.cwd(), 'config.yaml'),
    path.join(process.cwd(), 'config.yml'),
  ];

  for (const p of configPaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = yaml.load(raw) as Record<string, unknown> | null;
        if (parsed) {
          const merged = deepMerge(DEFAULTS as unknown as Record<string, unknown>, parsed);
          console.log(`[Config] Loaded from ${p}`);
          return merged as unknown as AppConfig;
        }
      } catch (err) {
        console.error(`[Config] Failed to parse ${p}:`, err);
      }
    }
  }

  console.log('[Config] No config.yaml found, using defaults');
  return DEFAULTS;
}

// Module-level singleton (survives HMR)
const globalForConfig = globalThis as unknown as { __appConfig?: AppConfig };
export const config: AppConfig = globalForConfig.__appConfig || loadConfig();
if (process.env.NODE_ENV !== 'production') globalForConfig.__appConfig = config;
