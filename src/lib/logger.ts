import fs from 'fs';
import path from 'path';
import { config } from './config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let logStream: fs.WriteStream | null = null;

function getLogStream(): fs.WriteStream | null {
  if (logStream) return logStream;
  const dir = config.log.dir;
  if (!dir) return null;

  const absDir = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  if (!fs.existsSync(absDir)) {
    fs.mkdirSync(absDir, { recursive: true });
  }
  logStream = fs.createWriteStream(path.join(absDir, 'app.log'), { flags: 'a' });
  return logStream;
}

function formatMessage(level: string, args: unknown[]): string {
  const ts = new Date().toISOString();
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  return `${ts} [${level.toUpperCase()}] ${msg}`;
}

function log(level: LogLevel, ...args: unknown[]): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[config.log.level]) return;

  const formatted = formatMessage(level, args);

  // Console output
  switch (level) {
    case 'error': console.error(formatted); break;
    case 'warn': console.warn(formatted); break;
    case 'debug': console.debug(formatted); break;
    default: console.log(formatted);
  }

  // File output
  const stream = getLogStream();
  if (stream) {
    stream.write(formatted + '\n');
  }
}

export const logger = {
  debug: (...args: unknown[]) => log('debug', ...args),
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
};
