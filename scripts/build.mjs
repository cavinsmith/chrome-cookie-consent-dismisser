/** Bundles the extension into `dist/` with esbuild. */
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const watch = process.argv.includes('--watch');

mkdirSync(OUT, { recursive: true });

/** Entry points and their bundle names inside `dist/`. */
const ENTRIES = {
  background: 'src/background/index.ts',
  content: 'src/content/index.ts',
  'shadow-hook': 'src/content/shadow-hook.ts',
  prompt: 'src/content/prompt.ts',
  popup: 'src/popup/popup.ts',
  options: 'src/options/options.ts',
};

const options = {
  entryPoints: Object.fromEntries(
    Object.entries(ENTRIES).map(([name, file]) => [name, join(ROOT, file)]),
  ),
  outdir: OUT,
  bundle: true,
  // Content scripts are classic scripts: they must not carry `import`.
  format: 'iife',
  target: 'chrome111',
  platform: 'browser',
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  legalComments: 'none',
  logLevel: 'info',
};

function copyStatic() {
  const manifestPath = join(ROOT, 'src/manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  manifest.version = pkg.version;
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  for (const file of ['src/popup/popup.html', 'src/popup/popup.css',
                      'src/options/options.html', 'src/options/options.css']) {
    cpSync(join(ROOT, file), join(OUT, file.split('/').pop()));
  }
  cpSync(join(ROOT, 'icons'), join(OUT, 'icons'), { recursive: true });
}

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  copyStatic();
  console.log('watching…');
} else {
  await build(options);
  copyStatic();
  console.log('built dist/');
}
