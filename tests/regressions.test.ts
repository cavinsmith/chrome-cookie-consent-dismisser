/**
 * Cases where an over-eager click or hide would actively damage the page.
 * These are the failure modes that matter more than a missed banner.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentEngine } from '../src/core/engine.js';
import { trackClicks } from './helpers.js';

const REJECT = {
  mode: 'reject' as const,
  fallbackToOpposite: false,
  hideIfNoButton: true,
  unblockScroll: true,
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
});

describe('false positives', () => {
  it("does not hide a site's own cookie policy page", () => {
    document.body.innerHTML = `
      <main id="cookie-policy">
        <h1>Cookie policy</h1>
        <p>This page explains which cookies we use and how you can control them.
           We use strictly necessary cookies as well as analytics cookies.</p>
      </main>`;

    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
    expect(document.getElementById('cookie-policy')!.style.display).toBe('');
  });

  it('does not press "I agree" in a terms-of-service checkout step', () => {
    document.body.innerHTML = `
      <form id="checkout">
        <p>Confirm that the delivery address and payment method are correct.</p>
        <button id="agree">I agree</button>
      </form>`;

    const tracker = trackClicks();
    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
    expect(tracker.clicked).toEqual([]);
    tracker.stop();
  });

  it('does not press "Accept" on a privacy-policy page with no banner', () => {
    document.body.innerHTML = `
      <article>
        <h1>Privacy policy</h1>
        <p>We process personal data in line with the GDPR.</p>
      </article>
      <nav><a href="/jobs" id="jobs">Accepting applications</a></nav>`;

    const tracker = trackClicks();
    new ConsentEngine(document, { ...REJECT, mode: 'accept' }).run();
    expect(tracker.clicked).not.toContain('jobs');
    tracker.stop();
  });

  it('does not switch off a toggle in a non-consent settings panel', () => {
    document.body.innerHTML = `
      <div class="account-settings" style="position:fixed">
        <h2>Email notifications</h2>
        <label><input type="checkbox" id="newsletter" checked /> Weekly newsletter</label>
        <button id="save">Save settings</button>
      </div>`;

    new ConsentEngine(document, REJECT).run();
    expect((document.getElementById('newsletter') as HTMLInputElement).checked).toBe(true);
  });
});

describe('multi-banner pages', () => {
  it('handles a second banner that appears after the first is dismissed', () => {
    document.body.innerHTML = `
      <div id="first" style="position:fixed">
        <p>We use cookies for analytics.</p>
        <button id="first-reject">Reject all</button>
      </div>`;

    const engine = new ConsentEngine(document, REJECT);
    expect(engine.run()).toMatchObject({ action: 'clicked' });
    document.getElementById('first')!.remove();

    document.body.innerHTML += `
      <div id="second" class="cookie-consent" style="position:fixed">
        <p>We use cookies and similar technologies. Manage your preferences below.</p>
        <button id="second-reject">Decline all</button>
      </div>`;

    const tracker = trackClicks();
    expect(engine.run()).toMatchObject({ action: 'clicked' });
    expect(tracker.clicked).toContain('second-reject');
    tracker.stop();
  });
});

describe('resilience', () => {
  it('survives the banner tearing itself down during the click', () => {
    document.body.innerHTML = `
      <div id="banner" style="position:fixed">
        <p>We use cookies on this site.</p>
        <button id="reject">Reject all</button>
      </div>`;
    // Real CMPs remove their own DOM from inside the handler.
    document.getElementById('reject')!.addEventListener('click', () => {
      document.getElementById('banner')!.remove();
    });

    const engine = new ConsentEngine(document, REJECT);
    expect(engine.run()).toMatchObject({ action: 'clicked' });
    expect(document.getElementById('banner')).toBeNull();
    expect(() => engine.run()).not.toThrow();
  });

  it('tolerates a rule selector that the browser cannot parse', () => {
    // `queryAll` swallows selector errors so one bad rule cannot abort the pass.
    document.body.innerHTML = `
      <div id="CybotCookiebotDialog">
        <p>This site uses cookies.</p>
        <button id="CybotCookiebotDialogBodyButtonDecline">Deny</button>
      </div>`;
    const original = Document.prototype.querySelectorAll;
    let calls = 0;
    Document.prototype.querySelectorAll = function (this: Document, selector: string) {
      if (++calls === 2) throw new SyntaxError('bad selector');
      return original.call(this, selector);
    } as typeof original;

    try {
      expect(new ConsentEngine(document, REJECT).run().action).toBe('clicked');
    } finally {
      Document.prototype.querySelectorAll = original;
    }
  });

  it('ignores a banner detached between detection and the next pass', () => {
    document.body.innerHTML = `
      <div id="banner" style="position:fixed">
        <p>We use cookies for advertising.</p>
        <button id="reject">Reject all</button>
      </div>`;

    const engine = new ConsentEngine(document, REJECT);
    document.getElementById('banner')!.remove();
    expect(engine.run().action).toBe('none');
  });
});
