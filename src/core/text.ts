/**
 * Text normalisation and phrase matching used to classify banner buttons.
 *
 * Everything here is pure and DOM-free so it can be unit tested directly.
 */

/** Latin combining marks only — CJK/Indic marks must survive normalisation. */
const LATIN_COMBINING = /[\u0300-\u036f]/g;
const NON_WORD = /[^\p{L}\p{N}\p{M}]+/gu;
/** Scripts that are not word-separated and therefore matched by substring. */
const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;

/**
 * Lowercases, strips diacritics and collapses every non-alphanumeric run to a
 * single space. `"Tout accepter !"` → `"tout accepter"`.
 *
 * German umlauts are folded the same way the phrase table spells them
 * (`ä`→`a`, `ß`→`ss`) so `"Alle zulassen"` and `"Alle zulässig"` normalise
 * consistently.
 *
 * Only Latin combining marks are dropped, and the string is recomposed
 * afterwards: decomposing `べ` and discarding its dakuten would corrupt
 * Japanese, and the same applies to Indic and Thai vowel signs.
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(LATIN_COMBINING, '')
    .normalize('NFC')
    .replace(/ß/g, 'ss')
    .replace(/[øØ]/g, 'o')
    .replace(/[åÅ]/g, 'a')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[đĐ]/g, 'd')
    .replace(/[łŁ]/g, 'l')
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .trim();
}

/** Phrases this short are matched almost exactly; see `scorePhrases`. */
const SHORT_PHRASE_LEN = 3;
/** …meaning the label may be at most this many words long. */
const SHORT_PHRASE_CONTEXT = 2;

/** Normalised text split into word tokens. */
export function tokenize(normalized: string): string[] {
  return normalized ? normalized.split(' ') : [];
}

function isCjk(phrase: string): boolean {
  return CJK.test(phrase);
}

/**
 * True when `phrase` occurs in `text` as a whole-word run (or as a plain
 * substring for CJK, which has no word separators).
 */
export function containsPhrase(text: string, phrase: string): boolean {
  const nText = normalize(text);
  const nPhrase = normalize(phrase);
  if (!nText || !nPhrase) return false;

  if (isCjk(nPhrase)) {
    return nText.replace(/ /g, '').includes(nPhrase.replace(/ /g, ''));
  }

  const words = tokenize(nText);
  const needle = tokenize(nPhrase);
  if (needle.length === 0 || needle.length > words.length) return false;

  outer: for (let i = 0; i + needle.length <= words.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (words[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

interface IndexedPhrase {
  /** Normalised phrase. */
  text: string;
  tokens: string[];
}

interface PhraseIndex {
  exact: Set<string>;
  /** Phrases grouped by their first word, so a text only tests what can match. */
  byFirstWord: Map<string, IndexedPhrase[]>;
  /** Phrases in scripts without word separators, matched by substring. */
  cjk: IndexedPhrase[];
}

/**
 * Phrase tables are module constants, so their index is built once and kept
 * for the life of the page. Without it, every button label on a page was
 * compared against every phrase in five tables: a single detection pass over a
 * shop's home page cost six seconds.
 */
const indexes = new WeakMap<readonly string[], PhraseIndex>();

function indexOf(phrases: readonly string[]): PhraseIndex {
  const cached = indexes.get(phrases);
  if (cached) return cached;

  const index: PhraseIndex = { exact: new Set(), byFirstWord: new Map(), cjk: [] };
  for (const phrase of phrases) {
    const text = normalize(phrase);
    if (!text) continue;
    index.exact.add(text);

    const entry: IndexedPhrase = { text, tokens: tokenize(text) };
    if (isCjk(text)) {
      index.cjk.push(entry);
      continue;
    }
    const first = entry.tokens[0]!;
    const bucket = index.byFirstWord.get(first);
    if (bucket) bucket.push(entry);
    else index.byFirstWord.set(first, [entry]);
  }

  indexes.set(phrases, index);
  return index;
}

/**
 * Scores how strongly `text` matches any phrase in `phrases`.
 *
 * - exact normalised equality scores highest (100 + length),
 * - a whole-word occurrence scores by phrase length,
 * - longer texts are penalised so a paragraph that merely mentions "accept"
 *   never outranks a two-word button label.
 *
 * Returns `0` when nothing matches.
 */
export function scorePhrases(text: string, phrases: readonly string[]): number {
  const nText = normalize(text);
  if (!nText) return 0;

  const index = indexOf(phrases);
  let best = index.exact.has(nText) ? 100 + nText.length : 0;

  const words = tokenize(nText);
  const shortAllowed = words.length <= SHORT_PHRASE_CONTEXT;

  for (let i = 0; i < words.length; i++) {
    const bucket = index.byFirstWord.get(words[i]!);
    if (!bucket) continue;

    for (const entry of bucket) {
      if (entry.text === nText) continue; // already scored as an exact match
      // A two- or three-letter word ("no", "ja", "ne") means what the table
      // says only when it is essentially the whole label. Inside a sentence it
      // is almost always another language's ordinary word.
      if (entry.text.length <= SHORT_PHRASE_LEN && !shortAllowed) continue;
      if (i + entry.tokens.length > words.length) continue;

      let matched = true;
      for (let j = 1; j < entry.tokens.length; j++) {
        if (words[i + j] !== entry.tokens[j]) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;

      // A label of a handful of words is still a button; an essay is not.
      const penalty = Math.min(40, Math.max(0, words.length - entry.tokens.length) * 4);
      best = Math.max(best, Math.max(1, entry.text.length + 20 - penalty));
    }
  }

  if (index.cjk.length > 0) {
    const packed = nText.replace(/ /g, '');
    for (const entry of index.cjk) {
      const needle = entry.text.replace(/ /g, '');
      if (!needle || entry.text === nText || !packed.includes(needle)) continue;
      const penalty = Math.min(40, Math.max(0, words.length - entry.tokens.length) * 4);
      best = Math.max(best, Math.max(1, entry.text.length + 20 - penalty));
    }
  }

  return best;
}

/**
 * How many times any of `phrases` occurs in `text`, counted as whole-word runs
 * (substrings for CJK) and capped at `max` so a long document costs no more
 * than a short one. Used to tell a block that is *about* cookies from one that
 * merely mentions them once.
 */
export function countPhraseHits(text: string, phrases: readonly string[], max = 10): number {
  const nText = normalize(text);
  if (!nText || max <= 0) return 0;

  const words = tokenize(nText);
  const needles: string[][] = [];
  let hits = 0;

  for (const phrase of phrases) {
    const nPhrase = normalize(phrase);
    if (!nPhrase) continue;
    if (isCjk(nPhrase)) {
      const haystack = nText.replace(/ /g, '');
      const needle = nPhrase.replace(/ /g, '');
      hits += needle ? haystack.split(needle).length - 1 : 0;
      if (hits >= max) return max;
      continue;
    }
    needles.push(tokenize(nPhrase));
  }

  outer: for (let i = 0; i < words.length; i++) {
    for (const needle of needles) {
      if (i + needle.length > words.length) continue;
      let matched = true;
      for (let j = 0; j < needle.length; j++) {
        if (words[i + j] !== needle[j]) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;
      hits++;
      if (hits >= max) break outer;
      // Do not count the same run twice under a longer phrase.
      i += needle.length - 1;
      continue outer;
    }
  }
  return Math.min(hits, max);
}

/** True when any phrase matches at all. */
export function matchesAny(text: string, phrases: readonly string[]): boolean {
  return scorePhrases(text, phrases) > 0;
}
