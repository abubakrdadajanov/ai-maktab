import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb, query, transaction, getDbMode } from './db.js';
import { generateChatReply, isAiConfigured } from './ai.js';
import { evaluatePrompt } from './rubric.js';
import { checkAndAwardAchievements } from './achievements.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ai-maktab-super-secure-production-jwt-key-2026-uz';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline styles/scripts and Google fonts
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieParser());

// Serve static frontend assets from public directory
app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));

// Simple in-memory rate limiter for login/register attempts
const loginAttempts = new Map();
function rateLimitAuth(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'local';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 15;

  const userAttempts = loginAttempts.get(ip) || [];
  const recent = userAttempts.filter(t => now - t < windowMs);

  if (recent.length >= maxAttempts) {
    return res.status(429).json({
      error: 'Juda ko‘p urinish qilindi. Iltimos, 1 daqiqa kutib qayta urinib ko‘ring.'
    });
  }

  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
}

// Helpers for Auth & Cookies
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setAuthCookie(res, token) {
  res.cookie('aimaktab_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
}

function authMiddleware(req, res, next) {
  const token = req.cookies.aimaktab_token;
  if (!token) {
    return res.status(401).json({ error: 'Avval tizimga kiring.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('aimaktab_token', { path: '/' });
    return res.status(401).json({ error: 'Sessiya muddati tugagan. Qayta kiring.' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Bu amal faqat administratorlar uchun ruxsat etilgan.' });
  }
  next();
}

// ==========================================
// 1. PUBLIC & SYSTEM ROUTES
// ==========================================

app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    const mode = await getDbMode();
    res.json({
      ok: true,
      service: 'AI Maktab API',
      database: 'connected',
      databaseMode: mode,
      aiConfigured: isAiConfigured(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      database: 'disconnected',
      error: err.message
    });
  }
});

app.get('/api/public/stats', async (_req, res) => {
  try {
    const [usersRes, quizzesRes, exercisesRes, projectsRes] = await Promise.all([
      query("SELECT COUNT(*)::int as count FROM users WHERE role <> 'admin'"),
      query("SELECT COUNT(*)::int as count FROM questions"),
      query("SELECT COUNT(*)::int as count FROM exercises"),
      query("SELECT COUNT(*)::int as count FROM projects")
    ]);

    res.json({
      studentsCount: usersRes.rows[0]?.count || 0,
      questionsCount: quizzesRes.rows[0]?.count || 0,
      exercisesCount: exercisesRes.rows[0]?.count || 0,
      projectsCount: projectsRes.rows[0]?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Statistika yuklanmadi.' });
  }
});

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================

const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 belgidan iborat bo‘lishi lozim').max(100),
  email: z.string().trim().email('Noto‘g‘ri email formati').toLowerCase(),
  password: z.string().min(8, 'Parol kamida 8 ta belgidan iborat bo‘lishi lozim').max(100),
  grade: z.string().trim().max(50).optional()
});

app.post('/api/auth/register', rateLimitAuth, async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Ma’lumotlar noto‘g‘ri' });
  }

  const { name, email, password, grade } = parsed.data;

  try {
    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Ushbu email bilan allaqachon hisob ochilgan.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, points, grade)
       VALUES ($1, $2, $3, 'student', 25, $4)
       RETURNING id, name, email, role, points, grade, bio, created_at`,
      [name, email, passwordHash, grade || '']
    );

    const user = result.rows[0];

    // Log registration activity
    await query(
      `INSERT INTO activity_logs (user_id, activity_type, description, points_change)
       VALUES ($1, 'register', 'AI Maktab platformasida ro‘yxatdan o‘tildi', 25)`,
      [user.id]
    );

    // Automatically check and award first_step achievement
    await checkAndAwardAchievements(user.id);

    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'Ro‘yxatdan o‘tish muvaffaqiyatli yakunlandi!',
      user
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ushbu email bilan allaqachon hisob ochilgan.' });
    }
    console.error('Ro‘yxatdan o‘tishda xatolik:', err);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.' });
  }
});

const LoginSchema = z.object({
  email: z.string().trim().email('Email manzilni to‘g‘ri kiriting').toLowerCase(),
  password: z.string().min(1, 'Parolni kiriting')
});

app.post('/api/auth/login', rateLimitAuth, async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Email yoki parol xato' });
  }

  const { email, password } = parsed.data;

  try {
    const result = await query(
      `SELECT id, name, email, password_hash, role, points, grade, bio, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Email yoki parol noto‘g‘ri kiritildi.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Email yoki parol noto‘g‘ri kiritildi.' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    const { password_hash, ...safeUser } = user;
    res.json({
      message: 'Xush kelibsiz!',
      user: safeUser
    });
  } catch (err) {
    console.error('Kirishda xatolik:', err);
    res.status(500).json({ error: 'Tizimga kirishda xatolik yuz berdi.' });
  }
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('aimaktab_token', { path: '/' });
  res.json({ ok: true, message: 'Tizimdan muvaffaqiyatli chiqildi.' });
});

