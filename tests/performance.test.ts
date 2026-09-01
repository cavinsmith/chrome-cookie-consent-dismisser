/**
 * The detector runs on every page load and again on every burst of DOM
 * mutations, so a pass has to be cheap. It was not: a shop's home page — a
 * thousand elements matching the deliberately wide "clickable" selector — cost
 * six seconds a pass, because every label was compared against every phrase in
 * five tables. Indexing the tables by first word brought that under a tenth of
 * a second.
 */
import { describe, expect, it } from 'vitest';
import { findCandidates } from '../src/core/detect.js';
import { scorePhrases } from '../src/core/text.js';
import { ACCEPT_PHRASES, REJECT_PHRASES } from '../src/core/phrases.js';

describe('a detection pass over a large page', () => {
  it('stays well under a second for a thousand controls', () => {
    const controls = Array.from(
      { length: 1000 },
      (_, i) => `<button class="btn">Product ${i} — add to basket</button>`,
    ).join('');
    document.body.innerHTML = `
      <main>${controls}</main>
      <div class="cookie-bar" style="position: fixed">
        <p>We use cookies on this site to improve your experience.</p>
        <button id="reject">Reject all</button>
        <button id="accept">Accept all</button>
      </div>`;

    const started = Date.now();
    const candidates = findCandidates(document);
    const elapsed = Date.now() - started;

    // The banner at the end of a long page is still found …
    expect(candidates.map((c) => c.kind)).toContain('reject');
    // … and finding it does not cost the page a visible pause.
    expect(elapsed).toBeLessThan(1000);
  });

  it('scores a single label in microseconds, not milliseconds', () => {
    const started = Date.now();
    for (let i = 0; i < 2000; i++) {
      scorePhrases('Alles accepteren', ACCEPT_PHRASES);
      scorePhrases('Weigeren', REJECT_PHRASES);
    }
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
