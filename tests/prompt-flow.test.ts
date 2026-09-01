/**
 * The confirmation prompt's own lifecycle. The bug this guards against: the
 * prompt stayed on screen after either button was pressed, which also left
 * `pendingPrompt` set and so froze the engine for the rest of the page.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountHtml } from './helpers.js';

/** A banner the engine finds plausible but not certain — it will ask. */
const UNCERTAIN_HTML = `
  <div style="position: fixed; z-index: 9999">
    <p>Manage your privacy and tracking preferences for this site.</p>
    <button id="accept">Accept all</button>
  </div>`;

const CONFIG = {
  enabled: true,
  mode: 'accept',
  fallbackToOpposite: false,
  hideIfNoButton: false,
  unblockScroll: false,
  uncertain: 'ask',
  debug: false,
};

const sent: unknown[] = [];

function installChrome(): void {
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: (message: { type: string }) => {
        sent.push(message);
        if (message.type === 'get-config') return Promise.resolve(CONFIG);
        return Promise.resolve(undefined);
      },
      onMessage: { addListener: () => undefined },
      getManifest: () => ({ name: 'Cookie Consent Dismisser' }),
    },
  });
}

/** The "Always do this on this site" toggle. */
function alwaysToggle(): HTMLElement {
  return promptShadow()!.querySelector('[role="checkbox"]') as HTMLElement;
}

/** The prompt's shadow root, or null when no prompt is on screen. */
function promptShadow(): ShadowRoot | null {
  return document.querySelector('[data-cbac-ui]')?.shadowRoot ?? null;
}

function promptButton(text: string): HTMLButtonElement {
  const buttons = Array.from(promptShadow()!.querySelectorAll('button'));
  const button = buttons.find((b) => b.textContent === text);
  if (!button) throw new Error(`no prompt button labelled "${text}"`);
  return button;
}

/** Boots the content script fresh and runs it until the prompt appears. */
async function bootAndAsk(): Promise<void> {
  mountHtml(UNCERTAIN_HTML);
  vi.resetModules();
  globalThis.__cbacStarted__ = undefined;
  installChrome();
  await import('../src/content/index.js');
  await vi.waitFor(() => expect(promptShadow()).not.toBeNull());
}

beforeEach(() => {
  document.body.innerHTML = '';
  sent.length = 0;
});

describe('confirmation prompt', () => {
  it('closes and clicks the banner button on "Close banner"', async () => {
    await bootAndAsk();
    const clicks: string[] = [];
    document.getElementById('accept')!.addEventListener('click', () => clicks.push('accept'));

    promptButton('Close banner').click();

    expect(promptShadow()).toBeNull();
    expect(document.querySelector('[data-cbac-ui]')).toBeNull();
    expect(clicks).toEqual(['accept']);
    expect(sent).toContainEqual(
      expect.objectContaining({ type: 'banner-handled', action: 'clicked' }),
    );
  });

  it('closes without clicking on "Leave it"', async () => {
    await bootAndAsk();
    const clicks: string[] = [];
    document.getElementById('accept')!.addEventListener('click', () => clicks.push('accept'));

    promptButton('Leave it').click();

    expect(document.querySelector('[data-cbac-ui]')).toBeNull();
    expect(clicks).toEqual([]);
  });

  it('removes the highlight outline from the banner', async () => {
    await bootAndAsk();
    const container = document.querySelector('div[style*="fixed"]') as HTMLElement;
    expect(container.getAttribute('data-cbac-highlight')).toBe('1');

    promptButton('Leave it').click();

    expect(container.hasAttribute('data-cbac-highlight')).toBe(false);
    expect(container.style.outline).toBe('');
  });

  it('names the extension and shows its mark in the header', async () => {
    await bootAndAsk();
    const brand = promptShadow()!.querySelector('.brand') as HTMLElement;

    expect(brand.textContent).toContain('Cookie Consent Dismisser');
    expect(brand.querySelector('svg')).not.toBeNull();
    promptButton('Leave it').click();
  });

  it('remembers the site choice when the box is ticked', async () => {
    await bootAndAsk();
    const always = alwaysToggle();

    always.click();
    promptButton('Close banner').click();

    expect(always.getAttribute('aria-checked')).toBe('true');
    expect(sent).toContainEqual({ type: 'remember-choice', choice: 'act' });
  });

  it('remembers nothing when the box is left alone', async () => {
    await bootAndAsk();

    promptButton('Close banner').click();

    expect(sent).not.toContainEqual({ type: 'remember-choice', choice: 'act' });
  });
});

/**
 * The prompt on a page that fights back. These drive the prompt module
 * directly: the point is the dialog's own event handling, not the engine.
 */
describe('a page that swallows clicks', () => {
  let prompt: typeof import('../src/content/prompt.js');
  let confirmed: boolean[];
  let dismissed: number;

  const pending = {
    kind: 'click' as const,
    ruleId: 'heuristic',
    confidence: 4,
    label: 'Accept all',
    get target() {
      return document.getElementById('accept')!;
    },
    get container() {
      return document.getElementById('banner')!;
    },
  };

  /** A consent wall that cancels every click outside its own dialog. */
  function blockAllClicks(): () => void {
    const swallow = (e: Event): void => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    document.addEventListener('click', swallow, true);
    return () => document.removeEventListener('click', swallow, true);
  }

  function click(el: Element): void {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  }

  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="banner"><p>We use cookies.</p><button id="accept">Accept all</button></div>`;
    confirmed = [];
    dismissed = 0;
    vi.resetModules();
    installChrome();
    prompt = await import('../src/content/prompt.js');
    prompt.showConfirmPrompt(
      pending,
      (_p, always) => confirmed.push(always),
      () => (dismissed += 1),
    );
  });

  it('confirms even though the page cancels the click', () => {
    const restore = blockAllClicks();
    click(promptButton('Close banner'));
    restore();

    expect(confirmed).toEqual([false]);
  });

  it('dismisses even though the page cancels the click', () => {
    const restore = blockAllClicks();
    click(promptButton('Leave it'));
    restore();

    expect(dismissed).toBe(1);
  });

  it('ticks the box even though the page cancels the click', () => {
    const restore = blockAllClicks();
    const always = alwaysToggle();

    click(always);
    click(promptButton('Close banner'));
    restore();

    expect(always.getAttribute('aria-checked')).toBe('true');
    expect(confirmed).toEqual([true]);
  });

  it('unticks the box on a second click', () => {
    const always = alwaysToggle();

    click(always);
    click(always);
    click(promptButton('Close banner'));

    expect(always.getAttribute('aria-checked')).toBe('false');
    expect(confirmed).toEqual([false]);
  });

  it('does not consume clicks meant for the page', () => {
    let pageClicks = 0;
    document.getElementById('accept')!.addEventListener('click', () => (pageClicks += 1));

    click(document.getElementById('accept')!);

    expect(pageClicks).toBe(1);
    expect(confirmed).toEqual([]);
    expect(dismissed).toBe(0);
  });

  it('leaves the banner alone on Escape', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(dismissed).toBe(1);
  });

  it('stops answering once the page has ripped the prompt out of the DOM', () => {
    const button = promptButton('Close banner');
    document.querySelector('[data-cbac-ui]')!.remove();

    click(button);

    expect(confirmed).toEqual([]);
    expect(dismissed).toBe(0);
  });
});

describe('what happened on a page', () => {
  it('marks the document when a banner is answered', async () => {
    await bootAndAsk();

    promptButton('Close banner').click();

    expect(document.documentElement.getAttribute('data-cbac-acted')).toBe('clicked:heuristic');
  });
});
