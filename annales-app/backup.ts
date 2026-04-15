/**
 * Backup and restore script for MongoDB + Garage S3 data.
 *
 * Usage: npm run backup [-- <command>]
 *
 * Commands:
 *   (none)          Create a new backup
 *   list            List available backups
 *   restore         Restore the most recent backup
 *   restore <id>    Restore a specific backup
 *   --help          Show this help
 */

import { execSync, execFileSync } from 'child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  rmSync,
} from 'fs';
import { basename, join } from 'path';
import { createInterface } from 'readline';

// ─── Colors ───

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function logSuccess(msg: string) {
  console.log(`${colors.green}${msg}${colors.reset}`);
}
function logWarning(msg: string) {
  console.log(`${colors.yellow}${msg}${colors.reset}`);
}
function logError(msg: string) {
  console.log(`${colors.red}${msg}${colors.reset}`);
}

// ─── Config ───

const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 2;

// ─── Detect environment ───

interface Environment {
  mongoContainer: string;
  garageContainer: string;
  dbName: string;
  envVars: Record<string, string>;
}

function detectEnvironment(): Environment {
  const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });

  let mongoContainer: string;
  let garageContainer: string;
  let dbName: string;
  let envFile: string;

  if (containers.includes('annales-mongo-dev')) {
    mongoContainer = 'annales-mongo-dev';
    garageContainer = 'annales-garage-dev';
    dbName = 'annales-dev';
    envFile = '.env.dev';
  } else if (containers.includes('annales-mongo')) {
    mongoContainer = 'annales-mongo';
    garageContainer = 'annales-garage';
    dbName = 'annales';
    envFile = '.env';
  } else {
    logError('❌ No running containers found. Start services first.');
    process.exit(1);
  }

  // Parse .env file
  const envContent = readFileSync(envFile, 'utf-8');
  const envVars: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  }

  return { mongoContainer, garageContainer, dbName, envVars };
}

// ─── Confirmation prompt ───

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.trim() === 'yes');
    });
  });
}

// ─── S3 sync via AWS CLI docker container ───

