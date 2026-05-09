import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { join } from 'path';

async function test() {
  const dbFile = './data/database.sqlite';
  const db = await open({
    filename: dbFile,
    driver: sqlite3.Database
  });

  console.log('Testing DB write...');
  const key = 'prompt_recepcionista';
  const value = 'Test value ' + new Date().toISOString();
  
  await db.run("REPLACE INTO settings (key, value) VALUES (?, ?)", key, value);
  console.log('Write successful.');

  const row = await db.get("SELECT value FROM settings WHERE key = ?", key);
  console.log('Read back:', row.value);
  
  await db.close();
}

test().catch(console.error);
