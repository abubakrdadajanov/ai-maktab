# ⚡ AI Maktab — Sun’iy Intellekt Ta’lim va Innovatsiya Platformasi

**AI Maktab** — maktab o‘quvchilariga sun’iy intellektdan mas’uliyatli, xavfsiz va samarali foydalanishni o‘rgatuvchi to‘liq funksional full-stack platforma.

O‘quvchilar platformada sun’iy intellekt murabbiyi bilan muloqot qiladi, **Prompt Lab** laboratoriyasida to‘g‘ri va aniq so‘rovlar (prompt) yozish mahoratini oshiradi, bilim testlarini yechib ballar yig‘adi, yutuqlarni (achievements) ochadi va umumta’lim maktabi reyting peshtaxtasida o‘zaro musobaqalashadi.

---

## 🚀 Asosiy imkoniyatlar

1. **Jozibador Asosiy Sahifa (Public Landing Page):**
   - Zamonaviy qora-to‘q ko‘k (Dark Navy) va neon moviy (Cyan / Electric Blue) ranglar uyg‘unligi.
   - "Kelajak bilimlari bugundan!" shiori ostidagi interaktiv hero qismi.
   - Haqiqiy statistik ma’lumotlar hisoblagichi.
   - Mas’uliyatli AI tamoyillari (axloq, faktlarni tekshirish, maxfiylik).

2. **Haqiqiy Autentifikatsiya va Rollar:**
   - Ro‘yxatdan o‘tish (Register) va Tizimga kirish (Login).
   - `bcryptjs` (12 rounds) orqali parollarni xesh qilish.
   - Xavfsiz `httpOnly` cookie asosidagi JWT sessiyalari.
   - Ko‘p darajali rollar: `student` (O‘quvchi), `teacher` (O‘qituvchi), `admin` (Administrator).
   - Brute-force hujumlariga qarshi tezlik cheklovi (Rate Limiting).

3. **O‘quvchi Shaxsiy Kabineti (Student Dashboard):**
   - Shaxsiylashtirilgan salomlashuv.
   - 4 ta real metrika: Jami ballar, Reytingdagi o‘rni, Test aniqligi (accuracy %), Prompt mashqlari soni.
   - Qo‘lga kiritilgan yutuqlar (Achievements).
   - Tavsiya etilgan amaliy mashqlar va so‘nggi harakatlar tarixi.

4. **Jonli AI Yordamchi (AI Assistant Chat):**
   - Haqiqiy AI API bilan muloqot (OpenAI, OpenRouter, Groq, DeepSeek mosligi).
   - O‘zbek tilida pedagogik va tushunarli tushuntirish beruvchi tizimli prompt.
   - Agar API kaliti hali kiritilmagan bo‘lsa, soxta javob o‘rniga aniq va to‘g‘ri sozlash yo‘riqnomasi ko‘rsatiladi.
   - Xabarlar tarixi PostgreSQL bazasida doimiy saqlanadi.
   - Faktlarni tekshirish va maxfiylik bo‘yicha ogohlantirish bannerlari.

5. **Prompt Lab (Amaliy So‘rovlar Muhandisligi):**
   - 5 ta amaliy real maktab topshiriqlari (Tadbir e’loni, Murakkab mavzuni tushuntirish, Haftalik reja, Loyiha taklifi, Matnni qisqartirish).
   - 4 mezonli tahlil: Rol va maqsad (5 ball), Auditoriya va kontekst (5 ball), Format va uslub (5 ball), Cheklovlar (5 ball).
   - Haqiqiy AI yoki hujjatlashtirilgan pedagogik rubrika orqali xolisona baholash va takliflar berish.
   - Topshiriqlar tarixi va ballar hisobi.

6. **Interaktiv Bilim Testlari (Quizzes):**
   - AI asoslari, Prompt Engineering, Axloq va xavfsizlik, Ta’limda AI toifalari.
   - Savollar ro‘yxatida to‘g‘ri javoblar hechkimsga oldindan oshkor etilmaydi (xavfsiz server tekshiruvi).
   - Bir savol uchun ball faqat birinchi to‘g‘ri javobda beriladi (takroriy suiiste’mollikdan himoya).
   - Har bir savol yakunida to‘liq izoh (explanation) taqdim etiladi.

7. **Ballar va Yutuqlar Tizimi (Achievements):**
   - Server nazoratidagi xolisona ballar hisobi.
   - Avtomatik ochiluvchi yutuqlar: "Birinchi qadam", "Prompt o‘rganuvchisi", "Prompt ustasi", "Bilim sinovi", "Intellekt chempioni", "AI tadqiqotchi", "100 ballik marra".

