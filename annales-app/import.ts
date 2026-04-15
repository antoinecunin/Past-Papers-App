/**
 * Bulk import wrapper — runs on the host, delegates to the API container.
 *
 * Usage: npm run import -- <directory> <pattern> [--dry-run] [--help]
 *
 * This script:
 * 1. Detects the running API container (dev or prod)
 * 2. Copies PDF files into the container
 * 3. Runs the TypeScript import script inside the container via docker exec
 * 4. Cleans up temporary files
 */

import { execSync, execFileSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
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
    logSuccess('🔍 Production mode detected');
    return 'annales-api';
  }
  logError('❌ No active API container found.');
  console.log('Start services first: npm start -- dev (or npm start -- prod)');
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

// Find the directory argument (first non-flag positional arg)
let directory = '';
for (const arg of args) {
  if (!arg.startsWith('-')) {
    directory = arg;
    break;
  }
}

const containerArgs = [...args];
let copied = false;

if (directory && existsSync(directory) && statSync(directory).isDirectory()) {
  const absDir = resolve(directory);

  // Find PDF files
  const pdfs = readdirSync(absDir).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (pdfs.length === 0) {
    logError(`❌ No PDF files found in ${absDir}`);
    process.exit(1);
  }

  // Copy PDFs into the container
  console.log('📦 Copying PDF files into the container...');
  dockerExec(container, ['rm', '-rf', '/tmp/import-pdfs']);
  dockerExec(container, ['mkdir', '-p', '/tmp/import-pdfs']);

  for (const pdf of pdfs) {
    dockerCp(resolve(absDir, pdf), `${container}:/tmp/import-pdfs/`);
  }
  logSuccess(`   ✓ ${pdfs.length} file(s) copied`);
  copied = true;

  // Replace directory argument with container path
  const dirIndex = containerArgs.indexOf(directory);
  if (dirIndex !== -1) {
    containerArgs[dirIndex] = '/tmp/import-pdfs';
  }
}

// Run the import script inside the container
console.log('');
let exitCode = 0;
try {
  dockerExecInteractive(container, ['node', 'dist/scripts/import.js', ...containerArgs]);
} catch (err) {
  // Forward the exit code from the container script
  exitCode = (err as { status?: number }).status ?? 1;
} finally {
  if (copied) {
    try {
      dockerExec(container, ['rm', '-rf', '/tmp/import-pdfs']);
    } catch {
      // Ignore cleanup errors
    }
  }
}
process.exit(exitCode);
