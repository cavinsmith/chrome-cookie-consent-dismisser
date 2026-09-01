import { beforeEach, describe, expect, it } from 'vitest';
import {
  collectClickables,
  collectRoots,
  elementLabel,
  hideElement,
  isVisible,
  simulateClick,
  unblockScroll,
} from '../src/core/dom.js';

beforeEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  document.body.removeAttribute('style');
});

describe('isVisible', () => {
  it('is false for detached elements', () => {
    expect(isVisible(document.createElement('div'))).toBe(false);
  });

  it('respects display, visibility, hidden and aria-hidden', () => {
    document.body.innerHTML = `
      <div id="a">shown</div>
      <div id="b" style="display:none">hidden</div>
      <div id="c" style="visibility:hidden">hidden</div>
      <div id="d" hidden>hidden</div>
      <div id="e" aria-hidden="true">hidden</div>`;
    expect(isVisible(document.getElementById('a')!)).toBe(true);
    for (const id of ['b', 'c', 'd', 'e']) {
      expect(isVisible(document.getElementById(id)!), id).toBe(false);
    }
  });

  it('is false when an ancestor is hidden', () => {
    document.body.innerHTML = `<div style="display:none"><button id="x">Accept</button></div>`;
    expect(isVisible(document.getElementById('x')!)).toBe(false);
  });
});

describe('collectRoots', () => {
  it('walks nested open shadow roots', () => {
    const outer = document.createElement('div');
    document.body.append(outer);
    const outerRoot = outer.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    outerRoot.append(inner);
    const innerRoot = inner.attachShadow({ mode: 'open' });

    const roots = collectRoots(document);
    expect(roots).toContain(document);
    expect(roots).toContain(outerRoot);
    expect(roots).toContain(innerRoot);
  });

  it('honours the root cap', () => {
    for (let i = 0; i < 10; i++) {
      const host = document.createElement('div');
      document.body.append(host);
      host.attachShadow({ mode: 'open' });
    }
    expect(collectRoots(document, 3).length).toBeLessThanOrEqual(3);
  });
});

describe('collectClickables', () => {
  it('finds buttons, links and role=button elements', () => {
    document.body.innerHTML = `
      <button id="a">a</button>
      <a href="#" id="b">b</a>
      <span role="button" id="c">c</span>
      <div class="btn-primary" id="d">d</div>
      <p id="e">not clickable</p>`;
    const ids = collectClickables(document).map((el) => el.id);
    expect(ids).toEqual(expect.arrayContaining(['a', 'b', 'c', 'd']));
    expect(ids).not.toContain('e');
  });
});

describe('elementLabel', () => {
  it('falls back to the accessible name for icon-only controls', () => {
    document.body.innerHTML = `<button id="x" aria-label="Reject all"><svg></svg></button>`;
    expect(elementLabel(document.getElementById('x')!)).toContain('Reject all');
  });
});

describe('simulateClick', () => {
  it('dispatches a full pointer sequence ending in click', () => {
    document.body.innerHTML = `<button id="x">go</button>`;
    const seen: string[] = [];
    const el = document.getElementById('x')!;
    for (const type of ['mousedown', 'mouseup', 'click']) {
      el.addEventListener(type, () => seen.push(type));
    }
    simulateClick(el);
    expect(seen).toEqual(['mousedown', 'mouseup', 'click']);
  });
});

describe('hideElement', () => {
  it('hides with !important and marks the element', () => {
    document.body.innerHTML = `<div id="x">banner</div>`;
    const el = document.getElementById('x')!;
    hideElement(el);
    expect(el.style.getPropertyPriority('display')).toBe('important');
    expect(el.getAttribute('data-cbac-hidden')).toBe('1');
  });
});

describe('unblockScroll', () => {
  it('restores a locked body and reports the change', () => {
    document.body.style.overflow = 'hidden';
    expect(unblockScroll(document)).toBe(true);
    expect(document.body.style.overflow).toBe('auto');
  });

  it('leaves an unlocked page untouched', () => {
    expect(unblockScroll(document)).toBe(false);
  });
});

describe('elementLabel deduplicates repeated parts', () => {
  it('does not repeat text that the title already carries', () => {
    document.body.innerHTML = `<a id="a" title="Ik ga akkoord">Ik ga akkoord</a>`;
    expect(elementLabel(document.getElementById('a')!)).toBe('Ik ga akkoord');
  });

  it('still names an icon-only control from its aria-label', () => {
    document.body.innerHTML = `<button id="b" aria-label="Accept all cookies">✓</button>`;
    expect(elementLabel(document.getElementById('b')!)).toBe('✓ Accept all cookies');
  });

  it('keeps an aria-label that says something different', () => {
    document.body.innerHTML = `<button id="c" aria-label="Reject all">No</button>`;
    expect(elementLabel(document.getElementById('c')!)).toBe('No Reject all');
  });
});
