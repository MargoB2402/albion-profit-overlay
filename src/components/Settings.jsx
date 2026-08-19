import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n, LANG_OPTIONS, setLang } from '../hooks/useI18n';

const S = {
    wrap:    { padding: '12px 14px', flex: 1, overflowY: 'auto', minHeight: 0 },
    label:   { fontSize: '10px', color: '#475569', marginBottom: '3px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em' },
    input:   { width: '100%', padding: '7px 9px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' },
    select:  { width: '100%', padding: '7px 9px', background: 'rgba(12,14,26,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', outline: 'none', colorScheme: 'dark', marginBottom: '8px' },
    btn:     { width: '100%', padding: '8px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px', marginTop: '2px' },
    sec:     { fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '7px', marginTop: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' },
    row:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '11px' },
    slider:  { width: '100%', accentColor: '#c8a050', cursor: 'pointer' },
    warning: { fontSize: '10px', color: '#f59e0b', lineHeight: 1.5, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '7px', padding: '7px 9px', marginTop: '6px' },
    toggle:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
    ghost:   { padding: '8px', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
};

function ToggleSwitch({ checked, onChange }) {
    return (
        <div onClick={() => onChange(!checked)} style={{
            width: '34px', height: '18px', borderRadius: '9px', cursor: 'pointer',
            background: checked ? '#c8a050' : 'rgba(255,255,255,0.12)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
            <div style={{
                position: 'absolute', top: '2px',
                left: checked ? '18px' : '2px',
                width: '14px', height: '14px', borderRadius: '50%',
                background: checked ? '#000' : '#475569',
                transition: 'left 0.2s',
            }} />
        </div>
    );
}

export default function Settings({ onClose }) {
    const { config, saveConfig, logout, isLoggedIn, isPro, isProPlus } = useApi();
    const { t, lang } = useI18n();

    const [wallet,  setWallet]  = useState(config.wallet       || '');
    const [token,   setToken]   = useState(config.token        || '');
    const [autoLog, setAutoLog] = useState(config.autoLogTrade || false);
    const [region,  setRegion]  = useState(config.region       || 'europe');
    const [saved,     setSaved]     = useState(false);

    // Debug mode state
    const [debugActive,  setDebugActive]  = useState(false);
    const [debugPass,    setDebugPass]    = useState('');
    const [debugPrompt,  setDebugPrompt]  = useState(false);
    const [debugErr,     setDebugErr]     = useState('');
    useEffect(() => {
        window.electron?.getDebugMode?.().then(v => setDebugActive(!!v));
    }, []);

    const [appVersion, setAppVersion] = useState('');
    useEffect(() => {
        window.electron?.getAppVersion?.().then(v => setAppVersion(v || ''));
    }, []);

    // Filter settings
    const [maxAge,    setMaxAge]    = useState(config.filterMaxAge    ?? 4);
    const [minDaily,  setMinDaily]  = useState(config.filterMinDaily  ?? 7);
    const [maxMargin, setMaxMargin] = useState(config.filterMaxMargin ?? 100);

    const handleSave = () => {
        saveConfig({
            wallet:          wallet.trim(),
            token:           token.trim(),
            autoLogTrade:    autoLog,
            region:          region,
            filterMaxAge:    Number(maxAge),
            filterMinDaily:  Number(minDaily),
            filterMaxMargin: Number(maxMargin),
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleLogout = () => {
        logout();
        setWallet('');
        setToken('');
    };

    return (
        <div style={S.wrap}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontWeight: '700', fontSize: '13px' }}>{t('settingsTitle')}</span>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}>×</button>
            </div>

            {/* Account status */}
            <div style={{
                background: isLoggedIn ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                border: `1px solid ${isLoggedIn ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.3)'}`,
                borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '11px',
            }}>
                {isLoggedIn ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#22c55e' }}>
                                ✅ {t('accountOk')}
                                {isProPlus && <span style={{ marginLeft: '6px', color: '#a78bfa', fontWeight: 700 }}>PRO+</span>}
                                {!isProPlus && isPro && <span style={{ marginLeft: '6px', color: '#c8a050', fontWeight: 700 }}>PRO</span>}
                                {!isPro && !isProPlus && <span style={{ marginLeft: '6px', color: '#64748b' }}>Free</span>}
                            </span>
                            <button
                                onClick={handleLogout}
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer', fontWeight: '600' }}
                            >
                                {t('logoutBtn') || 'Выйти'}
                            </button>
                        </div>
                        <div style={{ fontSize: '10px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                            {config.wallet ? `${config.wallet.slice(0, 8)}...${config.wallet.slice(-6)}` : ''}
                        </div>
                    </div>
                ) : (
                    <span style={{ color: '#f59e0b' }}>
                        ⚠️ {t('accountNo') || 'Аккаунт не подключён'}<br/>
                        <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px', display: 'block', lineHeight: 1.5 }}>
                            {t('accountHowTo') || 'Войди на'}{' '}
                            <a href="https://promptly.sbs" target="_blank" rel="noreferrer" style={{ color: '#c8a050' }}>promptly.sbs</a>
                            {' → '}
                            {t('accountHowTo2') || 'Профиль → Overlay Token → скопируй Wallet и Token'}
                        </span>
                    </span>
                )}
            </div>

            {/* Language */}
            <label style={S.label}>{t('langLabel')}</label>
            <select style={S.select} value={lang} onChange={e => setLang(e.target.value)}>
                {LANG_OPTIONS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>

            {/* Game server / region */}
            <label style={S.label}>{t('serverLabel') || 'Server'}</label>
            <select style={S.select} value={region} onChange={e => setRegion(e.target.value)}>
                <option value="europe">Europe</option>
                <option value="west">Americas (West)</option>
                <option value="east">Asia (East)</option>
            </select>

            {/* Wallet */}
            <label style={S.label}>{t('walletLabel')}</label>
            <input style={S.input} value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0x..." />

            {/* Token */}
            <label style={S.label}>{t('tokenLabel')}</label>
            <input style={S.input} type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="eyJ..." />
            <div style={{ fontSize: '10px', color: '#475569', marginBottom: '10px', marginTop: '-4px', lineHeight: 1.5 }}>
                💡 {t('tokenHint') || 'Скопируй из профиля на'}{' '}
                <a href="https://promptly.sbs" target="_blank" rel="noreferrer" style={{ color: '#c8a050', textDecoration: 'none' }}>promptly.sbs</a>
                {' → '}
                <span style={{ color: '#94a3b8' }}>{t('tokenHintProfile') || 'Профиль → Overlay Token'}</span>
            </div>

            {/* Auto-log toggle */}
            <div style={S.toggle}>
                <div>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t('autoLogLabel') || 'Авто-запись покупок в Бухгалтерию'}</span>
                    <div style={{ fontSize: '10px', color: '#334155', marginTop: '2px' }}>{t('autoLogHint') || 'PRO+ · Агент фиксирует торговые операции'}</div>
                </div>
                <ToggleSwitch checked={autoLog} onChange={setAutoLog} />
            </div>

            <button style={S.btn} onClick={handleSave}>
                {saved ? t('savedBtn') : t('saveBtn')}
            </button>

            {/* Filter settings */}
            <div style={S.sec}>{t('filterSection')}</div>
            <div style={S.warning}>{t('filterWarning')}</div>

            <div style={{ marginTop: '10px' }}>
                <div style={S.row}>
                    <span style={{ color: '#94a3b8' }}>{t('filterMaxAge')}</span>
                    <span style={{ color: '#c8a050', fontWeight: '700', minWidth: '28px', textAlign: 'right' }}>{maxAge}h</span>
                </div>
                <input type="range" style={S.slider} min={1} max={24} step={1} value={maxAge}
                    onChange={e => setMaxAge(Number(e.target.value))} />

                <div style={{ ...S.row, marginTop: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>{t('filterMinDaily')}</span>
                    <span style={{ color: '#c8a050', fontWeight: '700', minWidth: '28px', textAlign: 'right' }}>{minDaily}</span>
                </div>
                <input type="range" style={S.slider} min={1} max={50} step={1} value={minDaily}
                    onChange={e => setMinDaily(Number(e.target.value))} />

                <div style={{ ...S.row, marginTop: '8px' }}>
                    <span style={{ color: '#94a3b8' }}>{t('filterMaxMargin')}</span>
                    <span style={{ color: '#c8a050', fontWeight: '700', minWidth: '36px', textAlign: 'right' }}>{maxMargin}%</span>
                </div>
                <input type="range" style={S.slider} min={10} max={500} step={10} value={maxMargin}
                    onChange={e => setMaxMargin(Number(e.target.value))} />
            </div>

            {/* Hotkeys */}
            <div style={S.sec}>{t('hotkeysSection')}</div>
            <div style={S.row}>
                <span style={{ color: '#94a3b8' }}>{t('showHide')}</span>
                <code style={{ color: '#c8a050', fontSize: '11px' }}>Ctrl+Shift+A</code>
            </div>

            {/* Debug OCR mode */}
            <div style={{ ...S.sec, color: debugActive ? '#ef4444' : '#475569' }}>
                🔍 DEBUG OCR {debugActive && <span style={{ color: '#ef4444', fontWeight: 700 }}>● ACTIVE</span>}
            </div>
            <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.5, marginBottom: '8px' }}>
                Сохраняет зоны захвата, composite и OCR-текст на рабочий стол каждые 2.5с.
                Использовать только при диагностике — замедляет цикл OCR.
            </div>
            <div style={S.toggle}>
                <span style={{ fontSize: '11px', color: debugActive ? '#ef4444' : '#94a3b8' }}>
                    {debugActive ? 'Debug включён' : 'Debug выключен'}
                </span>
                <ToggleSwitch
                    checked={debugActive}
                    onChange={async (val) => {
                        if (val) {
                            setDebugPrompt(true);
                            setDebugErr('');
                        } else {
                            const r = await window.electron?.setDebugMode?.(false, '');
                            if (r?.ok) setDebugActive(false);
                        }
                    }}
                />
            </div>
            {debugPrompt && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '6px' }}>Введи admin-пароль для активации debug:</div>
                    <input
                        type="password"
                        style={{ ...S.input, marginBottom: '6px', border: debugErr ? '1px solid #ef4444' : undefined }}
                        value={debugPass}
                        onChange={e => { setDebugPass(e.target.value); setDebugErr(''); }}
                        onKeyDown={async e => {
                            if (e.key !== 'Enter') return;
                            const r = await window.electron?.setDebugMode?.(true, debugPass);
                            if (r?.ok) { setDebugActive(true); setDebugPrompt(false); setDebugPass(''); }
                            else { setDebugErr('Неверный пароль'); }
                        }}
                        placeholder="пароль..."
                        autoFocus
                    />
                    {debugErr && <div style={{ fontSize: '10px', color: '#ef4444' }}>{debugErr}</div>}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                        <button style={{ ...S.btn, background: '#ef4444', flex: 1 }} onClick={async () => {
                            const r = await window.electron?.setDebugMode?.(true, debugPass);
                            if (r?.ok) { setDebugActive(true); setDebugPrompt(false); setDebugPass(''); }
                            else { setDebugErr('Неверный пароль'); }
                        }}>Включить</button>
                        <button style={{ ...S.ghost, flex: 1 }} onClick={() => { setDebugPrompt(false); setDebugPass(''); setDebugErr(''); }}>Отмена</button>
                    </div>
                </div>
            )}

            {appVersion && (
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#334155', marginTop: '16px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    Albion Profit Overlay v{appVersion}
                </div>
            )}
        </div>
    );
}
