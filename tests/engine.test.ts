import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentEngine, type EngineOptions } from '../src/core/engine.js';
import { ONETRUST_HTML, genericBanner, mountHtml, trackClicks } from './helpers.js';

const OPTS: EngineOptions = {
  mode: 'reject',
  fallbackToOpposite: false,
  hideIfNoButton: true,
  unblockScroll: true,
};

function engine(overrides: Partial<EngineOptions> = {}): ConsentEngine {
  // `hideGraceMs: 0` keeps these single-pass: in a browser the engine waits a
  // beat before hiding a buttonless banner, in case the CMP is still painting
  // the button it should press instead. That wait has its own test below.
  return new ConsentEngine(document, { hideGraceMs: 0, ...OPTS, ...overrides });
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});

describe('rule-driven handling', () => {
  it('presses OneTrust "Reject All" in reject mode', () => {
    mountHtml(ONETRUST_HTML);
    const tracker = trackClicks();

    const result = engine({ mode: 'reject' }).run();

    expect(result).toMatchObject({ action: 'clicked', ruleId: 'onetrust' });
    expect(tracker.clicked).toContain('onetrust-reject-all-handler');
    expect(tracker.clicked).not.toContain('onetrust-accept-btn-handler');
    tracker.stop();
  });

  it('presses OneTrust "Accept All" in accept mode', () => {
    mountHtml(ONETRUST_HTML);
    const tracker = trackClicks();

    const result = engine({ mode: 'accept' }).run();

    expect(result).toMatchObject({ action: 'clicked', ruleId: 'onetrust' });
    expect(tracker.clicked).toContain('onetrust-accept-btn-handler');
    tracker.stop();
  });

  it('opens the preferences pane when the reject button is one level down', () => {
    mountHtml(`
      <div id="onetrust-consent-sdk">
        <div id="onetrust-banner-sdk">
          <p>We use cookies.</p>
          <button id="onetrust-pc-btn-handler">Cookie Settings</button>
          <button id="onetrust-accept-btn-handler">Accept All Cookies</button>
        </div>
      </div>`);

    const instance = engine({ mode: 'reject' });
    const first = instance.run();
    expect(first).toMatchObject({ action: 'clicked', ruleId: 'onetrust', followUp: true });

    // The pane mounts and now offers a real reject control.
    const pane = document.createElement('button');
    pane.className = 'ot-pc-refuse-all-handler';
    pane.textContent = 'Reject All';
    document.getElementById('onetrust-consent-sdk')!.append(pane);

    const tracker = trackClicks();
    expect(instance.run()).toMatchObject({ action: 'clicked', ruleId: 'onetrust' });
    expect(tracker.clicked).toContain('ot-pc-refuse-all-handler');
    tracker.stop();
  });

  it('only tries the preferences pane once', () => {
    mountHtml(`
      <div id="onetrust-consent-sdk">
        <div id="onetrust-banner-sdk">
          <p>We use cookies.</p>
          <button id="onetrust-pc-btn-handler">Cookie Settings</button>
        </div>
      </div>`);

    const instance = engine({ mode: 'reject' });
    expect(instance.run().action).toBe('clicked');
    expect(instance.run().action).not.toBe('clicked');
  });

  it('falls back to the rule\'s accept button only when allowed', () => {
    const html = `
      <div id="onetrust-consent-sdk">
        <div id="onetrust-banner-sdk">
          <p>We use cookies.</p>
          <button id="onetrust-accept-btn-handler">Accept All Cookies</button>
        </div>
      </div>`;

    document.body.innerHTML = html;
    expect(engine({ mode: 'reject', hideIfNoButton: false }).run().action).toBe('none');

    document.body.innerHTML = html;
    const tracker = trackClicks();
    expect(
      engine({ mode: 'reject', fallbackToOpposite: true }).run(),
    ).toMatchObject({ action: 'clicked', ruleId: 'onetrust' });
    expect(tracker.clicked).toContain('onetrust-accept-btn-handler');
    tracker.stop();
  });

  it('skips a rule whose banner is not visible', () => {
    mountHtml(`
      <div id="onetrust-consent-sdk" style="display:none">
        <div id="onetrust-banner-sdk">
          <button id="onetrust-reject-all-handler">Reject All</button>
        </div>
      </div>`);
    expect(engine().run().action).toBe('none');
  });

  it('handles Cookiebot, Didomi and CookieYes markup', () => {
    const cases = [
      {
        html: `<div id="CybotCookiebotDialog"><p>This site uses cookies.</p>
               <button id="CybotCookiebotDialogBodyButtonDecline">Deny</button></div>`,
        clicked: 'CybotCookiebotDialogBodyButtonDecline',
        ruleId: 'cookiebot',
      },
      {
        html: `<div id="didomi-notice"><p>We and our partners use cookies.</p>
               <button id="didomi-notice-disagree-button">Disagree</button></div>`,
        clicked: 'didomi-notice-disagree-button',
        ruleId: 'didomi',
      },
      {
        html: `<div class="cky-consent-container"><p>Cookie consent.</p>
               <button class="cky-btn-reject">Reject All</button></div>`,
        clicked: 'cky-btn-reject',
        ruleId: 'cookieyes',
      },
    ];

    for (const testCase of cases) {
      document.body.innerHTML = testCase.html;
      const tracker = trackClicks();
      expect(engine().run(), testCase.ruleId).toMatchObject({
        action: 'clicked',
        ruleId: testCase.ruleId,
      });
      expect(tracker.clicked).toContain(testCase.clicked);
      tracker.stop();
    }
  });
});