// ==========================================
// 3. USER PROFILE & ME
// ==========================================

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, points, grade, bio, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      res.clearCookie('aimaktab_token', { path: '/' });
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Foydalanuvchi ma’lumotini olishda xatolik.' });
  }
});

const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(300).optional(),
  grade: z.string().trim().max(50).optional()
});

app.patch('/api/me', authMiddleware, async (req, res) => {
  const parsed = UpdateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Kiritilgan ma’lumotlar noto‘g‘ri.' });
  }

  const { name, bio, grade } = parsed.data;

  try {
    const updateRes = await query(
      `UPDATE users
       SET name = COALESCE($1, name),
           bio = COALESCE($2, bio),
           grade = COALESCE($3, grade)
       WHERE id = $4
       RETURNING id, name, email, role, points, grade, bio, created_at`,
      [name || null, bio !== undefined ? bio : null, grade !== undefined ? grade : null, req.user.id]
    );

    res.json({
      message: 'Profil yangilandi!',
      user: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Profilni saqlashda xatolik yuz berdi.' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const [userRes, rankRes, attemptsRes, promptsRes, achRes, activityRes] = await Promise.all([
      query('SELECT id, name, email, role, points, grade, bio, created_at FROM users WHERE id = $1', [userId]),
      query(
        `SELECT rank FROM (
           SELECT id, RANK() OVER (ORDER BY points DESC, created_at ASC) as rank
           FROM users WHERE role <> 'admin'
         ) ranked WHERE id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE is_correct)::int as correct
         FROM attempts WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int as total,
                COALESCE(MAX(score), 0)::int as best_score
         FROM submissions WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT a.id, a.title, a.description, a.icon, a.points_reward, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1
         ORDER BY ua.earned_at DESC`,
        [userId]
      ),
      query(
        `SELECT activity_type, description, points_change, created_at
         FROM activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 15`,
        [userId]
      )
    ]);

    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });

    const totalQuiz = attemptsRes.rows[0]?.total || 0;
    const correctQuiz = attemptsRes.rows[0]?.correct || 0;
    const accuracy = totalQuiz > 0 ? Math.round((correctQuiz / totalQuiz) * 100) : 0;

    res.json({
      user,
      rank: rankRes.rows[0]?.rank || 1,
      stats: {
        quizzes: { total: totalQuiz, correct: correctQuiz, accuracy },
        prompts: {
          total: promptsRes.rows[0]?.total || 0,
          bestScore: promptsRes.rows[0]?.best_score || 0
        }
      },
      achievements: achRes.rows,
      recentActivity: activityRes.rows
    });
  } catch (err) {
    console.error('Profil ma’lumotini olishda xatolik:', err);
    res.status(500).json({ error: 'Profil ma’lumotlari yuklanmadi.' });
  }
});

// ==========================================
// 4. STUDENT DASHBOARD
// ==========================================

