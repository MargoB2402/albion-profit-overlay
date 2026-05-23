import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

export default function AlertsWidget() {
    const { fetchAlerts, isLoggedIn } = useApi();
    const { t } = useI18n();
    const [alerts,  setAlerts]  = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoggedIn) { setLoading(false); return; }
        fetchAlerts()
            .then(data => { if (Array.isArray(data)) setAlerts(data); })
            .finally(() => setLoading(false));
        const timer = setInterval(() => {
            fetchAlerts().then(data => { if (Array.isArray(data)) setAlerts(data); });
        }, 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, [isLoggedIn, fetchAlerts]);

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', flex: 1 }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>🔔</div>
                <div style={{ fontSize: '12px', lineHeight: 1.5 }}>{t('alertsLogin')}</div>
            </div>
        );
    }

    const active = alerts.filter(a => a.is_active);

    return (
        <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{t('alertsActive')}: {active.length} / 20</span>
                <a href="https://promptly.sbs/?tab=alerts" target="_blank" rel="noreferrer"
                    style={{ fontSize: '11px', color: '#c8a050', textDecoration: 'none', fontWeight: '600' }}>
                    {t('alertsAdd')}
                </a>
            </div>

            {loading && <div style={{ color: '#475569', fontSize: '11px' }}>{t('alertsLoading')}</div>}

            {!loading && active.length === 0 && (
                <div style={{ textAlign: 'center', color: '#334155', padding: '20px 0' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>🔕</div>
                    <div style={{ fontSize: '11px' }}>{t('alertsNone')}</div>
                </div>
            )}

            {active.map(alert => (
                <div key={alert.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '8px', padding: '8px 10px', marginBottom: '5px',
                }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '3px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alert.item_name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: alert.condition === 'lt' ? '#ef4444' : '#22c55e' }}>
                            {alert.condition === 'lt' ? '📉 <' : '📈 >'} {fmt(alert.target_price)}
                        </span>
                        <span>{alert.city === 'any' ? t('anyCity') : alert.city}</span>
                        {alert.last_triggered && (
                            <span>↩ {new Date(alert.last_triggered).toLocaleDateString()}</span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