describe('heuristic handling', () => {
  it('rejects a generic English banner', () => {
    mountHtml(
      genericBanner({
        text: 'We use cookies to personalise content and ads.',
        accept: 'Accept all',
        reject: 'Reject all',
      }),
    );
    const tracker = trackClicks();

    expect(engine({ mode: 'reject' }).run()).toMatchObject({
      action: 'clicked',
      ruleId: 'heuristic',
    });
    expect(tracker.clicked).toContain('btn-reject');
    tracker.stop();
  });

  it('rejects a Russian banner', () => {
    mountHtml(
      genericBanner({
        text: 'Мы используем файлы cookie для улучшения работы сайта.',
        accept: 'Принять все',
        reject: 'Только необходимые',
      }),
    );
    const tracker = trackClicks();
    expect(engine({ mode: 'reject' }).run().action).toBe('clicked');
    expect(tracker.clicked).toContain('btn-reject');
    tracker.stop();
  });

  it('accepts a German banner in accept mode', () => {
    mountHtml(
      genericBanner({
        text: 'Wir verwenden Cookies, um Inhalte zu personalisieren.',
        accept: 'Alle akzeptieren',
        reject: 'Nur notwendige',
      }),
    );
    const tracker = trackClicks();
    expect(engine({ mode: 'accept' }).run().action).toBe('clicked');
    expect(tracker.clicked).toContain('btn-accept');
    tracker.stop();
  });

  it('leaves the banner alone when only accept exists and fallback is off', () => {
    mountHtml(
      genericBanner({
        text: 'We use cookies on this website.',
        accept: 'Accept all',
      }),
    );
    const tracker = trackClicks();
    const result = engine({ mode: 'reject', hideIfNoButton: false }).run();
    expect(result.action).toBe('none');
    expect(tracker.clicked).not.toContain('btn-accept');
    tracker.stop();
  });

  it('falls back to accept when explicitly allowed', () => {
    mountHtml(
      genericBanner({
        text: 'We use cookies on this website.',
        accept: 'Accept all',
      }),
    );
    const tracker = trackClicks();
    expect(
      engine({ mode: 'reject', fallbackToOpposite: true, hideIfNoButton: false }).run(),
    ).toMatchObject({ action: 'clicked' });
    expect(tracker.clicked).toContain('btn-accept');
    tracker.stop();
  });

  it('opens a generic preferences pane when reject is hidden behind it', () => {
    mountHtml(
      genericBanner({
        text: 'We use cookies to personalise content.',
        accept: 'Accept all',
        settings: 'Cookie settings',
      }),
    );

    const instance = engine({ mode: 'reject' });
    const tracker = trackClicks();
    expect(instance.run()).toMatchObject({ action: 'clicked', followUp: true });
    expect(tracker.clicked).toContain('btn-settings');
    tracker.stop();

    // The pane is now open and offers a real reject control.
    document.querySelector('.notice-bar')!.insertAdjacentHTML(
      'beforeend',
      '<button id="btn-deny">Reject all</button>',
    );
    const second = trackClicks();
    expect(instance.run()).toMatchObject({ action: 'clicked' });
    expect(second.clicked).toContain('btn-deny');
    second.stop();
  });

  it('never clicks an accept button that is not in a consent context', () => {
    mountHtml(`
      <div class="checkout">
        <p>Confirm your delivery address before payment.</p>
        <button id="btn-accept">Accept</button>
      </div>`);
    const tracker = trackClicks();
    expect(engine({ mode: 'accept' }).run().action).toBe('none');
    expect(tracker.clicked).toEqual([]);
    tracker.stop();
  });

  it('works inside an open shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    host.attachShadow({ mode: 'open' }).innerHTML = `
      <div class="consent-shell">
        <p>We use cookies and similar tracking technologies.</p>
        <button id="shadow-reject">Reject all</button>
      </div>`;

    let clicked = false;
    host.shadowRoot!.getElementById('shadow-reject')!.addEventListener('click', () => {
      clicked = true;
    });

    expect(engine({ mode: 'reject' }).run().action).toBe('clicked');
    expect(clicked).toBe(true);
  });
});

describe('preference-toggle fallback', () => {
  it('switches optional categories off and saves, leaving necessary alone', () => {
    mountHtml(`
      <div class="cookie-prefs" style="position:fixed">
        <p>Manage your cookie preferences for this site.</p>
        <label><input type="checkbox" id="t-necessary" checked disabled /> Strictly necessary</label>
        <label><input type="checkbox" id="t-analytics" checked /> Analytics</label>
        <label><input type="checkbox" id="t-ads" checked /> Advertising</label>
        <button id="btn-save">Save preferences</button>
      </div>`);

    const result = engine({ mode: 'reject' }).run();

    expect(result).toMatchObject({ action: 'clicked' });
    expect((document.getElementById('t-analytics') as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById('t-ads') as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById('t-necessary') as HTMLInputElement).checked).toBe(true);
  });

  it('leaves a switch labelled "always active" untouched', () => {
    mountHtml(`
      <div class="cookie-prefs">
        <p>Cookie preferences and privacy settings.</p>
        <div><span role="switch" aria-checked="true" aria-label="Essential — always active"></span></div>
        <div><span role="switch" aria-checked="true" aria-label="Marketing" id="sw-marketing"></span></div>
        <button id="btn-save">Save settings</button>
      </div>`);

    const tracker = trackClicks();
    engine({ mode: 'reject' }).run();
    expect(tracker.clicked).toContain('sw-marketing');
    expect(tracker.clicked).toContain('btn-save');
    tracker.stop();
  });

  it('does not use the toggle path in accept mode', () => {
    mountHtml(`
      <div class="cookie-prefs">
        <p>Cookie preferences for this website.</p>
        <label><input type="checkbox" id="t-ads" checked /> Advertising</label>
        <button id="btn-save">Save preferences</button>
      </div>`);
    engine({ mode: 'accept' }).run();
    expect((document.getElementById('t-ads') as HTMLInputElement).checked).toBe(true);
  });
});

describe('cosmetic hiding', () => {
  it('hides a consent block that offers no button', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed"><p>We use cookies and similar technologies on this site.</p></div>`);

    const result = engine({ hideIfNoButton: true }).run();

    expect(result.action).toBe('hidden');
    expect(document.getElementById('cookie-wall')!.style.display).toBe('none');
  });

  it('waits before hiding, in case the banner is still painting its buttons', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed"><p>We use cookies and similar technologies on this site.</p></div>`);
    const instance = new ConsentEngine(document, { ...OPTS, hideIfNoButton: true, hideGraceMs: 20 });

    // First sight: leave it alone, a reject button may still arrive.
    expect(instance.run().action).toBe('none');
    expect(document.getElementById('cookie-wall')!.style.display).toBe('');

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(instance.run().action).toBe('hidden');
        expect(document.getElementById('cookie-wall')!.style.display).toBe('none');
        resolve();
      }, 30);
    });
  });

  it('presses a button that arrives during the wait instead of hiding', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed"><p>We use cookies and similar technologies on this site.</p></div>`);
    const instance = new ConsentEngine(document, { ...OPTS, hideIfNoButton: true, hideGraceMs: 20 });
    instance.run();

    document.getElementById('cookie-wall')!.insertAdjacentHTML(
      'beforeend',
      '<button id="reject">Reject all cookies</button>',
    );

    const result = instance.run();
    expect(result.action).toBe('clicked');
    expect(document.getElementById('cookie-wall')!.style.display).toBe('');
  });

  it('does nothing when hiding is disabled', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed"><p>We use cookies and similar technologies on this site.</p></div>`);
    expect(engine({ hideIfNoButton: false }).run().action).toBe('none');
  });

  it('hides each block only once', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed"><p>We use cookies and similar technologies on this site.</p></div>`);
    const instance = engine({ hideIfNoButton: true });
    expect(instance.run().action).toBe('hidden');
    expect(instance.run().action).toBe('none');
  });
});

