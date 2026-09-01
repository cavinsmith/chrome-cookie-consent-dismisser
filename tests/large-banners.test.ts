/**
 * Banners whose text is too long for the old container-size gate.
 *
 * Every site in this file was reported as "the extension does nothing":
 * detection classified the buttons correctly, but `findConsentContainer`
 * refused to credit any ancestor because the banner's own copy exceeded the
 * 4 000-character limit, so no candidate survived. The fixtures reproduce the
 * real DOM shapes and sizes measured on those pages.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentEngine } from '../src/core/engine.js';
import { findCandidates } from '../src/core/detect.js';
import { visibleText } from '../src/core/dom.js';
import { classifyLabel } from '../src/core/detect.js';
import { trackClicks } from './helpers.js';

const REJECT = {
  mode: 'reject' as const,
  fallbackToOpposite: false,
  hideIfNoButton: false,
  unblockScroll: false,
};
const ACCEPT = { ...REJECT, mode: 'accept' as const };

/** Filler with the same cookie vocabulary and bulk as a real category list. */
function categories(chars: number): string {
  const one =
    '<p>These cookies are used to send advertising and promotional information ' +
    'that is relevant to your interests, and to measure the performance of our ' +
    'campaigns. Some cookies may be processed by third parties.</p>';
  return one.repeat(Math.ceil(chars / 180));
}

beforeEach(() => {
  document.body.innerHTML = '';
});

/**
 * Mounts `html` inside a same-origin iframe and returns its document — the
 * shape an iframe-hosted CMP actually has, where the frame itself is the
 * overlay and its wrappers are plain unnamed `<div>`s.
 */
function mountInFrame(html: string): Document {
  const frame = document.createElement('iframe');
  document.body.append(frame);
  const doc = frame.contentDocument!;
  doc.body.innerHTML = html;
  return doc;
}

describe('fiat.com / media.stellantis.com (FCA CookieLaw, ~4.9k of text)', () => {
  /** Nested wrappers, none of which name a consent widget in its attributes. */
  const html = `
    <div class="content-wrapper">
      <div class="modal-parent"><div class="modal">
        <div id="dashboard" class="dashboard modal-page">
          <div class="inner-content-wrapper">
            <div class="decline-link"><button id="decline-text" class="as-link">CONTINUE WITHOUT ACCEPTING</button></div>
            <div id="dashboard-body-container" class="body-container">
              <h1>We use website cookies</h1>
              <p>We use cookies to ensure that we give you the best experience on our website.</p>
              ${categories(4500)}
              <div class="list-buttons">
                <button class="button-manage">MANAGE MY SETTINGS</button>
                <button class="button-custom">SAVE MY SETTINGS</button>
                <button id="acceptAllBtn" class="button-manage">ACCEPT ALL</button>
              </div>
            </div>
          </div>
        </div>
      </div></div>
    </div>`;

  it('clicks "Continue without accepting" in reject mode', () => {
    const doc = mountInFrame(html);
    let clicked = '';
    doc.getElementById('decline-text')!.addEventListener('click', () => (clicked = 'decline'));

    const result = new ConsentEngine(doc, REJECT).run();

    expect(result.action).toBe('clicked');
    expect(result.label).toBe('CONTINUE WITHOUT ACCEPTING');
    expect(clicked).toBe('decline');
  });

  it('clicks "Accept all" in accept mode', () => {
    const doc = mountInFrame(html);

    const result = new ConsentEngine(doc, ACCEPT).run();

    expect(result.action).toBe('clicked');
    expect(result.label).toBe('ACCEPT ALL');
  });

  it('is still ignored when the same markup is the whole page, not a frame', () => {
    // A top-level document gets no frame allowance: an unnamed, non-floating
    // block that long is not credited on its wording alone.
    document.body.innerHTML = html;
    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
  });

  it('does not treat "Continue without accepting" as a generic label', () => {
    // It contains the generic word "continue", which used to cost it a point
    // of confidence and force a prompt.
    expect(classifyLabel('CONTINUE WITHOUT ACCEPTING')).toMatchObject({
      kind: 'reject',
      generic: false,
    });
  });
});

