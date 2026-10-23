import "dotenv/config";
import bcrypt from "bcryptjs";
import { initDb, query } from "../src/db.js";

async function seed() {
  console.log("Boshlang‘ich ma’lumotlarni (seed) yuklash boshlanmoqda...");
  try {
    await initDb();

    // 1. Achievements
    const achievements = [
      [
        "first_step",
        "Birinchi qadam",
        "AI Maktab platformasida hisob yaratib, birinchi faoliyatni boshladingiz",
        "🌱",
        "general",
        25,
      ],
      [
        "prompt_rookie",
        "Prompt o‘rganuvchisi",
        "Prompt Lab bo‘limida birinchi amaliy topshiriqni topshirdingiz",
        "📝",
        "prompt",
        30,
      ],
      [
        "prompt_master",
        "Prompt ustasi",
        "Prompt Lab topshirig‘idan 18 balldan yuqori a’lo natija oldingiz",
        "💎",
        "prompt",
        50,
      ],
      [
        "quiz_starter",
        "Bilim sinovi",
        "Birinchi test savoliga to‘g‘ri javob berdingiz",
        "🎯",
        "quiz",
        20,
      ],
      [
        "quiz_champion",
        "Intellekt chempioni",
        "Kamida 5 ta test savolini to‘g‘ri yechdingiz",
        "🧠",
        "quiz",
        60,
      ],
      [
        "ai_explorer",
        "AI tadqiqotchi",
        "AI yordamchi bilan faol ma’rifiy muloqot olib bordingiz",
        "⚡",
        "chat",
        30,
      ],
      [
        "century_club",
        "100 ballik marra",
        "Jami to‘plagan ballaringiz 100 dan oshdi",
        "🏆",
        "general",
        100,
      ],
    ];

    for (const [id, title, desc, icon, cat, reward] of achievements) {
      await query(
        `INSERT INTO achievements (id, title, description, icon, category, points_reward)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           icon = EXCLUDED.icon,
           category = EXCLUDED.category,
           points_reward = EXCLUDED.points_reward`,
        [id, title, desc, icon, cat, reward],
      );
    }
    console.log("✓ Yutuqlar (Achievements) yuklandi.");

    // 2. Admin user
    const adminEmail = (
      process.env.ADMIN_EMAIL || "admin@aimaktab.uz"
    ).toLowerCase();
    const adminPass = process.env.ADMIN_PASSWORD || "AdminPassword2026!";
    const adminHash = await bcrypt.hash(adminPass, 12);
    const adminName = process.env.ADMIN_NAME || "AI Maktab Admin";

    await query(
      `INSERT INTO users (name, email, password_hash, role, points, bio, grade)
       VALUES ($1, $2, $3, 'admin', 150, 'Platforma bosh administratori', 'Admin')
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         role = 'admin'`,
      [adminName, adminEmail, adminHash],
    );

    // 3. Demo students
    const student1Pass = await bcrypt.hash("Oquvchi2026!", 12);
    await query(
      `INSERT INTO users (name, email, password_hash, role, points, bio, grade)
       VALUES ($1, $2, $3, 'student', 85, 'Dasturlash va robototexnikaga qiziqaman.', '9-sinf')
       ON CONFLICT (email) DO NOTHING`,
      ["Jasur Aliyev", "jasur@aimaktab.uz", student1Pass],
    );

    const student2Pass = await bcrypt.hash("Oquvchi2026!", 12);
    await query(
      `INSERT INTO users (name, email, password_hash, role, points, bio, grade)
       VALUES ($1, $2, $3, 'student', 120, 'Matematika va AI modellariga qiziqaman.', '10-sinf')
       ON CONFLICT (email) DO NOTHING`,
      ["Madina Karimova", "madina@aimaktab.uz", student2Pass],
    );

    const student3Pass = await bcrypt.hash("Oquvchi2026!", 12);
    await query(
      `INSERT INTO users (name, email, password_hash, role, points, bio, grade)
       VALUES ($1, $2, $3, 'student', 65, 'Kreativ yozuvchilik va prompt dizayni.', '8-sinf')
       ON CONFLICT (email) DO NOTHING`,
      ["Bekzod Rustamov", "bekzod@aimaktab.uz", student3Pass],
    );

    console.log("✓ Foydalanuvchilar (Admin va o‘quvchilar) tayyorlandi.");

    // 4. Quiz categories
    const categories = [
      [
        "AI asoslari",
        "Sun’iy intellekt, mashinaviy o‘rganish va neyron tarmoqlar asosiy tushunchalari",
        "🤖",
      ],
      [
        "Prompt Engineering",
        "AI bilan samarali muloqot va aniq so‘rovlar tuzish mahorati",
        "✍️",
      ],
      [
        "Axloq va xavfsizlik",
        "Mas’uliyatli foydalanish, faktlarni tekshirish va kiberxavfsizlik",
        "🛡️",
      ],
      [
        "Ta’limda AI",
        "O‘quv jarayoni, fanlarni chuqur o‘rganish va tadqiqotda AI yordamchilari",
        "🎓",
      ],
    ];

    for (const [name, desc, icon] of categories) {
      await query(
        `INSERT INTO quiz_categories (name, description, icon)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING`,
        [name, desc, icon],
      );
    }
    console.log("✓ Test toifalari yuklandi.");

    // 5. Questions
    const questions = [
      {
        category: "AI asoslari",
        question: "Sun’iy intellekt (AI / SI) nima?",
        options: [
          "Faqat temirdan yasalgan odamsimon robot",
          "Inson aqliy faoliyatiga xos bo‘lgan vazifalarni (matn tushunish, qaror qabul qilish, hisoblash) bajara oladigan tizimlar",
          "Kompyuterdagi oddiy kalkulyator dasturi",
          "Faqat internet brauzerining bir turi",
        ],
        correct_index: 1,
        explanation:
          "Sun’iy intellekt — inson aqliy qobiliyatlarini modellashtiruvchi, katta hajmdagi ma’lumotlarni tahlil qilib xulosa va yechim beruvchi dasturiy va apparat tizimlar majmuidir.",
        difficulty: "easy",
        points: 10,
      },
      {
        category: "AI asoslari",
        question:
          "Katta til modellari (LLM — Large Language Models) qanday ishlaydi?",
        options: [
          "Matndagi oldingi so‘zlarga qarab navbatdagi eng ehtimolli so‘zni bashorat qiladi",
          "Odam kabi his-tuyg‘u va shaxsiy qarashlarga ega bo‘ladi",
          "Barcha ma’lumotlarni odamlar kabi yodlab olib, o‘zgarmas holatda saqlaydi",
          "Faqat raqamli matematik formulalarni tekshiradi",
        ],
        correct_index: 0,
        explanation:
          "Katta til modellari ulkan matnlar bazasida o‘rgatilgan bo‘lib, statistik va ehtimollik qoidalari asosida matndagi keyingi so‘z yoki belgilarni mantiqiy ketma-ketlikda yaratadi.",
        difficulty: "medium",
        points: 15,
      },
      {
        category: "Prompt Engineering",
        question: "Prompt Engineering (so‘rovlar muhandisligi) nima?",
        options: [
          "Kompyuterning qattiq diskini ta’mirlash usuli",
          "AI modellaridan eng aniq va sifatli javob olish uchun so‘rovlarni to‘g‘ri, batafsil va tuzilmali shakllantirish mahorati",
          "Sun’iy intellekt dasturining kodini butunlay o‘chirib yuborish",
          "Faqat klaviaturada tez yozish tezligi",
        ],
        correct_index: 1,
        explanation:
          "Prompt Engineering — sun’iy intellektga vazifa, kontekst, auditoriya, format va cheklovlarni aniq tushuntirib, undan maksimal samarali natija olish san’atidir.",
        difficulty: "easy",
        points: 10,
      },
      {
        category: "Prompt Engineering",
        question:
          "Quyidagi promptlardan qaysi biri eng samarali va sifatli hisoblanadi?",
        options: [
          "Menga matematika haqida nimadir yozib ber.",
          "Sen tajribali matematika o‘qituvchisisan. 8-sinf o‘quvchilari uchun Pifagor teoremasini kundalik hayotdagi 2 ta aniq misol bilan, 150 so‘zdan oshmagan sodda tilda tushuntir.",
          "Pifagor nima?",
          "Tezda matematika mavzusini hal qil.",
        ],
        correct_index: 1,
        explanation:
          "Bu so‘rovda rol (tajribali o‘qituvchi), auditoriya (8-sinf), mavzu (Pifagor teoremasi), format (hayotiy misollar) va cheklov (150 so‘z) aniq belgilangan.",
        difficulty: "medium",
        points: 15,
      },
      {
        category: "Prompt Engineering",
        question: 'Promptda "Few-shot prompting" usuli nimani anglatadi?',
        options: [
          "AI’ga hech qanday ko‘rsatma bermasdan javob kutish",
          "AI’ga topshiriq berishdan oldin bir nechta namunaviy kirish va kutilgan chiqish misollarini ko‘rsatish",
          "Bir vaqtning o‘zida o‘nlab savollarni aralashtirib yuborish",
          "AI modelining xotirasini butunlay tozalash",
        ],
        correct_index: 1,
        explanation:
          'Few-shot prompting — bu modelga bir nechta namunaviy "savol-javob" yoki "misol-natija" juftliklarini berish orqali kutilayotgan format va mantiqni o‘rgatish usulidir.',
        difficulty: "hard",
        points: 20,
      },
      {
        category: "Axloq va xavfsizlik",
        question:
          "AI bilan muloqotda qanday ma’lumotlarni kiritish QAT’IYAN TAVSIYA ETILMAYDI?",
        options: [
          "Darslikdagi ochiq mavzu va savollar",
          "Shaxsiy parollar, bank kartalari, uy manzili va maxfiy hujjatlar",
          "O‘zbek tili grammatikasi haqidagi qoidalar",
          "Tarixiy sanalar va umumiy ma’lumotlar",
        ],
        correct_index: 1,
        explanation:
          "Maxfiylik va kiberxavfsizlik qoidalariga ko‘ra, hech qachon shaxsiy identifikatsiya ma’lumotlari, parollar va maxfiy ma’lumotlarni sun’iy intellekt chatlariga yubormaslik kerak.",
        difficulty: "easy",
        points: 10,
      },
      {
        category: "Axloq va xavfsizlik",
        question: "AI “gallyutsinatsiyasi” (hallucination) nima?",
        options: [
          "Modelning internet aloqasi uzilib qolishi",
          "AI modelining haqiqatga to‘g‘ri kelmaydigan, to‘qima yoki noto‘g‘ri faktlarni juda ishonchli ohangda yaratishi",
          "Dasturning tezroq ishlay boshlashi",
          "Kompyuter ekranining qorayib qolishi",
        ],
        correct_index: 1,
        explanation:
          "Gallyutsinatsiya — AI modeli statistik bog‘lanishlarga tayanib, mavjud bo‘lmagan kitoblar, sanalar yoki faktlarni xuddi haqiqatdek ishonch bilan to‘qib chiqarish holatidir. Shuning uchun faktlarni tekshirish shart!",
        difficulty: "medium",
        points: 15,
      },
      {
        category: "Ta’limda AI",
        question:
          "O‘quvchi maktabda mustaqil ish yoki insho yozishda AI’dan qanday to‘g‘ri foydalanishi kerak?",
        options: [
          "Butun inshoni AI’ga yozdirib olib, o‘z nomidan o‘qituvchiga topshirish",
          "G‘oyalar to‘plash, reja tuzish, imlo va uslubiy xatolarni tekshirish hamda qiyin tushunchalarni o‘rganishda aqlli yordamchi sifatida foydalanish",
          "AI bergan har qanday matnni o‘qimasdan nusxalash",
          "Hech qachon darslarda texnologiyaga qaramaslik",
        ],
        correct_index: 1,
        explanation:
          "AI — o‘quvchining o‘rniga o‘qish vositasi emas, balki uning aqliy qobiliyati, tanqidiy fikrlashi va mahoratini oshiruvchi aqlli shaxsiy murabbiy bo‘lishi lozim.",
        difficulty: "easy",
        points: 10,
      },
    ];

    for (const q of questions) {
      await query(
        `INSERT INTO questions (category, question, options, correct_index, explanation, difficulty, points)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
         ON CONFLICT (question) DO UPDATE SET
           category = EXCLUDED.category,
           options = EXCLUDED.options,
           correct_index = EXCLUDED.correct_index,
           explanation = EXCLUDED.explanation,
           difficulty = EXCLUDED.difficulty,
           points = EXCLUDED.points`,
        [
          q.category,
          q.question,
          JSON.stringify(q.options),
          q.correct_index,
          q.explanation,
          q.difficulty,
          q.points,
        ],
      );
    }
    console.log("✓ Bilim testlari savollari yuklandi.");

    // 6. Practical Prompt Lab Exercises
    const exercises = [
      {
        title: "Maktab kitobxonlik haftaligi e’loni",
        category: "E’lonlar va jamoatchilik",
        description:
          'Maktabingizda o‘tkaziladigan "Kitob — qalb quyoshi" haftaligi uchun o‘quvchilarni jalb qiluvchi qiziqarli e’lon matnini tayyorlatuvchi prompt tuzing.',
        goal: "Promptda AI’ga rol (tashkilotchi), maqsad (haftalikka taklif), auditoriya (5-11 sinf o‘quvchilari), tadbir vaqti/joyi va vizual format (emoji va bandlar) aniq ko‘rsatilgan bo‘lishi lozim.",
        criteria:
          "1. Rol va maqsad aniqligi (5 ball)\n2. Auditoriya va kontekst (5 ball)\n3. Natija formati va ohangi (5 ball)\n4. Cheklovlar va talablar (5 ball)",
        example_input:
          "Sen maktab Yoshlar ittifoqi yetakchisisan. 5-11 sinf o‘quvchilari uchun Kitobxonlik haftaligi e’lonini yoz. Matn ilhomlantiruvchi, emoji bilan bezatilgan va 3 banddan iborat bo‘lsin.",
        max_points: 20,
      },
      {
        title: "Murakkab ilmiy mavzuni sodda tushuntirish",
        category: "Ta’lim va tushuntirish",
        description:
          "Murakkab ilmiy hodisa (masalan: Fotosintez, Qora tuynuk yoki Blokcheyn)ni kichik sinf o‘quvchisiga tushunarli qilib beruvchi professional prompt yozing.",
        goal: "Promptda mavzu, auditoriya yoshi (masalan, 7-sinf), oddiy hayotiy o‘xshatishlar (metaforalar) keltirish talabi va atamalarni soddalashtirish sharti bo‘lishi kerak.",
        criteria:
          "1. Mavzu va tushuncha aniqligi (5 ball)\n2. Yoshga moslik va soddalik talabi (5 ball)\n3. O‘xshatishlar va metaforalar sharti (5 ball)\n4. Natija uzunligi va uslubi (5 ball)",
        example_input:
          "Sen tajribali fizika o‘qituvchisisan. 7-sinf o‘quvchisiga Yerning tortishish kuchini o‘yinchoq to‘p va batut misolida 120 so‘zda tushuntirib ber.",
        max_points: 20,
      },
      {
        title: "Imtihonga tayyorgarlikning haftalik rejasi",
        category: "Rejalashtirish va unumdorlik",
        description:
          "O‘quvchiga matematika yoki ingliz tili imtihoniga 7 kun ichida tayyorlanish bo‘yicha samarali va bosqichma-bosqich jadval yaratib beruvchi prompt yozing.",
        goal: "Promptda o‘rganiladigan fan, har kungi vaqt limiti (masalan 1.5 soat), jadval formati (Dushanba-Yakshanba) va dam olish oraliqlari belgilangan bo‘lishi shart.",
        criteria:
          "1. Aniq rejalashtirish maqsadi (5 ball)\n2. Vaqt va resurs cheklovlari (5 ball)\n3. Jadval yoki ro‘yxat shaklidagi format (5 ball)\n4. Samaradorlik va takrorlash usullari (5 ball)",
        example_input:
          "Ingliz tili imtihoniga tayyorgarlik uchun 7 kunlik jadval tuz. Kuniga 90 daqiqa, har kuni so‘z yodlash, grammatika va test tahlili jadval formatida berilsin.",
        max_points: 20,
      },
      {
        title: "Maktab innovatsion loyihasi taklifi",
        category: "Loyiha va tadqiqot",
        description:
          "Maktabda chiqindilarni saralash yoki robototexnika to‘garagini ochish bo‘yicha direktor huzuridagi taqdimot loyihasini yozdiradigan prompt yarating.",
        goal: "Promptda loyiha nomi, maqsad, maktabga keltiradigan 3 ta aniq foydasi, kerakli byudjet/jihozlar va ijro bosqichlari bo‘lishi so‘ralsin.",
        criteria:
          "1. Muammo va yechim tavsifi (5 ball)\n2. Bosqichlar va natijalar aniqligi (5 ball)\n3. Taqdimot formati va tuzilishi (5 ball)\n4. Ishonarli rasmiy uslub (5 ball)",
        example_input:
          'Maktab direktori uchun "Yashil maktab — chiqindilarni saralash" loyihasi rejasini yoz. Muammo, yechim, 3 bosqichli amalga oshirish rejasi va natijalar bandma-band bo‘lsin.',
        max_points: 20,
      },
      {
        title: "Katta matnni aniq auditoriyaga qisqartirish",
        category: "Xulosalash va tahlil",
        description:
          "Uzun ilmiy yoki badiiy matndan eng muhim xulosalarni ajratib oluvchi xulosalash (Summarization) promptini tuzing.",
        goal: "Promptda matnning asosiy 3 ta g‘oyasini ajratish, 50 so‘zdan oshmaslik va yakuniy xulosa bandlar bilan berilishi shart qilib qo‘yilsin.",
        criteria:
          "1. Xulosalash vazifasi aniqligi (5 ball)\n2. Hajm va so‘z soni cheklovi (5 ball)\n3. Asosiy g‘oyalarni ajratish mezoni (5 ball)\n4. Natija tuzilishi va format (5 ball)",
        example_input:
          "Quyidagi matnni tahlil qilib, eng asosiy 3 ta fikrni tezis shaklida ajrat. Umumiy hajm 80 so‘zdan oshmasin va xulosa aniq bo‘lsin.",
        max_points: 20,
      },
    ];

    for (const ex of exercises) {
      await query(
        `INSERT INTO exercises (title, category, description, goal, criteria, example_input, max_points)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (title) DO UPDATE SET
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           goal = EXCLUDED.goal,
           criteria = EXCLUDED.criteria,
           example_input = EXCLUDED.example_input,
           max_points = EXCLUDED.max_points`,
        [
          ex.title,
          ex.category,
          ex.description,
          ex.goal,
          ex.criteria,
          ex.example_input,
          ex.max_points,
        ],
      );
    }
    console.log("✓ Prompt Lab amaliy topshiriqlari yuklandi.");

    // 7. Projects Gallery
    const projects = [
      {
        title: "AI Repetitor — Matematika & Fizika",
        category: "Ta’lim",
        description:
          "O‘quvchilarga murakkab tenglamalar, geometrik isbotlar va fizika masalalarini bosqichma-bosqich, tayyor javob bermasdan fikrlashga o‘rgatuvchi AI murabbiy.",
        features:
          "Bosqichma-bosqich yordam, O‘zbek tilidagi tushuntirish, Formula va grafiklar tahlili, Tanqidiy fikrlashni rivojlantirish",
        badge: "Eng ommabop",
        icon: "📐",
        external_url: "https://aimaktab.uz/projects/repetitor",
        author_name: "AI Maktab IT Laboratoriyasi",
      },
      {
        title: "O‘zbek Tili Insho Tahlilchisi",
        category: "Til va adabiyot",
        description:
          "O‘quvchilar yozgan insho va ijodiy matnlarni imlo, uslub, punktuatsiya va mantiqiy izchillik bo‘yicha tahlil qilib, konstruktiv tavsiyalar beruvchi dastur.",
        features:
          "Imlo tekshiruvi, Lug‘at boyligini boyitish, Sinonimlar tavsiyasi, Matn tuzilishi bahosi",
        badge: "Tavsiya",
        icon: "✍️",
        external_url: "https://aimaktab.uz/projects/insho",
        author_name: "O‘zbek tili kafedrasi & AI jamoasi",
      },
      {
        title: "Virtual Kimyo Laboratoriyasi",
        category: "Fan va innovatsiya",
        description:
          "Xavfli yoki qimmatbaho kimyoviy reaksiyalarni xavfsiz o‘rganish uchun interaktiv AI simulyatori va tajriba bosqichlari ko‘rsatmasi.",
        features:
          "Reaksiyalar vizualizatsiyasi, Xavfsizlik ko‘rsatmalari, Elementlar davriy jadvali bilan integratsiya",
        badge: "Yangi",
        icon: "🧪",
        external_url: "https://aimaktab.uz/projects/chem-lab",
        author_name: "Kimyo to‘garagi",
      },
      {
        title: "Kreativ Ertak va Hikoyanavis",
        category: "Ijodkorlik",
        description:
          "Kichik yoshdagi o‘quvchilar uchun qahramonlar, sahnalar va qiziqarli syujet chiziqlarini birgalikda yaratuvchi interaktiv ijodiy assistent.",
        features:
          "Qahramonlar generatori, Tarbiyaviy xulosa yaratish, O‘zbek xalq ertaklari asosida motivlar",
        badge: "Ijodiy",
        icon: "🎨",
        external_url: "https://aimaktab.uz/projects/storyteller",
        author_name: "Ijodiy ustaxona",
      },
      {
        title: "Kod Mentor — Python & Web",
        category: "Dasturlash",
        description:
          "Dasturlashni endi boshlagan maktab o‘quvchilari uchun Python xatolarini tushunarli tilda tahlil qilib, yechim yo‘nalishini ko‘rsatuvchi dasturiy vosita.",
        features:
          "Sintaksis xatolarini tushuntirish, Toza kod yozish tavsiyalari, Algoritmik masalalar",
        badge: "IT Yo‘nalish",
        icon: "💻",
        external_url: "https://aimaktab.uz/projects/code-mentor",
        author_name: "Informatika to‘garagi",
      },
      {
        title: "Allomalar bilan Muloqot",
        category: "Tarix va ma’rifat",
        description:
          "Al-Xorazmiy, Ibn Sino, Mirzo Ulug‘bek va Beruniy kabi buyuk ajdodlarimizning ilmiy merosini savol-javob shaklida o‘rganish platformasi.",
        features:
          "Tarixiy faktlarga asoslanganlik, Ilmiy kashfiyotlar tarixi, Yoshlarga ma’rifiy o‘gitlar",
        badge: "Noyob loyiha",
        icon: "📜",
        external_url: "https://aimaktab.uz/projects/allomalar",
        author_name: "Tarix va ma’naviyat jamoasi",
      },
    ];

    for (const pr of projects) {
      await query(
        `INSERT INTO projects (title, category, description, features, badge, icon, external_url, author_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (title) DO UPDATE SET
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           features = EXCLUDED.features,
           badge = EXCLUDED.badge,
           icon = EXCLUDED.icon,
           external_url = EXCLUDED.external_url,
           author_name = EXCLUDED.author_name`,
        [
          pr.title,
          pr.category,
          pr.description,
          pr.features,
          pr.badge,
          pr.icon,
          pr.external_url,
          pr.author_name,
        ],
      );
    }
    console.log("✓ Loyihalar galereyasi (Projects Gallery) yuklandi.");

    console.log("==================================================");
    console.log("Seed ma’lumotlari muvaffaqiyatli yuklandi!");
    console.log("Administrator hisobi:");
    console.log("Email:", adminEmail);
    console.log("Parol:", adminPass);
    console.log("O‘quvchi hisobi:");
    console.log("Email: jasur@aimaktab.uz");
    console.log("Parol: Oquvchi2026!");
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Seed jarayonida xatolik:", err);
    process.exit(1);
  }
}

seed();
