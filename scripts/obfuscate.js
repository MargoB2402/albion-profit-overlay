#!/usr/bin/env node
// Обфускация main.js и preload.js перед упаковкой electron-builder
// Выходные файлы: main.obf.js, preload.obf.js

import { readFileSync, writeFileSync } from 'fs';
import JavaScriptObfuscator from 'javascript-obfuscator';

const FILES = [
    { src: 'main.js',    dst: 'main.obf.js' },
    { src: 'preload.js', dst: 'preload.obf.js' },
];

const OPTIONS = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,           // false = меньше размер
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 0.75,
    rotateStringArray: true,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 8,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,               // false = не ломает require/module
    selfDefending: true,                // код ломается при форматировании
    disableConsoleOutput: false,        // оставляем console для pm2 логов
    debugProtection: false,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
};

for (const { src, dst } of FILES) {
    const code = readFileSync(src, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, OPTIONS);
    writeFileSync(dst, result.getObfuscatedCode(), 'utf8');
    const ratio = (result.getObfuscatedCode().length / code.length).toFixed(2);
    console.log(`✅ ${src} → ${dst}  (size ×${ratio})`);
}