8. **Maktab Reyting Peshtaxtasi (Leaderboard):**
   - Real PostgreSQL ma’lumotlari asosida to‘liq hisoblangan reyting.
   - Top-3 sovrindorlar uchun shohsupa (🥇, 🥈, 🥉).
   - Joriy o‘quvchining o‘rni alohida ajratib ko‘rsatiladi.

9. **AI Loyihalar Galereyasi (Projects Gallery):**
   - Maktab ta’limida qo‘llaniladigan 6 ta innovatsion AI vositalari ko‘rgazmasi.
   - Interaktiv modal oynasi, imkoniyatlar ro‘yxati va yo‘nalishlar.

10. **Himoyalangan Administrator Paneli (Admin Panel):**
    - Platformaning umumiy statistik ko‘rsatkichlari.
    - Foydalanuvchilar ro‘yxati va ularning rollarini o‘zgartirish (Student ↔ Teacher ↔ Admin).
    - Yangi test savollari, yangi prompt mashqlari va loyihalar qo‘shish modallari.
    - O‘z-o‘zini admindan mahrum qilishdan himoya.

---

## 🛠️ Texnologiyalar steki

- **Frontend:** Zamonaviy toza HTML5, zamonaviy CSS3 (CSS Variables, Flexbox, CSS Grid), Vanilla JavaScript (ES Modules, Fetch API).
- **Backend:** Node.js, Express.js.
- **Xavfsizlik:** Helmet, Cookie-Parser, bcryptjs, JSON Web Token (JWT), Zod (server-side validation).
- **Ma’lumotlar bazasi:** PostgreSQL (ikkita rejimni qo‘llab-quvvatlaydi: tashqi PostgreSQL serveri yoki avtomatik ishga tushuvchi o‘rnatilgan PGlite PostgreSQL).
- **AI Integratsiyasi:** OpenAI, OpenRouter, Groq, DeepSeek bilan to‘liq mos keluvchi `/chat/completions` REST API.
- **Testlar:** Node.js o‘rnatilgan `node:test` va `node:assert` freymvorki.

---

## 💻 Windows 10/11 da o‘rnatish va ishga tushirish

