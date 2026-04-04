import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const distAssetsDir = resolve(process.cwd(), 'dist', 'assets');
const budgetBytes = 500 * 1024;

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;

const files = readdirSync(distAssetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => {
    const filePath = join(distAssetsDir, name);
    const size = statSync(filePath).size;
    return { name, size };
  })
  .sort((a, b) => b.size - a.size);

if (files.length === 0) {
  console.error('No JS chunks found in dist/assets. Run build first.');
  process.exit(1);
}

const oversized = files.filter((file) => file.size > budgetBytes);

console.log('Bundle budget report (JS chunks):');
for (const file of files.slice(0, 10)) {
  console.log(`- ${file.name}: ${formatKb(file.size)}`);
}

if (oversized.length > 0) {
  console.error('\nBundle budget failed. These chunks exceed 500 kB:');
  for (const file of oversized) {
    console.error(`- ${file.name}: ${formatKb(file.size)}`);
  }
  process.exit(1);
}

console.log('\nBundle budget passed. No JS chunk exceeds 500 kB.');
