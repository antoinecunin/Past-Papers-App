/**
 * Script de seeding pour créer des données de test
 * Usage: npx tsx src/scripts/seed.ts [--config <path>]
 *
 * Ce script lit la configuration depuis dev-seed.json et crée :
 * - Les utilisateurs (avec hash bcrypt)
 * - Les examens (upload fichiers vers S3)
 * - Les commentaires racines + réponses (threads)
 * - Les signalements
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
import { uploadBuffer, objectKey } from '../services/s3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types pour la configuration
interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
  isVerified?: boolean;
}

interface SeedFile {
  path: string;
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

// Couleurs pour la console
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

async function connectToDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI non défini');
  }

  log('🔌', 'Connexion à MongoDB...');
  await mongoose.connect(mongoUri);
  logSuccess('Connecté à MongoDB');
}

async function createUsers(
  users: SeedUser[],
  verbose: boolean
): Promise<Map<string, mongoose.Types.ObjectId>> {
  log('👤', `Création de ${users.length} utilisateurs...`);
  const userIds = new Map<string, mongoose.Types.ObjectId>();

  for (const userData of users) {
    try {
      // Vérifier si l'utilisateur existe déjà
      const existing = await UserModel.findOne({ email: userData.email });
      if (existing) {
        if (verbose) logWarning(`Utilisateur ${userData.email} existe déjà`);
        userIds.set(userData.email, existing._id);
        continue;
      }

      // Hash du mot de passe
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Création de l'utilisateur
      const user = await UserModel.create({
        email: userData.email,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
        isVerified: userData.isVerified ?? false,
      });

      userIds.set(userData.email, user._id);
      if (verbose) logSuccess(`Utilisateur créé: ${userData.email} (${userData.role || 'user'})`);
    } catch (error) {
      logError(`Erreur création utilisateur ${userData.email}: ${error}`);
    }
  }

  logSuccess(`${userIds.size} utilisateurs prêts`);
  return userIds;
}

async function createExams(
  files: SeedFile[],
  uploaderEmail: string,
  userIds: Map<string, mongoose.Types.ObjectId>,
  configDir: string,
  verbose: boolean
): Promise<mongoose.Types.ObjectId[]> {
  log('📄', `Création de ${files.length} examens...`);
  const examIds: mongoose.Types.ObjectId[] = [];

  const uploaderId = userIds.get(uploaderEmail);
  if (!uploaderId) {
    logError(`Uploader ${uploaderEmail} non trouvé`);
    return examIds;
  }

  for (const fileData of files) {
    try {
      const filePath = path.resolve(configDir, fileData.path);

      // Vérifier que le fichier existe
      if (!fs.existsSync(filePath)) {
        logWarning(`Fichier non trouvé: ${filePath}`);
        continue;
      }

      // Lire le fichier
      const fileBuffer = fs.readFileSync(filePath);

      // Générer une clé unique pour S3
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = objectKey('exams', String(fileData.year), `${timestamp}-${randomSuffix}.pdf`);

      // Upload vers S3
      await uploadBuffer(fileKey, fileBuffer, 'application/pdf');

      // Créer l'examen en base
      const exam = await Exam.create({
        title: fileData.title,
        year: fileData.year,
        module: fileData.module,
        fileKey,
        uploadedBy: uploaderId,
      });

      examIds.push(exam._id as mongoose.Types.ObjectId);
      if (verbose) logSuccess(`Examen créé: ${fileData.title}`);
    } catch (error) {
      logError(`Erreur création examen ${fileData.title}: ${error}`);
    }
  }

  logSuccess(`${examIds.length} examens créés`);
  return examIds;
}

// Commentaires de test pour le seeding
const sampleComments = [
  'La réponse à la question 1 est 42.',
  "Attention, il y a une erreur dans l'énoncé.",
  'Pour la question 3, utiliser la formule de récurrence.',
  "Cette partie n'était pas au programme cette année.",
  'Correction complète disponible sur le forum.',
  "Je pense que c'est un piège, vérifiez les hypothèses.",
  'Merci pour ce partage !',
  'La méthode vue en TD fonctionne bien ici.',
];

// Réponses de test pour les threads
const sampleReplies = [
  "Je suis d'accord, bonne analyse.",
  "Tu es sûr ? J'avais trouvé autre chose.",
  "Merci pour l'explication !",
  "Ça m'a bien aidé pour comprendre.",
  "Je ne suis pas d'accord, voici pourquoi...",
  "Quelqu'un peut confirmer ?",
  "C'est exactement ce que le prof a dit en cours.",
  "Attention, cette formule n'est valable que si n > 0.",
  "Je viens de vérifier, c'est correct.",
  'Il y a une autre méthode plus simple.',
  'Super explication, merci beaucoup !',
  'On peut aussi utiliser le théorème de...',
  "J'ai eu le même résultat en utilisant une autre approche.",
  'Le corrigé officiel donne la même chose.',
  "Bonne remarque, je n'avais pas vu ça.",
  'En fait il faut distinguer deux cas ici.',
  'Voir aussi la question 5 qui est liée.',
  'Le prof avait donné un indice en amphi.',
  "C'est plus clair maintenant, merci !",
  "Il me semble qu'il manque un facteur 2.",
];

async function createAnswers(
  examIds: mongoose.Types.ObjectId[],
  userIds: Map<string, mongoose.Types.ObjectId>,
  verbose: boolean
): Promise<{ answerIds: mongoose.Types.ObjectId[]; replyCount: number }> {
  log('💬', 'Création des commentaires et réponses...');
  const answerIds: mongoose.Types.ObjectId[] = [];
  const rootAnswers: {
    id: mongoose.Types.ObjectId;
    examId: mongoose.Types.ObjectId;
    page: number;
    yTop: number;
  }[] = [];
  const userIdArray = Array.from(userIds.values());
  let replyCount = 0;

  // Créer 2-3 commentaires racines par examen
  // Le premier commentaire du premier examen est déterministe (page 1, yTop 0.3)
  // pour retrouver facilement les 15 réponses de test
  for (let examIndex = 0; examIndex < examIds.length; examIndex++) {
    const examId = examIds[examIndex];
    const numComments = 2 + Math.floor(Math.random() * 2); // 2 ou 3 commentaires

    for (let i = 0; i < numComments; i++) {
      try {
        const isFirstComment = examIndex === 0 && i === 0;
        const authorId = isFirstComment
          ? userIdArray[0]
          : userIdArray[Math.floor(Math.random() * userIdArray.length)];
        const comment = isFirstComment
          ? sampleComments[0]
          : sampleComments[Math.floor(Math.random() * sampleComments.length)];
        const page = isFirstComment ? 1 : 1 + Math.floor(Math.random() * 3);
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
        // Ignore les erreurs
      }
    }
  }

  if (verbose) logSuccess(`${answerIds.length} commentaires racines créés`);

  // Créer des réponses sur certains commentaires
  // - Le premier commentaire racine reçoit 15 réponses (pour tester l'infinite scroll, limit=10)
  // - Quelques autres reçoivent 1-3 réponses
  for (let i = 0; i < rootAnswers.length; i++) {
    const root = rootAnswers[i];
    let numReplies: number;

    if (i === 0) {
      // Premier commentaire : 15 réponses pour déclencher l'infinite scroll
      numReplies = 15;
    } else if (Math.random() < 0.4) {
      // 40% des autres commentaires ont 1-3 réponses
      numReplies = 1 + Math.floor(Math.random() * 3);
    } else {
      continue; // Pas de réponses
    }

    for (let j = 0; j < numReplies; j++) {
      try {
        const authorId = userIdArray[Math.floor(Math.random() * userIdArray.length)];
        const replyText = sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

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
        });

        replyCount++;
      } catch {
        // Ignore les erreurs
      }
    }
  }

  if (verbose) logSuccess(`${replyCount} réponses créées (dont 15 sur le premier commentaire)`);
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
    logWarning('Aucun utilisateur pour créer des signalements');
    return { examReports: 0, commentReports: 0 };
  }

  const reasons = Object.values(ReportReason);

  // Descriptions de test variées pour les examens
  const examDescriptions = [
    'Ce contenu semble inapproprié',
    "L'examen ne correspond pas au module",
    'Possible violation de droits',
    'Qualité du scan très mauvaise',
    'Document illisible',
    'Duplication possible',
    undefined,
  ];

  // Descriptions de test variées pour les commentaires
  const commentDescriptions = [
    'Commentaire offensant',
    'Spam publicitaire',
    'Information incorrecte volontairement',
    'Contenu hors-sujet',
    'Langage inapproprié',
    undefined,
  ];

  const count = reportsConfig.count || 25;
  const items = reportsConfig.items || [];

  // Répartition : 60% sur examens, 40% sur commentaires
  const examReportCount = Math.ceil(count * 0.6);
  const commentReportCount = count - examReportCount;

  log(
    '🚨',
    `Création de ${count} signalements (${examReportCount} examens, ${commentReportCount} commentaires)...`
  );

  let examReportsCreated = 0;
  let commentReportsCreated = 0;

  // Créer les signalements explicitement définis (sur examens)
  for (const item of items) {
    if (examReportsCreated >= examReportCount) break;

    try {
      const examIndex = examReportsCreated % examIds.length;
      const userIndex = examReportsCreated % userIdArray.length;

      await ReportModel.create({
        type: ReportType.EXAM,
        targetId: examIds[examIndex],
        reason: (item.reason as ReportReason) || ReportReason.OTHER,
        description: item.description,
        reportedBy: userIdArray[userIndex],
        status: (item.status as ReportStatus) || ReportStatus.PENDING,
      });

      examReportsCreated++;
      if (verbose) logSuccess(`Signalement exam: ${item.reason}`);
    } catch {
      if (verbose) logWarning(`Signalement ignoré (doublon probable)`);
    }
  }

  // Signalements aléatoires sur examens
  const usedExamCombinations = new Set<string>();
  while (examReportsCreated < examReportCount && examIds.length > 0) {
    const examIndex = Math.floor(Math.random() * examIds.length);
    const userIndex = Math.floor(Math.random() * userIdArray.length);
    const comboKey = `exam-${userIndex}-${examIndex}`;

    if (usedExamCombinations.has(comboKey)) {
      if (usedExamCombinations.size >= userIdArray.length * examIds.length) {
        logWarning('Toutes les combinaisons user/exam épuisées');
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
      if (verbose) logSuccess(`Signalement exam #${examReportsCreated}: ${reason} (${status})`);
    } catch {
      // Ignore
    }
  }

  // Signalements sur commentaires
  const usedCommentCombinations = new Set<string>();
  while (commentReportsCreated < commentReportCount && answerIds.length > 0) {
    const answerIndex = Math.floor(Math.random() * answerIds.length);
    const userIndex = Math.floor(Math.random() * userIdArray.length);
    const comboKey = `comment-${userIndex}-${answerIndex}`;

    if (usedCommentCombinations.has(comboKey)) {
      if (usedCommentCombinations.size >= userIdArray.length * answerIds.length) {
        logWarning('Toutes les combinaisons user/comment épuisées');
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
      if (verbose)
        logSuccess(`Signalement comment #${commentReportsCreated}: ${reason} (${status})`);
    } catch {
      // Ignore
    }
  }

  logSuccess(
    `${examReportsCreated + commentReportsCreated} signalements créés (${examReportsCreated} examens, ${commentReportsCreated} commentaires)`
  );
  return { examReports: examReportsCreated, commentReports: commentReportsCreated };
}

async function main() {
  // Parser les arguments
  const args = process.argv.slice(2);
  let configPath = path.resolve(__dirname, '../../../dev-seed.json');

  const configIndex = args.indexOf('--config');
  if (configIndex !== -1 && args[configIndex + 1]) {
    configPath = path.resolve(args[configIndex + 1]);
  }

  log('🌱', 'Démarrage du seeding...');
  logInfo(`Configuration: ${configPath}`);

  // Vérifier que le fichier de config existe
  if (!fs.existsSync(configPath)) {
    logError(`Fichier de configuration non trouvé: ${configPath}`);
    process.exit(1);
  }

  // Lire la configuration
  const config: SeedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const configDir = path.dirname(configPath);
  const verbose = config.settings?.verbose ?? true;

  try {
    // Connexion à la base de données
    await connectToDatabase();

    // Créer les utilisateurs
    const userIds = await createUsers(config.users, verbose);

    // Créer les examens (uploader = premier utilisateur vérifié)
    const uploaderEmail = config.users.find(u => u.isVerified)?.email || config.users[0].email;
    const examIds = await createExams(config.files, uploaderEmail, userIds, configDir, verbose);

    // Créer les commentaires et réponses sur les examens
    const { answerIds, replyCount } = await createAnswers(examIds, userIds, verbose);

    // Créer les signalements (examens + commentaires)
    const reportStats = await createReports(config.reports, examIds, answerIds, userIds, verbose);

    // Résumé
    console.log('\n' + '='.repeat(50));
    log('🎉', 'Seeding terminé avec succès!', colors.green);
    console.log(`   - ${userIds.size} utilisateurs`);
    console.log(`   - ${examIds.length} examens`);
    console.log(`   - ${answerIds.length} commentaires racines`);
    console.log(`   - ${replyCount} réponses (threads)`);
    console.log(
      `   - ${reportStats.examReports + reportStats.commentReports} signalements (${reportStats.examReports} examens, ${reportStats.commentReports} commentaires)`
    );

    // Afficher les credentials de connexion
    console.log('\n📋 Credentials de test:');
    for (const user of config.users) {
      const role = user.role === 'admin' ? '(admin)' : '';
      console.log(`   ${user.email} / ${user.password} ${role}`);
    }
  } catch (error) {
    logError(`Erreur fatale: ${error}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log('🔌', 'Déconnecté de MongoDB');
  }
}

main();