app.get('/api/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [userRes, rankRes, quizStatsRes, promptStatsRes, chatStatsRes, recentActRes, achRes, exercisesRes] = await Promise.all([
      query('SELECT id, name, email, role, points, grade FROM users WHERE id = $1', [userId]),
      query(
        `SELECT rank FROM (
           SELECT id, RANK() OVER (ORDER BY points DESC, created_at ASC) as rank
           FROM users WHERE role <> 'admin'
         ) ranked WHERE id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int as total,
                COUNT(*) FILTER (WHERE is_correct)::int as correct
         FROM attempts WHERE user_id = $1`,
        [userId]
      ),
      query(
        `SELECT COUNT(*)::int as total,
                COALESCE(MAX(score), 0)::int as best_score
         FROM submissions WHERE user_id = $1`,
        [userId]
      ),
      query("SELECT COUNT(*)::int as count FROM chat_messages WHERE user_id = $1 AND role = 'user'", [userId]),
      query('SELECT activity_type, description, points_change, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5', [userId]),
      query(
        `SELECT a.id, a.title, a.icon, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id = $1
         ORDER BY ua.earned_at DESC LIMIT 4`,
        [userId]
      ),
      query('SELECT id, title, category, max_points FROM exercises ORDER BY id LIMIT 3')
    ]);

    const user = userRes.rows[0];
    const totalQuiz = quizStatsRes.rows[0]?.total || 0;
    const correctQuiz = quizStatsRes.rows[0]?.correct || 0;

    res.json({
      user,
      rank: rankRes.rows[0]?.rank || 1,
      stats: {
        totalPoints: user.points,
        quizTotal: totalQuiz,
        quizCorrect: correctQuiz,
        quizAccuracy: totalQuiz > 0 ? Math.round((correctQuiz / totalQuiz) * 100) : 0,
        promptTotal: promptStatsRes.rows[0]?.total || 0,
        promptBestScore: promptStatsRes.rows[0]?.best_score || 0,
        chatMessagesCount: chatStatsRes.rows[0]?.count || 0
      },
      recentActivity: recentActRes.rows,
      achievements: achRes.rows,
      recommendedExercises: exercisesRes.rows
    });
  } catch (err) {
    console.error('Dashboard ma’lumotlarida xatolik:', err);
    res.status(500).json({ error: 'Bosh sahifa ma’lumotlari yuklanmadi.' });
  }
});

// ==========================================
// 5. TESTS AND QUIZZES
// ==========================================

