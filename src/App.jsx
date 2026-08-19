import React, { useState, useRef, useCallback, useEffect } from 'react';
import PriceWidget from './components/PriceWidget';
import TransportWidget from './components/TransportWidget';
import CraftWidget from './components/CraftWidget';
import EnchantWidget from './components/EnchantWidget';
import SplitWidget from './components/SplitWidget';
import AlertsWidget from './components/AlertsWidget';
import TradeNotification from './components/TradeNotification';
import Settings from './components/Settings';
import { useAgent } from './hooks/useAgent';
import { useApi } from './hooks/useApi';
import { useI18n } from './hooks/useI18n';

const TABS = [
    { id: 'price',     icon: '₴' },
    { id: 'transport', icon: '→' },
    { id: 'craft',     icon: '⚒' },
    { id: 'enchant',   icon: '✦' },
    { id: 'split',     icon: '÷' },
    { id: 'alerts',    icon: '◆' },
];

const TAB_KEYS = { price: 'tabPrice', transport: 'tabTransport', craft: 'tabCraft', enchant: 'tabEnchant', split: 'tabSplit', alerts: 'tabAlerts' };

export default function App() {
    const [tab, setTab]                   = useState('price');
    const [ocrCity, setOcrCity] = useState(null); // город от OCR
    const city = ocrCity || 'unknown';
    const [pendingTrade, setPendingTrade] = useState(null);
    const [updateInfo, setUpdateInfo]     = useState(null); // { latest, url }
    // При первом запуске (нет сохранённых данных) — сразу показываем настройки
    const [settingsOpen, setSettingsOpen] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('overlay-first-run') || '{}');
            return !saved.configured;
        } catch { return true; }
    });
    const [agentConnected, setAgentConnected] = useState(false);
    // Локация игрока (из пакетов агента, НЕ ocrCity) — нужна для авто-детекта мгновенной
    // покупки. Узнаётся только при смене зоны, поэтому на свежем старте агента её нет.
    const [agentLocationKnown, setAgentLocationKnown] = useState(false);
    const [minimized, setMinimized]       = useState(false);
    const dragRef = useRef({ dragging: false, startX: 0, startY: 0 });

    const { config, isLoggedIn, isPro, isProPlus, saveConfig, logout } = useApi();
    const { t } = useI18n();

    // Проверяем обновление при запуске (раз в сессию)
    useEffect(() => {
        window.electron?.checkGithubUpdate?.().then(info => {
            if (!info) return;
            // Сравниваем версии: если GitHub новее текущей
            const toNum = v => v.split('.').reduce((a, n, i) => a + Number(n) * (1000 ** (2 - i)), 0);
            if (toNum(info.latest) > toNum(info.current)) setUpdateInfo(info);
        });
    }, []);

    const { lastEvent } = useAgent({
        onConnect:    () => setAgentConnected(true),
        onDisconnect: () => setAgentConnected(false),
        onEvent: (evt) => {
            if ((evt.type === 'trade_buy' || evt.type === 'trade_sell') && isLoggedIn && config.autoLogTrade) {
                setPendingTrade(evt);
            }
            if (evt.type === 'location') {
                setAgentLocationKnown(true);
            }
            // market_view НЕ переключает вкладку — агент только передаёт товарную позицию
        },
    });

    const toggleMinimize = useCallback(() => {
        const next = !minimized;
        setMinimized(next);
        window.electron?.setMinimized(next);
    }, [minimized]);

    const onMouseDown = useCallback((e) => {
        if (e.target.closest('button, input, select, textarea, a')) return;
        dragRef.current = { dragging: true, startX: e.screenX, startY: e.screenY };
        const onMove = (e2) => {
            if (!dragRef.current.dragging) return;
            window.electron?.moveWindow({ dx: e2.screenX - dragRef.current.startX, dy: e2.screenY - dragRef.current.startY });
            dragRef.current.startX = e2.screenX;
            dragRef.current.startY = e2.screenY;
        };
        const onUp = () => {
            dragRef.current.dragging = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, []);

    // ── Minimized bar ──
    if (minimized) {
        return (
            <div onMouseDown={onMouseDown} style={{
                width: '100vw', height: '100vh',
                background: 'linear-gradient(90deg, rgba(12,14,26,0.97) 0%, rgba(8,10,20,0.99) 100%)',
                backdropFilter: 'blur(20px)',
                borderRadius: '10px',
                border: '1px solid rgba(200,160,80,0.18)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '0 10px',
                fontFamily: "'Inter', -apple-system, sans-serif",
                color: '#e2e8f0',
                overflow: 'hidden',
                userSelect: 'none',
                cursor: 'grab',
            }}>
                <img src="./logo.svg" style={{ width: '16px', height: '16px', flexShrink: 0 }} alt="" />
                <span style={{ fontSize: '10px', fontWeight: '800', color: '#c8a050', letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1 }}>
                    {t('appName')}
                </span>
                {city !== 'unknown' && (
                    <span style={{ fontSize: '9px', color: '#64748b' }}>📍 {city}</span>
                )}
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: agentConnected ? '#22c55e' : '#475569', boxShadow: agentConnected ? '0 0 4px #22c55e88' : 'none' }} />
                <button onClick={toggleMinimize} style={{ background: 'transparent', border: '1px solid rgba(200,160,80,0.3)', borderRadius: '4px', color: '#c8a050', cursor: 'pointer', fontSize: '11px', padding: '1px 5px', lineHeight: 1 }}>
                    {t('expandBtn')}
                </button>
            </div>
        );
    }

    return (
        <div onMouseDown={onMouseDown} style={{
            width: '100vw', height: '100vh',
            background: 'linear-gradient(160deg, rgba(12,14,26,0.95) 0%, rgba(8,10,20,0.97) 100%)',
            backdropFilter: 'blur(20px)',
            borderRadius: '14px',
            border: '1px solid rgba(200,160,80,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            display: 'flex', flexDirection: 'column',
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: '#e2e8f0',
            overflow: 'hidden',
            userSelect: 'none',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '9px 12px 8px',
                background: 'linear-gradient(90deg, rgba(200,160,80,0.08) 0%, transparent 100%)',
                borderBottom: '1px solid rgba(200,160,80,0.12)',
                cursor: 'grab',
                flexShrink: 0,
            }}>
                <img src="./logo.svg" style={{ width: '20px', height: '20px', flexShrink: 0 }} alt="" />
                <span style={{
                    fontSize: '12px', fontWeight: '800', color: '#c8a050',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                }}>
                    {t('appName')}
                </span>

                {/* City badge */}
                {city !== 'unknown' && (
                    <span style={{
                        fontSize: '10px', color: '#94a3b8',
                        background: 'rgba(255,255,255,0.06)', padding: '2px 7px',
                        borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
                        maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        📍 {city}
                    </span>
                )}

                {/* Settings button — заметная кнопка */}
                <button
                    onClick={() => setSettingsOpen(s => !s)}
                    style={{
                        marginLeft: 'auto',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: settingsOpen ? 'rgba(200,160,80,0.18)' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${settingsOpen ? 'rgba(200,160,80,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '7px',
                        color: settingsOpen ? '#c8a050' : '#94a3b8',
                        cursor: 'pointer', fontSize: '11px', fontWeight: '600',
                        padding: '3px 9px', letterSpacing: '0.03em',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,160,80,0.4)'; e.currentTarget.style.color = '#c8a050'; }}
                    onMouseLeave={e => { if (!settingsOpen) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; } }}
                >
                    ⚙ {!isLoggedIn ? <span style={{ color: '#f59e0b' }}>!</span> : null}
                </button>

                {/* Minimize */}
                <button onClick={toggleMinimize} title={t('miniBtn')} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', color: '#475569', cursor: 'pointer',
                    fontSize: '14px', lineHeight: 1, padding: '2px 7px',
                    transition: 'color 0.15s',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = '#c8a050'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >—</button>

                {/* Close */}
                <button onClick={() => window.electron?.closeWindow()} style={{
                    background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px', color: '#475569', cursor: 'pointer',
                    fontSize: '15px', lineHeight: 1, padding: '2px 7px',
                    transition: 'color 0.15s',
                }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >×</button>
            </div>

            {/* ── Update banner ── */}
            {updateInfo && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.10))',
                    borderBottom: '1px solid rgba(245,158,11,0.35)',
                    padding: '5px 10px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    flexShrink: 0, fontSize: '11px',
                }}>
                    <span style={{ color: '#fbbf24' }}>🔄</span>
                    <span style={{ color: '#fde68a', flex: 1 }}>
                        Доступна версия <b>{updateInfo.latest}</b> — переустановите для автообновлений
                    </span>
                    <button
                        onClick={() => window.open(updateInfo.url)}
                        style={{ padding: '3px 9px', background: '#f59e0b', color: '#000', border: 'none', borderRadius: '5px', fontWeight: '700', cursor: 'pointer', fontSize: '11px', flexShrink: 0 }}
                    >
                        Скачать
                    </button>
                    <button
                        onClick={() => setUpdateInfo(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}
                    >×</button>
                </div>
            )}

            {/* ── Tabs ── */}
            {!settingsOpen && (
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(0,0,0,0.2)',
                    flexShrink: 0,
                }}>
                    {TABS.map(({ id, icon }) => {
                        const active = tab === id;
                        return (
                            <button key={id} onClick={() => setTab(id)} style={{
                                flex: 1, padding: '7px 4px 6px',
                                background: active ? 'rgba(200,160,80,0.12)' : 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${active ? '#c8a050' : 'transparent'}`,
                                color: active ? '#c8a050' : '#475569',
                                cursor: 'pointer', fontSize: '16px',
                                transition: 'all 0.15s',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                            }}>
                                <span>{icon}</span>
                                <span style={{ fontSize: '8px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    {t(TAB_KEYS[id])}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Content ── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {settingsOpen ? (
                    <Settings
                        config={config} isLoggedIn={isLoggedIn} isPro={isPro} isProPlus={isProPlus}
                        saveConfig={saveConfig} logout={logout}
                        agentLocationKnown={agentLocationKnown} onClose={() => {
                        localStorage.setItem('overlay-first-run', JSON.stringify({ configured: true }));
                        setSettingsOpen(false);
                    }} />
                ) : (
                    <>
                        {/* display:none вместо &&-рендера — компоненты (и OCR!) остаются живыми на всех вкладках */}
                        {/* overflow НЕ ставим — каждый виджет сам управляет своим скроллом */}
                        <div style={{ display: tab === 'price'     ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><PriceWidget     city={city} lastEvent={lastEvent} onOCRCity={setOcrCity} /></div>
                        <div style={{ display: tab === 'transport' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><TransportWidget city={city} /></div>
                        <div style={{ display: tab === 'craft'     ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><CraftWidget     city={city} /></div>
                        <div style={{ display: tab === 'enchant'   ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><EnchantWidget /></div>
                        <div style={{ display: tab === 'split'     ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><SplitWidget     city={city} /></div>
                        <div style={{ display: tab === 'alerts'    ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}><AlertsWidget /></div>
                    </>
                )}
            </div>

            {/* ── Trade notification ── */}
            {pendingTrade && (
                <TradeNotification
                    trade={pendingTrade}
                    config={config}
                    onConfirm={() => setPendingTrade(null)}
                    onDismiss={() => setPendingTrade(null)}
                />
            )}
        </div>
    );
}