describe('sweep', () => {
  it('hides leftover overlays and restores scrolling', () => {
    mountHtml(ONETRUST_HTML);
    document.body.style.overflow = 'hidden';

    const instance = engine({ mode: 'reject' });
    expect(instance.run().action).toBe('clicked');
    expect(instance.sweep()).toBe(true);

    expect(document.getElementById('onetrust-consent-sdk')!.style.display).toBe('none');
    expect(document.body.style.overflow).toBe('auto');
  });

  it('is a no-op when no rule has fired and nothing is locked', () => {
    mountHtml('<p>Ordinary page.</p>');
    expect(engine().sweep()).toBe(false);
  });
});

describe('safety limits', () => {
  it('stops after the interaction budget is spent', () => {
    const instance = engine({ mode: 'reject', maxActions: 1 });
    mountHtml(
      genericBanner({ text: 'We use cookies here.', accept: 'Accept all', reject: 'Reject all' }),
    );
    expect(instance.run().action).toBe('clicked');
    expect(instance.exhausted).toBe(true);
    expect(instance.run().action).toBe('none');
  });

  it('never clicks the same element twice', () => {
    mountHtml(
      genericBanner({ text: 'We use cookies here.', accept: 'Accept all', reject: 'Reject all' }),
    );
    const instance = engine({ mode: 'reject' });
    expect(instance.run().action).toBe('clicked');
    const second = instance.run();
    expect(second.label).not.toBe('Reject all');
  });

  it('does not click anything in dry-run mode', () => {
    mountHtml(ONETRUST_HTML);
    const tracker = trackClicks();
    expect(engine({ dryRun: true }).run()).toMatchObject({ action: 'clicked' });
    expect(tracker.clicked).toEqual([]);
    tracker.stop();
  });
});