describe('privatelease.fiat.nl (same CMP, Dutch)', () => {
  it('reads "Ga verder zonder aanvaarden" as reject and "Alles aanvaarden" as accept', () => {
    expect(classifyLabel('GA VERDER ZONDER AANVAARDEN →')).toMatchObject({ kind: 'reject' });
    expect(classifyLabel('ALLES AANVAARDEN')).toMatchObject({ kind: 'accept' });
  });
});

describe('gaspedaal.nl (4 052 characters — fifty over the old limit)', () => {
  it('accepts through the named consent popup', () => {
    document.body.innerHTML = `
      <div>
        <div id="as24-cmp-popup" class="_consent-popup_lzbp7_1" style="position: fixed">
          <div class="_consent-popup-inner_lzbp7_21">
            <h2>Wij gebruiken cookies</h2>
            ${categories(3900)}
            <div class="_acceptance-buttons_lzbp7_85">
              <button class="_consent-settings_lzbp7_103">Privacy instellingen</button>
              <button id="accept-all" class="_consent-accept_lzbp7_114">Alles accepteren</button>
            </div>
          </div>
        </div>
      </div>`;

    const result = new ConsentEngine(document, ACCEPT).run();

    expect(result.action).toBe('clicked');
    expect(result.label).toBe('Alles accepteren');
  });
});

describe('fiatcanada.com (OneTrust preferences pane, no "reject all")', () => {
  it('switches the optional categories off and saves', () => {
    document.body.innerHTML = `
      <div id="onetrust-consent-sdk">
        <div id="onetrust-pc-sdk" class="ot-pc-sdk" style="position: fixed">
          <h2>Privacy Preference Centre</h2>
          <p>When you visit our website, it may store or retrieve information on your
             browser in the form of cookies. Read our Cookie Notice for more information.</p>
          ${categories(9000)}
          <label for="c1">Strictly Necessary Cookies</label>
          <input id="c1" type="checkbox" checked disabled>
          <label for="c2">Functional Cookies</label>
          <input id="c2" type="checkbox" checked>
          <label for="c3">Performance Cookies</label>
          <input id="c3" type="checkbox" checked>
          <label for="c4">Targeting Cookies</label>
          <input id="c4" type="checkbox" checked>
          <button id="save" class="save-preference-btn-handler">Confirm My Choices</button>
        </div>
      </div>`;
    const clicks = trackClicks();

    const result = new ConsentEngine(document, REJECT).run();

    expect(result.action).toBe('clicked');
    expect(clicks.clicked).toContain('save');
    // The necessary category is left alone; the optional ones are switched off.
    expect((document.getElementById('c1') as HTMLInputElement).checked).toBe(true);
    for (const id of ['c2', 'c3', 'c4']) {
      expect((document.getElementById(id) as HTMLInputElement).checked).toBe(false);
    }
    clicks.stop();
  });
});

describe('the raised limit does not open the door to false positives', () => {
  it('ignores an "OK" button on a page whose footer links a cookie policy', () => {
    document.body.innerHTML = `
      <div id="page">
        <h1>Order summary</h1>
        <p>${'Your order has been prepared and is ready for collection. '.repeat(60)}</p>
        <button id="ok">OK</button>
        <footer><a href="/cookies">Cookie policy</a> — we use cookies on this site.</footer>
      </div>`;

    expect(findCandidates(document)).toEqual([]);
    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
  });
});

