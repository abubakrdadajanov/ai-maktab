import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { initDb, exec } from '../src/db.js';

async function migrate() {
  console.log('Ma’lumotlar bazasi migratsiyasi boshlanmoqda...');
  try {
    await initDb();
    const schemaPath = path.resolve(process.cwd(), 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    await exec(sql);
    console.log('Jadvallar va indekslar muvaffaqiyatli yaratildi/yangilandi.');
    process.exit(0);
  } catch (err) {
    console.error('Migratsiyada xatolik yuz berdi:', err.message);
    process.exit(1);
  }
}

migrate();
