import React, { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

const QUALITY = [
    { v: 1, short: 'N', label: 'Normal',      color: '#64748b' },
    { v: 2, short: 'G', label: 'Good',         color: '#22c55e' },
    { v: 3, short: 'O', label: 'Outstanding',  color: '#3b82f6' },
    { v: 4, short: 'E', label: 'Excellent',    color: '#a855f7' },
    { v: 5, short: 'M', label: 'Masterpiece',  color: '#c8a050' },
];

export default function TradeNotification({ trade, onConfirm, onDismiss }) {
    const { saveTrade } = useApi();
    const { t } = useI18n();
    const [saving, setSaving] = useState(false);
    const [saved,  setSaved]  = useState(false);
    const [quality, setQuality] = useState(1);

    const isBuy  = trade.type === 'trade_buy';
    const p      = trade.payload;
    const total  = p.price * p.quantity;

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveTrade({ ...trade, quality });
            setSaved(true);
            setTimeout(onConfirm, 1500);
        } catch (e) {
            alert(t('error') + ': ' + e.message);
        }
        setSaving(false);
    };

    return (
        <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(10,12,20,0.97)',
            borderTop: `2px solid ${isBuy ? '#3b82f6' : '#22c55e'}`,
            padding: '12px',
            animation: 'slideUp 0.2s ease-out',
        }}>
            <div style={{ fontSize: '11px', color: isBuy ? '#3b82f6' : '#22c55e', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {isBuy ? `📥 ${t('quickBought')}` : `📤 ${t('tradeDetectedSell')||'Sale detected'}`}
            </div>

            <div style={{ marginBottom: '10px' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#e2e8f0', marginBottom: '2px' }}>{p.item_name || p.item_id}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {p.quantity} {t('craftPcs')} × {fmt(p.price)} = <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{fmt(total)}</span>
                    <span style={{ marginLeft: '8px' }}>📍 {p.city}</span>
                </div>
                {/* Quality picker */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#475569', marginRight: '2px' }}>Quality:</span>
                    {QUALITY.map(q => (
                        <button key={q.v} onClick={() => setQuality(q.v)} title={q.label}
                            style={{ width: '26px', height: '22px', borderRadius: '5px', border: `1px solid ${q.color}55`, background: quality === q.v ? q.color + '33' : 'transparent', color: q.color, fontWeight: '700', fontSize: '10px', cursor: 'pointer' }}>
                            {q.short}
                        </button>
                    ))}
                </div>
            </div>

            {saved ? (
                <div style={{ color: '#22c55e', fontWeight: '700', fontSize: '13px' }}>✅ Записано в бухгалтерию!</div>
            ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{ flex: 1, padding: '7px', background: isBuy ? '#3b82f6' : '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' }}
                    >
                        {saving ? '...' : '📒 Записать в бухгалтерию'}
                    </button>
                    <button
                        onClick={onDismiss}
                        style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>
    );
}
