import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

const S = {
    wrap:  { padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 },
    input: { width: '100%', padding: '7px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' },
    label: { fontSize: '10px', color: '#475569', marginBottom: '3px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' },
    btn:   { flex: 1, padding: '8px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
};

export default function SplitWidget({ city }) {
    const { fetchPrice } = useApi();
    const { t } = useI18n();

    const [mode,    setMode]    = useState('items');
    const [items,   setItems]   = useState('');
    const [amount,  setAmount]  = useState('');
    const [players, setPlayers] = useState(5);
    const [tax,     setTax]     = useState(10);
    const [result,  setResult]  = useState(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        setLoading(true);
        try {
            let total = 0;
            const lines = [];
            if (mode === 'amount') {
                total = Number(amount.replace(/\s/g, ''));
                lines.push(`💰 ${fmt(total)}`);
            } else {
                const names = items.split('\n').map(s => s.trim()).filter(Boolean);
                for (const name of names) {
                    const data = await fetchPrice(name);
                    if (data?.success && !data.locked) {
                        const best = data.prices.find(p => p.city === city) || data.prices.sort((a, b) => b.sell - a.sell)[0];
                        const price = best?.sell || 0;
                        total += price;
                        lines.push(`• ${data.itemName}: ${fmt(price)}`);
                    } else {
                        lines.push(`• ${name}: ${t('noResults')}`);
                    }
                }
            }
            const afterTax  = Math.floor(total * (1 - tax / 100));
            const perPlayer = Math.floor(afterTax / players);
            setResult({ total, afterTax, perPlayer, lines });
        } catch {}
        setLoading(false);
    };

    return (
        <div style={S.wrap}>
            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '3px' }}>
                {[['items', t('splitItems')], ['amount', t('splitAmount')]].map(([m, l]) => (
                    <button key={m} onClick={() => setMode(m)} style={{
                        flex: 1, padding: '6px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                        fontWeight: '600', fontSize: '11px',
                        background: mode === m ? 'rgba(200,160,80,0.2)' : 'transparent',
                        color: mode === m ? '#c8a050' : '#475569',
                    }}>{l}</button>
                ))}
            </div>

            {mode === 'items' ? (
                <div style={{ marginBottom: '8px' }}>
                    <label style={S.label}>{t('itemsList')}</label>
                    <textarea style={{ ...S.input, height: '80px', resize: 'vertical' }}
                        value={items} onChange={e => setItems(e.target.value)}
                        placeholder={"T7 Bloodletter\nT6 Guardian Helmet\nT8 Rune Dagger"} />
                </div>
            ) : (
                <div style={{ marginBottom: '8px' }}>
                    <label style={S.label}>{t('silverAmount')}</label>
                    <input style={S.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5000000" />
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                    <label style={S.label}>{t('playersLabel')}</label>
                    <input style={S.input} type="number" value={players} onChange={e => setPlayers(Math.max(1, Number(e.target.value)))} min={1} max={50} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={S.label}>{t('taxLabel')}</label>
                    <input style={S.input} type="number" value={tax} onChange={e => setTax(Number(e.target.value))} min={0} max={25} step={0.5} />
                </div>
            </div>

            <button style={{ ...S.btn, width: '100%' }} onClick={calculate} disabled={loading}>
                {loading ? t('loading') : t('calcSplit')}
            </button>

            {result && (
                <div style={{
                    marginTop: '10px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(200,160,80,0.2)', borderRadius: '9px', padding: '10px 12px',
                }}>
                    {result.lines.map((l, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>{l}</div>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px', paddingTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px' }}>
                            <span style={{ color: '#475569' }}>{t('afterTaxLabel')} {tax}%</span>
                            <span style={{ color: '#94a3b8' }}>{fmt(result.afterTax)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span style={{ color: '#c8a050', fontWeight: '700' }}>{players} {t('perPlayer')}</span>
                            <span style={{ color: '#22c55e', fontWeight: '800' }}>{fmt(result.perPlayer)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
