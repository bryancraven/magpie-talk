/**
 * Syllable Parser
 *
 * Splits text into syllables for prolonged speech practice.
 * Uses regex-based syllabification (Hypher library dependency removed for simplicity).
 *
 * Preserved from original app.js - this is critical logic.
 */

export interface WordInfo {
  word: string;
  following: string;
  startIndex: number;
  endIndex: number;
  syllables: string[];
}

export interface ParseResult {
  syllables: string[];
  wordMap: WordInfo[];
}

/**
 * Apply original case from the source word to lowercase syllables
 */
function applyOriginalCase(originalWord: string, syllables: string[]): string[] {
  const casePreservedSyllables: string[] = [];
  let charIndex = 0;

  for (const syllable of syllables) {
    let preservedSyllable = '';

    for (let i = 0; i < syllable.length; i++) {
      if (charIndex < originalWord.length) {
        preservedSyllable += originalWord[charIndex];
        charIndex++;
      }
    }

    casePreservedSyllables.push(preservedSyllable);
  }

  return casePreservedSyllables;
}

/**
 * Fallback regex-based syllabification
 * Less accurate than Hypher but works without dependencies
 */
function fallbackSyllabify(word: string): string[] {
  const pattern = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi;
  const matches = word.match(pattern);
  return matches ? matches : [word];
}

/**
 * Syllabify a single word
 */
function syllabifyWord(word: string): string[] {
  const lowerWord = word.toLowerCase();
  const syllables = fallbackSyllabify(lowerWord);
  return applyOriginalCase(word, syllables);
}

/**
 * Parse text into syllables with word mapping
 *
 * @param text - The text to parse
 * @returns ParseResult containing syllables array and word mapping
 */
export function splitText(text: string): ParseResult {
  // Clean up repeated punctuation marks in the text first
  const cleanedText = text
    .replace(/([,;!?])\1+/g, '$1')  // Replace multiple commas/semicolons/etc with single
    .replace(/([—-])\1+/g, '$1')     // Replace multiple dashes with single
    .replace(/(['"])\1+/g, '$1');    // Replace multiple quotes with single

  // Match words with any following punctuation/spaces
  const wordRegex = /(\w+)([^a-zA-Z0-9]*)/g;
  const syllables: string[] = [];
  const wordMap: WordInfo[] = [];
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(cleanedText)) !== null) {
    const word = match[1];
    const following = match[2];

    if (!word) continue;

    const wordStart = syllables.length;

    let wordSyllables: string[];

    // Check if word is a number - split digits individually
    if (/^\d+$/.test(word)) {
      wordSyllables = word.split('');
    } else if (/^[A-Z]{2,}$/.test(word)) {
      // Split acronyms (all caps with 2+ letters) into individual letters
      wordSyllables = word.split('');
    } else {
      wordSyllables = syllabifyWord(word);
    }

    syllables.push(...wordSyllables);
    wordMap.push({
      word,
      following,
      startIndex: wordStart,
      endIndex: wordStart + wordSyllables.length - 1,
      syllables: wordSyllables,
    });
  }

  return { syllables, wordMap };
}

/**
 * Calculate estimated reading time based on syllable count and pace
 *
 * @param syllableCount - Number of syllables
 * @param msPerSyllable - Milliseconds per syllable
 * @returns Estimated time in milliseconds
 */
export function calculateReadingTime(syllableCount: number, msPerSyllable: number): number {
  return syllableCount * msPerSyllable;
}

/**
 * Format time in milliseconds to M:SS or MM:SS
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
