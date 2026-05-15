import { build } from 'esbuild';

await build({
  entryPoints: ['./server/index.ts'],
  bundle: true,
  platform: 'node',
  packages: 'external',
  format: 'esm',
  outfile: 'dist/index.js',
});
