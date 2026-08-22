import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const dictionaryPath = resolve(projectRoot, 'storage/vocabulary-source/dictionary_en_vi.db');
const frequencyPath = resolve(projectRoot, 'storage/frequency-source/google-10000-english-usa-no-swears.txt');
const outputPath = resolve(projectRoot, 'backend/prisma/data/vocabulary-bank.json');
const translationCachePath = resolve(projectRoot, 'storage/vocabulary-translation-cache.json');
const shouldTranslate = process.argv.includes('--translate');

if (!existsSync(dictionaryPath) || !existsSync(frequencyPath)) {
  throw new Error('Thiếu dữ liệu nguồn trong storage. Hãy tải từ điển và frequency list trước.');
}

const importantToeicTerms = [
  'appointment', 'document', 'equipment', 'available', 'submit', 'department', 'agenda', 'attend',
  'postpone', 'proposal', 'confirm', 'participant', 'departure', 'reservation', 'itinerary',
  'accommodation', 'delay', 'destination', 'invoice', 'budget', 'expense', 'refund', 'revenue',
  'estimate', 'campaign', 'advertise', 'survey', 'launch', 'discount', 'target', 'applicant',
  'qualification', 'vacancy', 'orientation', 'promote', 'candidate', 'shipment', 'warehouse',
  'deliver', 'package', 'inventory', 'supplier', 'complaint', 'replace', 'satisfied', 'request',
  'warranty', 'resolve',
];

const manualOverrides = {
  department: {
    ipa: '/dɪˈpɑːrtmənt/',
    meaning: 'phòng ban',
    example: 'Contact the finance department for approval.',
    exampleMeaning: 'Hãy liên hệ phòng tài chính để được phê duyệt.',
    partOfSpeech: 'noun',
  },
};

const frequencyWords = readFileSync(frequencyPath, 'utf8')
  .split(/\r?\n/)
  .map((word) => word.trim().toLowerCase())
  .filter((word) => /^[a-z]{2,}$/.test(word));
const candidates = [...new Set([...importantToeicTerms, ...frequencyWords])];

const database = new DatabaseSync(dictionaryPath, { readOnly: true });
const lookup = database.prepare(`
  SELECT w.word, p.ipa, p.region, d.definition, d.pos, wd.example
  FROM words w
  JOIN word_definitions wd ON w.id = wd.word_id
  JOIN definitions d ON wd.definition_id = d.id
  LEFT JOIN pronunciations p ON w.id = p.word_id
  WHERE w.word = ? AND d.definition_lang = 'vi'
  ORDER BY
    CASE upper(coalesce(p.region, '')) WHEN 'US' THEN 0 WHEN 'USA' THEN 0 ELSE 1 END,
    length(d.definition),
    length(wd.example) DESC
`);

const cleanText = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function targetBandForRank(rank) {
  if (rank <= 1500) return 450;
  if (rank <= 2500) return 600;
  if (rank <= 4000) return 700;
  return 800;
}

function selectEntry(term) {
  const override = manualOverrides[term];
  if (override) return { term, ...override };
  const rows = lookup.all(term);
  const validRows = rows.filter((row) => {
    const definition = cleanText(row.definition);
    const example = cleanText(row.example);
    return row.ipa && definition.length >= 1 && definition.length <= 160
      && example.length >= 12 && example.length <= 220
      && new RegExp(`\\b${term}\\b`, 'i').test(example);
  });
  if (!validRows.length) return null;
  const row = validRows[0];
  const ipa = cleanText(row.ipa);
  return {
    term,
    ipa: ipa.startsWith('/') || ipa.startsWith('[') ? ipa : `/${ipa}/`,
    meaning: cleanText(row.definition),
    example: cleanText(row.example),
    exampleMeaning: '',
    partOfSpeech: cleanText(row.pos) || 'other',
  };
}

const entries = [];
for (const term of candidates) {
  const entry = selectEntry(term);
  if (!entry) continue;
  entries.push({
    ...entry,
    rank: entries.length + 1,
    targetBand: targetBandForRank(entries.length + 1),
    audioText: entry.term,
    exampleAudioText: entry.example,
  });
  if (entries.length % 500 === 0) console.info(`Đã trích xuất ${entries.length}/5000 từ hợp lệ.`);
  if (entries.length === 5000) break;
}
database.close();

if (entries.length < 5000) {
  throw new Error(`Chỉ trích xuất được ${entries.length}/5000 từ hợp lệ.`);
}

if (shouldTranslate) {
  const translationCache = existsSync(translationCachePath)
    ? JSON.parse(readFileSync(translationCachePath, 'utf8'))
    : {};
  const pending = entries.filter((entry) => !entry.exampleMeaning && !translationCache[entry.example]);
  if (pending.length) {
    const { pipeline } = await import('@huggingface/transformers');
    const translator = await pipeline('translation', 'Xenova/opus-mt-en-vi', {
      dtype: 'q8',
      cache_dir: resolve(projectRoot, 'storage/model-cache'),
      progress_callback: (progress) => {
        if (progress.status === 'progress' && progress.progress) {
          console.info(`Tải mô hình ${Math.round(progress.progress)}% · ${progress.file ?? ''}`);
        }
      },
    });
    const batchSize = 16;
    for (let index = 0; index < pending.length; index += batchSize) {
      const batch = pending.slice(index, index + batchSize);
      const results = await translator(batch.map((entry) => entry.example), { max_new_tokens: 160 });
      results.forEach((result, resultIndex) => {
        translationCache[batch[resultIndex].example] = cleanText(result.translation_text ?? result.generated_text);
      });
      if (index % 80 === 0 || index + batchSize >= pending.length) {
        mkdirSync(dirname(translationCachePath), { recursive: true });
        writeFileSync(translationCachePath, JSON.stringify(translationCache, null, 2), 'utf8');
        console.info(`Đã dịch ${Math.min(index + batchSize, pending.length)}/${pending.length} câu.`);
      }
    }
  }
  for (const entry of entries) {
    entry.exampleMeaning ||= translationCache[entry.example] ?? '';
  }
}

const missingTranslations = entries.filter((entry) => !entry.exampleMeaning).length;
if (missingTranslations) {
  throw new Error(`Còn ${missingTranslations} câu chưa có bản dịch. Chạy lại với --translate.`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify({
  version: 1,
  count: entries.length,
  tiers: { 450: 1500, 600: 2500, 700: 4000, 800: 5000 },
  sources: [
    'https://github.com/skypediacode/english-vietnamese-dictionary',
    'https://github.com/first20hours/google-10000-english',
    'https://huggingface.co/Helsinki-NLP/opus-mt-en-vi',
  ],
  entries,
}, null, 2)}\n`, 'utf8');
console.info(`Đã tạo ${entries.length} từ, không trùng term, tại ${outputPath}.`);
