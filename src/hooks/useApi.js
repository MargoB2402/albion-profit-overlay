// Все запросы к API идут через Electron main process (IPC) — без CORS
//
// Раньше каждый компонент (Settings, CraftWidget, EnchantWidget, PriceWidget, ...) вызывал
// useApi() независимо — у каждого была СВОЯ копия config/isPro/isProPlus, свой отдельный
// IPC-запрос getConfig() и своя отдельная HTTP-проверка сессии. Это давало гонки: если
// какой-то компонент монтировался (например, после сворачивания/разворачивания оверлея)
// раньше, чем его собственный getConfig() успевал ответить, useState(config.wallet || '')
// на первом рендере намертво фиксировал пустые значения — и они больше никогда не
// обновлялись, даже когда config реально приходил. Один виджет мог показывать "PRO+
// активен", а другой в это же время — "требуется PRO+", потому что у них буквально РАЗНОЕ
// состояние. Теперь состояние одно на всё приложение (React Context), обновляется в одном
// месте — все потребители всегда видят одно и то же actual state.
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getLang } from './useI18n.js';
import { createQuoteQueue } from '../quoteQueue.mjs';
import { groupMarketOrders } from '../marketOrders.mjs';

const API_BASE = 'https://promptly.sbs';

// Обёртка над ipcRenderer.invoke('api-fetch')
async function apiFetch(url, opts = {}) {
    if (window.electron?.apiFetch) {
        const result = await window.electron.apiFetch({ url, ...opts });
        if (!result.ok && result.status === 0) throw new Error(result.error || 'Network error');
        return result.data;
    }
    // Fallback: прямой fetch (dev без Electron)
    const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    return res.json();
}

