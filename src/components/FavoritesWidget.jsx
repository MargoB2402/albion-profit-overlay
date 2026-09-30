import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n } from '../hooks/useI18n';

// Избранное с сайта прямо в оверлее. Главное тут — кнопка копирования имени:
// в игре название приходится вбивать в поиск аукциона руками, а так достаточно
// вставить. Имя приходит с сервера на языке оверлея (name_localized), потому что
// в базе лежит то, что было в интерфейсе сайта на момент добавления.

const fmt = n => n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M' : n >= 1_000 ? (n / 1_000).toFixed(1) + 'K' : String(Math.round(n));

export default function FavoritesWidget() {
    const { fetchFavorites, isLoggedIn } = useApi();
    const { t } = useI18n();
    const [items, setItems]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied]   = useState(null);

    const load = useCallback(() => {
        if (!isLoggedIn) { setLoading(false); return; }
        fetchFavorites().then(setItems).finally(() => setLoading(false));
    }, [isLoggedIn, fetchFavorites]);

    useEffect(() => {
        load();
        const timer = setInterval(load, 5 * 60 * 1000);
        return () => clearInterval(timer);
    }, [load]);

    const copyName = (name, id) => {
        navigator.clipboard.writeText(name).catch(() => {});
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
    };

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#475569', flex: 1 }}>
                <div style={{ fontSize: '30px', marginBottom: '8px' }}>⭐</div>
                <div style={{ fontSize: '12px', lineHeight: 1.5 }}>{t('favLogin')}</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#475569' }}>{t('favTracked')}: {items.length}</span>
                <a href="https://promptly.sbs/favorites" target="_blank" rel="noreferrer"
                    style={{ fontSize: '11px', color: '#c8a050', textDecoration: 'none', fontWeight: '600' }}>
                    {t('favOpenSite')}
                </a>
            </div>

            {loading && <div style={{ color: '#475569', fontSize: '11px' }}>{t('favLoading')}</div>}

            {!loading && items.length === 0 && (
                <div style={{ textAlign: 'center', color: '#334155', padding: '20px 0' }}>
                    <div style={{ fontSize: '26px', marginBottom: '6px' }}>☆</div>
                    <div style={{ fontSize: '11px' }}>{t('favEmpty')}</div>
                </div>
            )}

            {items.map(item => {
                const name = item.name_localized || item.item_name || item.item_id;
                return (
                    <div key={item.item_id} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '8px', padding: '8px 10px', marginBottom: '5px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {name}
                            </div>
                            {item.locked ? (
                                <div style={{ fontSize: '10px', color: '#c8a050' }}>{t('favLockedPro')}</div>
                            ) : (
                                <div style={{ fontSize: '10px', color: '#475569' }}>
                                    {item.best_city} · {fmt(item.best_price)} · {item.daily_volume}/{t('daily')}
                                </div>
                            )}
                        </div>
                        <button onClick={() => copyName(name, item.item_id)} title={t('favCopy')} style={{
                            flexShrink: 0, padding: '5px 9px', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '10px', fontWeight: '600',
                            background: copied === item.item_id ? 'rgba(34,197,94,0.15)' : 'rgba(200,160,80,0.12)',
                            border: `1px solid ${copied === item.item_id ? 'rgba(34,197,94,0.4)' : 'rgba(200,160,80,0.3)'}`,
                            color: copied === item.item_id ? '#22c55e' : '#c8a050',
                        }}>
                            {copied === item.item_id ? t('favCopied') : t('favCopy')}
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
