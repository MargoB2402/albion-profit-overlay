import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useOCR } from '../hooks/useOCR';
import { useI18n } from '../hooks/useI18n';

const fmt = n => n >= 1_000_000
    ? (n / 1_000_000).toFixed(2) + 'M'
    : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K'
    : String(Math.round(n));

const SI = {
    wrap:  { padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 },
    input: { width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    row:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' },
    sec:   { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', marginTop: '10px' },
    btn:   { padding: '7px 12px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
    ghost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#94a3b8', cursor: 'pointer', fontSize: '12px', padding: '7px 10px' },
};

// Autocomplete dropdown component
function SearchDropdown({ query, onSelect, apiFetch, config, t }) {
    const [suggestions, setSuggestions] = useState([]);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!query || query.length < 2) { setSuggestions([]); setVisible(false); return; }
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            try {
                const base   = config.apiBase || 'https://promptly.sbs';
                const wallet = config.wallet || '';
                const token  = config.token  || '';
                const url = `${base}/api/overlay/item-search?wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}&q=${encodeURIComponent(query)}&limit=6`;
                const res = await (window.electron?.apiFetch ? window.electron.apiFetch({ url }) : fetch(url).then(r => r.json()));
                const data = res?.data ?? res;
                if (Array.isArray(data) && data.length > 0) { setSuggestions(data); setVisible(true); }
                else { setSuggestions([]); setVisible(false); }
            } catch { setSuggestions([]); setVisible(false); }
        }, 280);
        return () => clearTimeout(timerRef.current);
    }, [query, config]);

    if (!visible || !suggestions.length) return null;

    return (
        <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'rgba(12,14,26,0.98)', border: '1px solid rgba(200,160,80,0.25)',
            borderRadius: '8px', marginTop: '2px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            overflow: 'hidden',
        }}>
            {suggestions.map((s, i) => (
                <div key={s.id} onMouseDown={(e) => { e.preventDefault(); onSelect(s); setVisible(false); }}
                    style={{
                        padding: '7px 10px', cursor: 'pointer', fontSize: '12px',
                        borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(200,160,80,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <span style={{ color: '#e2e8f0' }}>
                        {s.name}
                        {s.id?.match(/^T(\d+)/) && <span style={{ color: '#475569', marginLeft: '4px', fontSize: '10px' }}>T{s.id.match(/^T(\d+)/)[1]}</span>}
                        {s.id?.match(/@([1-4])$/) && <span style={{ color: '#c8a050', marginLeft: '3px' }}>.{s.id.match(/@([1-4])$/)[1]}</span>}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Quick buy log panel
const QUALITY = [
    { v: 1, short: 'N', label: 'Normal',      color: '#64748b' },
    { v: 2, short: 'G', label: 'Good',         color: '#22c55e' },
    { v: 3, short: 'O', label: 'Outstanding',  color: '#3b82f6' },
    { v: 4, short: 'E', label: 'Excellent',    color: '#a855f7' },
    { v: 5, short: 'M', label: 'Masterpiece',  color: '#c8a050' },
];

function QuickLogPanel({ result, city, ocrPrices, onSave, onClose, t }) {
    const { saveTrade } = useApi();
    const [qty,     setQty]     = useState(1);
    const [price,   setPrice]   = useState(ocrPrices?.length ? Math.min(...ocrPrices) : (result?.prices?.find(p => p.city === city)?.sell || 0));
    const [quality, setQuality] = useState(1);
    const [saved,   setSaved]   = useState(false);

    const handleSave = async () => {
        if (!result?.itemId || !price || !qty) return;
        try {
            await saveTrade({
                type: 'trade_buy',
                quality,
                payload: {
                    item_id:   result.itemId,
                    item_name: result.itemName,
                    quantity:  Number(qty),
                    price:     Number(price),
                    city:      city || 'unknown',
                },
            });
            setSaved(true);
            setTimeout(() => { setSaved(false); onClose(); }, 1500);
        } catch {}
    };

    return (
        <div style={{
            background: 'rgba(200,160,80,0.07)', border: '1px solid rgba(200,160,80,0.2)',
            borderRadius: '10px', padding: '10px', marginBottom: '8px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#c8a050' }}>📝 {result?.itemName}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '14px' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#475569', marginBottom: '3px' }}>{t('buyQty')}</div>
                    <input type="number" min={1} value={qty} onChange={e => setQty(e.target.value)}
                        style={{ ...SI.input, padding: '5px 8px', fontSize: '12px' }} />
                </div>
                <div style={{ flex: 2 }}>
                    <div style={{ fontSize: '10px', color: '#475569', marginBottom: '3px' }}>{t('buyPriceLabel')}</div>
                    <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)}
                        style={{ ...SI.input, padding: '5px 8px', fontSize: '12px' }} />
                </div>
            </div>
            {/* Quality picker */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#475569', marginRight: '2px' }}>Quality:</span>
                {QUALITY.map(q => (
                    <button key={q.v} onClick={() => setQuality(q.v)} title={q.label}
                        style={{ flex: 1, height: '22px', borderRadius: '5px', border: `1px solid ${q.color}55`, background: quality === q.v ? q.color + '33' : 'transparent', color: q.color, fontWeight: '700', fontSize: '10px', cursor: 'pointer' }}>
                        {q.short}
                    </button>
                ))}
            </div>
            <button onClick={handleSave} disabled={saved} style={{ ...SI.btn, width: '100%', fontSize: '12px', padding: '7px' }}>
                {saved ? t('logDone') : t('logBuy')}
            </button>
        </div>
    );
}

export default function PriceWidget({ city, lastEvent, onOCRCity }) {
    const { fetchPrice, contributePrices, config, isLoggedIn } = useApi();
    const { t } = useI18n();
    // Город определяется только OCR — marketCity IS city, приходит снаружи через onOCRCity
    const marketCityRef = useRef(null); // синхронная копия для использования в callback-ах

    const [query,      setQuery]      = useState('');
    const [result,     setResult]     = useState(null);
    const [loading,    setLoading]    = useState(false);
    const [ocrEnabled,    setOcrEnabled]    = useState(true);
    const [showLog,       setShowLog]       = useState(false);
    const [contribStatus, setContribStatus] = useState(''); // видимый статус последней попытки отправки
    const [debugMode,     setDebugMode]     = useState(false);

    // Проверяем debug-флаг один раз при монтировании
    useEffect(() => {
        window.electron?.getDebugMode?.()?.then?.(v => setDebugMode(!!v));
    }, []);

    const lastOcrRef      = useRef(null);
    const inputRef        = useRef(null);
    const dropdownRef     = useRef(null);
    const contribCooldown = useRef({}); // { "itemId_city": timestamp }
    const pendingContrib  = useRef(null);  // { itemId, city }
    const ocrPriceBuffer  = useRef([]);    // rolling buffer of min-price per scan, сбрасывается при смене предмета
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // doSearch: только API-запрос + UI. Contribution НЕ делает — за это отвечает pendingContrib.
    const doSearch = useCallback(async (q) => {
        if (!q?.trim()) return;
        setLoading(true);
        setShowLog(false);
        try {
            const data = await fetchPrice(q);
            if (data?.success) setResult(data);
            else setResult(null);
        } catch {}
        setLoading(false);
    }, [fetchPrice]);

    // OCR: только цены и город. Предмет определяет ТОЛЬКО агент через market_view.
    // onDetect намеренно отсутствует — OCR никогда не пишет в поле поиска.
    const { status: ocrStatus, lastResult, scanNow } = useOCR({
        enabled: ocrEnabled,
        onDetect: useCallback((q, parsed) => {
            // OCR находит имя предмета — сохраняем только для contribution, не пишем в UI
            lastOcrRef.current = parsed;
        }, []),
        onCityDetect: useCallback((c) => { if (c) { marketCityRef.current = c; onOCRCity?.(c); } }, [onOCRCity]),
    });

    // Agent market_view: только подставляет query и запускает поиск.
    // Contribution откладывается до следующего OCR-скана (pendingContrib).
    // ВАЖНО: lastResult НЕ должен быть в deps — иначе эффект перезапускается каждые 2.5с
    // и changedAt сбрасывается, не давая таймеру истечь. Город берём из ref, не из state.
    useEffect(() => {
        if (lastEvent?.type === 'market_view') {
            const id = lastEvent.payload.item_id;
            if (!id) return;
            setQuery(id);
            doSearch(id);
            const bestCity = marketCityRef.current || null;
            pendingContrib.current = { itemId: id, city: bestCity || null, changedAt: Date.now() };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastEvent, doSearch]);

    // Contribution: ждём ≥1 OCR-цикла (2.5с) после смены предмета чтобы экран обновился
    const OCR_INTERVAL_MS = 2500;
    useEffect(() => {
        const pending = pendingContrib.current;
        if (!pending) { setContribStatus('⏳ нет market_view'); return; }
        if (!lastResult?.prices?.length) {
            setContribStatus('⏳ нет цен от OCR');
            return;
        }

        const elapsed = Date.now() - pending.changedAt;
        if (elapsed < OCR_INTERVAL_MS) {
            setContribStatus(`⏳ жду ${OCR_INTERVAL_MS - elapsed}мс`);
            return;
        }

        const { itemId, city: pendingCity } = pending;
        const contribCity = lastResult?.city || city !== 'unknown' ? (lastResult?.city || city) : pendingCity;
        if (!contribCity || contribCity === 'unknown') {
            setContribStatus('⚠️ город не определён');
            return;
        }

        const ck = `${itemId}_${contribCity}`;
        const now = Date.now();
        const cooldownLeft = contribCooldown.current[ck] ? (2 * 60 * 1000 - (now - contribCooldown.current[ck])) : 0;
        if (cooldownLeft > 0) {
            setContribStatus(`🕐 cooldown ${Math.round(cooldownLeft / 1000)}с`);
            return;
        }

        const minPrice = Math.min(...lastResult.prices);
        if (minPrice < 30) {
            setContribStatus(`⛔ цена ${minPrice} < 30`);
            pendingContrib.current = null;
            return;
        }

        pendingContrib.current = null;
        contribCooldown.current[ck] = now;
        setContribStatus(`✅ → ${contribCity} ${minPrice}`);
        contributePrices({ itemId, city: contribCity, prices: lastResult.prices, quality: lastResult.enchant || 1 });
    }, [lastResult, contributePrices, city]);

    const handleSelect = useCallback((item) => {
        setQuery(item.name);
        setDropdownOpen(false);
        doSearch(item.id);
    }, [doSearch]);

    const prices = result?.prices?.filter(p => p.sell > 0 || p.buy > 0)
        .sort((a, b) => b.sell - a.sell) || [];
    const bestSell  = prices[0];
    const cityPrice = prices.find(p => p.city === city);

    return (
        <div style={SI.wrap}>
            {/* OCR status bar — только в режиме отладки */}
            {debugMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <div style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        background: ocrStatus === 'found' ? '#22c55e' : ocrStatus === 'scanning' ? '#f59e0b' : '#334155',
                        boxShadow: ocrStatus === 'scanning' ? '0 0 4px #f59e0b88' : 'none',
                    }} />
                    <span style={{ fontSize: '10px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ocrStatus === 'found' && lastResult?.item
                            ? `${lastResult.item}${lastResult.enchant ? ' .' + lastResult.enchant : ''}${lastResult.city ? ' · ' + lastResult.city : ''}`
                            : ocrStatus === 'scanning' ? t('ocrScanning')
                            : t('ocrOpen')}
                    </span>
                    <button onClick={() => setOcrEnabled(e => !e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ocrEnabled ? '#c8a050' : '#475569', fontSize: '11px', padding: '0 2px', letterSpacing: 0 }}>
                        {ocrEnabled ? '■' : '▶'}
                    </button>
                    <button onClick={scanNow} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', fontSize: '11px', padding: '0 2px' }}>↺</button>
                </div>
            )}

            {/* OCR detail strip — только в режиме отладки (debug mode) */}
            {debugMode && (
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap',
                    background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)',
                    borderRadius: '7px', padding: lastResult ? '5px 8px' : '0',
                    marginBottom: lastResult ? '7px' : '0',
                    maxHeight: lastResult ? '40px' : '0',
                    overflow: 'hidden',
                    fontSize: '10px',
                    transition: 'max-height 0.3s ease, padding 0.3s ease, margin-bottom 0.3s ease',
                }}>
                    {lastResult?.city  && <span><span style={{ color: '#475569' }}>{t('ocrCity')}: </span><span style={{ color: '#22c55e' }}>{lastResult.city}</span></span>}
                    {lastResult?.enchant != null && <span><span style={{ color: '#475569' }}>{t('ocrEnchant')}: </span><span style={{ color: '#a855f7' }}>.{lastResult.enchant}</span></span>}
                    {lastResult?.prices?.length > 0 && (
                        <span>
                            <span style={{ color: '#475569' }}>{t('ocrPrices')}: </span>
                            <span style={{ color: '#f59e0b' }}>{lastResult.prices.slice(0, 3).map(p => fmt(p)).join(', ')}</span>
                        </span>
                    )}
                    {contribStatus && (
                        <span style={{ color: contribStatus.startsWith('✅') ? '#22c55e' : contribStatus.startsWith('⚠️') || contribStatus.startsWith('⛔') ? '#ef4444' : '#475569' }}>
                            {contribStatus}
                        </span>
                    )}
                </div>
            )}

            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
                    <input
                        ref={inputRef}
                        style={SI.input}
                        placeholder={t('searchPlaceholder')}
                        value={query}
                        onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                        onKeyDown={e => { if (e.key === 'Enter') { setDropdownOpen(false); doSearch(query, lastOcrRef.current); } if (e.key === 'Escape') setDropdownOpen(false); }}
                        onFocus={() => query.length >= 2 && setDropdownOpen(true)}
                        onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    />
                    {dropdownOpen && (
                        <SearchDropdown
                            query={query}
                            onSelect={handleSelect}
                            config={config}
                            t={t}
                        />
                    )}
                </div>
                <button style={SI.btn} onClick={() => { setDropdownOpen(false); doSearch(query, lastOcrRef.current); }} disabled={loading}>
                    {loading ? '…' : '🔍'}
                </button>
            </div>

            {/* Quick log panel */}
            {showLog && result && isLoggedIn && (
                <QuickLogPanel
                    result={result}
                    city={city}
                    ocrPrices={lastResult?.prices}
                    onClose={() => setShowLog(false)}
                    t={t}
                />
            )}

            {/* PRO lock */}
            {result?.locked && (
                <div style={{
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    borderRadius: '10px', padding: '14px', textAlign: 'center', marginBottom: '4px',
                }}>
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
                    <div style={{ fontWeight: '700', color: '#a855f7', fontSize: '13px', marginBottom: '4px' }}>{t('proLocked')}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>{t('proLockedMsg')}</div>
                    <a href="https://promptly.sbs/#pricing" target="_blank" rel="noreferrer"
                        style={{ fontSize: '11px', color: '#c8a050', fontWeight: '700', textDecoration: 'none' }}>
                        {t('upgradePro')}
                    </a>
                </div>
            )}

            {/* Results */}
            {result && !result.locked && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {result.itemName}
                            {result.tier && <span style={{ marginLeft: '5px', fontSize: '10px', color: '#475569' }}>T{result.tier}{result.enchant ? `.${result.enchant}` : ''}</span>}
                        </div>
                        {isLoggedIn && (
                            <button onClick={() => setShowLog(l => !l)} style={{
                                ...SI.ghost, fontSize: '10px', padding: '4px 8px', marginLeft: '6px',
                                borderColor: showLog ? 'rgba(200,160,80,0.4)' : undefined,
                                color: showLog ? '#c8a050' : '#94a3b8',
                            }}>
                                {t('quickBought')}
                            </button>
                        )}
                    </div>

                    {/* Best sell */}
                    {bestSell && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.04))',
                            border: '1px solid rgba(34,197,94,0.2)',
                            borderRadius: '9px', padding: '8px 10px', marginBottom: '7px',
                        }}>
                            <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('bestSell')}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: '800', color: '#22c55e', fontSize: '17px' }}>{fmt(bestSell.sell)}</span>
                                <span style={{ color: '#64748b', fontSize: '11px' }}>{bestSell.city}</span>
                            </div>
                        </div>
                    )}

                    {/* Current city highlight */}
                    {cityPrice && city !== 'unknown' && cityPrice.city !== bestSell?.city && (
                        <div style={{
                            background: 'rgba(200,160,80,0.07)', border: '1px solid rgba(200,160,80,0.18)',
                            borderRadius: '9px', padding: '7px 10px', marginBottom: '7px',
                        }}>
                            <div style={{ fontSize: '10px', color: '#c8a050', marginBottom: '3px' }}>📍 {city} · {t('myCity')}</div>
                            <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                                <span style={{ color: '#22c55e', fontWeight: '700' }}>{fmt(cityPrice.sell)}</span>
                                {cityPrice.buy > 0 && <span style={{ color: '#3b82f6' }}>{fmt(cityPrice.buy)}</span>}
                            </div>
                        </div>
                    )}

                    {/* All cities */}
                    <div style={SI.sec}>{t('allCities')}</div>
                    {prices.map(p => (
                        <div key={p.city} style={SI.row}>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{p.city}</span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {p.sell > 0 && <span style={{ color: '#22c55e', fontWeight: '600' }}>{fmt(p.sell)}</span>}
                                {p.buy  > 0 && <span style={{ color: '#3b82f6' }}>{fmt(p.buy)}</span>}
                                {p.daily > 0 && <span style={{ color: '#334155', fontSize: '10px' }}>{p.daily}/{t('daily')}</span>}
                            </div>
                        </div>
                    ))}

                    {prices.length === 0 && (
                        <div style={{ color: '#334155', fontSize: '11px', textAlign: 'center', padding: '12px 0' }}>{t('noResults')}</div>
                    )}
                </>
            )}
        </div>
    );
}