function useApiState() {
    const [config, setConfig]       = useState({ wallet: '', token: '', apiBase: API_BASE, autoLogTrade: false, filterMaxAge: 4, filterMinDaily: 7, filterMaxMargin: 100 });
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isPro, setIsPro]         = useState(false);
    const [isProPlus, setIsProPlus] = useState(false);
    // Приватный режим. Источник правды — сервер, здесь только отражение: тумблер
    // есть ещё и на сайте, и расходиться состояниям нельзя.
    const [privateMode, setPrivateModeState] = useState(false);
    const [isAdmin, setIsAdmin]     = useState(false);

    useEffect(() => {
        window.electron?.getConfig().then(cfg => {
            if (cfg) {
                setConfig(cfg);
                if (cfg.wallet && cfg.token) verifySession(cfg);
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const verifySession = useCallback(async (cfg) => {
        const base    = cfg.apiBase || API_BASE;
        const wallet  = cfg.wallet;
        const token   = cfg.token;
        if (!wallet || !token) return;

        try {
            const data = await apiFetch(
                `${base}/api/profile?wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}`
            );
            if (data?.wallet || data?.wallet_address) {
                setIsLoggedIn(true);
                setIsPro(data.isPro       || false);
                setIsProPlus(data.isProPlus  || false);
                setIsAdmin(data.isAdmin     || false);
                setPrivateModeState(!!data.privateMode);
                // Сообщаем main: если значение разошлось с сохранённым, он
                // перезапустит агента — иначе выгрузка в AODP продолжилась бы
                // до следующего запуска приложения.
                // Без проверки необязательный вызов проглотил бы отсутствие моста
                // молча: режим на сервере включён, агент продолжает слать в AODP,
                // и никаких следов. Именно так и была пропущена опечатка в имени.
                if (window.electron?.setPrivateMode) window.electron.setPrivateMode(!!data.privateMode);
                else console.warn('[useApi] мост setPrivateMode недоступен — агент не узнает о режиме');
            } else {
                setIsLoggedIn(false);
                setIsAdmin(false);
            }
        } catch (e) {
            console.error('[useApi] verifySession error:', e.message);
            setIsLoggedIn(false);
        }
    }, []);

    // Запрос цен предмета
    const fetchPrice = useCallback(async (query, quality = 1, region = null) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        const reg    = region || config.region || 'europe';
        try {
            const resp = await fetch(
                `${base}/api/overlay/item-price?q=${encodeURIComponent(query)}&quality=${quality}&region=${reg}&lang=${getLang()}&wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}`
            );
            const data = await resp.json();
            // 401 — не залогінен
            if (resp.status === 401 || data?.error === 'not_logged_in') {
                return { success: false, reason: 'not_logged_in' };
            }
            if (data?.success) return data;
        } catch {}
        return { success: false };
    }, [config]);

    // Записать сделку в бухгалтерию
    const saveTrade = useCallback(async (trade) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) throw new Error('Not logged in');

        return apiFetch(`${base}/api/ledger/bulk-add`, {
            method: 'POST',
            body: {
                wallet, token,
                items: [{
                    itemId:    trade.payload.item_id,
                    itemName:  trade.payload.item_name || trade.payload.item_id,
                    amount:    trade.payload.quantity,
                    buyPrice:  trade.type === 'trade_buy'  ? trade.payload.price : 0,
                    sellPrice: trade.type === 'trade_sell' ? trade.payload.price : 0,
                    buyCity:   trade.type === 'trade_buy'  ? trade.payload.city  : '',
                    sellCity:  trade.type === 'trade_sell' ? trade.payload.city  : '',
                    quality:   trade.quality || 1,
                }],
            },
        });
    }, [config]);

    // Получить активные price alerts
    const fetchAlerts = useCallback(async () => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) return [];

        try {
            const data = await apiFetch(
                `${base}/api/alerts/price?wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}`
            );
            return Array.isArray(data) ? data : [];
        } catch { return []; }
    }, [config]);

    // Избранное с сайта. lang нужен, чтобы имя можно было вставить в поиск аукциона
    // на языке игры: в базе лежит то имя, что было в интерфейсе при добавлении.
    const fetchFavorites = useCallback(async () => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) return [];
        try {
            const params = new URLSearchParams({
                wallet, token, region: config.region || 'europe', lang: getLang(),
            });
            const data = await apiFetch(`${base}/api/favorites?${params}`);
            return Array.isArray(data?.items) ? data.items : [];
        } catch { return []; }
    }, [config]);

    // Перебитые лоты: где наша цена выше самой низкой на рынке в том же городе.
    // Ходит в Бухгалтерию (порт 3005), авторизация там по Bearer, а не по query.
    const fetchOutbid = useCallback(async () => {
        const base   = config.apiBase || API_BASE;
        const token  = config.token;
        if (!config.wallet || !token) return { success: false };
        try {
            const params = new URLSearchParams({ lang: getLang(), region: config.region || 'europe' });
            return await apiFetch(`${base}/api/ledger/overlay/outbid?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch { return { success: false }; }
    }, [config]);

    // Топ-5 предметов для транспортного маршрута
    const fetchTransportTop = useCallback(async ({ from, to, tax = 10.5, safetyFilter = false }) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) return { success: false };
        try {
            const params = new URLSearchParams({
                wallet, token, from, to, tax,
                region:    config.region || 'europe',
                safetyFilter: String(safetyFilter),
                maxAge:    config.filterMaxAge    ?? 4,
                minDaily:  config.filterMinDaily  ?? 7,
                maxMargin: config.filterMaxMargin ?? 100,
                lang: getLang(),
            });
            return await apiFetch(`${base}/api/overlay/transport-top?${params}`);
        } catch { return { success: false }; }
    }, [config]);

    // Отправить OCR-цены на сервер (вклад в общую базу цен)
    const contributePrices = useCallback(async (ocr) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token || !window.electron?.signPriceReport) return;

        const { city, prices } = ocr;
        if (!city || !prices?.length) return;

        // Нормализуем название города к английскому
        const CITY_MAP = {
            'Тетфорд': 'Thetford', 'Форт Стерлинг': 'Fort Sterling',
            'Лимхёрст': 'Lymhurst', 'Бриджвотч': 'Bridgewatch',
            'Мартлок': 'Martlock', 'Карлеон': 'Caerleon', 'Брецильен': 'Brecilien',
        };
        const cityEn = CITY_MAP[city] || city;

        // itemId нужен для подписи — берём из onDetect через ocr.itemId
        const itemId = ocr.itemId;
        if (!itemId) return;

        // PriceWidget уже отфильтровал цены < 30 перед вызовом — доп. фильтр не нужен.
        // Старый фильтр >= 1000 блокировал дешёвые предметы (руны, спирт по 447 и т.п.)
        const price = Math.min(...prices);

        try {
            const { sig, ts } = await window.electron.signPriceReport({
                itemId, city: cityEn, price, quality: ocr.quality || 1,
            });
            await apiFetch(`${base}/api/overlay/contribute-price`, {
                method: 'POST',
                body: { wallet, token, itemId, city: cityEn, price, quality: ocr.quality || 1, sig, ts, region: config.region || 'europe' },
            });
        } catch {}
    }, [config]);

    // 🎯 АОДП-контрибуция: шлём ТОЧНЫЕ ордера агента (price+quality+is_offer).
    // Группируем по (quality, is_offer): is_offer=false (ЧР/buy) → max, is_offer=true (offer) → min.
    const queue = useRef(null);
    const lastObservation = useRef(0);
    const [captureStatus, setCaptureStatus] = useState(null);
    useEffect(() => {
        if (!config.wallet || !config.token) { setCaptureStatus(null); return; }
        const current = createQuoteQueue({
            onStatus: setCaptureStatus,
            send: async prices => {
                const region = config.region || 'europe';
                const privateOnly = privateMode;
                if (!window.electron?.signPriceBatch) throw Object.assign(new Error('Update required'), { permanent: true });
                const { sig, ts } = await window.electron.signPriceBatch({ region, privateOnly, prices });
                const response = await apiFetch(`${config.apiBase || API_BASE}/api/overlay/contribute-prices`, {
                    method: 'POST', timeoutMs: 10_000,
                    body: { wallet: config.wallet, token: config.token, region, privateOnly, prices, sig, ts },
                });
                if (!response?.ok || !Array.isArray(response.results) || response.results.length !== prices.length) {
                    throw Object.assign(new Error(response?.error || 'Upload failed'), { permanent: ['invalid_batch', 'invalid_signature', 'Unauthorized', 'PRO_PLUS_REQUIRED'].includes(response?.error) });
                }
                return response.results;
            },
        });
        queue.current = current; setCaptureStatus(current.status());
        return () => { current.close(); if (queue.current === current) queue.current = null; };
    }, [config.wallet, config.token, config.apiBase, config.region, privateMode]);
    const contributeOrders = useCallback(({ city, orders }) => {
        const observedAt = Math.max(Date.now(), lastObservation.current + 1);
        lastObservation.current = observedAt;
        queue.current?.enqueue(groupMarketOrders({ city, orders }).map(report => ({ ...report, observedAt })));
    }, []);

    // Топ-5 крафта (для CraftWidget)
    const fetchCraftTop = useCallback(async ({ city, toCity = 'Black Market', region = 'europe', tax = 10.5 }) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        try {
            const params = new URLSearchParams({ region, city, toCity, tax, wallet: wallet || '', token: token || '' });
            const data = await apiFetch(`${base}/api/craft?${params}`);
            return Array.isArray(data) ? data.slice(0, 10) : [];
        } catch { return []; }
    }, [config]);

    // Рецепт конкретного предмета (для CraftWidget recipe view)
    const fetchCraftBreakdown = useCallback(async ({ item, city, region = 'europe', useCityBonus = 'false', usageFee = 0 }) => {
        const base = config.apiBase || API_BASE;
        try {
            const params = new URLSearchParams({ item, city, region, useCityBonus, usageFee });
            return await apiFetch(`${base}/api/craft-breakdown?${params}`);
        } catch { return { success: false }; }
    }, [config]);

    // Зачарование: матрица по городам
    const fetchEnchant = useCallback(async ({ item, region = 'europe' }) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) return { success: false };
        try {
            const params = new URLSearchParams({ region, item, wallet, token });
            return await apiFetch(`${base}/api/enchant/calculate?${params}`);
        } catch { return { success: false }; }
    }, [config]);

    // Записать крафт-смету в бухгалтерию (PRO+)
    const saveCraftLedger = useCallback(async (payload) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token) throw new Error('Not logged in');
        return apiFetch(`${base}/api/ledger/craft/add`, {
            method: 'POST',
            body:   { ...payload, wallet, token },
        });
    }, [config]);

    const saveConfig = useCallback((newCfg) => {
        const merged = { ...config, ...newCfg };
        setConfig(merged);
        window.electron?.saveConfig(merged);
        verifySession(merged);
    }, [config, verifySession]);

    const logout = useCallback(() => {
        const cleared = { ...config, wallet: '', token: '' };
        setConfig(cleared);
        window.electron?.saveConfig(cleared);
        setIsLoggedIn(false);
        setIsPro(false);
        setIsProPlus(false);
        setIsAdmin(false);
    }, [config]);

    // Переключение из оверлея. Запрос тот же, что и у кнопки на сайте.
    const togglePrivateMode = useCallback(async (enabled) => {
        const base = config.apiBase || API_BASE;
        try {
            // body передаём ОБЪЕКТОМ: apiFetch сериализует его сам, и в main-процессе,
            // и в запасном пути. Готовая строка здесь давала двойную сериализацию —
            // сервер получал строку вместо полей, не находил токен и отвечал отказом.
            const d = await apiFetch(`${base}/api/account/private-mode`, {
                method: 'POST',
                body: { wallet: config.wallet, token: config.token, enabled },
            });
            if (d?.success) {
                setPrivateModeState(!!d.enabled);
                if (window.electron?.setPrivateMode) await window.electron.setPrivateMode(!!d.enabled);
                else console.warn('[useApi] мост setPrivateMode недоступен — агент не перезапустится');
                return { ok: true, enabled: !!d.enabled };
            }
            return { ok: false, error: d?.error || 'unknown' };
        } catch (e) {
            return { ok: false, error: e.message };
        }
    }, [config]);

    return { captureStatus, config, isLoggedIn, isPro, isProPlus, isAdmin, privateMode, togglePrivateMode, fetchPrice, saveTrade, fetchAlerts, fetchFavorites, fetchOutbid, saveConfig, logout, contributePrices, contributeOrders, fetchTransportTop, fetchCraftTop, fetchCraftBreakdown, fetchEnchant, saveCraftLedger };
}

const ApiContext = createContext(null);

export function ApiProvider({ children }) {
    const value = useApiState();
    return React.createElement(ApiContext.Provider, { value }, children);
}

export function useApi() {
    const ctx = useContext(ApiContext);
    if (!ctx) {
        throw new Error('useApi() must be called inside <ApiProvider>');
    }
    return ctx;
}
