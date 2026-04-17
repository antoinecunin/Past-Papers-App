/**
 * Seed script to create test data
 * Usage: npx tsx src/scripts/seed.ts [--config <path>]
 *
 * Reads configuration from dev-seed.json and creates:
 * - Users (with bcrypt hashing)
 * - Exams (uploads files to S3)
 * - Root comments + replies (threads)
 * - Reports
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserModel, UserRole } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { AnswerModel } from '../models/Answer.js';
import { ReportModel, ReportType, ReportReason, ReportStatus } from '../models/Report.js';
import { PDFDocument } from 'pdf-lib';
import { uploadBuffer, objectKey } from '../services/s3.js';
import { instanceConfigService } from '../services/instance-config.service.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * Generate a fake PDF with the given number of pages using pdf-lib.
 * Each page has the exam title and page number drawn on it.
 */
async function generateFakePdf(title: string, numPages: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont('Helvetica');

  for (let i = 1; i <= numPages; i++) {
    const page = pdf.addPage([595, 842]); // A4
    page.drawText(title, { x: 50, y: 780, size: 20, font });
    page.drawText(`Page ${i} / ${numPages}`, { x: 50, y: 750, size: 14, font });
    page.drawText('This is a generated test document for development purposes.', {
      x: 50,
      y: 700,
      size: 12,
      font,
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
const __dirname = path.dirname(__filename);

// Types for seed configuration
interface SeedUser {
  emailPrefix: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
  isVerified?: boolean;
}

interface SeedFile {
  title: string;
  year: number;
  module: string;
}

interface SeedReport {
  reason: string;
  description?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface SeedConfig {
  users: SeedUser[];
  files: SeedFile[];
  reports?: {
    count?: number;
    items?: SeedReport[];
  };
  settings?: {
    verbose?: boolean;
  };
}

// Console colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(emoji: string, message: string, color = colors.reset) {
  console.log(`${color}${emoji} ${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log('✅', message, colors.green);
}

function logWarning(message: string) {
  log('⚠️', message, colors.yellow);
}

function logError(message: string) {
  log('❌', message, colors.red);
}

function logInfo(message: string) {
  log('📌', message, colors.cyan);
}

/**
 * Build a full email address from a prefix and the first allowed domain in instance config
 */
function buildEmail(prefix: string): string {
  const config = instanceConfigService.getConfig();
  const domain = config.email.allowedDomains[0];
  return `${prefix}${domain}`;
}

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI not defined');
  }

  log('🔌', 'Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  logSuccess('Connected to MongoDB');
}

async function createUsers(
  users: SeedUser[],
  verbose: boolean
): Promise<Map<string, mongoose.Types.ObjectId>> {
  log('👤', `Creating ${users.length} users...`);
  const userIds = new Map<string, mongoose.Types.ObjectId>();

  for (const userData of users) {
    try {
      const email = buildEmail(userData.emailPrefix);

      // Check if user already exists
      const existing = await UserModel.findOne({ email });
      if (existing) {
        if (verbose) logWarning(`User ${email} already exists`);
        userIds.set(email, existing._id);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user
      const user = await UserModel.create({
        email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
        isVerified: userData.isVerified ?? false,
      });

      userIds.set(email, user._id);
      if (verbose) logSuccess(`User created: ${email} (${userData.role || 'user'})`);
    } catch (error) {
      logError(`Error creating user ${userData.emailPrefix}: ${error}`);
    }
  }

  logSuccess(`${userIds.size} users ready`);
  return userIds;
}

interface ExamInfo {
  id: mongoose.Types.ObjectId;
  pages: number;
}

async function createExams(
  files: SeedFile[],
  uploaderEmail: string,
  userIds: Map<string, mongoose.Types.ObjectId>,
  verbose: boolean
): Promise<ExamInfo[]> {
  log('📄', `Creating ${files.length} exams...`);
  const exams: ExamInfo[] = [];

  const uploaderId = userIds.get(uploaderEmail);
  if (!uploaderId) {
    logError(`Uploader ${uploaderEmail} not found`);
    return exams;
  }

  for (const fileData of files) {
    try {
      // Generate a fake PDF (1-3 pages)
      const numPages = 1 + Math.floor(Math.random() * 3);
      const fileBuffer = await generateFakePdf(fileData.title, numPages);

      // Generate a unique S3 key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = objectKey('exams', String(fileData.year), `${timestamp}-${randomSuffix}.pdf`);

      // Upload to S3
      await uploadBuffer(fileKey, fileBuffer, 'application/pdf');

      const pages = numPages;

      // Create exam in database
      const exam = await Exam.create({
        title: fileData.title,
        year: fileData.year,
        module: fileData.module,
        fileKey,
        fileSize: fileBuffer.length,
        pages,
        uploadedBy: uploaderId,
      });

      exams.push({ id: exam._id as mongoose.Types.ObjectId, pages });
      if (verbose) logSuccess(`Exam created: ${fileData.title} (${pages} pages)`);
    } catch (error) {
      logError(`Error creating exam ${fileData.title}: ${error}`);
    }
  }

  logSuccess(`${exams.length} exams created`);
  return exams;
}

// Sample comments for seeding
const sampleComments = [
  'The answer to question 1 is 42.',
  'Note: there is an error in the problem statement.',
  'For question 3, use the recurrence formula.',
  "This section wasn't covered in this year's curriculum.",
  'Full solution available on the forum.',
  'I think this is a trick question — check the assumptions.',
  'Thanks for sharing!',
  'The method from the tutorial works well here.',
];

// Sample replies for threads
const sampleReplies = [
  'I agree, good analysis.',
  'Are you sure? I got a different result.',
  'Thanks for the explanation!',
  'This really helped me understand.',
  "I disagree, here's why...",
  'Can anyone confirm?',
  "That's exactly what the professor said in class.",
  'Be careful, this formula only holds for n > 0.',
  "I just checked, it's correct.",
  "There's a simpler method.",
  'Great explanation, thanks a lot!',
  'You can also use the theorem of...',
  'I got the same result using a different approach.',
  'The official answer key gives the same thing.',
  "Good point, I hadn't noticed that.",
  'Actually, you need to distinguish two cases here.',
  'See also question 5, which is related.',
  'The professor gave a hint during the lecture.',
  "It's clearer now, thanks!",
  'I think there might be a missing factor of 2.',
];

async function createAnswersAndReplies(
  exams: ExamInfo[],
  userIds: Map<string, mongoose.Types.ObjectId>,
  verbose: boolean
): Promise<{ answerIds: mongoose.Types.ObjectId[]; replyCount: number }> {
  log('💬', 'Creating comments and replies...');
  const answerIds: mongoose.Types.ObjectId[] = [];
  const rootAnswers: {
    id: mongoose.Types.ObjectId;
    examId: mongoose.Types.ObjectId;
    page: number;
    yTop: number;
  }[] = [];
  const userIdArray = Array.from(userIds.values());
  let replyCount = 0;

  // Create 2-3 root comments per exam
  // The first comment on the first exam is deterministic (page 1, yTop 0.3)
  // to easily locate the 15 test replies
  for (let examIndex = 0; examIndex < exams.length; examIndex++) {
    const { id: examId, pages: examPages } = exams[examIndex];
    const numComments = 2 + Math.floor(Math.random() * 2); // 2 or 3 comments

    for (let i = 0; i < numComments; i++) {
      try {
        const isFirstComment = examIndex === 0 && i === 0;
        const authorId = isFirstComment
          ? userIdArray[0]
          : userIdArray[Math.floor(Math.random() * userIdArray.length)];
        const comment = isFirstComment
          ? sampleComments[0]
          : sampleComments[Math.floor(Math.random() * sampleComments.length)];
        const page = isFirstComment ? 1 : 1 + Math.floor(Math.random() * examPages);
        const yTop = isFirstComment ? 0.3 : Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;

        const answer = await AnswerModel.create({
          examId,
          page,
          yTop,
          content: {
            type: 'text',
            data: comment,
          },
          authorId,
        });

        const answerId = answer._id as mongoose.Types.ObjectId;
        answerIds.push(answerId);
        rootAnswers.push({ id: answerId, examId, page, yTop });
      } catch {
        // Ignore errors
      }
    }
  }

  if (verbose) logSuccess(`${answerIds.length} root comments created`);

  // Create replies on some comments
  // - The first root comment gets 15 replies (to test infinite scroll, limit=10)
  // - Some others get 1-3 replies
  // - Some replies mention a previous user (YouTube-style)
  for (let i = 0; i < rootAnswers.length; i++) {
    const root = rootAnswers[i];
    let numReplies: number;

    if (i === 0) {
      // First comment: 15 replies to trigger infinite scroll
      numReplies = 15;
    } else if (Math.random() < 0.4) {
      // 40% of other comments get 1-3 replies
      numReplies = 1 + Math.floor(Math.random() * 3);
    } else {
      continue; // No replies
    }

    // Track thread authors for mentions
    const threadAuthorIds: mongoose.Types.ObjectId[] = [
      // The root comment author is a mention candidate
      userIdArray.find(id => rootAnswers[i] && id) || userIdArray[0],
    ];

    for (let j = 0; j < numReplies; j++) {
      try {
        const authorId = userIdArray[Math.floor(Math.random() * userIdArray.length)];
        const replyText = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

        // Decide if this reply mentions someone
        // ~40% of replies mention a previous author (not self)
        let mentionedUserId: mongoose.Types.ObjectId | null = null;
        if (Math.random() < 0.4) {
          const candidates = threadAuthorIds.filter(id => id.toString() !== authorId.toString());
          if (candidates.length > 0) {
            mentionedUserId = candidates[Math.floor(Math.random() * candidates.length)];
          }
        }

        await AnswerModel.create({
          examId: root.examId,
          page: root.page,
          yTop: root.yTop,
          content: {
            type: 'text',
            data: replyText,
          },
          authorId,
          parentId: root.id,
          mentionedUserId,
        });

        threadAuthorIds.push(authorId);
        replyCount++;
      } catch {
        // Ignore errors
      }
    }
  }

  if (verbose) logSuccess(`${replyCount} replies created (including 15 on the first comment)`);
  return { answerIds, replyCount };
}

async function createReports(
  reportsConfig: SeedConfig['reports'],
  examIds: mongoose.Types.ObjectId[],
  answerIds: mongoose.Types.ObjectId[],
  userIds: Map<string, mongoose.Types.ObjectId>,
  verbose: boolean
): Promise<{ examReports: number; commentReports: number }> {
  if (!reportsConfig || (examIds.length === 0 && answerIds.length === 0)) {
    return { examReports: 0, commentReports: 0 };
  }

  const userIdArray = Array.from(userIds.values());
  if (userIdArray.length === 0) {
    logWarning('No users available to create reports');
    return { examReports: 0, commentReports: 0 };
  }

  const reasons = Object.values(ReportReason);

  // Various test descriptions for exams
  const examDescriptions = [
    'This content seems inappropriate',
    'The exam does not match the module',
    'Possible rights violation',
    'Very poor scan quality',
    'Illegible document',
    'Possible duplicate',
    undefined,
  ];

  // Various test descriptions for comments
  const commentDescriptions = [
    'Offensive comment',
    'Spam / advertisement',
    'Deliberately incorrect information',
    'Off-topic content',
    'Inappropriate language',
    undefined,
  ];

  const count = reportsConfig.count || 25;
  const items = reportsConfig.items || [];

  // Split: 60% on exams, 40% on comments
  const examReportCount = Math.ceil(count * 0.6);
  const commentReportCount = count - examReportCount;

  log(
    '🚨',
    `Creating ${count} reports (${examReportCount} exams, ${commentReportCount} comments)...`
  );

  let examReportsCreated = 0;
  let commentReportsCreated = 0;

  // Track all used combinations to avoid duplicates
  const usedExamCombinations = new Set<string>();

  // Create explicitly defined reports (on exams)
  for (const item of items) {
    if (examReportsCreated >= examReportCount) break;

    const examIndex = examReportsCreated % examIds.length;
    const userIndex = examReportsCreated % userIdArray.length;
    const comboKey = `exam-${userIndex}-${examIndex}`;

    // Skip if combination already used
    if (usedExamCombinations.has(comboKey)) {
      continue;
    }

    await ReportModel.create({
      type: ReportType.EXAM,
      targetId: examIds[examIndex],
      reason: (item.reason as ReportReason) || ReportReason.OTHER,
      description: item.description,
      reportedBy: userIdArray[userIndex],
      status: (item.status as ReportStatus) || ReportStatus.PENDING,
    });

    usedExamCombinations.add(comboKey);
    examReportsCreated++;
    if (verbose) logSuccess(`Exam report: ${item.reason}`);
  }

  // Random reports on exams
  while (examReportsCreated < examReportCount && examIds.length > 0) {
    const examIndex = Math.floor(Math.random() * examIds.length);
    const userIndex = Math.floor(Math.random() * userIdArray.length);
    const comboKey = `exam-${userIndex}-${examIndex}`;

    if (usedExamCombinations.has(comboKey)) {
      if (usedExamCombinations.size >= userIdArray.length * examIds.length) {
        logWarning('All user/exam combinations exhausted');
        break;
      }
      continue;
    }
    usedExamCombinations.add(comboKey);

    try {
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      const description = examDescriptions[Math.floor(Math.random() * examDescriptions.length)];
      const statusRoll = Math.random();
      const status =
        statusRoll < 0.7
          ? ReportStatus.PENDING
          : statusRoll < 0.85
            ? ReportStatus.APPROVED
            : ReportStatus.REJECTED;

      await ReportModel.create({
        type: ReportType.EXAM,
        targetId: examIds[examIndex],
        reason,
        description: description ? `${description} (exam #${examReportsCreated + 1})` : undefined,
        reportedBy: userIdArray[userIndex],
        status,
      });

      examReportsCreated++;
      if (verbose) logSuccess(`Exam report #${examReportsCreated}: ${reason} (${status})`);
    } catch (error) {
      if (verbose) logWarning(`Error creating exam report: ${error}`);
    }
  }

  // Reports on comments
  const usedCommentCombinations = new Set<string>();
  while (commentReportsCreated < commentReportCount && answerIds.length > 0) {
    const answerIndex = Math.floor(Math.random() * answerIds.length);
    const userIndex = Math.floor(Math.random() * userIdArray.length);
    const comboKey = `comment-${userIndex}-${answerIndex}`;

    if (usedCommentCombinations.has(comboKey)) {
      if (usedCommentCombinations.size >= userIdArray.length * answerIds.length) {
        logWarning('All user/comment combinations exhausted');
        break;
      }
      continue;
    }
    usedCommentCombinations.add(comboKey);

    try {
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      const description =
        commentDescriptions[Math.floor(Math.random() * commentDescriptions.length)];
      const statusRoll = Math.random();
      const status =
        statusRoll < 0.7
          ? ReportStatus.PENDING
          : statusRoll < 0.85
            ? ReportStatus.APPROVED
            : ReportStatus.REJECTED;

      await ReportModel.create({
        type: ReportType.COMMENT,
        targetId: answerIds[answerIndex],
        reason,
        description: description
          ? `${description} (comment #${commentReportsCreated + 1})`
          : undefined,
        reportedBy: userIdArray[userIndex],
        status,
      });

      commentReportsCreated++;
      if (verbose) logSuccess(`Comment report #${commentReportsCreated}: ${reason} (${status})`);
    } catch (error) {
      if (verbose) logWarning(`Error creating comment report: ${error}`);
    }
  }

  logSuccess(
    `${examReportsCreated + commentReportsCreated} reports created (${examReportsCreated} exams, ${commentReportsCreated} comments)`
  );
  return { examReports: examReportsCreated, commentReports: commentReportsCreated };
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  let configPath = path.resolve(__dirname, '../../../dev-seed.json');

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = path.resolve(args[configIndex + 1]);
  }

  log('🌱', 'Starting seed...');
  logInfo(`Configuration: ${configPath}`);

  // Check that the config file exists
  if (!fs.existsSync(configPath)) {
    logError(`Configuration file not found: ${configPath}`);
    process.exit(1);
  }

  // Read configuration
  const config: SeedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const verbose = config.settings?.verbose ?? true;

  try {
    // Connect to database
    await connectToDatabase();

    // Load instance configuration (needed for email domain)
    log('⚙️', 'Loading instance configuration...');
    instanceConfigService.loadConfig();
    logSuccess('Instance configuration loaded');

    // Create users
    const userIds = await createUsers(config.users, verbose);

    // Create exams (uploader = first verified user)
    const firstVerified = config.users.find(u => u.isVerified);
    const uploaderEmail = firstVerified
      ? buildEmail(firstVerified.emailPrefix)
      : buildEmail(config.users[0].emailPrefix);
    const exams = await createExams(config.files, uploaderEmail, userIds, verbose);
    const examIds = exams.map(e => e.id);

    // Create comments and replies on exams
    const { answerIds, replyCount } = await createAnswersAndReplies(exams, userIds, verbose);

    // Create reports (exams + comments)
    const reportStats = await createReports(config.reports, examIds, answerIds, userIds, verbose);

    // Summary
    console.log('\n' + '='.repeat(50));
    log('🎉', 'Seeding completed successfully!', colors.green);
    console.log(`   - ${userIds.size} users`);
    console.log(`   - ${exams.length} exams`);
    console.log(`   - ${answerIds.length} root comments`);
    console.log(`   - ${replyCount} replies (threads)`);
    console.log(
      `   - ${reportStats.examReports + reportStats.commentReports} reports (${reportStats.examReports} exams, ${reportStats.commentReports} comments)`
    );

    // Display login credentials
    console.log('\n📋 Test credentials:');
    for (const user of config.users) {
      const role = user.role === 'admin' ? '(admin)' : '';
      console.log(`   ${buildEmail(user.emailPrefix)} / ${user.password} ${role}`);
    }
  } catch (error) {
    logError(`Fatal error: ${error}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('🔌', 'Disconnected from MongoDB');
  }
}

main();
