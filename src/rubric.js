import { isAiConfigured } from './ai.js';

export async function evaluatePrompt({ prompt, exercise }) {
  const p = prompt.trim();
  const maxPoints = exercise.max_points || 20;

  // If AI is configured, perform intelligent evaluation via LLM
  if (isAiConfigured()) {
    try {
      const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const model = process.env.AI_MODEL || 'gpt-4o-mini';
      const apiKey = process.env.AI_API_KEY;

      const evalSystem = `Siz "AI Maktab" platformasining Prompt Engineering bo‘yicha ekspert murabbiysisiz.
O‘quvchi quyidagi amaliy topshiriq uchun sun’iy intellektga beriladigan prompt (so‘rov) yozdi.
Topshiriq nomi: "${exercise.title}"
Topshiriq maqsadi: "${exercise.goal}"

Siz ushbu promptni 4 ta mezon bo‘yicha xolisona baholashingiz kerak (har biri 0 dan 5 ballgacha, jami maksimal ${maxPoints} ball):
1. goal_and_role: Rol va maqsadning aniqligi (0-5)
2. audience_and_context: Auditoriya va kontekstning berilishi (0-5)
3. format_and_style: Natija formati va ohangining belgilanishi (0-5)
4. constraints: Cheklovlar, hajm va aniq talablar (0-5)

Faqat va faqat JSON formatida javob bering:
{
  "scores": {
    "goal_and_role": 4,
    "audience_and_context": 4,
    "format_and_style": 4,
    "constraints": 3
  },
  "total_score": 15,
  "feedback": "O‘zbek tilida o‘quvchiga yo‘naltirilgan 2-3 jumlali konstruktiv tahlil va yaxshilash bo‘yicha amaliy maslahat."
}`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: evalSystem },
            { role: 'user', content: `O‘quvchining yozgan prompti:\n"""${p}"""` }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content);
        const score = Math.min(maxPoints, Math.max(0, Number(parsed.total_score) || 0));
        return {
          score,
          maxPoints,
          feedback: parsed.feedback || 'Prompt tekshirildi.',
          criteriaScores: parsed.scores || {},
          evaluatedBy: 'ai'
        };
      }
    } catch (err) {
      console.warn('AI orqali baholashda xatolik yuz berdi, qoidaviy rubrikaga o‘tilmoqda:', err.message);
    }
  }

  // Documented, educational rule-based rubric evaluation
  return evaluateRuleBasedRubric(p, exercise, maxPoints);
}

function evaluateRuleBasedRubric(prompt, exercise, maxPoints) {
  const text = prompt.toLowerCase();
  const criteriaScores = {
    goal_and_role: 0,
    audience_and_context: 0,
    format_and_style: 0,
    constraints: 0
  };

  const advice = [];

  // 1. Role and Goal (0 - 5)
  const hasRole = /(sen|roling|mutaxassis|o‘qituvchi|oqituvchi|ustoz|yetakchi|dasturchi|tashkilotchi|maslahatchi|yordamchi)/i.test(text);
  const hasGoal = /(yoz|tuz|tayyorla|tushuntir|yarat|xulosa|reja|keltir|qil|ber)/i.test(text);

  if (hasRole && hasGoal) {
    criteriaScores.goal_and_role = 5;
  } else if (hasGoal || hasRole) {
    criteriaScores.goal_and_role = 3;
    if (!hasRole) advice.push("AI’ga aniq rol bering (masalan: 'Sen tajribali biologiya o‘qituvchisisan').");
  } else {
    criteriaScores.goal_and_role = 1;
    advice.push("Topshiriq maqsadi va AI bajarishi kerak bo‘lgan vazifani aniqroq ifodalang.");
  }

  // 2. Audience and Context (0 - 5)
  const hasAudience = /(sinf|o‘quvchi|oquvchi|yoshlar|bolalar|direktor|ota-ona|jamoa|auditoriya|boshlang‘ich)/i.test(text);
  const hasContext = /(maktab|dars|haftalik|tadbir|fan|mavzu|imtihon|loyiha|muammo)/i.test(text);

  if (hasAudience && hasContext) {
    criteriaScores.audience_and_context = 5;
  } else if (hasAudience || hasContext) {
    criteriaScores.audience_and_context = 3;
    if (!hasAudience) advice.push("Natija kim uchun mo‘ljallanganini ko‘rsating (masalan, 8-sinf o‘quvchilari uchun).");
  } else {
    criteriaScores.audience_and_context = 1;
    advice.push("Kontekst va maqsadli auditoriyani yozing.");
  }

  // 3. Format and Style (0 - 5)
  const hasFormat = /(jadval|ro‘yxat|royxat|band|qadam|punkt|bullet|matn|dialog|reja|abzats)/i.test(text);
  const hasTone = /(sodda|qiziqarli|ilhomlantiruvchi|rasmiy|do‘stona|aniq|ilmiy)/i.test(text);

  if (hasFormat && hasTone) {
    criteriaScores.format_and_style = 5;
  } else if (hasFormat || hasTone) {
    criteriaScores.format_and_style = 3;
    if (!hasFormat) advice.push("Natija shaklini belgilang (masalan: ro‘yxat, jadval yoki 3 ta punkt).");
  } else {
    criteriaScores.format_and_style = 1;
    advice.push("Kutilayotgan format va ohangni aniqlashtiring.");
  }

  // 4. Constraints and Length (0 - 5)
  const hasConstraints = /(oshmasin|kamida|so‘z|soz|daqiqa|qoida|faqat|limit|misol|emoji)/i.test(text);
  const lengthSufficient = prompt.length >= 60;

  if (hasConstraints && lengthSufficient) {
    criteriaScores.constraints = 5;
  } else if (hasConstraints || lengthSufficient) {
    criteriaScores.constraints = 3;
    if (!hasConstraints) advice.push("Cheklov yoki hajm belgilang (masalan: '100 so‘zdan oshmasin').");
  } else {
    criteriaScores.constraints = 1;
    advice.push("Promptni to‘liqroq yozing va aniq shartlar kiriting.");
  }

  const rawTotal = criteriaScores.goal_and_role +
                   criteriaScores.audience_and_context +
                   criteriaScores.format_and_style +
                   criteriaScores.constraints;

  const score = Math.round((rawTotal / 20) * maxPoints);

  let feedback = '';
  if (score >= 17) {
    feedback = "A’lo darajadagi professional prompt! Rol, maqsad, auditoriya, format va cheklovlar juda puxta kiritilgan. AI bunday so‘rovdan eng yuqori sifatli natija bera oladi.";
  } else if (score >= 12) {
    feedback = "Yaxshi natija! Promptingizda asosiy vazifa tushunarli. " + (advice.length ? advice.slice(0, 2).join(' ') : "Yana biroz aniqlik kiritsangiz natija yanada mukammal bo‘ladi.");
  } else {
    feedback = "Boshlanishi yaxshi, lekin promptni kuchaytirish zarur. " + (advice.length ? advice.slice(0, 2).join(' ') : "Rol, auditoriya va formatni albatta ko‘rsating.");
  }

  return {
    score,
    maxPoints,
    feedback,
    criteriaScores,
    evaluatedBy: 'rubric'
  };
}
