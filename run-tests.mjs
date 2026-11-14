import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(__dirname, '.test-bundle.mjs');

console.log('Compiling TypeScript analytics tests via esbuild...');

try {
  await build({
    entryPoints: [path.join(__dirname, 'src/analytics/__tests__/analytics.test.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    outfile,
    loader: {
      '.csv': 'text',
      '.json': 'text',
    },
  });

  console.log('Running test suite with Node.js built-in test runner...');

  const child = spawn(process.execPath, ['--test', outfile], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    try {
      if (fs.existsSync(outfile)) fs.unlinkSync(outfile);
    } catch {}
    process.exit(code || 0);
  });
} catch (err) {
  console.error('Test compilation failed:', err);
  process.exit(1);
}