function s3Sync(env: Environment, source: string, dest: string, localDir: string): boolean {
  try {
    execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--network',
        `container:${env.garageContainer}`,
        '--user',
        `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`,
        '-e',
        `AWS_ACCESS_KEY_ID=${env.envVars['S3_ACCESS_KEY']}`,
        '-e',
        `AWS_SECRET_ACCESS_KEY=${env.envVars['S3_SECRET_KEY']}`,
        '-e',
        'AWS_DEFAULT_REGION=garage',
        '-v',
        `${localDir}:/backup`,
        'amazon/aws-cli:latest',
        's3',
        'sync',
        source,
        dest,
        '--endpoint-url',
        'http://127.0.0.1:3900',
        '--quiet',
      ],
      { stdio: 'pipe' }
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Get directory size (human-readable) ───

function dirSize(dir: string): string {
  try {
    return execSync(`du -sh "${dir}" 2>/dev/null`, { encoding: 'utf-8' })
      .split('\t')[0]
      .trim();
  } catch {
    return '?';
  }
}

// ─── List backup directories sorted by name ───

function listBackupDirs(): string[] {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter(d => /^\d/.test(d) && statSync(join(BACKUP_DIR, d)).isDirectory())
    .sort();
}

// ─── Commands ───

function doBackup(env: Environment): void {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '-',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  const dir = join(BACKUP_DIR, ts);
  mkdirSync(dir, { recursive: true });

  console.log(`📦 Creating backup ${ts}...`);

  // MongoDB dump
  console.log('   MongoDB...');
  try {
    const dump = execSync(
      `docker exec ${env.mongoContainer} mongodump --db ${env.dbName} --archive --quiet`,
      { maxBuffer: 500 * 1024 * 1024 }
    );
    writeFileSync(join(dir, 'mongo.archive'), dump);
  } catch (err) {
    logWarning('   ⚠️  MongoDB dump failed');
  }

  // Garage files via S3
  console.log('   Garage files...');
  const filesDir = join(process.cwd(), dir, 'files');
  mkdirSync(filesDir, { recursive: true });
  const bucket = env.envVars['S3_BUCKET'] || 'annales';
  if (!s3Sync(env, `s3://${bucket}`, '/backup', join(process.cwd(), dir, 'files'))) {
    logWarning('   ⚠️  Could not backup Garage files (AWS CLI sync failed).');
  }

  const size = dirSize(dir);
  logSuccess(`✅ Backup ${ts} created (${size})`);

  // Cleanup old backups
  const backups = listBackupDirs();
  if (backups.length > MAX_BACKUPS) {
    const toRemove = backups.slice(0, backups.length - MAX_BACKUPS);
    for (const old of toRemove) {
      console.log(`🗑️  Removing old backup ${old}`);
      rmSync(join(BACKUP_DIR, old), { recursive: true, force: true });
    }
  }
}

function doList(): void {
  const backups = listBackupDirs();
  if (backups.length === 0) {
    console.log('No backups found.');
    return;
  }

  console.log('📋 Available backups:');
  console.log('');
  for (const name of [...backups].reverse()) {
    const dir = join(BACKUP_DIR, name);
    const size = dirSize(dir);
    const mongoOk = existsSync(join(dir, 'mongo.archive')) ? '✓' : '❌';
    const filesOk = existsSync(join(dir, 'files')) ? '✓' : '❌';
    console.log(`  ${name}  (${size})  mongo:${mongoOk}  files:${filesOk}`);
  }
}

async function doRestore(env: Environment, targetId?: string): Promise<void> {
  let targetDir: string;

  if (targetId) {
    targetDir = join(BACKUP_DIR, targetId);
    if (!existsSync(targetDir)) {
      logError(`❌ Backup not found: ${targetId}`);
      console.log("Run 'npm run backup -- list' to see available backups.");
      process.exit(1);
    }
  } else {
    const backups = listBackupDirs();
    if (backups.length === 0) {
      logError('❌ No backups found.');
      process.exit(1);
    }
    targetDir = join(BACKUP_DIR, backups[backups.length - 1]);
  }

  const name = basename(targetDir);
  console.log(`⚠️  This will REPLACE all current data with backup ${name}.`);
  const confirmed = await confirm("Are you sure? Type 'yes' to confirm: ");
  if (!confirmed) {
    console.log('❌ Aborted.');
    process.exit(1);
  }

  console.log(`📦 Restoring from ${name}...`);

  // MongoDB restore
  const archivePath = join(targetDir, 'mongo.archive');
  if (existsSync(archivePath)) {
    console.log('   MongoDB...');
    try {
      const archive = readFileSync(archivePath);
      execSync(
        `docker exec -i ${env.mongoContainer} mongorestore --db ${env.dbName} --archive --drop --quiet`,
        { input: archive, maxBuffer: 500 * 1024 * 1024 }
      );
      console.log('   ✓ MongoDB restored');
    } catch {
      logWarning('   ⚠️  MongoDB restore failed');
    }
  } else {
    logWarning('   ⚠️  No MongoDB archive found, skipping.');
  }

  // Garage files restore
  const filesDir = join(targetDir, 'files');
  if (existsSync(filesDir)) {
    console.log('   Garage files...');
    const bucket = env.envVars['S3_BUCKET'] || 'annales';
    if (s3Sync(env, '/backup', `s3://${bucket}`, join(process.cwd(), filesDir))) {
      console.log('   ✓ Garage files restored');
    } else {
      logWarning('   ⚠️  Could not restore Garage files.');
    }
  } else {
    logWarning('   ⚠️  No files directory found, skipping.');
  }

  logSuccess(`✅ Restore complete from ${name}`);
}

// ─── Help ───

function showHelp(): void {
  console.log('📦 Usage: npm run backup [-- <command>]');
  console.log('');
  console.log('COMMANDS:');
  console.log('   (none)          Create a new backup');
  console.log('   list            List available backups');
  console.log('   restore         Restore the most recent backup');
  console.log('   restore <id>    Restore a specific backup');
  console.log('   --help          Show this help');
  console.log('');
  console.log('EXAMPLES:');
  console.log('   npm run backup');
  console.log('   npm run backup -- list');
  console.log('   npm run backup -- restore');
  console.log('');
  console.log('FILES:');
  console.log(`   ${BACKUP_DIR}/    Backup storage (max ${MAX_BACKUPS} kept)`);
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '';

  if (command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const env = detectEnvironment();

  switch (command) {
    case '':
      doBackup(env);
      break;
    case 'list':
      doList();
      break;
    case 'restore':
      await doRestore(env, args[1]);
      break;
    default:
      logError(`❌ Unknown command: ${command}`);
      console.log("💡 Use --help for usage information");
      process.exit(1);
  }
}

main();
