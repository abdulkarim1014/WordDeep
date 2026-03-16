import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';

// 1. Initialize SQLite Database
// This replaces MySQL for local/serverless environments. It uses standard SQL.
const db = new Database('dictionary.db');

async function translateText(text: string): Promise<string> {
  if (!text) return '';
  try {
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`);
    const data = await response.json();
    return data[0].map((item: any) => item[0]).join('');
  } catch (e) {
    console.error('Translation error:', e);
    return '';
  }
}

// 2. Create the table (similar to your MySQL schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    word_en TEXT,
    word_ar TEXT,
    definition_en TEXT,
    definition_ar TEXT,
    usage_en TEXT,
    usage_ar TEXT,
    examples_en TEXT,
    examples_ar TEXT,
    synonyms_en TEXT,
    synonyms_ar TEXT,
    antonyms_en TEXT,
    antonyms_ar TEXT,
    phonetic TEXT,
    audio TEXT,
    level_en TEXT,
    level_ar TEXT,
    freq_en TEXT,
    freq_ar TEXT,
    used_in_en TEXT,
    used_in_ar TEXT,
    usage_detail_en TEXT,
    usage_detail_ar TEXT
  );
`);

// Add new columns to existing table if they don't exist
try {
  db.exec('ALTER TABLE dictionary ADD COLUMN phonetic TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN audio TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN level_en TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN level_ar TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN freq_en TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN freq_ar TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN used_in_en TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN used_in_ar TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN usage_detail_en TEXT;');
  db.exec('ALTER TABLE dictionary ADD COLUMN usage_detail_ar TEXT;');
} catch (e) {
  // Ignore errors if columns already exist
}

// Helper to estimate CEFR level and frequency based on word length/complexity
function estimateWordStats(word: string) {
  const len = word.length;
  if (len <= 4) {
    return {
      level_en: 'A1 - Beginner', level_ar: 'A1 - مبتدئ',
      freq_en: 'Very High (Common word)', freq_ar: 'مرتفعة جداً (كلمة شائعة)',
      used_in_en: 'Daily life, Basic communication', used_in_ar: 'الحياة اليومية، التواصل الأساسي'
    };
  } else if (len <= 6) {
    return {
      level_en: 'A2 - Elementary', level_ar: 'A2 - أساسي',
      freq_en: 'High (Frequent word)', freq_ar: 'مرتفعة (كلمة متكررة)',
      used_in_en: 'Daily life, Education, General reading', used_in_ar: 'الحياة اليومية، التعليم، القراءة العامة'
    };
  } else if (len <= 8) {
    return {
      level_en: 'B1 - Intermediate', level_ar: 'B1 - متوسط',
      freq_en: 'Medium (Regular word)', freq_ar: 'متوسطة (كلمة عادية)',
      used_in_en: 'Education, Business, Media', used_in_ar: 'التعليم، الأعمال، الإعلام'
    };
  } else if (len <= 10) {
    return {
      level_en: 'B2 - Upper Intermediate', level_ar: 'B2 - فوق المتوسط',
      freq_en: 'Low (Less common)', freq_ar: 'منخفضة (أقل شيوعاً)',
      used_in_en: 'Academic, Professional, Literature', used_in_ar: 'أكاديمي، مهني، الأدب'
    };
  } else {
    return {
      level_en: 'C1/C2 - Advanced', level_ar: 'C1/C2 - متقدم',
      freq_en: 'Very Low (Rare word)', freq_ar: 'منخفضة جداً (كلمة نادرة)',
      used_in_en: 'Specialized texts, Advanced literature, Science', used_in_ar: 'النصوص المتخصصة، الأدب المتقدم، العلوم'
    };
  }
}

// 3. Insert sample data if the table is empty
const countResult = db.prepare('SELECT COUNT(*) as count FROM dictionary').get() as { count: number };
if (countResult.count === 0) {
  const insert = db.prepare(`
    INSERT INTO dictionary (
      word_en, word_ar, definition_en, definition_ar, usage_en, usage_ar, 
      examples_en, examples_ar, synonyms_en, synonyms_ar, antonyms_en, antonyms_ar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insert.run(
    'hello', 'مرحباً', 
    'Used as a greeting or to begin a phone conversation.', 'تُستخدم كتحية أو لبدء محادثة هاتفية.', 
    'Used informally to greet someone.', 'تُستخدم بشكل غير رسمي لتحية شخص ما.', 
    'Hello, how are you?', 'مرحباً، كيف حالك؟', 
    'hi,greetings', 'أهلاً,تحياتي', 
    'goodbye,farewell', 'وداعاً,وداع'
  );
  
  insert.run(
    'world', 'عالم', 
    'The earth, together with all of its countries and peoples.', 'الأرض، مع جميع بلدانها وشعوبها.', 
    'Used to refer to the entire planet.', 'تُستخدم للإشارة إلى الكوكب بأكمله.', 
    'He traveled around the world.', 'سافر حول العالم.', 
    'earth,globe', 'الأرض,الكرة الأرضية', 
    '', ''
  );

  insert.run(
    'fast', 'سريع', 
    'Moving or capable of moving at high speed.', 'يتحرك أو قادر على التحرك بسرعة عالية.', 
    'Used to describe speed.', 'تُستخدم لوصف السرعة.', 
    'He drives a fast car.', 'إنه يقود سيارة سريعة.', 
    'quick,rapid', 'سريع,سريع جداً', 
    'slow', 'بطيء'
  );

  insert.run(
    'care', 'رعاية / اهتمام', 
    'The provision of what is necessary for the health, welfare, maintenance, and protection of someone or something.', 'توفير ما هو ضروري للصحة والرفاهية والصيانة وحماية شخص أو شيء ما.', 
    'Feel concern or interest; attach importance to something.', 'الشعور بالقلق أو الاهتمام؛ إيلاء أهمية لشيء ما.', 
    'Handle with care.', 'تعامل بعناية.', 
    'attention,concern', 'انتباه,اهتمام', 
    'neglect,disregard', 'إهمال,تجاهل'
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Endpoint to update usage_detail manually
  app.use(express.json());
  app.post('/api/update-usage-detail', (req, res) => {
    const { word_en, usage_detail_en, usage_detail_ar } = req.body;
    if (!word_en) return res.status(400).json({ error: 'word_en is required' });
    const stmt = db.prepare(`
      UPDATE dictionary SET usage_detail_en = ?, usage_detail_ar = ? WHERE LOWER(word_en) = LOWER(?)
    `);
    const result = stmt.run(usage_detail_en || '', usage_detail_ar || '', word_en);
    if (result.changes === 0) return res.status(404).json({ error: 'Word not found' });
    res.json({ success: true });
  });

  // API Endpoint to search the SQL database
  app.get('/api/search', async (req, res) => {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    try {
      // SQL Query: Search English word, Arabic word, or synonyms
      const stmt = db.prepare(`
        SELECT * FROM dictionary 
        WHERE LOWER(word_en) = LOWER(?) 
           OR word_ar = ? 
           OR synonyms_en LIKE ? 
           OR synonyms_ar LIKE ?
        LIMIT 1
      `);
      
      const likeQuery = `%${q}%`;
      let row = stmt.get(q, q, likeQuery, likeQuery) as any;

      if (row) {
        // If the word exists but lacks a definition, enrich it with Free Dictionary API
        if (!row.definition_en && !row.examples_en) {
          try {
            console.log(`Fetching data from Free Dictionary API for: ${row.word_en}`);
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(row.word_en)}`);
            
            if (response.ok) {
              const data = await response.json();
              const entry = data[0];
              
              let definition_en = '';
              let usage_en = '';
              let examplesList: string[] = [];
              let synonyms_en: string[] = [];
              let antonyms_en: string[] = [];
              let phonetic = '';
              let audio = '';

              // Extract phonetic and audio
              if (entry.phonetics && entry.phonetics.length > 0) {
                const phoneticObj = entry.phonetics.find((p: any) => p.text);
                if (phoneticObj) phonetic = phoneticObj.text;
                else if (entry.phonetic) phonetic = entry.phonetic;

                const audioObj = entry.phonetics.find((p: any) => p.audio && p.audio.length > 0);
                if (audioObj) audio = audioObj.audio;
              }

              const posExplanations: Record<string, string> = {
                noun: "to name a person, place, thing, or idea",
                verb: "to describe an action, state, or occurrence",
                adjective: "to describe or modify a noun",
                adverb: "to modify a verb, adjective, or other adverb",
                pronoun: "in place of a noun",
                preposition: "to show relationship between words",
                conjunction: "to connect clauses or sentences",
                interjection: "to express sudden emotion"
              };

              if (entry.meanings && entry.meanings.length > 0) {
                // Get first definition
                const firstMeaning = entry.meanings[0];
                if (firstMeaning.definitions && firstMeaning.definitions.length > 0) {
                   definition_en = firstMeaning.definitions[0].definition || '';
                }
                
                let usages: string[] = [];
                // Collect examples, synonyms, and antonyms across all meanings
                entry.meanings.forEach((m: any) => {
                  if (m.partOfSpeech) {
                    const pos = m.partOfSpeech.toLowerCase();
                    const explanation = posExplanations[pos] ? ` (${posExplanations[pos]})` : '';
                    usages.push(`Used as a ${pos}${explanation}`);
                  }
                  if (m.synonyms) synonyms_en.push(...m.synonyms);
                  if (m.antonyms) antonyms_en.push(...m.antonyms);
                  m.definitions.forEach((d: any) => {
                    if (d.synonyms) synonyms_en.push(...d.synonyms);
                    if (d.antonyms) antonyms_en.push(...d.antonyms);
                    if (d.example) examplesList.push(d.example);
                  });
                });
                usage_en = Array.from(new Set(usages)).join('. ') + (usages.length > 0 ? '.' : '');
              }

              const examples_en_arr = examplesList.slice(0, 2);
              const examples_en = examples_en_arr.join(' | ');
              const synStr = Array.from(new Set(synonyms_en)).slice(0, 5).join(', ');
              const antStr = Array.from(new Set(antonyms_en)).slice(0, 5).join(', ');

              // Translate to Arabic
              const definition_ar = await translateText(definition_en);
              const usage_ar = await translateText(usage_en);
              
              const examples_ar_arr = [];
              for (const ex of examples_en_arr) {
                examples_ar_arr.push(await translateText(ex));
              }
              const examples_ar = examples_ar_arr.join(' | ');
              
              const synStrAr = await translateText(synStr);
              const antStrAr = await translateText(antStr);

              const stats = estimateWordStats(row.word_en);

              // Update the database
              const updateStmt = db.prepare(`
                UPDATE dictionary SET 
                  definition_en = ?, definition_ar = ?,
                  usage_en = ?, usage_ar = ?,
                  examples_en = ?, examples_ar = ?,
                  synonyms_en = ?, synonyms_ar = ?,
                  antonyms_en = ?, antonyms_ar = ?,
                  phonetic = ?, audio = ?,
                  level_en = ?, level_ar = ?,
                  freq_en = ?, freq_ar = ?,
                  used_in_en = ?, used_in_ar = ?
                WHERE id = ?
              `);
              
              updateStmt.run(
                definition_en, definition_ar,
                usage_en, usage_ar,
                examples_en, examples_ar,
                synStr, synStrAr,
                antStr, antStrAr,
                phonetic, audio,
                stats.level_en, stats.level_ar,
                stats.freq_en, stats.freq_ar,
                stats.used_in_en, stats.used_in_ar,
                row.id
              );

              // Merge enriched data into row for the response
              row.definition_en = definition_en;
              row.definition_ar = definition_ar;
              row.usage_en = usage_en;
              row.usage_ar = usage_ar;
              row.examples_en = examples_en;
              row.examples_ar = examples_ar;
              row.synonyms_en = synStr;
              row.synonyms_ar = synStrAr;
              row.antonyms_en = antStr;
              row.antonyms_ar = antStrAr;
              row.phonetic = phonetic;
              row.audio = audio;
              row.level_en = stats.level_en;
              row.level_ar = stats.level_ar;
              row.freq_en = stats.freq_en;
              row.freq_ar = stats.freq_ar;
              row.used_in_en = stats.used_in_en;
              row.used_in_ar = stats.used_in_ar;
            }
          } catch (apiError) {
            console.error('Failed to fetch from Free Dictionary API:', apiError);
          }
        }

        res.json(row);
      } else {
        res.status(404).json({ error: 'Word not found' });
      }
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
