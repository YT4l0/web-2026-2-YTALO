// Script de build — empacota o handler em dist/handler.mjs (ESM, Node 22)
import { build } from 'esbuild';

await build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  // .mjs garante que o runtime Lambda trate o bundle como ESM.
  outfile: 'dist/handler.mjs',
  // Mantém o AWS SDK externo (já disponível no runtime Lambda)
  external: [
    '@aws-sdk/*',
  ],
  logLevel: 'info',
});