app.get('/api/quizzes/categories', authMiddleware, async (_req, res) => {
  try {
    const result = await query(
      `SELECT c.id, c.name, c.description, c.icon,
              COUNT(q.id)::int as questions_count
       FROM quiz_categories c
       LEFT JOIN questions q ON q.category = c.name
       GROUP BY c.id, c.name, c.description, c.icon
       ORDER BY c.id`
    );
    res.json({ categories: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Test toifalari yuklanmadi.' });
  }
});

// Student Question list: NEVER expose correct_index or explanation before submission!
app.get('/api/quizzes', authMiddleware, async (req, res) => {
  try {
    const category = req.query.category;
    let sql = `SELECT id, category, question, options, difficulty, points FROM questions`;
    const params = [];

    if (category) {
      sql += ` WHERE category = $1`;
      params.push(category);
    }
    sql += ` ORDER BY id ASC`;

    const questionsRes = await query(sql, params);

    // Also get which questions the user has already solved
    const userAttemptsRes = await query(
      `SELECT question_id, is_correct, points_awarded
       FROM attempts
       WHERE user_id = $1`,
      [req.user.id]
    );

    const attemptsMap = {};
    for (const a of userAttemptsRes.rows) {
      if (!attemptsMap[a.question_id] || a.is_correct) {
        attemptsMap[a.question_id] = a;
      }
    }

    const safeQuestions = questionsRes.rows.map(q => ({
      ...q,
      alreadySolved: Boolean(attemptsMap[q.id]?.is_correct),
      lastAttempt: attemptsMap[q.id] || null
    }));

    res.json({ questions: safeQuestions });
  } catch (err) {
    res.status(500).json({ error: 'Savollarni olishda xatolik yuz berdi.' });
  }
});

const AnswerSchema = z.object({
  selectedIndex: z.number().int().min(0).max(10)
});

app.post('/api/quizzes/:id/answer', authMiddleware, async (req, res) => {
  const parsed = AnswerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Javob variantini tanlang.' });
  }

  const { selectedIndex } = parsed.data;
  const questionId = req.params.id;
  const userId = req.user.id;

  try {
    const qRes = await query('SELECT * FROM questions WHERE id = $1', [questionId]);
    const question = qRes.rows[0];

    if (!question) {
      return res.status(404).json({ error: 'Test savoli topilmadi.' });
    }

    const isCorrect = (selectedIndex === question.correct_index);

    // Check if user has already received points for this question before
    const prevSuccess = await query(
      'SELECT id FROM attempts WHERE user_id = $1 AND question_id = $2 AND is_correct = true',
      [userId, question.id]
    );

    const isFirstCorrect = isCorrect && prevSuccess.rowCount === 0;
    const pointsAwarded = isFirstCorrect ? (question.points || 10) : 0;

    // Save attempt inside transaction
    await transaction(async ({ query: q }) => {
      await q(
        `INSERT INTO attempts (user_id, question_id, selected_index, is_correct, points_awarded)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, question.id, selectedIndex, isCorrect, pointsAwarded]
      );

      if (pointsAwarded > 0) {
        await q('UPDATE users SET points = points + $1 WHERE id = $2', [pointsAwarded, userId]);
        await q(
          `INSERT INTO activity_logs (user_id, activity_type, description, points_change)
           VALUES ($1, 'quiz', $2, $3)`,
          [userId, `"${question.question.slice(0, 40)}..." testiga to‘g‘ri javob berildi`, pointsAwarded]
        );
      }
    });

    // Check for newly earned achievements
    const newAchievements = await checkAndAwardAchievements(userId);

    // Refresh current user points
    const uRes = await query('SELECT points FROM users WHERE id = $1', [userId]);

    res.json({
      correct: isCorrect,
      correctIndex: question.correct_index,
      pointsAwarded,
      currentPoints: uRes.rows[0]?.points || 0,
      explanation: question.explanation,
      newAchievements
    });
  } catch (err) {
    console.error('Test javobini tekshirishda xatolik:', err);
    res.status(500).json({ error: 'Javobni qabul qilishda xatolik yuz berdi.' });
  }
});

// ==========================================
// 6. PROMPT LAB
// ==========================================

app.get('/api/exercises', authMiddleware, async (_req, res) => {
  try {
    const result = await query(
      `SELECT e.id, e.title, e.category, e.description, e.goal, e.criteria, e.example_input, e.max_points,
              COUNT(s.id)::int as total_submissions
       FROM exercises e
       LEFT JOIN submissions s ON s.exercise_id = e.id
       GROUP BY e.id, e.title, e.category, e.description, e.goal, e.criteria, e.example_input, e.max_points
       ORDER BY e.id ASC`
    );
    res.json({ exercises: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Mashqlarni yuklashda xatolik.' });
  }
});

app.get('/api/exercises/:id', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM exercises WHERE id = $1', [req.params.id]);
    const exercise = result.rows[0];
    if (!exercise) return res.status(404).json({ error: 'Mashq topilmadi.' });

    // Also get user's past submissions for this exercise
    const subs = await query(
      `SELECT id, prompt_text, score, feedback, criteria_scores, created_at
       FROM submissions
       WHERE user_id = $1 AND exercise_id = $2
       ORDER BY created_at DESC LIMIT 5`,
      [req.user.id, exercise.id]
    );

    res.json({ exercise, submissions: subs.rows });
  } catch (err) {
    res.status(500).json({ error: 'Mashq ma’lumotini olishda xatolik.' });
  }
});

const SubmitPromptSchema = z.object({
  prompt: z.string().trim().min(10, 'Prompt kamida 10 ta belgidan iborat bo‘lishi lozim').max(4000)
});

app.post('/api/exercises/:id/submit', authMiddleware, async (req, res) => {
  const parsed = SubmitPromptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Noto‘g‘ri prompt matni' });
  }

  const { prompt } = parsed.data;
  const exerciseId = req.params.id;
  const userId = req.user.id;

  try {
    const exRes = await query('SELECT * FROM exercises WHERE id = $1', [exerciseId]);
    const exercise = exRes.rows[0];
    if (!exercise) {
      return res.status(404).json({ error: 'Mashq topilmadi.' });
    }

    // Evaluate using AI or documented semantic rubric
    const evaluation = await evaluatePrompt({ prompt, exercise });

    // Save submission and award points
    await transaction(async ({ query: q }) => {
      await q(
        `INSERT INTO submissions (user_id, exercise_id, prompt_text, score, feedback, criteria_scores)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [userId, exercise.id, prompt, evaluation.score, evaluation.feedback, JSON.stringify(evaluation.criteriaScores)]
      );

      if (evaluation.score > 0) {
        await q('UPDATE users SET points = points + $1 WHERE id = $2', [evaluation.score, userId]);
        await q(
          `INSERT INTO activity_logs (user_id, activity_type, description, points_change)
           VALUES ($1, 'prompt', $2, $3)`,
          [userId, `"${exercise.title}" mashqiga prompt topshirildi`, evaluation.score]
        );
      }
    });

    const newAchievements = await checkAndAwardAchievements(userId);
    const uRes = await query('SELECT points FROM users WHERE id = $1', [userId]);

    res.json({
      score: evaluation.score,
      maxPoints: evaluation.maxPoints,
      feedback: evaluation.feedback,
      criteriaScores: evaluation.criteriaScores,
      evaluatedBy: evaluation.evaluatedBy,
      currentPoints: uRes.rows[0]?.points || 0,
      newAchievements
    });
  } catch (err) {
    console.error('Promptni baholashda xatolik:', err);
    res.status(500).json({ error: 'Promptni baholashda server xatoligi yuz berdi.' });
  }
});

// ==========================================
// 7. REAL AI ASSISTANT CHAT
// ==========================================

app.get('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at ASC LIMIT 60`,
      [req.user.id]
    );

    res.json({
      messages: result.rows,
      aiConfigured: isAiConfigured()
    });
  } catch (err) {
    res.status(500).json({ error: 'Muloqot tarixini olishda xatolik.' });
  }
});