describe('visibleText', () => {
  it('ignores inline script and style payloads', () => {
    // The real FCA frame ships an 850 000-character configuration blob this
    // way, which made every ancestor look far too large to be a banner.
    document.body.innerHTML = `
      <div id="banner">
        <script>const config = "${'x'.repeat(5000)}";</script>
        <style>.a { color: red }</style>
        <p>We use cookies.</p>
      </div>`;

    expect(visibleText(document.getElementById('banner')!).trim()).toBe('We use cookies.');
  });

  it('stops reading at the cap', () => {
    document.body.innerHTML = `<div id="long">${'a'.repeat(5000)}</div>`;
    expect(visibleText(document.getElementById('long')!, 100)).toHaveLength(100);
  });
});

describe('lynkco.com (Dutch imperatives, and a footer that looked like a button)', () => {
  /** The real shape: nested spans inside the button, wrapped in a "buttonBox". */
  const banner = `
    <div class="cookie-panel" style="position: fixed">
      <h2>Deze website maakt gebruik van cookies</h2>
      <p>Als je daarvoor toestemming geeft, gebruiken wij en derden cookies en
         soortgelijke technologieën om onze diensten te verbeteren.
         Meer hierover lees je in ons <a href="/privacy">privacybeleid</a> en
         <a href="/cookies">cookiebeleid</a>.</p>
      <div class="buttonBox">
        <button id="accept-all" class="primary-button dark-green">
          <span class="primary-button__content"><span class="buttonText">Accepteer alle cookies</span></span>
        </button>
        <button id="reject-all" class="primary-button outline-black">
          <span class="primary-button__content"><span class="buttonText">Weiger alle onnodige cookies</span></span>
        </button>
        <button id="customise" class="primary-button outline-black">
          <span class="buttonText">Cookies aanpassen</span>
        </button>
      </div>
    </div>`;

  it('refuses the unnecessary cookies in reject mode', () => {
    document.body.innerHTML = banner;
    let clicked = '';
    for (const id of ['accept-all', 'reject-all', 'customise']) {
      document.getElementById(id)!.addEventListener('click', () => (clicked = id));
    }

    const result = new ConsentEngine(document, REJECT).run();

    expect(result.action).toBe('clicked');
    expect(clicked).toBe('reject-all');
  });

  it('accepts in accept mode', () => {
    document.body.innerHTML = banner;
    let clicked = '';
    for (const id of ['accept-all', 'reject-all']) {
      document.getElementById(id)!.addEventListener('click', () => (clicked = id));
    }

    expect(new ConsentEngine(document, ACCEPT).run().action).toBe('clicked');
    expect(clicked).toBe('accept-all');
  });

  it('does not offer a footer full of links as one button', () => {
    // What the prompt actually asked about on this site: a wrapper whose label
    // was every link's text concatenated, inside a footer carrying an inline
    // SVG stylesheet.
    document.body.innerHTML = `
      <footer class="site-footer">
        <style>.st0{clip-path:url(#SVGID_1_);}</style>
        <div class="footer-buttons">
          <a href="/terms">Voorwaarden en beleid</a>
          <a href="/cookies">Cookiebeleid</a>
          <a href="/privacy">Privacybeleid</a>
        </div>
      </footer>`;

    const labels = findCandidates(document).map((c) => c.label);
    expect(labels.some((l) => l.includes('Voorwaarden en beleid Voorwaarden'))).toBe(false);
  });
});

describe('github.com (its own repository link is not an accept button)', () => {
  it('ignores a link that merely contains the word "consent"', () => {
    document.body.innerHTML = `
      <div class="repo-page">
        <a href="/user/chrome-cookie-consent-dismisser">chrome-cookie-consent-dismisser</a>
        <p>Chrome extension that automatically accepts or rejects cookie-consent
           banners on every site.</p>
        <div class="upload-area">Drag files here or click to add files</div>
      </div>`;

    expect(findCandidates(document)).toEqual([]);
  });

  it('still recognises a real button that contains a phrase', () => {
    document.body.innerHTML = `
      <div class="cookie-banner" style="position: fixed">
        <p>We use cookies to improve this site.</p>
        <button id="ok">Accept all cookies and continue</button>
      </div>`;

    expect(findCandidates(document).map((c) => c.kind)).toContain('accept');
  });
});

