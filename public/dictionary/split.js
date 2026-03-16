const fs = require("fs");

// اقرأ ملف القاموس
const data = JSON.parse(fs.readFileSync("dictionary.json", "utf8"));

// كائن لتجميع الكلمات حسب الحرف
const groups = {};

// مر على كل كلمة
data.forEach(item => {
  const word = item.word_en?.trim();
  if (!word) return;

  const first = word[0].toLowerCase();

  if (!groups[first]) groups[first] = [];
  groups[first].push(item);
});

// أنشئ ملفات JSON لكل حرف
Object.keys(groups).forEach(letter => {
  fs.writeFileSync(`${letter}.json`, JSON.stringify(groups[letter], null, 2));
});

console.log("تم التقسيم بنجاح");