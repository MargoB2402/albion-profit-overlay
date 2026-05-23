import React, { useState, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

const CITIES = ['Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien'];

const S = {
    wrap:   { padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 },
    label:  { fontSize: '10px', color: '#475569', marginBottom: '3px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' },
    input:  { width: '100%', padding: '7px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    select: { width: '100%', padding: '7px 9px', background: 'rgba(12,14,26,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', colorScheme: 'dark' },
    btn:    { width: '100%', padding: '8px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px', marginTop: '8px' },
    sec:    { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', marginTop: '10px' },
    card:   { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', padding: '10px 12px', marginBottom: '6px' },
    row:    { display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' },
};

function ResultCard({ result, tax, t }) {
    return (
        <div style={{ ...S.card, border: `1px solid ${result.profit >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <div style={{ fontWeight: '700', marginBottom: '7px', fontSize: '13px' }}>{result.itemName}</div>
            {[
                [t('buyPriceCol'),    fmt(result.fromPrice), '#64748b'],
                [t('sellBeforeTax'), fmt(result.toPrice),   '#94a3b8'],
                [`${t('afterTaxLabel')} ${tax}%`, fmt(result.afterTax), '#e2e8f0'],
                [t('profitPer'),     (result.profit >= 0 ? '+' : '') + fmt(result.profit), result.profit >= 0 ? '#22c55e' : '#ef4444'],
                [t('marginLabel'),   result.margin + '%', result.margin >= 0 ? '#22c55e' : '#ef4444'],
            ].map(([l, v, c]) => (
                <div key={l} style={S.row}>
                    <span style={{ color: '#475569' }}>{l}</span>
                    <span style={{ color: c, fontWeight: '600' }}>{v}</span>
                </div>
            ))}
        </div>
    );
}

function Top5Card({ item, t }) {
    return (
        <div style={{
            background: 'rgba(200,160,80,0.05)', border: '1px solid rgba(200,160,80,0.15)',
            borderRadius: '9px', padding: '8px 10px', marginBottom: '5px',
            display: 'flex', alignItems: 'center', gap: '8px',
        }}>
            <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: 'rgba(200,160,80,0.12)', border: '1px solid rgba(200,160,80,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#c8a050', fontWeight: '800', flexShrink: 0,
            }}>T{item.tier}{item.enchant ? `.${item.enchant}` : ''}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.itemName}
                </div>
                <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>
                    {fmt(item.buyPrice)} → {fmt(item.sellPrice)} · {item.daily}/{t('daily')}
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#22c55e' }}>+{fmt(item.profit)}</div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>{item.margin}%</div>
            </div>
        </div>
    );
}

export default function TransportWidget({ city }) {
    const { fetchPrice, fetchTransportTop, config } = useApi();
    const { t } = useI18n();

    const [item,    setItem]    = useState('');
    const [from,    setFrom]    = useState(city !== 'unknown' ? city : 'Thetford');
    const [to,      setTo]      = useState('Caerleon');
    const [tax,     setTax]     = useState(10.5);
    const [result,  setResult]  = useState(null);
    const [loading, setLoading] = useState(false);

    // Top-5 mode
    const [mode,        setMode]        = useState('single'); // 'single' | 'top5'
    const [filterMode,  setFilterMode]  = useState(null);    // null = not asked yet, 'all' | 'safe'
    const [top5,        setTop5]        = useState(null);
    const [top5Loading, setTop5Loading] = useState(false);

    React.useEffect(() => {
        if (city && city !== 'unknown') setFrom(city);
    }, [city]);

    const calculate = async () => {
        if (!item.trim()) return;
        setLoading(true);
        try {
            const data = await fetchPrice(item);
            if (!data?.success) { setResult({ error: t('noResults') }); return; }
            const fromPrice = data.prices.find(p => p.city === from)?.sell || 0;
            const toPrice   = data.prices.find(p => p.city === to)?.sell   || 0;
            if (!fromPrice || !toPrice) { setResult({ error: t('noPrices') }); return; }
            const afterTax = Math.round(toPrice * (1 - tax / 100));
            const profit   = afterTax - fromPrice;
            setResult({ fromPrice, toPrice, afterTax, profit, margin: ((profit / fromPrice) * 100).toFixed(1), itemName: data.itemName });
        } catch (e) { setResult({ error: e.message }); }
        setLoading(false);
    };

    const loadTop5 = useCallback(async (useSafeFilter) => {
        setTop5Loading(true);
        setTop5(null);
        try {
            const data = await fetchTransportTop({ from, to, tax, safetyFilter: useSafeFilter });
            if (data?.success) setTop5(data);
            else setTop5({ error: t(data?.message === 'cache_not_ready' ? 'cacheNotReady' : 'error') });
        } catch { setTop5({ error: t('error') }); }
        setTop5Loading(false);
    }, [from, to, tax, fetchTransportTop, t]);

    const handleTop5Click = () => {
        setMode('top5');
        setFilterMode(null);
        setTop5(null);
    };

    const handleFilterChoice = (choice) => {
        setFilterMode(choice);
        loadTop5(choice === 'safe');
    };

    return (
        <div style={S.wrap}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px' }}>
                {[['single', '🔍'], ['top5', '🏆']].map(([m, icon]) => (
                    <button key={m} onClick={() => { setMode(m); if (m === 'top5') handleTop5Click(); }} style={{
                        flex: 1, padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '11px',
                        background: mode === m ? 'rgba(200,160,80,0.2)' : 'transparent',
                        color: mode === m ? '#c8a050' : '#475569',
                    }}>
                        {icon} {mode === m ? (m === 'single' ? t('itemLabel') : t('top5Title')) : (m === 'single' ? t('itemLabel') : t('top5Title'))}
                    </button>
                ))}
            </div>

            {/* From / To / Tax — always visible */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '7px' }}>
                <div style={{ flex: 1 }}>
                    <label style={S.label}>{t('fromLabel')}</label>
                    <select style={S.select} value={from} onChange={e => setFrom(e.target.value)}>
                        {CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1px', fontSize: '14px', color: '#475569' }}>→</div>
                <div style={{ flex: 1 }}>
                    <label style={S.label}>{t('toLabel')}</label>
                    <select style={S.select} value={to} onChange={e => setTo(e.target.value)}>
                        {CITIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div style={{ width: '54px' }}>
                    <label style={S.label}>{t('taxLabel')}</label>
                    <input style={S.input} type="number" value={tax} onChange={e => setTax(Number(e.target.value))} min={0} max={25} step={0.5} />
                </div>
            </div>

            {/* ── Single item mode ── */}
            {mode === 'single' && (
                <>
                    <label style={S.label}>{t('itemLabel')}</label>
                    <input style={{ ...S.input, marginBottom: '0' }} value={item}
                        onChange={e => setItem(e.target.value)}
                        placeholder={t('searchPlaceholder')}
                        onKeyDown={e => e.key === 'Enter' && calculate()} />
                    <button style={S.btn} onClick={calculate} disabled={loading}>
                        {loading ? t('loading') : t('calcBtn')}
                    </button>

                    {result && !result.error && <ResultCard result={result} tax={tax} t={t} />}
                    {result?.error && <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '11px' }}>❌ {result.error}</div>}
                </>
            )}

            {/* ── Top-5 mode ── */}
            {mode === 'top5' && (
                <>
                    {/* Filter choice prompt */}
                    {filterMode === null && !top5Loading && (
                        <div style={{ ...S.card, textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px', lineHeight: 1.5 }}>
                                {t('filterAll')} или {t('filterSafe')}?
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleFilterChoice('all')} style={{
                                    flex: 1, padding: '7px', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '7px', background: 'transparent', color: '#94a3b8',
                                    cursor: 'pointer', fontSize: '11px',
                                }}>
                                    {t('filterAll')}
                                </button>
                                <button onClick={() => handleFilterChoice('safe')} style={{
                                    flex: 1, padding: '7px', border: '1px solid rgba(200,160,80,0.3)',
                                    borderRadius: '7px', background: 'rgba(200,160,80,0.1)', color: '#c8a050',
                                    cursor: 'pointer', fontSize: '11px', fontWeight: '700',
                                }}>
                                    {t('filterSafe')}
                                </button>
                            </div>
                            {filterMode !== null && (
                                <div style={{ fontSize: '10px', color: '#475569', marginTop: '6px' }}>
                                    {t('filterDesc')}
                                </div>
                            )}
                            <button onClick={() => { /* handled by Settings */ }} style={{
                                background: 'none', border: 'none', color: '#475569', cursor: 'pointer',
                                fontSize: '10px', marginTop: '8px', textDecoration: 'underline',
                            }}>
                                {t('filterSettings')}
                            </button>
                        </div>
                    )}

                    {top5Loading && (
                        <div style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                            {t('loading')} ТОП-5…
                        </div>
                    )}

                    {filterMode !== null && !top5Loading && top5?.items?.length > 0 && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <div style={S.sec}>{t('top5Title')} · {from} → {to}</div>
                                <button onClick={() => setFilterMode(null)} style={{
                                    background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '10px',
                                }}>↩</button>
                            </div>
                            {filterMode === 'safe' && (
                                <div style={{ fontSize: '10px', color: '#475569', marginBottom: '6px', background: 'rgba(200,160,80,0.06)', borderRadius: '6px', padding: '4px 8px' }}>
                                    🔒 {t('filterDesc')}
                                </div>
                            )}
                            {top5.items.map(item => <Top5Card key={item.itemId} item={item} t={t} />)}
                            {!top5.isPro && (
                                <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', marginTop: '4px' }}>
                                    T7–T8 · <a href="https://promptly.sbs/#pricing" target="_blank" rel="noreferrer" style={{ color: '#c8a050' }}>PRO</a>
                                </div>
                            )}
                        </>
                    )}

                    {filterMode !== null && !top5Loading && top5?.items?.length === 0 && (
                        <div style={{ color: '#475569', fontSize: '11px', textAlign: 'center', padding: '12px 0' }}>
                            {t('noResults')}
                        </div>
                    )}

                    {top5?.error && (
                        <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '8px' }}>❌ {top5.error}</div>
                    )}
                </>
            )}
        </div>
    );
}