### 1-qadam: Kerakli vositalar
- **Node.js** (v20 yoki undan yuqori) o‘rnatilgan bo‘lishi lozim. ([nodejs.org](https://nodejs.org) dan yuklab olishingiz mumkin).
- **Visual Studio Code** yoki istalgan kod muharriri.

### 2-qadam: Loyihani ochish
ZIP arxivni oching va PowerShell terminalida loyiha papkasiga kiring:
```powershell
cd "c:\Users\user\Desktop\ai maktab"
```

### 3-qadam: Bog‘liqliklarni (dependencies) o‘rnatish
Agar PowerShell'da `npm` xavfsizlik cheklovi bersa, `npm.cmd` buyrug‘idan foydalaning:
```powershell
npm.cmd install
```

### 4-qadam: Muhit sozlamalarini tayyorlash (`.env`)
Loyihada tayyor `.env` mavjud, zarurat bo‘lsa `.env.example` dan nusxa oling:
```powershell
Copy-Item .env.example .env
```
Agar AI chatidan jonli foydalanmoqchi bo‘lsangiz, `.env` faylini ochib `AI_API_KEY` qiymatini kiriting (masalan OpenAI yoki OpenRouter kaliti). Agar kalit kiritilmasa, tizim to‘xtab qolmaydi, balki barcha sahifalar to‘liq ishlaydi va chatda sozlash bo‘yicha muloyim ko‘rsatma chiqadi.

### 5-qadam: Ma’lumotlar bazasini yaratish va boshlang‘ich ma’lumotlarni yuklash
Bitta buyruq bilan jadvallarni yarating va ma’lumotlarni yuklang:
```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

> **Eslatma:** Dastur ma’lumotlar bazasi uchun ikkita ajoyib imkoniyatga ega:
> 1. Agar sizda tashqi PostgreSQL o‘rnatilgan bo‘lsa, `.env` faylida `DATABASE_URL=postgresql://postgres:parol@localhost:5432/aimaktab` ko‘rinishida kiriting.
> 2. Agar PostgreSQL o‘rnatilmagan bo‘lsa, hech qanday qo‘shimcha dastur o‘rnatish shart emas! Tizim avtomatik tarzda o‘rnatilgan (embedded WebAssembly) PGlite PostgreSQL dvigatelini ishga tushiradi va ma’lumotlarni mahalliy `data/aimaktab_pg` papkasida saqlaydi!

### 6-qadam: Veb-saytni ishga tushirish
```powershell
npm.cmd start
```
Brauzeringizda quyidagi manzilni oching:
👉 **http://localhost:3000**

---

## 🔑 Tayyor sinov hisoblari (Demo Accounts)

Boshlang‘ich `db/seed.js` orqali quyidagi tayyor hisoblar yaratiladi:

| Rol | Email | Parol | Tavsif |
|---|---|---|---|
| **Administrator** | `admin@aimaktab.uz` | `AdminPassword2026!` | Barcha boshqaruv huquqlariga ega |
| **O‘quvchi** | `jasur@aimaktab.uz` | `Oquvchi2026!` | Tayyor ballar va test tarixi mavjud |
| **O‘quvchi** | `madina@aimaktab.uz` | `Oquvchi2026!` | Reytingdagi peshqadam o‘quvchi |

Shuningdek, istalgan vaqtda "Ro‘yxatdan o‘tish" tugmasi orqali yangi o‘quvchi hisobini ochishingiz mumkin.

---

## 🧪 Avtomatlashtirilgan backend testlarni ishga tushirish

Loyiha arxitekturasi Master Prompt talablariga muvofiq to‘liq sinovdan o‘tgan. Testlarni ishga tushirish uchun:
```powershell
npm.cmd test
```

Ushbu testlar quyidagilarni tekshiradi:
- [x] 1. Tizim va ma’lumotlar bazasi salomatligi (`/api/health`)
- [x] 2. Ommaviy statistika API
- [x] 3. Ruxsatsiz so‘rovlarni 401 bilan bloklash
- [x] 4. Ro‘yxatdan o‘tish, dublikat emailni rad etish, noto‘g‘ri parolni tekshirish va sessiyani yopish (Logout)
- [x] 5. O‘quvchi va Administrator huquqlarini tekshirish (403 Forbidden himoyasi)
- [x] 6. Test savollarini tekshirish va takroriy ball olishni ishonchli bloklash (Duplicate Reward Prevention)
- [x] 7. Prompt Lab amaliy topshiriqlarini topshirish va pedagogik rubrika orqali baholash
- [x] 8. Reyting peshtaxtasining qat’iy tartiblanishi (Deterministic Leaderboard)
- [x] 9. AI assistentining xavfsiz javob qaytarishi

---

## 📁 Loyiha tuzilishi

```
ai-maktab/
├── .env.example          # Muhit o'zgaruvchilari namunasi
├── .env                  # Mahalliy muhit konfiguratsiyasi
├── .gitignore            # Git istisno fayli
├── README.md             # Loyiha hujjatlari (O'zbek tilida)
├── package.json          # Bog'liqliklar va buyruqlar
├── package-lock.json     # Lockfile
├── db/
│   ├── schema.sql        # PostgreSQL jadvallar va indekslar sxemasi
│   ├── migrate.js        # Migratsiya skripti
│   └── seed.js           # Boshlang'ich ma'lumotlar skripti
├── src/
│   ├── db.js             # Dual-mode PostgreSQL / PGlite bazasi adapteri
│   ├── server.js         # Express REST API va xavfsizlik sozlamalari
│   ├── ai.js             # Jonli AI integratsiyasi
│   ├── rubric.js         # Prompt Lab baholash tizimi
│   └── achievements.js   # Yutuqlarni tekshirish va taqdirlash mantig'i
├── test/
│   └── api.test.js       # Avtomatlashtirilgan integratsion testlar
└── public/
    ├── index.html        # Asosiy HTML hujjati
    ├── styles.css        # To'liq dizayn tizimi va responsive CSS
    └── app.js            # Frontend interaktiv mantiq va routing
```

---

## 🛡️ Xavfsizlik choralari
- Barcha SQL so‘rovlar parametrlangan (`$1, $2`) bo‘lib, SQL Injection ehtimolini istisno qiladi.
- XSS hujumlariga qarshi HTML escaping va Helmet xavfsizlik sarlavhalari qo‘llanilgan.
- Barcha kirish ma’lumotlari server tomonida qat’iy `Zod` sxemalari orqali tekshiriladi.
- Maxfiy API kalitlari va parollar frontend JavaScript kodiga hech qachon chiqmaydi.
