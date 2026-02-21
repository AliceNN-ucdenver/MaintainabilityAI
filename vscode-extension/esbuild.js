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

/** @type {import('esbuild').BuildOptions} */
const webviewConfig = {
  entryPoints: ['src/webview/app/main.ts'],
  bundle: true,
  outfile: 'dist/webview/main.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: !production,
  minify: production,
};

/** @type {import('esbuild').BuildOptions} */
const scorecardWebviewConfig = {
  entryPoints: ['src/webview/app/scorecard.ts'],
  bundle: true,
  outfile: 'dist/webview/scorecard.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: !production,
  minify: production,
};

/** @type {import('esbuild').BuildOptions} */
const lookingGlassWebviewConfig = {
  entryPoints: ['src/webview/app/lookingGlass.ts'],
  bundle: true,
  outfile: 'dist/webview/lookingGlass.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: !production,
  minify: production,
  jsx: 'automatic',
  plugins: [inlineCssPlugin],
};

/** @type {import('esbuild').BuildOptions} */
const oraculumWebviewConfig = {
  entryPoints: ['src/webview/app/oraculum.ts'],
  bundle: true,
  outfile: 'dist/webview/oraculum.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: !production,
  minify: production,
};

async function main() {
  if (watch) {
    const extCtx = await esbuild.context(extensionConfig);
    const webCtx = await esbuild.context(webviewConfig);
    const scorecardCtx = await esbuild.context(scorecardWebviewConfig);
    const lookingGlassCtx = await esbuild.context(lookingGlassWebviewConfig);
    const oraculumCtx = await esbuild.context(oraculumWebviewConfig);
    await Promise.all([extCtx.watch(), webCtx.watch(), scorecardCtx.watch(), lookingGlassCtx.watch(), oraculumCtx.watch()]);
    console.log('Watching for changes...');
  } else {
    await Promise.all([
      esbuild.build(extensionConfig),
      esbuild.build(webviewConfig),
      esbuild.build(scorecardWebviewConfig),
      esbuild.build(lookingGlassWebviewConfig),
      esbuild.build(oraculumWebviewConfig),
    ]);
    console.log('Build complete.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
