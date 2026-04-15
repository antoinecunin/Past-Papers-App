/**
 * Seed wrapper — runs on the host, delegates to the API container.
 *
 * Usage: npm run seed [-- <config-file>]
 *
 * This script:
 * 1. Detects the running API container (dev or prod)
 * 2. Copies the seed config file into the container
 * 3. Runs the TypeScript seed script inside the container via docker exec
 * 4. Cleans up temporary files
 */

import { execSync, execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

// ─── Colors ───

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
};

function logSuccess(msg: string) {
  console.log(`${colors.green}${msg}${colors.reset}`);
}
function logError(msg: string) {
  console.log(`${colors.red}${msg}${colors.reset}`);
}

// ─── Detect API container ───

function detectContainer(): string {
  const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf-8' });
  if (containers.includes('annales-api-dev')) {
    logSuccess('🔍 Development mode detected');
    return 'annales-api-dev';
  }
  if (containers.includes('annales-api')) {
    logError('❌ Seeding is only available in development mode.');
    console.log('Start services in dev mode first: npm start -- dev');
    process.exit(1);
  }
  logError('❌ No active API container found.');
  console.log('Start services first: npm start -- dev');
  process.exit(1);
}

// ─── Docker helpers ───

function dockerExec(container: string, command: string[]): void {
  execFileSync('docker', ['exec', container, ...command], { stdio: 'ignore' });
}

function dockerCp(src: string, dest: string): void {
  execFileSync('docker', ['cp', src, dest], { stdio: 'ignore' });
}

function dockerExecInteractive(container: string, command: string[]): void {
  const flags = process.stdin.isTTY ? ['-it'] : ['-i'];
  execFileSync('docker', ['exec', ...flags, container, ...command], {
    stdio: 'inherit',
  });
}

// ─── Main ───

const args = process.argv.slice(2);
const container = detectContainer();

const configFile = resolve(args[0] || 'dev-seed.json');

if (!existsSync(configFile)) {
  logError(`❌ Configuration file not found: ${configFile}`);
  process.exit(1);
}

logSuccess(`📄 Configuration: ${configFile}`);

// Copy config into the container
console.log('📦 Copying config into the container...');
dockerCp(configFile, `${container}:/app/seed-config.json`);

// Run the seed script inside the container
console.log('');
console.log('🌱 Running seeding...');
console.log('');

let exitCode = 0;
try {
  dockerExecInteractive(container, [
    'node',
    'dist/scripts/seed.js',
    '--config',
    '/app/seed-config.json',
  ]);
} catch (err) {
  exitCode = (err as { status?: number }).status ?? 1;
} finally {
  // Clean up
  console.log('');
  console.log('🧹 Cleaning up temporary files from the container...');
  try {
    dockerExec(container, ['rm', '-f', '/app/seed-config.json']);
  } catch {
    // Ignore cleanup errors
  }
}

if (exitCode === 0) {
  logSuccess('✅ Seeding complete!');
}
process.exit(exitCode);
