/**
 * Pre-publish validation. Checks the built dist/ against Chrome Web Store
 * requirements. Exits non-zero on the first failing check so `npm run check`
 * blocks a broken bundle from being shipped.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** @param {string} msg */
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};
/** @param {string} msg */
const pass = (msg) => console.log(`✓ ${msg}`);

const exists = (p) => existsSync(join(DIST, p));

// 1. dist/ exists and has a manifest.
if (!exists('manifest.json')) {
  fail('dist/manifest.json is missing — run `npm run build` first');
  process.exit(1);
}

/** @type {import('../src/common/types.js').default} */
let manifest;
try {
  manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
} catch {
  fail('dist/manifest.json is not valid JSON');
  process.exit(1);
}

// 2. Manifest fields.
const { name, short_name: shortName, version, version_name: versionName, description, manifest_version: mv, permissions, host_permissions: hostPerm, icons, action, background, content_scripts: scripts } = manifest;

if (mv !== 3) fail(`manifest_version must be 3, got ${mv}`);
else pass('manifest_version is 3');

if (!name || name.length > 75) fail(`name must be 1–75 chars (${name?.length})`);
else pass(`name length OK (${name.length})`);

if (shortName && shortName.length > 12) fail(`short_name must be ≤12 chars (${shortName.length})`);
else pass(`short_name OK (${shortName?.length ?? 0})`);

if (versionName && versionName.length > 100) fail(`version_name too long`);
else pass(`version_name OK`);

if (!description || description.length > 132) fail(`description must be 1–132 chars (${description?.length})`);
else pass(`description length OK (${description?.length})`);

if (!/^\d{1,10}(\.\d{1,10}){0,3}$/.test(version)) fail(`version "${version}" is not a valid Chrome version`);
else pass(`version format OK (${version})`);

if (manifest.key) {
  console.warn('⚠ manifest contains a "key" field — this pins the extension ID. Remove it for a first publish so the store assigns a new ID.');
}

// 2b. content_security_policy — in MV3 the default is strict; customising it
//     to allow remote scripts would violate policy.
if (manifest.content_security_policy) {
  fail('content_security_policy should not be customised in MV3 (default is strict)');
} else pass('no custom content_security_policy (uses strict MV3 default)');

// 3. No broad warnings surprises: host_permissions should be declared.
if (!Array.isArray(hostPerm) || !hostPerm.includes('<all_urls>')) {
  fail('host_permissions should include <all_urls> for this extension');
} else pass('host_permissions includes <all_urls> (expected for this extension)');

// 3b. externally_connectable — not needed for this extension.
if (manifest.externally_connectable) {
  console.warn('⚠ manifest has externally_connectable — justify it in the listing');
}

// 4. Permissions are minimal.
const ALLOWED = new Set(['storage', 'tabs', 'scripting']);
for (const p of permissions ?? []) {
  if (!ALLOWED.has(p)) fail(`permission "${p}" is unexpected — justify it in store listing`);
}
pass(`permissions OK: ${permissions?.join(', ')}`);

// 5. Service worker.
if (!background?.service_worker) fail('background.service_worker is required in MV3');
else if (!exists(background.service_worker)) fail(`background.service_worker "${background.service_worker}" missing`);
else pass(`service worker present (${background.service_worker})`);

// 6. Icons.
for (const size of ['16', '32', '48', '128']) {
  const path = icons?.[size];
  if (!path) fail(`icon ${size}px missing`);
  else if (!exists(path)) fail(`icon "${path}" not found in dist`);
  else pass(`icon ${size}px present (${path})`);
}

// 7. Content scripts reference real files.
for (const cs of scripts ?? []) {
  for (const js of cs.js ?? []) {
    if (!exists(js)) fail(`content script "${js}" not in dist`);
  }
  pass(`content script world ${cs.world ?? '?'}: ${cs.js?.join(', ')}`);
}

// 8. No remote resources anywhere in dist.
const htmlFiles = ['popup.html', 'options.html'];
for (const file of htmlFiles) {
  if (!exists(file)) continue;
  const html = readFileSync(join(DIST, file), 'utf8');
  const remote = html.match(/https?:\/\/[^"'\s)]+/g)?.filter((u) => !u.startsWith('https://schemas.android'));
  if (remote?.length) fail(`${file} references remote resources: ${remote.join(', ')}`);
  else pass(`${file} has no remote resources`);

  if (/<script[^>]*>[\s\S]+?<\/script>/i.test(html)) fail(`${file} has inline script content`);
  else pass(`${file} has no inline scripts`);
}

// 9. No remote code / eval in JS bundles.
const jsFiles = Object.keys(manifest.icons ?? {})
  .map(() => null)
  .filter(() => false)
  .concat(
    scripts?.flatMap((s) => s.js ?? []) ?? [],
    [background?.service_worker],
    [action?.default_popup && 'popup.js'].filter(Boolean),
    ['options.js'],
  );

const allJs = new Set([
  ...(scripts?.flatMap((s) => s.js ?? []) ?? []),
  background?.service_worker,
  'popup.js',
  'options.js',
].filter(Boolean));

for (const file of allJs) {
  if (!exists(file)) continue;
  const code = readFileSync(join(DIST, file), 'utf8');
  if (/\bnew\s+Function\s*\(/.test(code)) fail(`${file} uses new Function()`);
  if (/\beval\s*\(/.test(code)) fail(`${file} uses eval()`);
  if (/import\s*\(/.test(code)) fail(`${file} has dynamic import — must not in MV3`);
}
pass('no eval / new Function / dynamic import in bundles');

// 10. Bundle size under the CWS limit (way under the 32 MB limit).
let total = 0;
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) total += statSync(full).size;
  }
};
walk(DIST);
const mb = total / (1024 * 1024);
if (mb > 32) fail(`total bundle size ${mb.toFixed(2)} MB exceeds 32 MB limit`);
else pass(`total bundle size ${mb.toFixed(2)} MB (well under limit)`);

if (process.exitCode === 1) {
  console.error('\n✗ VALIDATION FAILED — fix the issues above before publishing.');
} else {
  console.log('\n✓ Ready for Chrome Web Store. See store/listing.md and store/note-to-reviewer.md.');
}
