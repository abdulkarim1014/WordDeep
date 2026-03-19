import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Volume2, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
type TranslationPair = { en: string; ar: string };
type UsageExample = { en: string; ar: string };
type UsageMeaning = {
  pos: string;
  pos_ar: string;
  translation: string;
  definition: string;
  examples: UsageExample[];
  usage_note: string;
};
type UsageGuide = {
  meanings: UsageMeaning[];
  why_use?: string;
  where_use?: string;
};
type DictionaryEntry = {
  ar: string;
  definition: TranslationPair;
  usage: TranslationPair;
  usage_guide?: UsageGuide;
  examples: TranslationPair[];
  synonyms: TranslationPair[];
  antonyms: TranslationPair[];
  phonetic?: string;
  audio?: string;
  level_en?: string;
  level_ar?: string;
  freq_en?: string;
  freq_ar?: string;
  used_in_en?: string;
  used_in_ar?: string;
};
type SavedWord = { en: string; ar: string; timestamp: number };

const CACHE_KEY = 'worddeep_saved_words_v2';

export default function WordDeep() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ word: string; data: DictionaryEntry } | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SavedWord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {}
  }, []);

  const saveHistory = (newHistory: SavedWord[]) => {
    setHistory(newHistory);
    localStorage.setItem(CACHE_KEY, JSON.stringify(newHistory));
  };

  // 🔥 دالة البحث الجديدة
  const handleSearch = async (searchWord: string) => {
    const normalizedWord = searchWord.trim().toLowerCase();
    if (!normalizedWord) return;

    setQuery(normalizedWord);
    setError('');
    setIsSearching(true);

    try {
      const letter = normalizedWord[0].toUpperCase();
const response = await fetch(`/${letter}.json`);
      if (!response.ok) throw new Error('File not found');

      const data = await response.json();
      const row = data.find((item: any) => item.word_en.toLowerCase() === normalizedWord);

      if (!row) throw new Error('Word not found');

      const entry: DictionaryEntry = {
        ar: row.word_ar,
        definition: { en: row.definition_en, ar: row.definition_ar },
        usage: { en: row.usage_en, ar: row.usage_ar },
        usage_guide: row.usage_detail_en ? JSON.parse(row.usage_detail_en) : undefined,
        examples: row.examples_en
          ? row.examples_en.split('|').map((en: string, i: number) => ({
              en: en.trim(),
              ar: row.examples_ar?.split('|')[i]?.trim() || '',
            }))
          : [],
        synonyms: row.synonyms_en
          ? row.synonyms_en.split(',').map((en: string, i: number) => ({
              en: en.trim(),
              ar: row.synonyms_ar?.split(',')[i]?.trim() || '',
            }))
          : [],
        antonyms: row.antonyms_en
          ? row.antonyms_en.split(',').map((en: string, i: number) => ({
              en: en.trim(),
              ar: row.antonyms_ar?.split(',')[i]?.trim() || '',
            }))
          : [],
        phonetic: row.phonetic,
        audio: row.audio,
        level_en: row.level_en,
        level_ar: row.level_ar,
        freq_en: row.freq_en,
        freq_ar: row.freq_ar,
        used_in_en: row.used_in_en,
        used_in_ar: row.used_in_ar,
      };

      setResult({ word: row.word_en, data: entry });

      const newWord: SavedWord = { en: row.word_en, ar: row.word_ar, timestamp: Date.now() };
      const newHistory = [newWord, ...history.filter(w => w.en !== row.word_en)].slice(0, 50);
      saveHistory(newHistory);
    } catch {
      setResult(null);
      setError(`Word "${normalizedWord}" not found.`);
    } finally {
      setIsSearching(false);
    }
  }
            const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(query);
    if (e.key === 'Escape') clearInput();
  };

  const clearInput = () => {
    setQuery('');
    setResult(null);
    setError('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (error) setError('');
    if (val.trim() === '') setResult(null);
  };

  const handleRelatedWordClick = (word: string) => {
    setQuery(word);
    handleSearch(word);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <header className="text-center mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-2xl mb-4 text-indigo-600"
          >
            <BookOpen size={32} />
          </motion.div>

          <h1 className="text-4xl font-bold mb-2">WordDeep</h1>
          <p className="text-slate-500">Offline English-Arabic Dictionary</p>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative flex items-center">
            <button 
              onClick={() => handleSearch(query)}
              disabled={isSearching}
              className="absolute left-4 text-slate-400"
            >
              {isSearching ? <Loader2 size={20} className="animate-spin text-indigo-500" /> : <Search size={20} />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder="Search for a word..."
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-lg"
            />

            {query && (
              <button 
                onClick={clearInput}
                className="absolute right-4 text-slate-400"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 text-center border border-red-100">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-12">

            <div className="text-center mb-8 pb-8 border-b border-slate-100">
              <h2 className="text-5xl font-bold capitalize">{result.word}</h2>
              <p className="text-3xl text-indigo-600 font-bold" dir="rtl">{result.data.ar}</p>

              {result.data.phonetic && (
                <span className="text-lg text-slate-600 font-mono bg-slate-100 px-3 py-1 rounded-lg">
                  {result.data.phonetic}
                </span>
              )}

              <button 
                className="flex items-center gap-2 px-6 py-3 mt-4 bg-indigo-50 text-indigo-700 rounded-full"
                onClick={() => {
                  if (result.data.audio) new Audio(result.data.audio).play();
                  else {
                    const u = new SpeechSynthesisUtterance(result.word);
                    u.lang = 'en-US';
                    speechSynthesis.speak(u);
                  }
                }}
              >
                <Volume2 size={20} />
                استماع
              </button>
            </div>

            {/* Definition */}
            <div className="mb-10">
              <h3 className="text-xl font-bold mb-4">التعريف (Definition)</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl">
                  <p className="text-slate-700">{result.data.definition.en}</p>
                </div>

                <div className="bg-indigo-50 p-5 rounded-2xl" dir="rtl">
                  <p className="text-indigo-900">{result.data.definition.ar}</p>
                </div>
              </div>
            </div>

            {/* Examples */}
            {result.data.examples.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold mb-4">أمثلة (Examples)</h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-5 rounded-2xl">
                    <ul className="space-y-2">
                      {result.data.examples.map((ex, i) => (
                        <li key={i}>{ex.en}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-50 p-5 rounded-2xl" dir="rtl">
                    <ul className="space-y-2">
                      {result.data.examples.map((ex, i) => (
                        <li key={i}>{ex.ar}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <History size={24} className="text-indigo-600" />
                <h3 className="text-2xl font-bold">مخزن الكلمات</h3>
              </div>

              <button 
                onClick={() => saveHistory([])}
                className="text-sm text-rose-500 bg-rose-50 px-4 py-2 rounded-xl"
              >
                مسح الكل
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {history.map((item) => (
                <button
                  key={item.en}
                  onClick={() => handleRelatedWordClick(item.en)}
                  className="p-4 bg-slate-50 rounded-2xl text-center"
                >
                  <span className="font-bold">{item.en}</span>
                  <br />
                  <span className="text-indigo-600" dir="rtl">{item.ar}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
  
