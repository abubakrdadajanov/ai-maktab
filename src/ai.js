import 'dotenv/config';

export function isAiConfigured() {
  return Boolean(process.env.AI_API_KEY && process.env.AI_API_KEY.trim().length > 0);
}

export async function generateChatReply(history = [], userMessage) {
  if (!isAiConfigured()) {
    return {
      configured: false,
      reply: "⚠️ AI xizmati sozlanmagan: Haqiqiy sun’iy intellekt javoblarini olish uchun administrator loyihaning `.env` fayliga `AI_API_KEY` (masalan, OpenAI, OpenRouter, Groq yoki DeepSeek kaliti) va `AI_MODEL` qiymatini kiritishi lozim. Sozlangach, bot to‘liq jonli ishlaydi."
    };
  }

  const baseUrl = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const apiKey = process.env.AI_API_KEY;

  const systemMessage = {
    role: 'system',
    content: `Siz "AI Maktab" platformasining rasmiy sun’iy intellekt ta’lim yordamchisisiz.
Siz o‘quvchilarga barcha maktab fanlari (matematika, fizika, informatika, biologiya, kimyo, ona tili, adabiyot, tarix, chet tillari) bo‘yicha tushunarli, aniq, pedagogik jihatdan to‘g‘ri va ilhomlantiruvchi yordam berasiz.
Qoidalar:
1. Har doim o‘zbek tilida (lotin yozuvida) javob bering.
2. O‘quvchining o‘rniga tayyor uy vazifasini birdaniga yozib bermang; ularga bosqichma-bosqich yo‘l-yo‘riq ko‘rsating va mustaqil fikrlashga undash uchun savollar bering.
3. Axloqsiz, zo‘ravonlik yoki maxfiy ma’lumotlar haqidagi so‘rovlarni muloyimlik bilan rad eting.
4. Javoblaringiz tushunarli, tuzilmali, kerak bo‘lganda qisqa ro‘yxat va misollar bilan boyitilgan bo‘lsin.
5. Sun’iy intellekt ham xato qilishi mumkinligini unutmang va o‘quvchini faktlarni tekshirishga o‘rgating.`
  };

  const messages = [
    systemMessage,
    ...history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1200
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error(`AI API xatosi (${response.status}):`, errBody);
      throw new Error(`AI provayderi xatolik qaytardi (${response.status}). Iltimos, API kaliti va balansni tekshiring.`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error('AI provayderidan bo‘sh javob keldi.');
    }

    return {
      configured: true,
      reply: reply
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('AI xizmatiga ulanish vaqti tugadi (timeout). Tarmoq aloqasini tekshiring.');
    }
    throw err;
  }
}
