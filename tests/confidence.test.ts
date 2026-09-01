/**
 * The new "don't act unless you're sure" behaviour. These are the cases that
 * matter most: the ones where the old extension would have clicked or hidden
 * something it shouldn't have.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { ConsentEngine } from '../src/core/engine.js';
import { evaluateContext, findCandidates, scoreConfidence } from '../src/core/detect.js';
import { mountHtml } from './helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('context strength', () => {
  it('treats cookie/consent/GDPR vocabulary as strong', () => {
    expect(evaluateContext('We use cookies to personalise content')).toBe('strong');
    expect(evaluateContext('Wir verwenden Cookies')).toBe('strong');
    expect(evaluateContext('GDPR consent manager')).toBe('strong');
  });

  it('treats privacy/tracking vocabulary as weak on its own', () => {
    expect(evaluateContext('Manage your privacy and personal data')).toBe('weak');
  });

  it('treats ordinary copy as no context', () => {
    expect(evaluateContext('Choose a delivery address')).toBe('none');
  });
});

describe('generic accept labels need strong context', () => {
  it('rejects an "OK" button in a weak privacy block', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and personal data preferences.</p>
        <button id="ok">OK</button>
      </div>`);
    expect(findCandidates(document)).toEqual([]);
  });

  it('accepts an "OK" button inside a strong cookie block', () => {
    mountHtml(`
      <div class="cookie-notice" style="position: fixed; z-index: 9999">
        <p>We use cookies on this site. Accept to continue.</p>
        <button id="ok">OK</button>
      </div>`);
    expect(findCandidates(document).length).toBeGreaterThan(0);
  });

  it('rejects a "Got it" button outside any consent context', () => {
    mountHtml(`
      <div class="onboarding-tip" style="position: fixed; z-index: 9999">
        <p>Here is a quick tour of the new dashboard.</p>
        <button id="got-it">Got it</button>
      </div>`);
    expect(findCandidates(document)).toEqual([]);
  });
});

describe('the engine asks instead of acting on thin matches', () => {
  it('asks for an "Accept all" button in a weak block', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`);

    const result = new ConsentEngine(document, {
      mode: 'accept',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'ask',
    }).run();

    expect(result.action).toBe('ask');
    expect(result.pending?.target.id).toBe('accept');
  });

  it('acts without asking for a strong cookie banner', () => {
    mountHtml(`
      <div class="cookie-consent" style="position: fixed; z-index: 9999">
        <p>We use cookies and similar technologies. Manage your preferences below.</p>
        <button id="reject">Reject all</button>
      </div>`);

    const result = new ConsentEngine(document, {
      mode: 'reject',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'ask',
    }).run();

    expect(result.action).toBe('clicked');
    expect(result.ruleId).toBe('heuristic');
  });

  it('skips thin matches when configured to skip', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`);

    const result = new ConsentEngine(document, {
      mode: 'accept',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'skip',
    }).run();

    expect(result.action).toBe('none');
  });

  it('acts on thin matches when configured to act', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`);

    const result = new ConsentEngine(document, {
      mode: 'accept',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'act',
    }).run();

    expect(result.action).toBe('clicked');
  });
});

describe('confirming and dismissing a pending action', () => {
  it('carries out a confirmed pending click', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`);

    const engine = new ConsentEngine(document, {
      mode: 'accept',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'ask',
    });

    const ask = engine.run();
    expect(ask.action).toBe('ask');

    let clicked = false;
    document.getElementById('accept')!.addEventListener('click', () => {
      clicked = true;
    });

    const done = engine.confirmPending(ask.pending!);
    expect(done.action).toBe('clicked');
    expect(clicked).toBe(true);
  });

  it('never asks about the same element twice after a dismissal', () => {
    mountHtml(`
      <div style="position: fixed; z-index: 9999">
        <p>Manage your privacy and tracking preferences for this site.</p>
        <button id="accept">Accept all</button>
      </div>`);

    const engine = new ConsentEngine(document, {
      mode: 'accept',
      fallbackToOpposite: false,
      hideIfNoButton: false,
      unblockScroll: false,
      uncertain: 'ask',
    });

    const ask = engine.run();
    expect(ask.action).toBe('ask');
    engine.dismissPending(ask.pending!);
    expect(engine.run().action).toBe('none');
  });
});

describe('scoreConfidence', () => {
  it('rewards strong context, exact labels and a named container', () => {
    const strong = scoreConfidence(
      { kind: 'accept', score: 30, exact: true, generic: false },
      { element: Object.assign(document.createElement('div'), {}), strength: 'strong' },
    );
    const weak = scoreConfidence(
      { kind: 'accept', score: 30, exact: false, generic: true },
      { element: document.createElement('div'), strength: 'weak' },
    );
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('the extension never detects its own prompt', () => {
  it('ignores elements tagged as extension UI', () => {
    mountHtml(`
      <div data-cbac-ui="1" style="position: fixed; z-index: 9999">
        <p>We use cookies on this site.</p>
        <button id="fake">Accept all</button>
      </div>`);
    expect(findCandidates(document)).toEqual([]);
  });
});
