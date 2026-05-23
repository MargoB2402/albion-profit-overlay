// Генерирует assets/icon.ico из assets/icon.png
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const src = resolve('assets/icon.png');
const dst = resolve('assets/icon.ico');

const buf = await pngToIco(src);
writeFileSync(dst, buf);
console.log(`✅ icon.ico создан (${(buf.length / 1024).toFixed(1)} kB)`);
