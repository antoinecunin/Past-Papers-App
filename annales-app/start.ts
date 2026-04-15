/**
 * Platform startup script.
 *
 * Usage: npm start [-- dev|prod] [-- --clean] [-- --seed]
 *
 * Starts the entire platform with Docker Compose, initializes Garage S3
 * storage, waits for health checks, and optionally seeds test data.
 */

import { execSync, execFileSync } from 'child_process';
import { existsSync, readFileSync, copyFileSync } from 'fs';
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

// ─── Docker helpers ───

function run(cmd: string, opts?: { silent?: boolean }): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: opts?.silent ? 'pipe' : 'inherit',
    }).trim();
  } catch {
    return '';
  }
}

function runOrFail(cmd: string): void {
  execSync(cmd, { stdio: 'inherit' });
}

function dockerCompose(composeFile: string, envFile: string, args: string, opts?: { silent?: boolean }): string {
  const cmd = `docker compose -f ${composeFile} --env-file ${envFile} ${args}`;
  if (opts?.silent) {
    return run(cmd, { silent: true });
  }
  runOrFail(cmd);
  return '';
}

function dockerExec(container: string, command: string, opts?: { silent?: boolean }): string {
  const cmd = `docker exec ${container} ${command}`;
  return run(cmd, { silent: opts?.silent ?? true });
}

// ─── Help ───

function showHelp(): void {
  console.log('📖 Usage: npm start [-- dev|prod] [-- OPTIONS]');
  console.log('');
  console.log('MODES:');
  console.log('   dev    Start in development mode with hot reload');
  console.log('   prod   Start in production mode (default)');
  console.log('');
  console.log('OPTIONS:');
  console.log('   --clean    Remove data volumes before starting');
  console.log('   --seed     Create test data from dev-seed.json (dev only)');
  console.log('   --help     Show this help');
  console.log('');
  console.log('EXAMPLES:');
  console.log('   npm start                         # Production');
  console.log('   npm start -- dev                  # Dev with data persistence');
  console.log('   npm start -- dev --clean          # Clean dev (volumes removed)');
  console.log('   npm start -- dev --clean --seed   # Clean dev + test data');
  console.log('');
  console.log('FILES:');
  console.log('   dev-seed.json            Test data configuration');
  console.log('   .env.dev / .env          Environment variables');
}

// ─── Parse .env file ───

