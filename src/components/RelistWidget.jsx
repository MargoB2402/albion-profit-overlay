import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

// «Корректировка лотов»: лоты, которые на рынке уже перебили — наша цена выше
// самой низкой в том же городе. Группируем по городам, потому что игрок ходит
// именно по городам: пришёл в Мартлок — перевыставил всё, что там висит.
// Данные те же, что дают подсветку перебивки в Бухгалтерии, значит PRO+.

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

export default function RelistWidget() {
    const { fetchOutbid, isLoggedIn, isProPlus } = useApi();
    const { t } = useI18n();
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [denied, setDenied]   = useState(false);
    const [copied, setCopied]   = useState(null);

    const load = useCallback(() => {
        if (!isLoggedIn) { setLoading(false); return; }
        fetchOutbid()
            .then(res => {
                if (res?.error === 'PRO_PLUS_REQUIRED') { setDenied(true); setItems([]); return; }
                setDenied(false);
                setItems(Array.isArray(res?.items) ? res.items : []);
            })
            .finally(() => setLoading(false));
    }, [isLoggedIn, fetchOutbid]);

    useEffect(() => {
        load();
        const timer = setInterval(load, 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, [load]);

    const copyName = (name, key) => {
        navigator.clipboard.writeText(name).catch(() => {});
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
    };

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', flex: 1 }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>🏷</div>
                <div style={{ fontSize: '12px', lineHeight: 1.5 }}>{t('relistLogin')}</div>
            </div>
        );
    }

    if (denied || (!loading && !isProPlus && items.length === 0)) {
        return (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', flex: 1 }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>👑</div>
                <div style={{ fontSize: '12px', lineHeight: 1.5, marginBottom: '10px' }}>{t('relistProPlus')}</div>
                <a href="https://promptly.sbs/pricing" target="_blank" rel="noreferrer"
                    style={{ fontSize: '11px', color: '#c8a050', textDecoration: 'none', fontWeight: '600' }}>
                    {t('upgradePro')}
                </a>
            </div>
        );
    }

    // Город → лоты. Внутри города порядок уже по величине отставания (сортировка с сервера).
    const byCity = items.reduce((acc, it) => {
        (acc[it.city] = acc[it.city] || []).push(it);
        return acc;
    }, {});
    const cities = Object.keys(byCity);

    return (
        <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{t('relistOutbid')}: {items.length}</span>
                <button onClick={load} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '11px', color: '#c8a050', fontWeight: '600', padding: 0,
                }}>{t('relistRefresh')}</button>
            </div>

            {loading && <div style={{ color: '#475569', fontSize: '11px' }}>{t('relistLoading')}</div>}

            {!loading && items.length === 0 && (
                <div style={{ textAlign: 'center', color: '#334155', padding: '20px 0' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>✓</div>
                    <div style={{ fontSize: '11px' }}>{t('relistEmpty')}</div>
                </div>
            )}

            {cities.map(city => (
                <div key={city} style={{ marginBottom: '10px' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: '11px', fontWeight: '700', color: '#c8a050',
                        padding: '3px 2px', borderBottom: '1px solid rgba(200,160,80,0.2)', marginBottom: '5px',
                    }}>
                        <span>{city}</span>
                        <span style={{ color: '#475569', fontWeight: '600' }}>{byCity[city].length}</span>
                    </div>

                    {byCity[city].map((it, i) => {
                        const key = `${city}-${it.itemId}-${i}`;
                        return (
                            <div key={key} style={{
                                background: 'rgba(239,68,68,0.06)',
                                border: '1px solid rgba(239,68,68,0.18)',
                                borderRadius: '8px', padding: '8px 10px', marginBottom: '5px',
                                display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {it.name}{it.quality > 1 ? ` · Q${it.quality}` : ''}{it.qty ? ` · ×${it.qty}` : ''}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#475569' }}>
                                        <span style={{ color: '#ef4444' }}>{fmt(it.myPrice)}</span>
                                        {' → '}
                                        <span style={{ color: '#22c55e' }}>{fmt(it.marketLowest)}</span>
                                        {' · −'}{fmt(it.diff)} ({it.diffPct}%)
                                    </div>
                                </div>
                                <button onClick={() => copyName(it.name, key)} title={t('favCopy')} style={{
                                    flexShrink: 0, padding: '5px 9px', borderRadius: '6px', cursor: 'pointer',
                                    fontSize: '10px', fontWeight: '600',
                                    background: copied === key ? 'rgba(34,197,94,0.15)' : 'rgba(200,160,80,0.12)',
                                    border: `1px solid ${copied === key ? 'rgba(34,197,94,0.4)' : 'rgba(200,160,80,0.3)'}`,
                                    color: copied === key ? '#22c55e' : '#c8a050',
                                }}>
                                    {copied === key ? t('favCopied') : t('favCopy')}
                                </button>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
