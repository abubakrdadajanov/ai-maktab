import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import { initDb, query } from '../src/db.js';

let server;
let baseUrl;

test.before(async () => {
  await initDb();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('1. Health Check Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.equal(data.database, 'connected');
  assert.ok(data.databaseMode);
});

test('2. Public Statistics Endpoint', async () => {
  const res = await fetch(`${baseUrl}/api/public/stats`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.studentsCount >= 0);
  assert.ok(data.questionsCount > 0);
  assert.ok(data.exercisesCount > 0);
});

test('3. Protected endpoint returns 401 when unauthenticated', async () => {
  const res = await fetch(`${baseUrl}/api/me`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error);
});

test('4. Registration, Login, Logout Flow', async () => {
  const testEmail = `test_student_${Date.now()}@aimaktab.uz`;

  // Register
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Oquvchi',
      email: testEmail,
      password: 'SecurePassword123!',
      grade: '8-sinf'
    })
  });

  assert.equal(regRes.status, 201);
  const regData = await regRes.json();
  assert.equal(regData.user.email, testEmail);
  assert.equal(regData.user.role, 'student');
  assert.equal(regData.user.points, 25); // Welcome bonus

  const setCookie = regRes.headers.get('set-cookie');
  assert.ok(setCookie, 'Cookie set upon registration');

  // Duplicate email prevention
  const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Boshqa Oquvchi',
      email: testEmail,
      password: 'SecurePassword123!'
    })
  });
  assert.equal(dupRes.status, 409);

  // Invalid Login
  const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'WrongPassword999!'
    })
  });
  assert.equal(badLogin.status, 401);

  // Valid Login
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'SecurePassword123!'
    })
  });
  assert.equal(loginRes.status, 200);
  const loginCookie = loginRes.headers.get('set-cookie');
  const tokenCookie = loginCookie.split(';')[0];

  // Access /api/me with session cookie
  const meRes = await fetch(`${baseUrl}/api/me`, {
    headers: { Cookie: tokenCookie }
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.user.email, testEmail);

  // Logout
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: tokenCookie }
  });
  assert.equal(logoutRes.status, 200);
});

test('5. Student / Admin Authorization Enforcement', async () => {
  // Login as standard student
  const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jasur@aimaktab.uz',
      password: 'Oquvchi2026!'
    })
  });
  assert.equal(studentLogin.status, 200);
  const studentCookie = studentLogin.headers.get('set-cookie').split(';')[0];

  // Try accessing admin overview as student -> 403 Forbidden
  const forbiddenRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Cookie: studentCookie }
  });
  assert.equal(forbiddenRes.status, 403);

  // Login as admin
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@aimaktab.uz',
      password: 'AdminPassword2026!'
    })
  });
  assert.equal(adminLogin.status, 200);
  const adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];

  // Admin overview access -> 200 OK
  const adminRes = await fetch(`${baseUrl}/api/admin/overview`, {
    headers: { Cookie: adminCookie }
  });
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.ok(adminData.usersCount >= 1);
});

