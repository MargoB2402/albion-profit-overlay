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
    const contribOrdersCd = useRef({});
    const contributeOrders = useCallback(async ({ city, itemId, orders }) => {
        const base   = config.apiBase || API_BASE;
        const wallet = config.wallet;
        const token  = config.token;
        if (!wallet || !token || !window.electron?.signPriceReport) return;
        if (!city || !itemId || !Array.isArray(orders) || orders.length === 0) return;

        const CITY_MAP = {
            'Тетфорд': 'Thetford', 'Форт Стерлинг': 'Fort Sterling',
            'Лимхёрст': 'Lymhurst', 'Бриджвотч': 'Bridgewatch',
            'Мартлок': 'Martlock', 'Карлеон': 'Caerleon', 'Брецильен': 'Brecilien',
            'Чёрный рынок': 'Black Market', 'Черный рынок': 'Black Market',
        };
        const cityEn = CITY_MAP[city] || city;

        // Группируем по качеству и стороне ордера.
        // ВАЖНО: агент отдаёт цену в ВНУТРЕННИХ единицах Albion (×10000, 4 знака после запятой).
        // Реальное серебро = price / 10000.  (417120000 → 41712)
        const groups = {};
        for (const o of orders) {
            const q = Number(o.quality) || 1;
            const price = Math.round((Number(o.price) || 0) / 10000);
            if (price < 1) continue; // агент даёт точные цены даже на 4-5 серебра — режем только 0/мусор
            const side = o.is_offer ? 'sell' : 'buy';
            const k = `${q}_${side}`;
            (groups[k] ||= { q, side, prices: [] }).prices.push(price);
        }

        const now = Date.now();
        for (const { q, side, prices } of Object.values(groups)) {
            const price = side === 'buy' ? Math.max(...prices) : Math.min(...prices);
            const ck = `${itemId}_${cityEn}_${q}_${side}`;
            if (contribOrdersCd.current[ck] && now - contribOrdersCd.current[ck] < 60_000) continue; // клиентский анти-спам 60с
            try {
                const { sig, ts } = await window.electron.signPriceReport({ itemId, city: cityEn, price, quality: q });
                await apiFetch(`${base}/api/overlay/contribute-price`, {
                    method: 'POST',
                    body: { wallet, token, itemId, city: cityEn, price, quality: q, side, sig, ts, region: config.region || 'europe' },
                });
                contribOrdersCd.current[ck] = now;
            } catch {}
        }
    }, [config]);

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

    return { config, isLoggedIn, isPro, isProPlus, isAdmin, fetchPrice, saveTrade, fetchAlerts, saveConfig, logout, contributePrices, contributeOrders, fetchTransportTop, fetchCraftTop, fetchCraftBreakdown, fetchEnchant, saveCraftLedger };
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
