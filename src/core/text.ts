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

  let best = 0;
  for (const phrase of phrases) {
    const nPhrase = normalize(phrase);
    if (!nPhrase) continue;

    if (nText === nPhrase) {
      best = Math.max(best, 100 + nPhrase.length);
      continue;
    }
    if (containsPhrase(nText, nPhrase)) {
      const wordCount = tokenize(nText).length;
      // A label of a handful of words is still a button; an essay is not.
      const penalty = Math.min(40, Math.max(0, wordCount - tokenize(nPhrase).length) * 4);
      best = Math.max(best, Math.max(1, nPhrase.length + 20 - penalty));
    }
  }
  return best;
}

/** True when any phrase matches at all. */
export function matchesAny(text: string, phrases: readonly string[]): boolean {
  return scorePhrases(text, phrases) > 0;
}
