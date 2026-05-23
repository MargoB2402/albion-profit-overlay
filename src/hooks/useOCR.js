// OCR hook — читает окно рынка Albion Online с экрана
import { useState, useEffect, useRef, useCallback } from 'react';

const OCR_INTERVAL_MS = 2500;

// Паттерны городов — города в игре ВСЕГДА латиница (Thetford, Martlock...).
// WinRT OCR иногда путает латинские глифы с кириллическими (M→М, a→а, o→о),
// поэтому паттерны допускают оба варианта одного символа через character class.
// "магГ1осР" — это OCR читает "Martlock" через "русский шрифт".
// OCR путает латинскую 'r' с кириллической 'г' (визуально похожи в игровом шрифте).
// Поэтому во всех паттернах где есть 'r' — добавляем [rрPгГ].
// Fort Sterling: между "Fort" и "Sterling" ровно 1 пробел → минимум .{1,…}, не .{2,…}.
const CITY_PATTERNS = [
    { city: 'Thetford',      re: /[tТ].{0,1}[hхН]?[eеЕ][tТ][fфФ]/i },
    // OCR читает "Sterling" как "Ste lin" (пробел вместо 'rlin') → матчим "Fort...Ste" ИЛИ "Sterli" (если повезёт)
    { city: 'Fort Sterling', re: /[fфФ][oоО][rрPгГ].{0,8}[sсС][tТ][eеЕ]|[sсС][tТ][eеЕ][rрPгГ][lлЛ1][iиИ]/i },
    { city: 'Lymhurst',      re: /[lлЛ][yиИ][mмМ][hхХ]/i },
    { city: 'Bridgewatch',   re: /[bбБ][rрPгГ][iиИ][dдД]/i },
    // OCR читает "Martlock" как "Martl ck" (o→пробел) → матчим по "Martl" (уникально среди городов)
    { city: 'Martlock',      re: /[mмМ][aаА][rрPгГ][tТ][lлЛ1]/i },
    { city: 'Caerleon',      re: /[cсС][aаА][eеЕ][rрPгГ]/i },
    { city: 'Brecilien',     re: /[bбБ][rрPгГ][eеЕ][cсС][iиИ]/i },
    // OCR может читать "Black" как "Bl ck" или "Bla ck" → матчим "Bl" + до 3 символов + "ck"
    { city: 'Black Market',  re: /[bбБ][lлЛ].{0,3}[cсС][kкК]/i },
];

// Паттерны которые НЕ являются названиями предметов
const SKIP_PATTERNS = [
    /^(купить|продать|buy|sell|отмена|cancel|ok|закрыть|close)$/i,
    /^(категория|category|уровень|level|ярус|tier|качество|quality|чары|enchantment)$/i,
    /^(цена|price|время|time|количество|amount|истекает|expires)$/i,
    /^(рынок|market|аукцион|auction)$/i,
    /^(предмет|item|продавец|seller|покупатель|buyer)$/i,
    /^\d[\d\s.,]*$/,                    // только цифры
    /^[^\wа-яА-Я]+$/,                   // только символы
    /\d+\s*[дd]\s+\d+\s*[чh]/i,        // "29 д 23 ч" / "29 d 23 h" — время листинга
    /^\d+\s*(дн|день|дней|day|days)/i,  // "29 дней"
    /^[\d.,]+[kKмM]?$/,                 // числа с суффиксом типа "2.7K"
];

/**
 * Парсит OCR-текст рыночного окна Albion.
 * Возвращает: { city, item, enchant, prices }
 */
