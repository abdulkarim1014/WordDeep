import fs from 'fs';
import Database from 'better-sqlite3';

const db = new Database('dictionary.db');

console.log('Starting dictionary import process from public/dictionary.json...');

const sqlFilePath = './public/dictionary.json';

if (!fs.existsSync(sqlFilePath)) {
  console.error(`Error: Could not find the file '${sqlFilePath}'.`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

// Regex to match (id, 'eng', 'ara')
// We need to handle escaped quotes if any, but a simple regex might work for most:
// \((\d+),\s*'([^']*)',\s*'([^']*)'\)
// Let's use a more robust approach: split by "INSERT INTO" and then parse values.

const regex = /\(\d+,\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)'\)/g;

let match;
let count = 0;

const insertStmt = db.prepare(`
  INSERT INTO dictionary (word_en, word_ar)
  VALUES (?, ?)
`);

const insertMany = db.transaction(() => {
  while ((match = regex.exec(sqlContent)) !== null) {
    const eng = match[1].replace(/''/g, "'");
    const ara = match[2].replace(/''/g, "'");
    
    // Check if word already exists to avoid duplicates
    const exists = db.prepare('SELECT 1 FROM dictionary WHERE word_en = ?').get(eng);
    if (!exists) {
      insertStmt.run(eng, ara);
      count++;
    }
  }
});

insertMany();

console.log(`Import completed! Successfully inserted ${count} new words.`);
