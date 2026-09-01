import { describe, expect, it } from 'vitest';
import { containsPhrase, matchesAny, normalize, scorePhrases, tokenize } from '../src/core/text.js';

describe('normalize', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalize('  Accept ALL Cookies!  ')).toBe('accept all cookies');
  });

  it('strips diacritics', () => {
    expect(normalize('Tout accepter')).toBe('tout accepter');
    expect(normalize('J’accepte')).toBe('j accepte');
    expect(normalize('Zgadzam się')).toBe('zgadzam sie');
    expect(normalize('Přijmout vše')).toBe('prijmout vse');
  });

  it('folds German and Nordic special letters', () => {
    expect(normalize('Alle zulässig')).toBe('alle zulassig');
    expect(normalize('Straße')).toBe('strasse');
    expect(normalize('Godkänn alla')).toBe('godkann alla');
    expect(normalize('Kun nødvendige')).toBe('kun nodvendige');
  });

  it('keeps non-Latin scripts intact', () => {
    expect(normalize('Принять все')).toBe('принять все');
    expect(normalize('すべて拒否')).toBe('すべて拒否');
  });

  it('returns an empty string for punctuation-only input', () => {
    expect(normalize('!!! ...')).toBe('');
    expect(tokenize('')).toEqual([]);
  });
});

describe('containsPhrase', () => {
  it('matches whole words only', () => {
    expect(containsPhrase('Please accept all cookies', 'accept all')).toBe(true);
    expect(containsPhrase('unacceptable', 'accept')).toBe(false);
    expect(containsPhrase('acceptance criteria', 'accept')).toBe(false);
  });

  it('matches CJK by substring, since there are no word breaks', () => {
    expect(containsPhrase('この度は同意するをご確認ください', '同意する')).toBe(true);
    expect(containsPhrase('全部拒绝所有cookie', '全部拒绝')).toBe(true);
  });

  it('is false for an empty needle or haystack', () => {
    expect(containsPhrase('', 'accept')).toBe(false);
    expect(containsPhrase('accept', '')).toBe(false);
  });
});

describe('scorePhrases', () => {
  it('ranks an exact label above an incidental mention', () => {
    const exact = scorePhrases('Accept all', ['accept all']);
    const mention = scorePhrases(
      'We use cookies. You can accept all of them or manage each purpose separately below.',
      ['accept all'],
    );
    expect(exact).toBeGreaterThan(mention);
  });

  it('returns 0 when nothing matches', () => {
    expect(scorePhrases('Add to basket', ['accept all', 'reject all'])).toBe(0);
  });

  it('prefers the longer, more specific phrase', () => {
    const specific = scorePhrases('Only necessary cookies', ['only necessary cookies']);
    const generic = scorePhrases('Only necessary cookies', ['necessary']);
    expect(specific).toBeGreaterThan(generic);
  });

  it('matchesAny mirrors scorePhrases', () => {
    expect(matchesAny('Tout refuser', ['tout refuser'])).toBe(true);
    expect(matchesAny('Continue shopping', ['tout refuser'])).toBe(false);
  });
});