function parseMarketOCR(text) {
    if (!text || text.trim().length < 5) return null;

    // Нормализуем частые OCR-замены в числах:
    //   L/I перед цифрами → 1  (1,099,997 читается как "L099,997" или "I099,997")
    //   апостроф/backtick перед 3 цифрами → "1,"
    //   (миллионная цена "1,099,989" читается OCR как "'.099,989")
    text = text
        .replace(/\bL(?=\d)/g, '1')
        .replace(/\bI(?=\d)/g, '1')
        .replace(/['''`](\d{3})/g, '1,$1');

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const result = { city: null, item: null, enchant: null, prices: [] };

    // 1. Город: единый fuzzy-проход по CITY_PATTERNS — покрывает точные и OCR-искажённые имена.
    for (const { city, re } of CITY_PATTERNS) {
        if (re.test(text)) { result.city = city; break; }
    }

    // 2. Зачарование: фильтровые кнопки рынка [.1][.2][.3] всегда видны → OCR читает ".1" из кнопки.
    // Требуем ≥2 вхождений одного уровня — кнопка даёт 1 раз, реальный список (3+ рядов) даёт 3+ раз.
    const allEnchants = [...text.matchAll(/[.,]([123])\b/g)].map(m => Number(m[1]));
    const enchantFreq = allEnchants.reduce((acc, n) => { acc[n] = (acc[n] || 0) + 1; return acc; }, {});
    const dominantEnchant = Object.entries(enchantFreq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
    if (dominantEnchant) result.enchant = Number(dominantEnchant[0]);

    // 3. Ищем название предмета — ищем повторяющиеся строки (в списке рынка)
    // Название предмета повторяется в каждой строке листинга
    const candidates = {};
    for (const line of lines) {
        // Пропускаем нежелательные строки
        if (SKIP_PATTERNS.some(p => p.test(line))) continue;
        if (line.length < 3 || line.length > 60) continue;
        // Считаем частоту
        candidates[line] = (candidates[line] || 0) + 1;
    }

    // Берём строку с максимальным повторением (название предмета в листинге)
    const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 2) {
        result.item = sorted[0][0];
    } else if (sorted.length > 0) {
        result.item = sorted[0][0];
    }

    // Убираем тир-суффикс в скобках: "Реликт (магистр)" → "Реликт"
    // Albion показывает "(эксперт)", "(магистр)", "(Грандмастер)", "(Expert's)" и т.д.
    if (result.item) {
        result.item = result.item.replace(/\s*\([^)]*\)\s*$/, '').trim();
    }

    // 4. ЯКОРЬ: цена в Albion рынке всегда стоит перед кнопкой "Купить" / "Buy"
    // Ищем строки с "Купить"/"Buy" → извлекаем последнее число перед кнопкой
    const marketPrices = [];
    for (const line of lines) {
        if (!/купить|buy\b/i.test(line)) continue;
        // Убираем кнопку и всё после неё, берём последнее число оставшегося
        const beforeBtn = line.replace(/\s*купить.*$/i, '').replace(/\s*buy\b.*$/i, '').trim();
        // Число может быть "4 996", "4.996", "4,996" или "22.500"
        const numMatch = beforeBtn.match(/(\d[\d\s.,]+\d|\d+)\s*$/);
        if (!numMatch) continue;
        const val = parseInt(numMatch[1].replace(/[\s.,]/g, ''), 10);
        if (val >= 30 && val <= 999_000_000) marketPrices.push(val);
    }

    // Если якорный поиск нашёл цены — используем их; иначе fallback
    if (marketPrices.length >= 2) {
        result.prices = marketPrices.sort((a, b) => a - b).slice(0, 8);
    } else {
        // Fallback для composite-режима: OCR уже выдал только ценовые полосы.
        // Паттерны:
        //   \d{1,3}[.,]\d{3}  — "14.993", "96,999" (разделитель тысяч точка/запятая)
        //   \d{3,7}           — "979", "14993" — простое число 3-7 цифр (без пробела!)
        // НЕ используем \d\s\d{3}: "981 981" (две цены подряд) давало ложный 981981
        // Зазор 6px между полосами в composite не даёт OCR склеивать соседние строки
        const raw = [];
        // min=30: максимальный листинговый период в Albion — 29 дней, 23 часа.
        // Всё что < 30 — это компоненты времени, не цены.
        // Цены ≥ 30 серебра (самые дешёвые предметы T1-T2) будут захвачены.
        // (?:[.,]\d{3})+ — несколько групп: "2,990,488" и "3,000,000" теперь читаются правильно
        // [ .,] — пробел как разделитель тысяч (русская локаль: "1 199 987") + точка/запятая
        const priceRe = /\b\d{1,3}(?:[ .,]\d{3})+\b|\b\d{3,9}\b/g;
        for (const line of lines) {
            let m;
            while ((m = priceRe.exec(line)) !== null) {
                const val = parseInt(m[0].replace(/[ .,]/g, ''), 10);
                if (val >= 30 && val <= 999_000_000) raw.push(val);
            }
            priceRe.lastIndex = 0;
        }
        // Кластеризуем по СЫРОМУ массиву (с дубликатами), не по Set.
        // Если 5 строк дают цену 872 и 1 строка даёт шум 32900:
        //   raw = [872,872,872,872,872,32900] → медиана = 872 → 32900 отфильтруется.
        // После Set: [872,32900] → length=2 → фильтр не срабатывал → баг.
        const sortedRaw = [...raw].sort((a, b) => a - b);
        if (sortedRaw.length >= 2) {
            const mid = sortedRaw[Math.floor(sortedRaw.length / 2)];
            const filtered = sortedRaw.filter(p => p >= mid * 0.50 && p <= mid * 2.0);
            result.prices = [...new Set(filtered)].sort((a, b) => a - b).slice(0, 8);
        } else {
            result.prices = [...new Set(sortedRaw)].sort((a, b) => a - b);
        }
    }

    return result;
}

export function useOCR({ enabled = true, onDetect, onCityDetect }) {
    const [status, setStatus]       = useState('idle');
    const [lastResult, setLastResult] = useState(null);
    const [rawText, setRawText]     = useState('');
    const timerRef                   = useRef(null);
    const prevItemRef                = useRef('');
    const prevCityRef                = useRef('');
    const nullCityCountRef           = useRef(0); // сколько подряд сканов без города
    const enabledRef                 = useRef(enabled);

    // Refs так что scan всегда вызывает актуальные колбэки без пересоздания интервала
    const onDetectRef     = useRef(onDetect);
    const onCityDetectRef = useRef(onCityDetect);
    useEffect(() => { onDetectRef.current     = onDetect;     }, [onDetect]);
    useEffect(() => { onCityDetectRef.current = onCityDetect; }, [onCityDetect]);
    useEffect(() => { enabledRef.current = enabled; }, [enabled]);

    // Сбрасывает город через 5 последовательных "пустых" сканов.
    // Вызывается при любом случае отсутствия рыночного окна.
    const bumpNoMarket = useCallback(() => {
        nullCityCountRef.current += 1;
        if (nullCityCountRef.current >= 5 && prevCityRef.current) {
            prevCityRef.current = '';
            onCityDetectRef.current?.(null);
        }
    }, []);

    const scan = useCallback(async () => {
        if (!enabledRef.current || !window.electron?.ocrAlbion) return;
        setStatus('scanning');

        try {
            const ocr = await window.electron.ocrAlbion();

            // Re-check: пользователь мог нажать Stop пока шёл async-скан
            if (!enabledRef.current) { setStatus('idle'); return; }

            // PS-диагностика видна в renderer-консоли (DevTools) — убираем после отладки
            if (ocr._dbg) console.warn('[OCR PS]', ocr._dbg);

            if (!ocr.text) {
                // Albion не найден или захват сорвался — нет вообще никакого текста
                bumpNoMarket();
                setStatus('idle');
                return;
            }

            // Логируем источник: рынок или HUD мини-карты
            if (ocr.found) {
                setRawText(ocr.text);
                console.log('[OCR raw market]', ocr.text?.slice(0, 200));
            } else {
                console.log('[OCR raw HUD]', ocr.text?.slice(0, 200));
            }

            const parsed = parseMarketOCR(ocr.text);
            console.log('[OCR parsed]', parsed);

            if (!parsed) { bumpNoMarket(); setStatus('idle'); return; }

            // Город — определяем из любого текста (маркет или HUD мини-карты)
            if (parsed.city) {
                nullCityCountRef.current = 0;
                if (parsed.city !== prevCityRef.current) {
                    prevCityRef.current = parsed.city;
                    onCityDetectRef.current?.(parsed.city);
                }
            } else {
                bumpNoMarket();
            }

            // Товарная позиция и цены — только когда маркет открыт (ocr.found)
            if (ocr.found) {
                setLastResult(parsed);
                setStatus('found');

                if (parsed.item && parsed.item !== prevItemRef.current) {
                    prevItemRef.current = parsed.item;
                    const query = parsed.enchant
                        ? `${parsed.item} .${parsed.enchant}`
                        : parsed.item;
                    onDetectRef.current?.(query, parsed);
                }
            } else {
                setStatus('idle');
            }
        } catch {
            setStatus('error');
        }
    // scan не зависит от onDetect/onCityDetect — используем refs выше
    }, [bumpNoMarket]);

    useEffect(() => {
        if (!enabled) { setStatus('idle'); return; }
        const init = setTimeout(scan, 1000);
        timerRef.current = setInterval(scan, OCR_INTERVAL_MS);
        return () => {
            clearTimeout(init);
            clearInterval(timerRef.current);
        };
    }, [enabled, scan]);

    const scanNow = useCallback(() => scan(), [scan]);

    return { status, lastResult, rawText, scanNow };
}
