// afterPack hook для electron-builder
// Вычисляет SHA-256 хэш app.asar и регистрирует его на сервере как доверенную сборку

import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Загружаем .env из корня overlay-app (рядом со scripts/)
try {
    const envPath = resolve(import.meta.dirname, '..', '.env');
    if (existsSync(envPath)) {
        readFileSync(envPath, 'utf8').split('\n').forEach(line => {
            const [k, ...v] = line.split('=');
            if (k && v.length && !process.env[k.trim()]) {
                process.env[k.trim()] = v.join('=').trim();
            }
        });
    }
} catch {}

export default async function afterPack(context) {
    const { appOutDir, packager } = context;
    const version = packager.appInfo.version;

    // Путь к app.asar внутри собранного дистрибутива
    const asarPath = join(appOutDir, 'resources', 'app.asar');

    if (!existsSync(asarPath)) {
        console.warn('[post-build] app.asar не найден, пропускаем регистрацию хэша');
        return;
    }

    const hash = createHash('sha256').update(readFileSync(asarPath)).digest('hex');
    console.log(`[post-build] app.asar SHA-256: ${hash}`);

    // Регистрируем доверенный хэш на сервере
    const apiUrl  = process.env.OVERLAY_API_URL  || 'https://promptly.sbs';
    const apiKey  = process.env.OVERLAY_BUILD_KEY || '';

    if (!apiKey) {
        console.warn('[post-build] OVERLAY_BUILD_KEY не задан — хэш не зарегистрирован');
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/api/overlay/register-build`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-build-key': apiKey,
            },
            body: JSON.stringify({ version, hash, platform: process.platform }),
        });
        const data = await res.json();
        if (data.ok) {
            console.log(`[post-build] ✅ Хэш v${version} зарегистрирован на сервере`);
        } else {
            console.error('[post-build] ❌ Сервер отклонил хэш:', data.error);
        }
    } catch (err) {
        console.error('[post-build] ❌ Ошибка регистрации хэша:', err.message);
    }
}