describe('lemonde.fr (a wall that hides most of its own text)', () => {
  it('measures what is on screen, not the collapsed explanations', () => {
    // 40 000 characters of collapsed copy around 200 of visible text: the
    // block was too big for any limit until it was measured as rendered.
    const hidden = '<p>Pourquoi le Monde vous demande d’accepter ces cookies. </p>'.repeat(700);
    document.body.innerHTML = `
      <div class="gdpr-lmd-wall" style="position: fixed">
        <h2>Accéder gratuitement en acceptant l’utilisation de vos données</h2>
        <p>Le Monde et ses partenaires utilisent des cookies pour personnaliser
           les publicités et mesurer l’audience.</p>
        <div class="c-explanation" style="display: none">${hidden}</div>
        <button id="accept" class="gdpr-lmd-button">Accepter et continuer</button>
      </div>`;
    const wall = document.querySelector('.gdpr-lmd-wall') as HTMLElement;
    // jsdom has no `innerText`; stand in for the rendered reading.
    Object.defineProperty(wall, 'innerText', {
      get: () => (wall.querySelector('h2')!.textContent ?? '') + (wall.querySelector('p')!.textContent ?? ''),
    });

    expect(visibleText(wall, 4001).length).toBeLessThan(4000);
    expect(findCandidates(document).map((c) => c.kind)).toContain('accept');
  });
});

describe('corriere.it (the CMP empties its wall but leaves it up)', () => {
  it('hides a page-covering layer that has nothing left in it', () => {
    document.body.innerHTML = `
      <div class="privacy-cp-wall" style="position: fixed">
        <div class="inner">
          <p>Il Corriere usa cookie per personalizzare la pubblicità.</p>
          <button id="accept">Accetta e continua</button>
        </div>
      </div>`;
    const wall = document.querySelector('.privacy-cp-wall') as HTMLElement;
    // The site tears its own content down once the notice is answered.
    document.getElementById('accept')!.addEventListener('click', () => {
      wall.querySelector('.inner')!.remove();
    });
    const engine = new ConsentEngine(document, ACCEPT);

    expect(engine.run().action).toBe('clicked');
    expect(engine.sweep()).toBe(true);
    expect(wall.style.display).toBe('none');
  });

  it('leaves an unrelated overlay alone', () => {
    document.body.innerHTML = `
      <div id="loader" style="position: fixed"></div>
      <div class="cookie-bar" style="position: fixed">
        <p>We use cookies on this site.</p>
        <button id="accept">Accept all cookies</button>
      </div>`;
    const engine = new ConsentEngine(document, ACCEPT);
    engine.run();
    engine.sweep();

    // The site's own loading screen is not ours to hide.
    expect((document.getElementById('loader') as HTMLElement).style.display).toBe('');
  });
});

describe('allegro.pl (a refusal that contains the acceptance)', () => {
  it('reads "Nie zgadzam się" as a refusal, not as "Zgadzam się"', () => {
    expect(classifyLabel('Nie zgadzam się')).toMatchObject({ kind: 'reject' });
    expect(classifyLabel('Zgadzam się')).toMatchObject({ kind: 'accept' });
  });

  it('presses the refuse button on the real banner shape', () => {
    document.body.innerHTML = `
      <div id="opbox-gdpr-consents-modal">
        <div style="position: fixed">
          <h2>Dbamy o Twoją prywatność</h2>
          <p>Dzięki plikom cookies i technologiom pokrewnym oraz przetwarzaniu
             Twoich danych osobowych możemy lepiej dopasować treści.</p>
          <a href="/cookies" data-role="manage_home_view_link">Ustawienia plików cookies</a>
          <button id="accept" data-role="accept-consent">Zgadzam się</button>
          <button id="reject" data-role="reject-rodo">Nie zgadzam się</button>
        </div>
      </div>`;
    let clicked = '';
    for (const id of ['accept', 'reject']) {
      document.getElementById(id)!.addEventListener('click', () => (clicked = id));
    }

    expect(new ConsentEngine(document, REJECT).run().action).toBe('clicked');
    expect(clicked).toBe('reject');
  });

  it('still presses accept in accept mode', () => {
    document.body.innerHTML = `
      <div class="cookie-modal" style="position: fixed">
        <p>Dzięki plikom cookies możemy lepiej dopasować treści.</p>
        <button id="accept">Zgadzam się</button>
        <button id="reject">Nie zgadzam się</button>
      </div>`;
    let clicked = '';
    for (const id of ['accept', 'reject']) {
      document.getElementById(id)!.addEventListener('click', () => (clicked = id));
    }

    new ConsentEngine(document, ACCEPT).run();
    expect(clicked).toBe('accept');
  });
});

