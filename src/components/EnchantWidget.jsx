import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

const fmt = n =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M'
    : n >= 1_000   ? (n / 1_000).toFixed(1) + 'K'
    : String(Math.round(n));

const SI = {
    wrap:  { padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 },
    label: { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', marginTop: '8px' },
    input: { width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    btn:   { padding: '6px 12px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
    ghost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '4px 8px' },
    row:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' },
    sec:   { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', marginTop: '10px' },
};

const RES_ORDER = ['rune', 'soul', 'relic', 'shard'];
const RES_EMOJI = { rune: '🔵', soul: '🟣', relic: '🟡', shard: '⚪' };

function ProLock({ t }) {
    return (
        <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '10px', padding: '14px', textAlign: 'center', margin: '16px 0' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
            <div style={{ fontWeight: '700', color: '#a855f7', fontSize: '13px', marginBottom: '4px' }}>{t('enchantProLocked')}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>{t('enchantProMsg')}</div>
            <a href="https://promptly.sbs/#pricing" target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#c8a050', fontWeight: '700', textDecoration: 'none' }}>{t('upgradePro')}</a>
        </div>
    );
}

// Autocomplete dropdown (reuses same pattern as PriceWidget)
function SearchDropdown({ query, onSelect, config, t }) {
    const [suggestions, setSuggestions] = useState([]);
    const [visible, setVisible]         = useState(false);
    const timer = useRef(null);

    useEffect(() => {
        if (!query || query.length < 2) { setSuggestions([]); setVisible(false); return; }
        clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            try {
                const base   = config.apiBase || 'https://promptly.sbs';
                const wallet = config.wallet  || '';
                const token  = config.token   || '';
                const url = `${base}/api/overlay/item-search?wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}&q=${encodeURIComponent(query)}&limit=6&filterType=GEAR_ONLY`;
                const res = await (window.electron?.apiFetch ? window.electron.apiFetch({ url }) : fetch(url).then(r => r.json()));
                const data = res?.data ?? res;
                if (Array.isArray(data) && data.length) { setSuggestions(data); setVisible(true); }
                else { setSuggestions([]); setVisible(false); }
            } catch { setSuggestions([]); setVisible(false); }
        }, 280);
        return () => clearTimeout(timer.current);
    }, [query, config]);

    if (!visible || !suggestions.length) return null;

    return (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: 'rgba(12,14,26,0.98)', border: '1px solid rgba(200,160,80,0.25)', borderRadius: '8px', marginTop: '2px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            {suggestions.map((s, i) => (
                <div key={s.id} onMouseDown={e => { e.preventDefault(); onSelect(s); setVisible(false); }}
                    style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '11px', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
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

export default function EnchantWidget() {
    const { config, isPro, isProPlus, fetchEnchant, saveCraftLedger } = useApi();
    const { t } = useI18n();

    const [query,        setQuery]        = useState('');
    const [selectedItem, setSelectedItem] = useState(null); // { id, name }
    const [dropOpen,     setDropOpen]     = useState(false);
    const [startEnch,    setStartEnch]    = useState('0');
    const [targetEnch,   setTargetEnch]   = useState('1');
    const [loading,      setLoading]      = useState(false);
    const [matrix,       setMatrix]       = useState(null); // raw matrixData from API
    const [result,       setResult]       = useState(null); // computed best route
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerDone,    setLedgerDone]    = useState(false);
    const dropRef = useRef(null);

    useEffect(() => {
        const fn = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    const handleStartChange = (v) => {
        setStartEnch(v);
        if (Number(v) >= Number(targetEnch)) setTargetEnch(String(Number(v) + 1));
        setResult(null);
    };

    const handleSelectItem = useCallback((item) => {
        setSelectedItem(item);
        setQuery(item.name);
        setDropOpen(false);
        setMatrix(null);
        setResult(null);
    }, []);

    const calculate = async () => {
        if (!selectedItem) return;
        setLoading(true);
        setResult(null);
        const data = await fetchEnchant({ item: selectedItem.id, region: config.region || 'europe' });
        if (data?.success && data.matrix) {
            setMatrix(data);
            computeResult(data, startEnch, targetEnch);
        }
        setLoading(false);
    };

    const computeResult = (data, from, to) => {
        const m    = data.matrix;
        const mult = data.multiplier || 1;
        const requiredRes = [];
        for (let i = Number(from); i < Number(to); i++) requiredRes.push(RES_ORDER[i]);

        let bestBuyBase   = { city: '-', price: Infinity };
        let bestSellTarget = { city: '-', price: 0 };
        let bestResCities  = {};
        requiredRes.forEach(r => { bestResCities[r] = { city: '-', price: Infinity }; });

        let rows = [];

        m.forEach(row => {
            const basePrice = row.items?.[from]?.sell || 0;
            const targetSell = row.city === 'Black Market' ? (row.items?.[to]?.buy || 0) : (row.items?.[to]?.sell || 0);

            if (basePrice > 0 && basePrice < bestBuyBase.price) bestBuyBase = { city: row.city, price: basePrice };
            if (targetSell > bestSellTarget.price) bestSellTarget = { city: row.city, price: targetSell };

            requiredRes.forEach(res => {
                const p = row.resources?.[res]?.price || 0;
                if (p > 0 && p < bestResCities[res].price) bestResCities[res] = { city: row.city, price: p };
            });

            if (row.city !== 'Black Market' && basePrice > 0 && targetSell > 0) {
                let resTotal = 0;
                let valid = true;
                requiredRes.forEach(res => {
                    const p = row.resources?.[res]?.price || 0;
                    if (!p) valid = false;
                    resTotal += p;
                });
                const cost   = basePrice + resTotal * mult;
                const profit = targetSell * 0.915 - cost;
                rows.push({ city: row.city, profit: valid ? profit : 0, basePrice, resTotal, targetSell, valid });
            }
        });

        // Turbo route (best of each city)
        let turboCost = (bestBuyBase.price === Infinity ? 0 : bestBuyBase.price);
        requiredRes.forEach(r => {
            if (bestResCities[r].price !== Infinity) turboCost += bestResCities[r].price * mult;
        });
        const turboProfit = bestSellTarget.price * 0.915 - turboCost;

        rows.sort((a, b) => b.profit - a.profit);

        setResult({ rows, bestBuyBase, bestSellTarget, bestResCities, turboProfit, turboCost, requiredRes, mult });
    };

    useEffect(() => {
        if (matrix) computeResult(matrix, startEnch, targetEnch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startEnch, targetEnch]);

    const sendToLedger = async () => {
        if (!isProPlus || !result || !selectedItem) return;
        setLedgerLoading(true);
        try {
            const basePrice = result.bestBuyBase.price === Infinity ? 0 : result.bestBuyBase.price;

            // Строим список ингредиентов: базовый предмет + ресурсы зачарования
            const ingredients = [
                {
                    id:     selectedItem.id,
                    name:   selectedItem.name,
                    amount: 1,
                    price:  basePrice,
                    city:   result.bestBuyBase.city,
                },
                ...result.requiredRes.map(res => ({
                    id:     res,   // rune / soul / relic / shard — как идентификатор в бухгалтерии
                    name:   `${res} (×${result.mult})`,
                    amount: result.mult,
                    price:  result.bestResCities[res]?.price || 0,
                    city:   result.bestResCities[res]?.city || '',
                })),
            ];

            const payload = {
                items: [{
                    itemId:        `${selectedItem.id}@${targetEnch}`,
                    localizedName: `${selectedItem.name} .${targetEnch}`,
                    amount:        1,
                    sellPrice:     result.bestSellTarget.price,
                    buyCity:       result.bestBuyBase.city,
                    sellCity:      result.bestSellTarget.city,
                    region:        config.region || 'europe',
                    ingredients,
                }],
            };
            const res = await saveCraftLedger(payload);
            if (res?.success) { setLedgerDone(true); setTimeout(() => setLedgerDone(false), 2000); }
        } catch {}
        setLedgerLoading(false);
    };

    if (!isPro) return <div style={SI.wrap}><ProLock t={t} /></div>;

    return (
        <div style={SI.wrap}>
            {/* Item search */}
            <div style={{ position: 'relative' }} ref={dropRef}>
                <div style={SI.label}>{t('enchantSearch').split('...')[0]}</div>
                <input style={SI.input} placeholder={t('enchantSearch')} value={query}
                    onChange={e => { setQuery(e.target.value); setDropOpen(true); setSelectedItem(null); setResult(null); }}
                    onFocus={() => query.length >= 2 && setDropOpen(true)}
                    onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                />
                {dropOpen && <SearchDropdown query={query} onSelect={handleSelectItem} config={config} t={t} />}
            </div>

            {/* Enchant selectors + calc btn */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', marginTop: '6px' }}>
                <div style={{ flex: 1 }}>
                    <div style={SI.label}>{t('enchantFrom')}</div>
                    <select value={startEnch} onChange={e => handleStartChange(e.target.value)} style={{ ...SI.input, colorScheme: 'dark' }}>
                        {['0','1','2','3'].map(v => <option key={v} value={v} style={{ background: '#1e2030', color: '#e2e8f0' }}>.{v}</option>)}
                    </select>
                </div>
                <div style={{ color: '#475569', fontSize: '14px', paddingBottom: '6px' }}>→</div>
                <div style={{ flex: 1 }}>
                    <div style={SI.label}>{t('enchantTo')}</div>
                    <select value={targetEnch} onChange={e => { setTargetEnch(e.target.value); setResult(null); }} style={{ ...SI.input, colorScheme: 'dark' }}>
                        {['1','2','3','4'].filter(v => Number(v) > Number(startEnch)).map(v => <option key={v} value={v} style={{ background: '#1e2030', color: '#e2e8f0' }}>.{v}</option>)}
                    </select>
                </div>
                <button onClick={calculate} disabled={!selectedItem || loading} style={{ ...SI.btn, padding: '6px 10px', alignSelf: 'flex-end', opacity: (!selectedItem || loading) ? 0.5 : 1 }}>
                    {loading ? '…' : t('enchantCalc')}
                </button>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Best turbo route */}
                    <div style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.04))', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '9px', padding: '8px 10px', marginTop: '10px' }}>
                        <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{t('enchantBestProfit')}</div>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: '#22c55e', marginBottom: '6px' }}>{fmt(result.turboProfit)}</div>

                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{t('enchantBuyIn')}: <span style={{ color: '#e2e8f0' }}>{result.bestBuyBase.city} · {fmt(result.bestBuyBase.price === Infinity ? 0 : result.bestBuyBase.price)}</span></span>
                            {result.requiredRes.map(res => (
                                <span key={res}>{RES_EMOJI[res]} {res}: <span style={{ color: '#e2e8f0' }}>{result.bestResCities[res]?.city} · {fmt((result.bestResCities[res]?.price || 0) * result.mult)}</span></span>
                            ))}
                            <span>{t('enchantSellIn')}: <span style={{ color: '#e2e8f0' }}>{result.bestSellTarget.city} · {fmt(result.bestSellTarget.price)}</span></span>
                        </div>
                    </div>

                    {/* Per-city table */}
                    <div style={SI.sec}>{t('allCities')}</div>
                    {result.rows.slice(0, 7).map(row => (
                        <div key={row.city} style={SI.row}>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{row.city}</span>
                            <span style={{ fontWeight: '700', fontSize: '12px', color: row.profit > 0 ? '#22c55e' : '#ef4444' }}>{fmt(row.profit)}</span>
                        </div>
                    ))}

                    {/* Ledger — PRO+ only */}
                    {isProPlus ? (
                        <button onClick={sendToLedger} disabled={ledgerLoading || ledgerDone} style={{ ...SI.btn, width: '100%', marginTop: '10px', background: ledgerDone ? '#22c55e' : '#3b82f6', fontSize: '11px' }}>
                            {ledgerDone ? t('enchantLedgerDone') : ledgerLoading ? t('loading') : t('enchantSendLedger')}
                        </button>
                    ) : (
                        <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '10px', color: '#475569' }}>🔒 {t('enchantLedgerProPlus')}</div>
                    )}
                </>
            )}

            {!result && !loading && (
                <div style={{ color: '#334155', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>{t('enchantNoData')}</div>
            )}
        </div>
    );
}