const ChatMessageSchema = z.object({
  message: z.string().trim().min(1, 'Xabar bo‘sh bo‘lishi mumkin emas').max(4000)
});

app.post('/api/chat', authMiddleware, async (req, res) => {
  const parsed = ChatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Xabar xato' });
  }

  const { message } = parsed.data;
  const userId = req.user.id;

  try {
    // 1. Save user's message to database
    await query(
      `INSERT INTO chat_messages (user_id, role, content)
       VALUES ($1, 'user', $2)`,
      [userId, message]
    );

    // 2. Fetch recent conversation history
    const historyRes = await query(
      `SELECT role, content FROM chat_messages
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 12`,
      [userId]
    );
    const history = historyRes.rows.reverse();

    // 3. Generate response using real AI or clear setup guidance
    const aiResult = await generateChatReply(history, message);

    // 4. Save assistant reply to database
    await query(
      `INSERT INTO chat_messages (user_id, role, content)
       VALUES ($1, 'assistant', $2)`,
      [userId, aiResult.reply]
    );

    // 5. Check achievements (e.g. ai_explorer)
    const newAchievements = await checkAndAwardAchievements(userId);

    res.json({
      reply: aiResult.reply,
      configured: aiResult.configured,
      newAchievements
    });
  } catch (err) {
    console.error('Chat xatosi:', err);
    res.status(502).json({
      error: err.message || 'AI xizmatidan javob olishda xatolik yuz berdi. Iltimos qaytadan urinib ko‘ring.'
    });
  }
});

