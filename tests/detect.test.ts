import { beforeEach, describe, expect, it } from 'vitest';
import { classifyLabel, findCandidates, findOrphanBanners, hasConsentContext } from '../src/core/detect.js';
import { genericBanner, mountHtml } from './helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('classifyLabel', () => {
  it('classifies accept labels across languages', () => {
    for (const label of [
      'Accept all',
      'Принять все',
      'Alle akzeptieren',
      'Tout accepter',
      'Aceptar todo',
      'Accetta tutto',
      'Alles accepteren',
      'Zaakceptuj wszystkie',
      'Tümünü kabul et',
      'すべて同意',
      '接受全部',
      '모두 동의',
    ]) {
      expect(classifyLabel(label)?.kind, label).toBe('accept');
    }
  });

  it('classifies reject labels across languages', () => {
    for (const label of [
      'Reject all',
      'Only necessary cookies',
      'Отклонить все',
      'Только необходимые',
      'Alle ablehnen',
      'Nur notwendige Cookies',
      'Tout refuser',
      'Rechazar todo',
      'Rifiuta tutto',
      'Alles weigeren',
      'Odrzuć wszystkie',
      'Tümünü reddet',
      'すべて拒否',
      '全部拒绝',
      '모두 거부',
    ]) {
      expect(classifyLabel(label)?.kind, label).toBe('reject');
    }
  });

  it('files reject-shaped labels that embed accept vocabulary as reject', () => {
    expect(classifyLabel('Continue without accepting')?.kind).toBe('reject');
    expect(classifyLabel('Не принимать')?.kind).toBe('reject');
    expect(classifyLabel('Continuer sans accepter')?.kind).toBe('reject');
    expect(classifyLabel('Weiter ohne Einwilligung')?.kind).toBe('reject');
    expect(classifyLabel('Accept only necessary')?.kind).toBe('reject');
  });

  it('recognises settings and save labels', () => {
    expect(classifyLabel('Cookie settings')?.kind).toBe('settings');
    expect(classifyLabel('Manage preferences')?.kind).toBe('settings');
    expect(classifyLabel('Save preferences')?.kind).toBe('save');
    expect(classifyLabel('Сохранить настройки')?.kind).toBe('save');
  });

  it('ignores unrelated labels', () => {
    for (const label of ['Add to cart', 'Sign in', 'Read more about our history', 'Submit review']) {
      expect(classifyLabel(label), label).toBeNull();
    }
  });

  it('ignores text too long to be a button', () => {
    expect(classifyLabel('Accept all '.repeat(30))).toBeNull();
  });
});

describe('hasConsentContext', () => {
  it('recognises consent wording in several languages', () => {
    expect(hasConsentContext('We use cookies to improve your experience')).toBe(true);
    expect(hasConsentContext('Мы используем файлы cookie')).toBe(true);
    expect(hasConsentContext('Wir verwenden Cookies für den Datenschutz')).toBe(true);
    expect(hasConsentContext('当サイトはクッキーを使用します')).toBe(true);
  });

  it('rejects unrelated copy', () => {
    expect(hasConsentContext('Free shipping on orders over 50 euro')).toBe(false);
  });
});

describe('findCandidates', () => {
  it('finds accept and reject buttons in a generic banner', () => {
    mountHtml(
      genericBanner({
        text: 'This website uses cookies to ensure you get the best experience.',
        accept: 'Accept all',
        reject: 'Reject all',
        settings: 'Cookie settings',
      }),
    );

    const kinds = findCandidates(document).map((c) => c.kind);
    expect(kinds).toContain('accept');
    expect(kinds).toContain('reject');
    expect(kinds).toContain('settings');
  });

  it('does not fire on an accept button outside a consent context', () => {
    mountHtml(`
      <form id="terms">
        <p>Please review the delivery terms for your order before continuing.</p>
        <button id="btn-accept">Accept</button>
      </form>`);
    expect(findCandidates(document)).toEqual([]);
  });

  it('treats a button that names cookies itself as its own context', () => {
    mountHtml('<div><button id="only">Accept cookies</button></div>');
    const candidates = findCandidates(document);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('accept');
  });

  it('ignores a hidden banner', () => {
    mountHtml(`
      <div class="cookie-notice" style="display: none">
        <p>We use cookies on this site.</p>
        <button id="btn-accept">Accept all</button>
      </div>`);
    expect(findCandidates(document)).toEqual([]);
  });

  it('reaches buttons inside an open shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <div class="consent">
        <p>We use cookies for analytics.</p>
        <button id="deny">Reject all</button>
      </div>`;

    const candidates = findCandidates(shadow);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.kind).toBe('reject');
  });

  it('scores a fixed, consent-named container above a plain one', () => {
    mountHtml(`
      <div class="cookie-consent-bar" style="position: fixed; z-index: 9999">
        <p>We use cookies.</p><button id="a">Accept all</button>
      </div>
      <div class="footer-note">
        <p>Cookies policy summary text here.</p><button id="b">Accept all</button>
      </div>`);

    const [best] = findCandidates(document);
    expect(best?.button.id).toBe('a');
  });
});

describe('findOrphanBanners', () => {
  it('finds a consent block with nothing to click', () => {
    mountHtml(`
      <div id="cookie-wall" style="position:fixed">
        <p>We use cookies and similar technologies on this site.</p>
      </div>`);
    expect(findOrphanBanners(document).map((el) => el.id)).toEqual(['cookie-wall']);
  });

  it('does not treat a plain policy link as a banner', () => {
    mountHtml(`<div id="cookie-link" style="position:fixed"><a href="/cookies">Cookies</a></div>`);
    expect(findOrphanBanners(document)).toEqual([]);
  });

  it('does not report a nested duplicate of a block it already returned', () => {
    mountHtml(`
      <div id="outer-consent" style="position:fixed">
        <p>We use cookies and similar technologies.</p>
        <div id="inner-consent" style="position:fixed"><p>We use cookies and similar technologies.</p></div>
      </div>`);
    expect(findOrphanBanners(document).map((el) => el.id)).toEqual(['outer-consent']);
  });
});