function parseEnvFile(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) vars[match[1]] = match[2];
  }
  return vars;
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let mode = 'prod';
  let clean = false;
  let seed = false;

  for (const arg of args) {
    switch (arg) {
      case 'dev':
      case 'prod':
        mode = arg;
        break;
      case '--clean':
        clean = true;
        break;
      case '--seed':
        seed = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        logError(`❌ Unknown argument: ${arg}`);
        console.log('💡 Use --help for usage information');
        process.exit(1);
    }
  }

  // Validate
  if (seed && mode !== 'dev') {
    logError('❌ The --seed option is only available in dev mode');
    process.exit(1);
  }

  console.log(`🚀 Starting the platform in ${mode} mode...`);

  // Check Docker
  if (!run('docker --version', { silent: true })) {
    logError('❌ Docker is not installed.');
    process.exit(1);
  }
  if (!run('docker compose version', { silent: true })) {
    logError('❌ Docker Compose plugin is missing.');
    process.exit(1);
  }

  // Configuration based on mode
  const isDev = mode === 'dev';
  const composeFile = isDev ? 'docker-compose.dev.yml' : 'docker-compose.yml';
  const envFile = isDev ? '.env.dev' : '.env';
  const nginxContainer = isDev ? 'annales-nginx-dev' : 'annales-nginx';

  // Check .env file
  if (!existsSync(envFile)) {
    if (!isDev) {
      console.log('📝 Creating .env file from .env.example...');
      copyFileSync('.env.example', '.env');
      logWarning('⚠️  Edit .env then restart if needed.');
    } else {
      logError(`❌ File ${envFile} is missing.`);
      process.exit(1);
    }
  }

  const env = parseEnvFile(envFile);

  // 🧹 Clean volumes if requested
  if (clean) {
    if (!isDev) {
      console.log('⚠️  WARNING: This will permanently delete ALL production data (database + files).');
      const confirmed = await confirm("Are you sure? Type 'yes' to confirm: ");
      if (!confirmed) {
        console.log('❌ Aborted.');
        process.exit(1);
      }
    }
    console.log(`🧹 Cleaning data volumes (${mode})...`);

    // Stop services if running
    const running = dockerCompose(composeFile, envFile, 'ps -q', { silent: true });
    if (running) {
      console.log('⏹️  Stopping running services...');
      dockerCompose(composeFile, envFile, 'down');
    }

    // Remove volumes
    const suffix = isDev ? '_dev' : '';
    const volumes = [
      `annales-app_mongo_data${suffix}`,
      `annales-app_garage_meta${suffix}`,
      `annales-app_garage_data${suffix}`,
    ];
    console.log(`🗑️  Removing ${mode} volumes...`);
    for (const vol of volumes) {
      run(`docker volume rm ${vol}`, { silent: true });
    }
    logSuccess('✅ Cleanup complete');
  }

  // Build and start
  console.log(`🔨 Building images (${mode})...`);
  dockerCompose(composeFile, envFile, 'build');

  console.log(`▶️  Starting services (${mode})...`);
  dockerCompose(composeFile, envFile, 'up -d');

  // Initialize Garage S3 storage
  console.log('⏳ Initializing Garage S3 storage...');
  const garageContainer = dockerCompose(composeFile, envFile, 'ps -q garage', { silent: true });

  if (garageContainer) {
    const bucket = env['S3_BUCKET'] || 'annales';
    const accessKey = env['S3_ACCESS_KEY'] || '';
    const secretKey = env['S3_SECRET_KEY'] || '';
    const containerName = isDev ? 'annales-garage-dev' : 'annales-garage';

    // Wait for Garage to be ready
    for (let i = 0; i < 120; i++) {
      if (dockerExec(containerName, '/garage status')) break;
      await sleep(1000);
    }

    // Assign layout if needed
    const status = dockerExec(containerName, '/garage status');
    if (status.includes('NO ROLE ASSIGNED')) {
      const nodeIdMatch = status.match(/^[0-9a-f]{16}/m);
      if (nodeIdMatch) {
        dockerExec(containerName, `/garage layout assign -z dc1 -c 1G ${nodeIdMatch[0]}`);
        dockerExec(containerName, '/garage layout apply --version 1');
        console.log('   Layout applied.');
      }
    } else {
      console.log('   Layout already configured.');
    }

    // Create bucket
    const bucketResult = dockerExec(containerName, `/garage bucket create ${bucket}`);
    if (!bucketResult) console.log(`   Bucket '${bucket}' already exists.`);

    // Import key and grant access
    dockerExec(containerName, `/garage key import -n annales-app-key --yes ${accessKey} ${secretKey}`);
    dockerExec(containerName, `/garage bucket allow --read --write --owner ${bucket} --key ${accessKey}`);

    // Show bucket info
    const bucketInfo = dockerExec(containerName, `/garage key info ${accessKey}`);
    if (bucketInfo) {
      const keyLines = bucketInfo.split('\n').filter(l => l.includes('RW') || l.includes('Permissions'));
      if (keyLines.length) {
        console.log('==== KEYS FOR THIS BUCKET ====');
        for (const line of keyLines) console.log(line);
      }
    }
    console.log(`   Garage S3 ready (key: ${accessKey}).`);
  }

  // Wait for health checks
  console.log('⏳ Waiting for health checks...');
  const webPort = env['WEB_PORT'] || '8080';
  for (let i = 0; i < 60; i++) {
    const healthStatus = run(`docker inspect --format='{{.State.Health.Status}}' ${nginxContainer}`, { silent: true });
    if (healthStatus === 'healthy') break;
    await sleep(1000);
  }

  // Check API health
  const healthOk = run(`curl -sf http://localhost:${webPort}/api/health`, { silent: true });

  if (healthOk) {
    logSuccess(`✅ Services started successfully in ${mode} mode!`);
    console.log(`🌐 Web interface: http://localhost:${webPort}`);
    console.log(`📖 API docs:      http://localhost:${webPort}/api/docs`);
    console.log(`❤️  Health:       http://localhost:${webPort}/api/health`);

    if (isDev) {
      console.log('');
      console.log('🔥 Development mode active:');
      console.log('   - Hot reload enabled for Web and API');
      console.log(`   - Direct API:     http://localhost:${env['API_EXTERNAL_PORT'] || '3000'}`);
      console.log(`   - Direct Web:     http://localhost:${env['VITE_PORT'] || '5173'}`);
      console.log(`   - MongoDB:        localhost:${env['MONGO_EXTERNAL_PORT'] || '27017'}`);
      console.log(`   - Garage S3 API:  http://localhost:${env['GARAGE_S3_EXTERNAL_PORT'] || '3900'}`);
    }

    // Seed if requested
    if (seed) {
      console.log('');
      try {
        execSync('npm run seed', { stdio: 'inherit' });
      } catch {
        logError('❌ Seeding failed. Services are running but test data was not created.');
      }
    }
  } else {
    logError(`❌ Reverse proxy failed (port ${webPort}). Logs:`);
    run(`docker logs ${nginxContainer}`);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main();
