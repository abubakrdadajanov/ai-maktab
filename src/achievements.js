import { query, transaction } from './db.js';

export async function checkAndAwardAchievements(userId) {
  const newAwards = [];

  // Get user details
  const userRes = await query('SELECT id, name, points FROM users WHERE id = $1', [userId]);
  const user = userRes.rows[0];
  if (!user) return newAwards;

  // Get current unlocked achievement ids
  const earnedRes = await query('SELECT achievement_id FROM user_achievements WHERE user_id = $1', [userId]);
  const earnedSet = new Set(earnedRes.rows.map(r => r.achievement_id));

  // Get user activity stats from DB
  const [attemptsRes, subsRes, chatRes] = await Promise.all([
    query('SELECT COUNT(*)::int as total, COUNT(*) FILTER(WHERE is_correct)::int as correct FROM attempts WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*)::int as total, COALESCE(MAX(score), 0)::int as best_score FROM submissions WHERE user_id = $1', [userId]),
    query("SELECT COUNT(*)::int as count FROM chat_messages WHERE user_id = $1 AND role = 'user'", [userId])
  ]);

  const quizStats = attemptsRes.rows[0] || { total: 0, correct: 0 };
  const promptStats = subsRes.rows[0] || { total: 0, best_score: 0 };
  const chatCount = chatRes.rows[0]?.count || 0;

  // Check conditions
  const toAward = [];

  if (!earnedSet.has('first_step')) {
    toAward.push('first_step');
  }

  if (!earnedSet.has('quiz_starter') && quizStats.correct >= 1) {
    toAward.push('quiz_starter');
  }

  if (!earnedSet.has('quiz_champion') && quizStats.correct >= 5) {
    toAward.push('quiz_champion');
  }

  if (!earnedSet.has('prompt_rookie') && promptStats.total >= 1) {
    toAward.push('prompt_rookie');
  }

  if (!earnedSet.has('prompt_master') && promptStats.best_score >= 18) {
    toAward.push('prompt_master');
  }

  if (!earnedSet.has('ai_explorer') && chatCount >= 3) {
    toAward.push('ai_explorer');
  }

  if (!earnedSet.has('century_club') && user.points >= 100) {
    toAward.push('century_club');
  }

  // Award achievements inside a transaction
  for (const achId of toAward) {
    try {
      const achInfo = await query('SELECT * FROM achievements WHERE id = $1', [achId]);
      const ach = achInfo.rows[0];
      if (!ach) continue;

      await query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, achievement_id) DO NOTHING`,
        [userId, achId]
      );

      // Award bonus points
      const bonus = ach.points_reward || 0;
      if (bonus > 0) {
        await query('UPDATE users SET points = points + $1 WHERE id = $2', [bonus, userId]);
      }

      await query(
        `INSERT INTO activity_logs (user_id, activity_type, description, points_change)
         VALUES ($1, $2, $3, $4)`,
        [userId, 'achievement', `Yangi yutuq ochildi: "${ach.title}"!`, bonus]
      );

      newAwards.push({
        id: ach.id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        bonus
      });
    } catch (err) {
      console.warn(`Yutuqni biriktirishda xatolik (${achId}):`, err.message);
    }
  }

  return newAwards;
}
