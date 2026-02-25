const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Plugin: inline CSS imports as runtime <style> injection
// Needed because VS Code webviews load JS via <script> but have no <link> for companion CSS
const inlineCssPlugin = {
  name: 'inline-css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await fs.promises.readFile(args.path, 'utf8');
      return {
        contents: `(function(){if(typeof document!=='undefined'){var s=document.createElement('style');s.textContent=${JSON.stringify(css)};document.head.appendChild(s);}})();`,
        loader: 'js',
      };
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: !production,
  minify: production,
  loader: {
    '.md': 'text',
    '.json': 'json',
  },
};

/** Create a browser IIFE config for a webview entry point. */
function webviewEntry(entryPoint, outfile, extras = {}) {
  return {
    entryPoints: [entryPoint],
    bundle: true,
    outfile: `dist/webview/${outfile}`,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: !production,
    minify: production,
    ...extras,
  };
}

const configs = [
  extensionConfig,
  webviewEntry('src/webview/app/main.ts', 'main.js'),
  webviewEntry('src/webview/app/scorecard.ts', 'scorecard.js'),
  webviewEntry('src/webview/app/lookingGlass.ts', 'lookingGlass.js', { jsx: 'automatic', plugins: [inlineCssPlugin] }),
  webviewEntry('src/webview/app/oraculum.ts', 'oraculum.js'),
];

async function main() {
  if (watch) {
    const contexts = await Promise.all(configs.map(c => esbuild.context(c)));
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('Watching for changes...');
  } else {
    await Promise.all(configs.map(c => esbuild.build(c)));
    console.log('Build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
