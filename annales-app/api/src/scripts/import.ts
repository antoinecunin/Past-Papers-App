/**
 * Bulk import script for PDF exam files
 * Usage: npm run import -- <directory> <pattern> [--dry-run]
 *
 * Scans a directory for PDF files, extracts metadata (module, year, title)
 * from filenames using a user-defined pattern, and uploads them via the
 * internal API (all validation is reused from the upload endpoint).
 *
 * This script runs inside the API container. The host-side wrapper
 * (import.ts at project root) handles copying files and docker exec.
 */

import fs from 'fs';
import path from 'path';
import { instanceConfigService } from '../services/instance-config.service.js';

// ─── Console colors ───

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
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

// ─── Pattern parsing ───

interface ParsedFile {
  filepath: string;
  filename: string;
  module: string;
  year: number;
  title: string;
  matched: boolean;
}

function buildPatternRegex(pattern: string): { regex: RegExp; groups: string[] } {
  const placeholderRe = /\{(module|year|title)\}/g;
  const groups: string[] = [];
  let lastIndex = 0;
  let regexStr = '^';

  let match;
  while ((match = placeholderRe.exec(pattern)) !== null) {
    // Escape literal text between placeholders
    const literal = pattern.slice(lastIndex, match.index);
    regexStr += escapeRegExp(literal);

    const name = match[1];
    groups.push(name);

    // Find the next literal character after this placeholder to constrain the group
    const afterPlaceholder = pattern.slice(placeholderRe.lastIndex);
    const nextLiteralChar = afterPlaceholder.match(/^[^{]/)?.[0];

    if (name === 'year') {
      regexStr += '(\\d{4})';
    } else if (nextLiteralChar) {
      regexStr += `([^${escapeRegExp(nextLiteralChar)}]+)`;
    } else {
      regexStr += '(.+)';
    }

    lastIndex = placeholderRe.lastIndex;
  }

  // Trailing literal (e.g. ".pdf")
  regexStr += escapeRegExp(pattern.slice(lastIndex));
  regexStr += '$';

  return { regex: new RegExp(regexStr), groups };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseFilenames(files: string[], directory: string, pattern: string): ParsedFile[] {
  const { regex, groups } = buildPatternRegex(pattern);
  const hasTitle = groups.includes('title');

  return files.map(filename => {
    const filepath = path.join(directory, filename);
    const match = filename.match(regex);

    if (!match) {
      return {
        filepath,
        filename,
        module: '',
        year: 0,
        title: filename.replace(/\.pdf$/i, ''),
        matched: false,
      };
    }

    const extracted: Record<string, string> = {};
    groups.forEach((name, i) => {
      extracted[name] = match[i + 1];
    });

    return {
      filepath,
      filename,
      module: extracted['module'] || '',
      year: parseInt(extracted['year'], 10) || 0,
      title: hasTitle
        ? extracted['title'] || filename.replace(/\.pdf$/i, '')
        : filename.replace(/\.pdf$/i, ''),
      matched: true,
    };
  });
}

// ─── Preview table ───

function printPreview(files: ParsedFile[]): { matchCount: number; unmatchCount: number } {
  const maxFile = Math.min(50, Math.max(8, ...files.map(f => f.filename.length)));
  const maxModule = Math.min(30, Math.max(6, ...files.map(f => f.module.length)));
  const maxTitle = Math.min(40, Math.max(5, ...files.map(f => f.title.length)));

  const header = `  ${pad('Filename', maxFile)}  ${pad('Module', maxModule)}  ${pad('Year', 4)}  ${pad('Title', maxTitle)}`;
  const separator = `  ${'─'.repeat(maxFile)}  ${'─'.repeat(maxModule)}  ${'─'.repeat(4)}  ${'─'.repeat(maxTitle)}  ${'─'.repeat(2)}`;

  console.log(`\n${colors.bold}📋 Preview (${files.length} files):${colors.reset}\n`);
  console.log(`${colors.bold}${header}${colors.reset}`);
  console.log(separator);

  let matchCount = 0;
  let unmatchCount = 0;

  for (const f of files) {
    const name =
      f.filename.length > maxFile ? f.filename.slice(0, maxFile - 3) + '...' : f.filename;
    if (f.matched) {
      console.log(
        `  ${pad(name, maxFile)}  ${pad(f.module, maxModule)}  ${pad(String(f.year), 4)}  ${pad(f.title, maxTitle)}  ✓`
      );
      matchCount++;
    } else {
      logWarning(
        `  ${pad(name, maxFile)}  ${pad('-', maxModule)}  ${pad('-', 4)}  ${pad(f.title, maxTitle)}  ⚠️`
      );
      unmatchCount++;
    }
  }

  console.log('');
  console.log(`  ✓ ${matchCount} matched`);
  if (unmatchCount > 0) {
    logWarning(`  ⚠️  ${unmatchCount} unmatched (will be skipped)`);
  }

  return { matchCount, unmatchCount };
}

function pad(s: string, len: number): string {
  return s.padEnd(len);
}

// ─── Confirmation prompt ───

async function confirm(message: string): Promise<boolean> {
  return new Promise(resolve => {
    process.stdout.write(`\n${message} `);
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');
    process.stdin.once('data', (data: string) => {
      process.stdin.pause();
      resolve(data.trim() === 'yes');
    });
  });
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const dryRun = args.includes('--dry-run');
  const positional = args.filter(a => !a.startsWith('--'));

  if (positional.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log(`📦 Usage: npm run import -- <directory> <pattern> [OPTIONS]`);
    console.log('');
    console.log('Import PDF files in bulk using filename patterns to extract metadata.');
    console.log('');
    console.log('PATTERN PLACEHOLDERS:');
    console.log('   {module}    Module or subject name');
    console.log('   {year}      Year (4 digits)');
    console.log('   {title}     Exam title');
    console.log('');
    console.log('   At least {year} and {module} are required.');
    console.log('   If {title} is omitted, the full filename (without extension) is used.');
    console.log('');
    console.log('OPTIONS:');
    console.log('   --dry-run   Preview extracted metadata without uploading');
    console.log('   --help      Show this help');
    console.log('');
    console.log('EXAMPLES:');
    console.log('   npm run import -- ./annales "{module}_{year}_{title}.pdf"');
    console.log('   npm run import -- ./exams "{year} - {module} - {title}.pdf" --dry-run');
    process.exit(positional.length < 2 ? 1 : 0);
  }

  const directory = path.resolve(positional[0]);
  const pattern = positional[1];

  // Validate arguments
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    logError(`❌ Directory not found: ${directory}`);
    process.exit(1);
  }

  if (!pattern.includes('{year}') || !pattern.includes('{module}')) {
    logError('❌ Pattern must contain at least {year} and {module}');
    console.log('💡 Example: "{module}_{year}_{title}.pdf"');
    process.exit(1);
  }

  // Load instance config
  instanceConfigService.loadConfig();
  const maxFileSizeMB = instanceConfigService.getConfig().uploads.maxFileSizeMB;
  const maxFileSize = maxFileSizeMB * 1024 * 1024;

  // Scan directory for PDFs
  const allFiles = fs
    .readdirSync(directory)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();

  if (allFiles.length === 0) {
    logError(`❌ No PDF files found in ${directory}`);
    process.exit(1);
  }

  // Filter out files that are too large
  let skippedCount = 0;
  const validFiles: string[] = [];
  for (const filename of allFiles) {
    const size = fs.statSync(path.join(directory, filename)).size;
    if (size > maxFileSize) {
      logWarning(`⚠️  Skipping (>${maxFileSizeMB}MB): ${filename}`);
      skippedCount++;
    } else {
      validFiles.push(filename);
    }
  }

  if (validFiles.length === 0) {
    logError('❌ No PDF files within size limit');
    if (skippedCount > 0) {
      console.log(`   (${skippedCount} file(s) skipped because they exceed ${maxFileSizeMB}MB)`);
    }
    process.exit(1);
  }

  // Parse filenames
  const parsed = parseFilenames(validFiles, directory, pattern);
  const { matchCount } = printPreview(parsed);

  if (skippedCount > 0) {
    logWarning(`  ⚠️  ${skippedCount} file(s) skipped (>${maxFileSizeMB}MB)`);
  }

  if (matchCount === 0) {
    logError('\n❌ No files matched the pattern. Nothing to import.');
    console.log(`💡 Check your pattern: ${pattern}`);
    process.exit(1);
  }

  // Dry run stops here
  if (dryRun) {
    logSuccess('\n📋 Dry run complete. No files imported.');
    process.exit(0);
  }

  // Confirm
  const confirmed = await confirm(`Import ${matchCount} file(s)? Type 'yes' to confirm:`);
  if (!confirmed) {
    console.log('❌ Aborted.');
    process.exit(1);
  }

  // Authenticate via internal API (no Nginx, no rate limit)
  const apiUrl = `http://localhost:${process.env.API_PORT || 3000}`;
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logError('❌ INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set');
    process.exit(1);
  }

  console.log('\n🔑 Authenticating...');
  const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    logError(
      `❌ Authentication failed: ${(err as { error?: string }).error || loginRes.statusText}`
    );
    process.exit(1);
  }

  // Extract auth cookie from response
  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
  if (!cookie) {
    logError('❌ No auth cookie received');
    process.exit(1);
  }
  logSuccess(`   ✓ Authenticated as ${adminEmail}`);

  // Upload files via API
  console.log('\n📤 Importing...\n');

  let successCount = 0;
  let failCount = 0;
  let current = 0;
  const matched = parsed.filter(f => f.matched);

  for (const file of matched) {
    current++;
    try {
      const buffer = fs.readFileSync(file.filepath);
      const blob = new Blob([buffer], { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('file', blob, file.filename);
      formData.append('title', file.title);
      formData.append('year', String(file.year));
      formData.append('module', file.module);

      const res = await fetch(`${apiUrl}/api/files/upload`, {
        method: 'POST',
        headers: { Cookie: cookie },
        body: formData,
      });

      if (res.ok) {
        console.log(
          `  [${current}/${matchCount}] ${colors.green}✓${colors.reset} ${file.filename}`
        );
        successCount++;
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(
        `  [${current}/${matchCount}] ${colors.red}✗${colors.reset} ${file.filename} — ${msg}`
      );
      failCount++;
    }
  }

  // Summary
  console.log('');
  if (failCount === 0) {
    logSuccess(`✅ ${successCount} file(s) imported successfully`);
  } else {
    logWarning(`📊 ${successCount} imported, ${failCount} failed`);
  }
}

main();