app.delete('/api/chat/history', authMiddleware, async (req, res) => {
  try {
    await query('DELETE FROM chat_messages WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true, message: 'Muloqot tarixi tozalandi.' });
  } catch (err) {
    res.status(500).json({ error: 'Muloqot tarixini tozalab bo‘lmadi.' });
  }
});

// ==========================================
// 8. LEADERBOARD
// ==========================================

app.get('/api/leaderboard', authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Deterministic ranking: points DESC, created_at ASC
    const result = await query(
      `SELECT id, name, grade, points, created_at,
              RANK() OVER (ORDER BY points DESC, created_at ASC) as rank
       FROM users
       WHERE role <> 'admin'
       ORDER BY points DESC, created_at ASC
       LIMIT 50`
    );

    // Also get current user's specific rank
    const myRankRes = await query(
      `SELECT rank, points FROM (
         SELECT id, points, RANK() OVER (ORDER BY points DESC, created_at ASC) as rank
         FROM users WHERE role <> 'admin'
       ) ranked WHERE id = $1`,
      [currentUserId]
    );

    res.json({
      leaderboard: result.rows,
      currentUserRank: myRankRes.rows[0]?.rank || null,
      currentUserPoints: myRankRes.rows[0]?.points || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Reyting peshtaxtasini yuklashda xatolik.' });
  }
});

// ==========================================
// 9. PROJECTS GALLERY
// ==========================================

app.get('/api/projects', async (req, res) => {
  try {
    const category = req.query.category;
    let sql = 'SELECT * FROM projects';
    const params = [];

    if (category) {
      sql += ' WHERE category = $1';
      params.push(category);
    }
    sql += ' ORDER BY id ASC';

    const result = await query(sql, params);
    res.json({ projects: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Loyihalarni olishda xatolik.' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    const project = result.rows[0];
    if (!project) return res.status(404).json({ error: 'Loyiha topilmadi.' });
    res.json({ project });
  } catch (err) {
    res.status(500).json({ error: 'Loyiha ma’lumotini olishda xatolik.' });
  }
});

// ==========================================
// 10. ADMINISTRATOR PANEL (Protected)
// ==========================================

app.get('/api/admin/overview', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const [uRes, qRes, aRes, eRes, sRes, cRes, ptsRes] = await Promise.all([
      query("SELECT COUNT(*)::int as total FROM users WHERE role <> 'admin'"),
      query("SELECT COUNT(*)::int as total FROM questions"),
      query("SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE is_correct)::int as correct FROM attempts"),
      query("SELECT COUNT(*)::int as total FROM exercises"),
      query("SELECT COUNT(*)::int as total FROM submissions"),
      query("SELECT COUNT(*)::int as total FROM chat_messages"),
      query("SELECT COALESCE(SUM(points), 0)::int as total FROM users")
    ]);

    res.json({
      usersCount: uRes.rows[0]?.total || 0,
      questionsCount: qRes.rows[0]?.total || 0,
      attemptsTotal: aRes.rows[0]?.total || 0,
      attemptsCorrect: aRes.rows[0]?.correct || 0,
      exercisesCount: eRes.rows[0]?.total || 0,
      submissionsTotal: sRes.rows[0]?.total || 0,
      chatMessagesTotal: cRes.rows[0]?.total || 0,
      totalPointsAwarded: ptsRes.rows[0]?.total || 0,
      aiConfigured: isAiConfigured()
    });
  } catch (err) {
    res.status(500).json({ error: 'Admin umumiy ma’lumotlari yuklanmadi.' });
  }
});

app.get('/api/admin/users', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, role, points, grade, created_at
       FROM users
       ORDER BY created_at DESC LIMIT 200`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Foydalanuvchilar ro‘yxatini olishda xatolik.' });
  }
});

const UpdateRoleSchema = z.object({
  role: z.enum(['student', 'teacher', 'admin'])
});

app.patch('/api/admin/users/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  const parsed = UpdateRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Rol faqat student, teacher yoki admin bo‘lishi mumkin.' });
  }

  const targetId = req.params.id;

  // Prevent self-demotion to avoid lockout
  if (String(req.user.id) === String(targetId) && parsed.data.role !== 'admin') {
    return res.status(400).json({ error: 'O‘zingizning adminlik huquqingizni bekor qila olmaysiz.' });
  }

  try {
    const result = await query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, name, email, role, points, grade`,
      [parsed.data.role, targetId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi.' });
    }

    res.json({
      message: 'Foydalanuvchi roli yangilandi!',
      user: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Rolni yangilashda xatolik yuz berdi.' });
  }
});

// Admin Quiz CRUD
app.post('/api/admin/questions', authMiddleware, adminMiddleware, async (req, res) => {
  const Schema = z.object({
    category: z.string().trim().min(2),
    question: z.string().trim().min(5),
    options: z.array(z.string().trim().min(1)).min(2).max(6),
    correct_index: z.number().int().min(0),
    explanation: z.string().trim().default(''),
    points: z.number().int().min(1).default(10),
    difficulty: z.enum(['easy', 'medium', 'hard']).default('medium')
  });

  const p = Schema.safeParse(req.body);
  if (!p.success) {
    return res.status(400).json({ error: p.error.issues[0]?.message || 'Ma’lumotlar noto‘g‘ri' });
  }

  const { category, question, options, correct_index, explanation, points, difficulty } = p.data;

  if (correct_index >= options.length) {
    return res.status(400).json({ error: 'To‘g‘ri javob indeksi variantlar sonidan oshmasligi kerak.' });
  }

  try {
    const r = await query(
      `INSERT INTO questions (category, question, options, correct_index, explanation, points, difficulty)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
       RETURNING *`,
      [category, question, JSON.stringify(options), correct_index, explanation, points, difficulty]
    );

    res.status(201).json({ question: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Savol qo‘shishda xatolik: ' + err.message });
  }
});

app.delete('/api/admin/questions/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query('DELETE FROM questions WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Savol topilmadi.' });
    res.json({ ok: true, message: 'Savol o‘chirildi.' });
  } catch (err) {
    res.status(500).json({ error: 'Savolni o‘chirishda xatolik.' });
  }
});

// Admin Exercise CRUD
app.post('/api/admin/exercises', authMiddleware, adminMiddleware, async (req, res) => {
  const Schema = z.object({
    title: z.string().trim().min(3),
    category: z.string().trim().default('Prompt Engineering'),
    description: z.string().trim().min(5),
    goal: z.string().trim().min(5),
    criteria: z.string().trim().default(''),
    example_input: z.string().trim().default(''),
    max_points: z.number().int().min(5).max(100).default(20)
  });

  const p = Schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message || 'Xato' });

  try {
    const r = await query(
      `INSERT INTO exercises (title, category, description, goal, criteria, example_input, max_points)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [p.data.title, p.data.category, p.data.description, p.data.goal, p.data.criteria, p.data.example_input, p.data.max_points]
    );
    res.status(201).json({ exercise: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Mashq qo‘shishda xatolik: ' + err.message });
  }
});

app.delete('/api/admin/exercises/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query('DELETE FROM exercises WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Mashq topilmadi.' });
    res.json({ ok: true, message: 'Mashq o‘chirildi.' });
  } catch (err) {
    res.status(500).json({ error: 'Mashqni o‘chirishda xatolik.' });
  }
});

// Admin Project CRUD
app.post('/api/admin/projects', authMiddleware, adminMiddleware, async (req, res) => {
  const Schema = z.object({
    title: z.string().trim().min(2),
    category: z.string().trim().min(2),
    description: z.string().trim().min(5),
    features: z.string().trim().default(''),
    badge: z.string().trim().default('Tavsiya'),
    icon: z.string().trim().default('🚀'),
    external_url: z.string().trim().default(''),
    author_name: z.string().trim().default('AI Maktab')
  });

  const p = Schema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0]?.message || 'Xato' });

  try {
    const r = await query(
      `INSERT INTO projects (title, category, description, features, badge, icon, external_url, author_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [p.data.title, p.data.category, p.data.description, p.data.features, p.data.badge, p.data.icon, p.data.external_url, p.data.author_name]
    );
    res.status(201).json({ project: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Loyiha qo‘shishda xatolik: ' + err.message });
  }
});

app.delete('/api/admin/projects/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const r = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Loyiha topilmadi.' });
    res.json({ ok: true, message: 'Loyiha o‘chirildi.' });
  } catch (err) {
    res.status(500).json({ error: 'Loyihani o‘chirishda xatolik.' });
  }
});

// ==========================================
// 11. SPA FALLBACK ROUTE
// ==========================================

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint topilmadi' });
  }
  res.sendFile(path.resolve(publicDir, 'index.html'));
});

// Start Server if executed directly
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('src\\server.js') ||
  process.argv[1].endsWith('src/server.js')
);

if (isDirectRun && process.env.NODE_ENV !== 'test') {
  await initDb();
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 AI Maktab veb-sayti ishga tushdi: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

export default app;
