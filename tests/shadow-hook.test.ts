/**
 * The hook patches a global prototype, so it lives in its own test file —
 * vitest isolates each file's environment.
 */
import { beforeAll, describe, expect, it } from 'vitest';

beforeAll(async () => {
  await import('../src/content/shadow-hook.js');
});

describe('shadow-hook', () => {
  it('makes a closed shadow root reachable from outside', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = '<button>Reject all</button>';

    expect(host.shadowRoot).not.toBeNull();
    expect(host.shadowRoot?.querySelector('button')?.textContent).toBe('Reject all');
  });

  it('leaves open roots exactly as they were', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    expect(host.shadowRoot).toBe(root);
  });

  it('is idempotent — importing twice does not double-wrap', async () => {
    await import('../src/content/shadow-hook.js');
    const host = document.createElement('div');
    document.body.append(host);
    host.attachShadow({ mode: 'closed' });
    expect(host.shadowRoot).not.toBeNull();
  });
});
