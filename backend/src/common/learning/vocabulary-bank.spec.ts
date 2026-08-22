import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface VocabularyEntry {
  term: string;
  ipa: string;
  meaning: string;
  example: string;
  exampleMeaning: string;
  rank: number;
  targetBand: 450 | 600 | 700 | 800;
  audioText: string;
  exampleAudioText: string;
}

interface VocabularyBank {
  count: number;
  tiers: Record<'450' | '600' | '700' | '800', number>;
  entries: VocabularyEntry[];
}

const bank = JSON.parse(
  readFileSync(resolve(process.cwd(), 'prisma/data/vocabulary-bank.json'), 'utf8'),
) as VocabularyBank;

describe('vocabulary bank', () => {
  it('contains exactly 5,000 unique ranked terms', () => {
    expect(bank.count).toBe(5000);
    expect(bank.entries).toHaveLength(5000);
    expect(new Set(bank.entries.map((entry) => entry.term)).size).toBe(5000);
    expect(bank.entries.map((entry) => entry.rank)).toEqual(Array.from({ length: 5000 }, (_, index) => index + 1));
  });

  it.each([
    [450, 1500],
    [600, 2500],
    [700, 4000],
    [800, 5000],
  ] as const)('provides %i target with %i cumulative terms', (target, expectedCount) => {
    expect(bank.tiers[String(target) as keyof typeof bank.tiers]).toBe(expectedCount);
    expect(bank.entries.filter((entry) => entry.rank <= expectedCount)).toHaveLength(expectedCount);
  });

  it('has complete learning and speech data for every term', () => {
    for (const entry of bank.entries) {
      expect(entry.term).not.toHaveLength(0);
      expect(entry.ipa).not.toHaveLength(0);
      expect(entry.meaning).not.toHaveLength(0);
      expect(entry.example).toMatch(new RegExp(`\\b${entry.term}\\b`, 'i'));
      expect(entry.exampleMeaning).not.toHaveLength(0);
      expect(entry.audioText).toBe(entry.term);
      expect(entry.exampleAudioText).toBe(entry.example);
    }
  });

  it('keeps the approved department card content', () => {
    expect(bank.entries.find((entry) => entry.term === 'department')).toMatchObject({
      ipa: '/dɪˈpɑːrtmənt/',
      meaning: 'phòng ban',
      example: 'Contact the finance department for approval.',
      exampleMeaning: 'Hãy liên hệ phòng tài chính để được phê duyệt.',
    });
  });
});
