import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, Volume2, ArrowRight, History, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
type TranslationPair = {
  en: string;
  ar: string;
};

type UsageExample = {
  en: string;
  ar: string;
};

type UsageMeaning = {
  pos: string;       // e.g. "Noun"
  pos_ar: string;    // e.g. "اسم"
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

type Dictionary = Record<string, DictionaryEntry>;

type SavedWord = {
  en: string;
  ar: string;
  timestamp: number;
};

const CACHE_KEY = 'worddeep_saved_words_v2';

export default function WordDeep() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ word: string; data: DictionaryEntry } | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<SavedWord[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: SavedWord[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  };

  const handleSearch = async (searchWord: string) => {
    // Remove zero-width spaces and trim
    const normalizedWord = searchWord.replace(/[\u200B-\u200D\uFEFF]/g, '').trim().toLowerCase();
    
    if (!normalizedWord) {
      setError('');
      return;
    }

    setQuery(normalizedWord);
    setError('');
    setIsSearching(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(normalizedWord)}`);
      
      if (!response.ok) {
        throw new Error('Not found');
      }

      const row = await response.json();

      // Map SQL row to our existing DictionaryEntry format
      const entry: DictionaryEntry = {
        ar: row.word_ar,
        definition: { en: row.definition_en, ar: row.definition_ar },
        usage: { en: row.usage_en, ar: row.usage_ar },
        usage_guide: row.usage_detail_en ? (() => { try { return JSON.parse(row.usage_detail_en); } catch { return undefined; } })() : undefined,
        examples: row.examples_en 
          ? row.examples_en.split('|').map((en: string, i: number) => ({ en: en.trim(), ar: (row.examples_ar?.split('|')[i] || '').trim() })).filter((e: any) => e.en)
          : [],
        synonyms: row.synonyms_en 
          ? row.synonyms_en.split(',').map((en: string, i: number) => ({ en: en.trim(), ar: (row.synonyms_ar?.split(',')[i] || '').trim() })).filter((s: any) => s.en)
          : [],
        antonyms: row.antonyms_en 
          ? row.antonyms_en.split(',').map((en: string, i: number) => ({ en: en.trim(), ar: (row.antonyms_ar?.split(',')[i] || '').trim() })).filter((s: any) => s.en)
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
      
      // Update history using the word the user actually typed
      const newWord: SavedWord = { en: row.word_en, ar: row.word_ar, timestamp: Date.now() };
      const filteredHistory = history.filter(w => w.en.toLowerCase() !== row.word_en.toLowerCase());
      const newHistory = [newWord, ...filteredHistory].slice(0, 50); // Keep up to 50 words
      saveHistory(newHistory);
    } catch (err) {
      setResult(null);
      setError(`Word "${normalizedWord}" not found in the database.`);
    } finally {
      setIsSearching(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      clearInput();
    }
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
    if (error) {
      setError('');
    }
    if (val.trim() === '') {
      setResult(null);
    }
  };

  const handleRelatedWordClick = (word: string) => {
    setQuery(word);
    handleSearch(word);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
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
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-slate-900 mb-2"
          >
            WordDeep
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500"
          >
            Offline English-Arabic Dictionary
          </motion.p>
        </header>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative mb-8"
        >
          <div className="relative flex items-center">
            <button 
              onClick={() => handleSearch(query)}
              disabled={isSearching}
              className="absolute left-4 text-slate-400 hover:text-indigo-500 transition-colors z-10 disabled:opacity-50"
              aria-label="Search"
            >
              {isSearching ? <Loader2 size={20} className="animate-spin text-indigo-500" /> : <Search size={20} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder="Search for a word (e.g., hello, world, fast)..."
              className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {query && (
              <button 
                onClick={clearInput}
                className="absolute right-4 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
                aria-label="Clear search"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div className="mt-2 text-sm text-slate-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono">Enter</kbd> to search, <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-xs font-mono">Esc</kbd> to clear
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 text-center border border-red-100"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key={result.word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 mb-12"
            >
              {/* Main Word Card */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <div className="flex flex-col items-center gap-4 mb-8 pb-8 border-b border-slate-100 text-center">
                  <h2 className="text-5xl font-bold text-slate-900 capitalize">
                    {result.word}
                  </h2>
                  <p className="text-3xl text-indigo-600 font-arabic font-bold" dir="rtl">
                    {result.data.ar}
                  </p>
                  
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pronunciation / النطق</span>
                    {result.data.phonetic && (
                      <span className="text-lg text-slate-600 font-mono bg-slate-100 px-3 py-1 rounded-lg">{result.data.phonetic}</span>
                    )}
                    <button 
                      className="flex items-center gap-2 px-6 py-3 mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full transition-colors font-medium"
                      onClick={() => {
                        if (result.data.audio) {
                          new Audio(result.data.audio).play().catch(e => console.error("Audio play failed", e));
                        } else if ('speechSynthesis' in window) {
                          const utterance = new SpeechSynthesisUtterance(result.word);
                          utterance.lang = 'en-US';
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                    >
                      <Volume2 size={20} />
                      <span>🔊 استماع (زر صوتي)</span>
                    </button>
                  </div>
                </div>

                {/* 1. Definition */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                    التعريف (Definition)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">English</span>
                      <p className="text-slate-700 mb-3">{result.data.definition.en}</p>
                      {result.data.usage.en && <p className="text-slate-600 italic border-l-2 border-slate-300 pl-3">{result.data.usage.en}</p>}
                    </div>
                    <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50" dir="rtl">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 block">العربية</span>
                      <p className="text-indigo-900 font-arabic mb-3">{result.data.definition.ar}</p>
                      {result.data.usage.ar && <p className="text-indigo-800 italic font-arabic border-r-2 border-indigo-300 pr-3">{result.data.usage.ar}</p>}
                    </div>
                  </div>
                </div>

                {/* 2. Usage Guide */}
                {result.data.usage_guide && (
                  <div className="mb-10">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                      دليل الاستخدام (Usage Guide)
                    </h3>
                    <div className="space-y-4">
                      {result.data.usage_guide.meanings.map((m, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                          {/* POS Header */}
                          <div className="bg-indigo-600 text-white px-5 py-3 flex items-center justify-between">
                            <span className="font-bold text-lg">{idx + 1}. {m.pos}</span>
                            <span className="font-arabic text-indigo-200 text-base">{m.pos_ar}: {m.translation}</span>
                          </div>
                          <div className="p-5 space-y-4">
                            {/* Definition */}
                            <p className="text-slate-700 font-arabic text-right border-r-4 border-indigo-300 pr-3">{m.definition}</p>
                            {/* Examples */}
                            {m.examples.length > 0 && (
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">أمثلة / Examples</p>
                                <ul className="space-y-2">
                                  {m.examples.map((ex, i) => (
                                    <li key={i} className="bg-slate-50 rounded-xl p-3 space-y-1">
                                      <p className="text-slate-700 text-sm">{ex.en}</p>
                                      <p className="text-indigo-700 font-arabic text-sm text-right">{ex.ar}</p>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {/* Usage note */}
                            {m.usage_note && (
                              <p className="text-slate-500 text-sm italic font-arabic text-right border-t border-slate-100 pt-3">{m.usage_note}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Why / Where */}
                      {(result.data.usage_guide.why_use || result.data.usage_guide.where_use) && (
                        <div className="grid md:grid-cols-2 gap-4">
                          {result.data.usage_guide.why_use && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">لماذا تستخدم / Why Use</p>
                              <p className="text-amber-900 font-arabic text-right text-sm">{result.data.usage_guide.why_use}</p>
                            </div>
                          )}
                          {result.data.usage_guide.where_use && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">أين تستخدم / Where Used</p>
                              <p className="text-emerald-900 font-arabic text-right text-sm">{result.data.usage_guide.where_use}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Examples */}
                {result.data.examples.length > 0 && (
                  <div className="mb-10">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
                      أمثلة (Examples)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">English</span>
                        <ul className="space-y-3 list-disc list-inside text-slate-700">
                          {result.data.examples.map((ex, i) => (
                            <li key={`en-${i}`}>{ex.en}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50" dir="rtl">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 block">العربية</span>
                        <ul className="space-y-3 list-disc list-inside text-indigo-900 font-arabic">
                          {result.data.examples.map((ex, i) => (
                            <li key={`ar-${i}`}>{ex.ar}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Synonyms & Antonyms */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
                    المرادفات والأضداد (Synonyms & Antonyms)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Synonyms */}
                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
                      <span className="text-sm font-bold text-emerald-600 mb-3 block">Synonyms (مرادفات)</span>
                      {result.data.synonyms.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {result.data.synonyms.map((syn, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRelatedWordClick(syn.en)}
                              className="group flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors text-left border border-emerald-100/50"
                            >
                              <span className="font-medium text-emerald-900 group-hover:text-emerald-700">{syn.en}</span>
                              <span className="text-emerald-600/60 text-sm font-arabic" dir="rtl">{syn.ar}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">None / لا يوجد</p>
                      )}
                    </div>
                    {/* Antonyms */}
                    <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100">
                      <span className="text-sm font-bold text-rose-600 mb-3 block">Antonyms (أضداد)</span>
                      {result.data.antonyms.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {result.data.antonyms.map((ant, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleRelatedWordClick(ant.en)}
                              className="group flex items-center gap-2 px-3 py-2 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors text-left border border-rose-100/50"
                            >
                              <span className="font-medium text-rose-900 group-hover:text-rose-700">{ant.en}</span>
                              <span className="text-rose-600/60 text-sm font-arabic" dir="rtl">{ant.ar}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 italic">None / لا يوجد</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Frequency & Level */}
                {result.data.level_en && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">5</span>
                      درجة الاستخدام في اللغة (Frequency & Level)
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 block">English</span>
                        <ul className="space-y-2 text-slate-700">
                          <li><span className="font-semibold">Frequency:</span> {result.data.freq_en}</li>
                          <li><span className="font-semibold">Level:</span> {result.data.level_en}</li>
                          <li><span className="font-semibold">Used in:</span> {result.data.used_in_en}</li>
                        </ul>
                      </div>
                      <div className="bg-indigo-50/30 p-5 rounded-2xl border border-indigo-50" dir="rtl">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 block">العربية</span>
                        <ul className="space-y-2 text-indigo-900 font-arabic">
                          <li><span className="font-semibold">درجة التكرار:</span> {result.data.freq_ar}</li>
                          <li><span className="font-semibold">المستوى:</span> {result.data.level_ar}</li>
                          <li><span className="font-semibold">تستخدم في:</span> {result.data.used_in_ar}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search History (Always visible if history exists) */}
        {history.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-slate-800">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                  <History size={24} />
                </div>
                <h3 className="text-2xl font-bold font-arabic" dir="rtl">مخزن الكلمات (Saved Words)</h3>
              </div>
              <button 
                onClick={() => saveHistory([])}
                className="text-sm font-medium text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-xl transition-colors font-arabic"
                dir="rtl"
              >
                مسح الكل
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {history.map((item) => (
                <button
                  key={item.en}
                  onClick={() => handleRelatedWordClick(item.en)}
                  className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all text-center group shadow-sm hover:shadow-md"
                >
                  <span className="font-bold text-slate-700 group-hover:text-indigo-700 text-lg mb-1">{item.en}</span>
                  <span className="text-sm text-indigo-600/80 font-arabic" dir="rtl">{item.ar}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