test('6. Quizzes: Correct Answer Checking & Duplicate Reward Prevention', async () => {
  // Register a fresh student to test first-time and second-time attempts cleanly
  const studentEmail = `quiz_tester_${Date.now()}@aimaktab.uz`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Quiz Sinovchi',
      email: studentEmail,
      password: 'QuizPassword123!'
    })
  });
  assert.equal(regRes.status, 201);
  const studentCookie = regRes.headers.get('set-cookie').split(';')[0];

  // Fetch quizzes
  const qListRes = await fetch(`${baseUrl}/api/quizzes`, {
    headers: { Cookie: studentCookie }
  });
  assert.equal(qListRes.status, 200);
  const qListData = await qListRes.json();
  assert.ok(qListData.questions.length > 0);

  const question = qListData.questions[0];
  // Verify correct answer is NOT exposed in student endpoint
  assert.equal(question.correct_index, undefined);

  // Query actual correct index from db for testing
  const dbQ = await query('SELECT correct_index, points FROM questions WHERE id = $1', [question.id]);
  const correctIdx = dbQ.rows[0].correct_index;
  const qPoints = dbQ.rows[0].points;
  const wrongIdx = (correctIdx + 1) % 4;

  // Submit wrong answer
  const wrongRes = await fetch(`${baseUrl}/api/quizzes/${question.id}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie
    },
    body: JSON.stringify({ selectedIndex: wrongIdx })
  });
  assert.equal(wrongRes.status, 200);
  const wrongData = await wrongRes.json();
  assert.equal(wrongData.correct, false);
  assert.equal(wrongData.pointsAwarded, 0);

  // Submit correct answer (1st time)
  const correctRes1 = await fetch(`${baseUrl}/api/quizzes/${question.id}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie
    },
    body: JSON.stringify({ selectedIndex: correctIdx })
  });
  assert.equal(correctRes1.status, 200);
  const correctData1 = await correctRes1.json();
  assert.equal(correctData1.correct, true);
  assert.equal(correctData1.pointsAwarded, qPoints);

  // Submit correct answer AGAIN (2nd time) -> Duplicate point prevention!
  const correctRes2 = await fetch(`${baseUrl}/api/quizzes/${question.id}/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie
    },
    body: JSON.stringify({ selectedIndex: correctIdx })
  });
  assert.equal(correctRes2.status, 200);
  const correctData2 = await correctRes2.json();
  assert.equal(correctData2.correct, true);
  assert.equal(correctData2.pointsAwarded, 0, 'Duplicate reward prevented!');
});

test('7. Prompt Lab: Submission and Scoring', async () => {
  const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jasur@aimaktab.uz',
      password: 'Oquvchi2026!'
    })
  });
  const studentCookie = studentLogin.headers.get('set-cookie').split(';')[0];

  const exList = await fetch(`${baseUrl}/api/exercises`, {
    headers: { Cookie: studentCookie }
  });
  const exData = await exList.json();
  const ex = exData.exercises[0];

  // Submit structured prompt
  const subRes = await fetch(`${baseUrl}/api/exercises/${ex.id}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie
    },
    body: JSON.stringify({
      prompt: 'Sen tajribali maktab o‘qituvchisisan. 8-sinf o‘quvchilari uchun Kitobxonlik haftaligi e’lonini yoz. Natija 3 ta banddan iborat bo‘lsin va 100 so‘zdan oshmasin.'
    })
  });

  assert.equal(subRes.status, 200);
  const subData = await subRes.json();
  assert.ok(subData.score >= 12, 'High score for structured prompt');
  assert.ok(subData.feedback.length > 0);
  assert.ok(subData.criteriaScores);
});

test('8. Deterministic Leaderboard Ranking', async () => {
  const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jasur@aimaktab.uz',
      password: 'Oquvchi2026!'
    })
  });
  const studentCookie = studentLogin.headers.get('set-cookie').split(';')[0];

  const leadRes = await fetch(`${baseUrl}/api/leaderboard`, {
    headers: { Cookie: studentCookie }
  });
  assert.equal(leadRes.status, 200);
  const leadData = await leadRes.json();
  assert.ok(leadData.leaderboard.length > 0);

  // Check ranking order (points DESC)
  for (let i = 0; i < leadData.leaderboard.length - 1; i++) {
    assert.ok(
      leadData.leaderboard[i].points >= leadData.leaderboard[i + 1].points,
      'Leaderboard sorted by points descending'
    );
  }
});

test('9. AI Assistant Chat Handling', async () => {
  const studentLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'jasur@aimaktab.uz',
      password: 'Oquvchi2026!'
    })
  });
  const studentCookie = studentLogin.headers.get('set-cookie').split(';')[0];

  const chatRes = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: studentCookie
    },
    body: JSON.stringify({
      message: 'Salom, fotosintez jarayoni haqida qisqacha ma’lumot bering.'
    })
  });

  assert.equal(chatRes.status, 200);
  const chatData = await chatRes.json();
  assert.ok(chatData.reply.length > 0);
});