describe('pay-or-consent walls', () => {
  it('never presses a button that starts a subscription', () => {
    // publico.es and corriere.it put the refusal behind a paid subscription.
    expect(classifyLabel('Rechaza y suscríbete por 9€/mes')).toBeNull();
    expect(classifyLabel('Rifiuta e abbonati')).toBeNull();
    expect(classifyLabel('Pur-Abo für 4,99 €')).toBeNull();
    // The free choice on the same wall is still readable.
    expect(classifyLabel('Acepta y navega gratis')).toMatchObject({ kind: 'accept' });
  });

  it('leaves such a wall alone in reject mode rather than buying anything', () => {
    document.body.innerHTML = `
      <div class="didomi-popup-backdrop" style="position: fixed">
        <p>Público te permite navegación gratuita mediante cookies publicitarias.</p>
        <button id="pay">Rechaza y suscríbete por 9€/mes</button>
        <button id="free">Acepta y navega gratis</button>
      </div>`;
    const clicks = trackClicks();

    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
    expect(clicks.clicked).not.toContain('pay');
    clicks.stop();
  });
});

describe('lone settings controls', () => {
  it('ignores an accessibility settings button in a page header', () => {
    // welt.de offered "Einstellungen für Barrierefreiheit" as a consent control.
    document.body.innerHTML = `
      <header class="r-header">
        <button id="a11y">Einstellungen für Barrierefreiheit</button>
        <a href="/datenschutz">Datenschutz</a>
      </header>`;

    expect(findCandidates(document)).toEqual([]);
  });

  it('still takes a settings button that sits beside an accept', () => {
    document.body.innerHTML = `
      <div class="cookie-bar" style="position: fixed">
        <p>Wir verwenden Cookies auf dieser Website.</p>
        <button id="settings">Einstellungen</button>
        <button id="accept">Alle akzeptieren</button>
      </div>`;

    expect(findCandidates(document).map((c) => c.kind)).toContain('settings');
  });
});

describe('the "Cookie Preferences" link every site keeps in its footer', () => {
  it('is not pressed on a page that is not asking anything', () => {
    // forbes.com, aliexpress.com and zara.com all have one; pressing it opens
    // a dialog the reader never asked for.
    document.body.innerHTML = `
      <footer class="site-footer">
        <p>© 2026 Example Inc. Read about the cookies we use on this site.</p>
        <a href="#" id="prefs" class="cookie-preferences">Cookie Preferences</a>
      </footer>`;

    expect(findCandidates(document)).toEqual([]);
    expect(new ConsentEngine(document, REJECT).run().action).toBe('none');
  });

  it('is still pressed when it is the way into a banner', () => {
    document.body.innerHTML = `
      <div class="cookie-bar" style="position: fixed">
        <p>We use cookies on this site to improve your experience.</p>
        <a href="#" id="prefs">Cookie Preferences</a>
      </div>`;

    expect(findCandidates(document).map((c) => c.kind)).toContain('settings');
  });
});
