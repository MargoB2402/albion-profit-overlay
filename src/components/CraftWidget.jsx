import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { useI18n, getLang } from '../hooks/useI18n';

const fmt = n =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(2) + 'M'
    : n >= 1_000   ? (n / 1_000).toFixed(1) + 'K'
    : String(Math.round(n));

const SI = {
    wrap:   { padding: '10px 12px', overflowY: 'auto', flex: 1, minHeight: 0 },
    label:  { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', marginTop: '8px' },
    input:  { width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', color: '#e2e8f0', fontSize: '12px', outline: 'none', boxSizing: 'border-box' },
    btn:    { padding: '6px 12px', background: '#c8a050', color: '#000', border: 'none', borderRadius: '7px', fontWeight: '700', cursor: 'pointer', fontSize: '12px' },
    ghost:  { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', padding: '4px 8px' },
    row:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' },
    sec:    { fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px', marginTop: '10px' },
};

const CITIES    = ['Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien'];
const TO_CITIES = ['Black Market', 'Fort Sterling', 'Thetford', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien'];
const RRR_PRESETS = [{ label: '15.2%', v: 15.2 }, { label: '24.8%', v: 24.8 }, { label: '43.5%⚡', v: 43.5 }, { label: '47.9%⚡', v: 47.9 }];

// Общие пресеты для фильтров тир/зачар в поиске предметов (все виджеты с поиском)
const TIER_FILTER_OPTIONS    = ['1', '2', '3', '4', '5', '6', '7', '8'];
const ENCHANT_FILTER_OPTIONS = ['0', '1', '2', '3', '4'];

// Autocomplete поиск предметов
function SearchDropdown({ query, onSelect, config, tierFilter, enchantFilter }) {
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
                let url = `${base}/api/overlay/item-search?wallet=${encodeURIComponent(wallet)}&token=${encodeURIComponent(token)}&q=${encodeURIComponent(query)}&limit=7&lang=${getLang()}`;
                if (tierFilter)    url += `&tier=${encodeURIComponent(tierFilter)}`;
                if (enchantFilter) url += `&enchant=${encodeURIComponent(enchantFilter)}`;
                const res    = await (window.electron?.apiFetch ? window.electron.apiFetch({ url }) : fetch(url).then(r => r.json()));
                const data   = res?.data ?? res;
                if (Array.isArray(data) && data.length) { setSuggestions(data); setVisible(true); }
                else { setSuggestions([]); setVisible(false); }
            } catch { setSuggestions([]); setVisible(false); }
        }, 300);
        return () => clearTimeout(timer.current);
    }, [query, config, tierFilter, enchantFilter]);

    if (!visible || !suggestions.length) return null;
    return (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'rgba(12,14,26,0.98)', border: '1px solid rgba(200,160,80,0.25)', borderRadius: '8px', marginTop: '2px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            {suggestions.map((s, i) => (
                <div key={s.id} onMouseDown={e => { e.preventDefault(); onSelect(s); setVisible(false); }}
                    style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
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

function ProLock({ t }) {
    return (
        <div style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '10px', padding: '14px', textAlign: 'center', margin: '16px 0' }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔒</div>
            <div style={{ fontWeight: '700', color: '#a855f7', fontSize: '13px', marginBottom: '4px' }}>{t('craftProLocked')}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '10px', lineHeight: 1.5 }}>{t('craftProMsg')}</div>
            <a href="https://promptly.sbs/#pricing" target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#c8a050', fontWeight: '700', textDecoration: 'none' }}>{t('upgradePro')}</a>
        </div>
    );
}

export default function CraftWidget({ city }) {
    const { config, isPro, isProPlus, fetchCraftTop, fetchCraftBreakdown, saveCraftLedger } = useApi();
    const { t, lang } = useI18n();

    const defaultCity = (city && city !== 'unknown') ? city : 'Thetford';

    const [craftCity, setCraftCity] = useState(defaultCity);
    const [toCity,    setToCity]    = useState('Black Market');
    const [loading,   setLoading]   = useState(false);
    const [items,     setItems]     = useState([]);

    // Search state
    const [searchQuery,  setSearchQuery]  = useState('');
    const [searchOpen,   setSearchOpen]   = useState(false);
    const [searchTier,    setSearchTier]    = useState('');
    const [searchEnchant, setSearchEnchant] = useState('');
    const searchRef = useRef(null);
    useEffect(() => {
        const fn = e => { if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    // Recipe view state
    const [selected,    setSelected]    = useState(null); // row from top-5 or search
    const [recipe,      setRecipe]      = useState(null);
    const [recLoading,  setRecLoading]  = useState(false);
    const [rrr,         setRrr]         = useState(15.2);
    const [qty,         setQty]         = useState(1);
    const [copied,      setCopied]      = useState(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerDone,    setLedgerDone]    = useState(false);
    const [recipeError,   setRecipeError]   = useState(null);

    const loadTop5 = useCallback(async () => {
        setLoading(true);
        const data = await fetchCraftTop({ city: craftCity, toCity, region: config.region || 'europe' });
        setItems(data);
        setLoading(false);
    }, [fetchCraftTop, craftCity, toCity, config.region]);

    const openRecipe = useCallback(async (row) => {
        setSelected(row);
        setRecipe(null);
        setRecipeError(null);
        setRecLoading(true);
        setLedgerDone(false);
        const data = await fetchCraftBreakdown({ item: row.item, city: craftCity, region: config.region || 'europe' });
        if (data?.success) {
            setRecipe(data);
            // Как в RecipeDrawer сайта: начальное qty = yield рецепта (1 крафт = yield порций)
            setQty(data.yield || 1);
            setRrr(data.rrr || 15.2);
        } else {
            // Раньше тут просто оставался пустой экран без единого объяснения — пользователь
            // не мог понять, баг это или у предмета правда нет рецепта крафта на этом тире.
            setRecipeError(data?.error || t('craftNoRecipeError') || 'Нет рецепта крафта для этого предмета (возможно, недоступен в этом тире/зачаре).');
        }
        setRecLoading(false);
    }, [fetchCraftBreakdown, craftCity, config.region, t]);

    const copyName = (name, id) => {
        navigator.clipboard.writeText(name).catch(() => {});
        setCopied(id);
        setTimeout(() => setCopied(null), 1500);
    };

    const sendToLedger = async () => {
        if (!isProPlus || !selected || !recipe) return;
        setLedgerLoading(true);
        try {
            const rrrMult = 1 - (rrr / 100);
            const payload = {
                items: [{
                    itemId:      selected.item,
                    localizedName: selected.item,
                    amount:      qty,
                    sellPrice:   selected.sellPrice || 0,
                    buyCity:     craftCity,
                    sellCity:    toCity,
                    region:      config.region || 'europe',
                    ingredients: recipe.ingredients.map(ing => ({
                        id:     ing.id,
                        name:   ing.id,
                        amount: ing.isRefundable ? ing.grossCount * qty * rrrMult : ing.grossCount * qty,
                        price:  ing.price,
                        city:   craftCity,
                    })),
                }],
            };
            const res = await saveCraftLedger(payload);
            if (res?.success) {
                setLedgerDone(true);
                setTimeout(() => setLedgerDone(false), 2000);
            }
        } catch {}
        setLedgerLoading(false);
    };

    if (!isPro) return <div style={SI.wrap}><ProLock t={t} /></div>;

    // ── Recipe view ──
    if (selected) {
        const rrrMult = 1 - (rrr / 100);
        const baseYield = recipe?.yield || 1;
        const ops = qty / baseYield;
        let totalNet = 0;

        return (
            <div style={SI.wrap}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={() => { setSelected(null); setRecipe(null); setRecipeError(null); }} style={SI.ghost}>{t('craftBack')}</button>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#e2e8f0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.name || selected.item}
                </span>
                {selected.margin !== '—' && (
                    <span style={{ fontSize: '11px', color: Number(selected.margin) >= 0 ? '#22c55e' : '#ef4444', fontWeight: '700' }}>{Number(selected.margin).toFixed(1)}%</span>
                )}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ flex: 1 }}>
                        <div style={SI.label}>{t('craftQty')}</div>
                        <input type="number" min={baseYield} step={baseYield} value={qty}
                            onChange={e => setQty(Math.max(baseYield, Number(e.target.value)))}
                            style={SI.input} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={SI.label}>{t('craftRrr')}</div>
                        <input type="number" min={0} max={60} step={0.1} value={rrr}
                            onChange={e => setRrr(Number(e.target.value))}
                            style={SI.input} />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {RRR_PRESETS.map(p => (
                        <button key={p.v} onClick={() => setRrr(p.v)} style={{ ...SI.ghost, background: Math.abs(rrr - p.v) < 0.01 ? 'rgba(200,160,80,0.2)' : 'transparent', color: Math.abs(rrr - p.v) < 0.01 ? '#c8a050' : '#94a3b8', border: `1px solid ${Math.abs(rrr - p.v) < 0.01 ? 'rgba(200,160,80,0.4)' : 'rgba(255,255,255,0.12)'}` }}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {recLoading && <div style={{ textAlign: 'center', color: '#475569', padding: '20px', fontSize: '12px' }}>{t('loading')}</div>}

                {!recLoading && recipeError && (
                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '9px', padding: '12px', margin: '10px 0', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#ef4444', lineHeight: 1.5 }}>{recipeError}</div>
                    </div>
                )}

                {recipe && (
                    <>
                        <div style={SI.sec}>{t('craftIngredients')}</div>
                        {recipe.ingredients.map(ing => {
                            // Математика 1-в-1 с RecipeDrawer.jsx сайта
                            const grossTotal = ing.grossCount * ops;
                            const netTotal   = ing.isRefundable ? grossTotal * rrrMult : grossTotal;
                            const grossCost  = grossTotal * ing.price;
                            const netCost    = netTotal   * ing.price;
                            totalNet += netCost;
                            const ingName = lang === 'ru' ? (ing.nameRu || ing.nameEn || ing.id) : (ing.nameEn || ing.nameRu || ing.id);
                            return (
                                <div key={ing.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '8px 10px', marginBottom: '6px' }}>
                                    {/* Строка: иконка + имя + копировать + "без возврата" */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <img src={`https://render.albiononline.com/v1/item/${ing.id}.png?size=24`} alt="" style={{ width: '22px', height: '22px', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ingName}</span>
                                                <button onClick={() => copyName(ingName, ing.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === ing.id ? '#22c55e' : '#475569', fontSize: '10px', padding: '0 2px', flexShrink: 0 }}>
                                                    {copied === ing.id ? '✓' : '⎘'}
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#475569' }}>{t('craftPriceLabel')} {fmt(ing.price)} {t('craftPcs')}</div>
                                        </div>
                                        {!ing.isRefundable && <span style={{ fontSize: '9px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>—RRR</span>}
                                    </div>
                                    {/* Нужно / Сгорит */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                        <div style={{ color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span>{t('craftBuyLabel')}</span>
                                            <span>{t('craftBurnLabel')} ({rrr}%):</span>
                                        </div>
                                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ color: '#e2e8f0', fontWeight: '700' }}>{Math.ceil(grossTotal)} {t('craftPcs')}<span style={{ color: '#475569', fontWeight: '400' }}>({fmt(grossCost)})</span></span>
                                            <span style={{ color: '#22c55e', fontWeight: '700' }}>{Math.ceil(netTotal)} {t('craftPcs')}<span style={{ color: '#475569', fontWeight: '400' }}>({fmt(netCost)})</span></span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{t('craftBudgetLabel')}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmt(recipe.ingredients.reduce((s, ing) => s + ing.grossCount * ops * ing.price, 0) + (recipe.fee || 0) * ops)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '700' }}>{t('craftTotalCost')}</span>
                            <span style={{ fontSize: '15px', color: '#22c55e', fontWeight: '900' }}>{fmt(totalNet + (recipe.fee || 0) * ops)}</span>
                        </div>

                        {/* Ledger button — PRO+ only */}
                        {isProPlus ? (
                            <button onClick={sendToLedger} disabled={ledgerLoading || ledgerDone} style={{ ...SI.btn, width: '100%', marginTop: '8px', background: ledgerDone ? '#22c55e' : '#3b82f6', fontSize: '11px' }}>
                                {ledgerDone ? t('craftLedgerDone') : ledgerLoading ? t('loading') : t('craftSendLedger')}
                            </button>
                        ) : (
                            <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '10px', color: '#475569' }}>
                                🔒 {t('craftLedgerProPlus')}
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    // ── List view ──
    return (
        <div style={SI.wrap}>
            {/* Item search */}
            <div style={{ position: 'relative', marginBottom: '8px' }} ref={searchRef}>
                <input
                    style={{ ...SI.input, paddingLeft: '26px' }}
                    placeholder={t('craftSearchPlaceholder') || '🔍 Найти предмет по названию...'}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => searchQuery.length >= 2 && setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                />
                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#475569', pointerEvents: 'none' }}>🔍</span>
                {searchOpen && (
                    <SearchDropdown
                        query={searchQuery}
                        config={config}
                        tierFilter={searchTier}
                        enchantFilter={searchEnchant}
                        onSelect={item => {
                            setSearchQuery(item.name);
                            setSearchOpen(false);
                            openRecipe({ item: item.id, name: item.name, margin: '—', sellPrice: 0 });
                        }}
                    />
                )}
            </div>

            {/* Search filters: tier/enchant — сужают автокомплит, меньше перебора по базе */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <select style={{ ...SI.input, flex: 1 }} value={searchTier} onChange={e => setSearchTier(e.target.value)}>
                    <option value="">{t('filterAnyTier') || 'Любой тир'}</option>
                    {TIER_FILTER_OPTIONS.map(v => <option key={v} value={v}>T{v}</option>)}
                </select>
                <select style={{ ...SI.input, flex: 1 }} value={searchEnchant} onChange={e => setSearchEnchant(e.target.value)}>
                    <option value="">{t('filterAnyEnchant') || 'Любой зачар'}</option>
                    {ENCHANT_FILTER_OPTIONS.map(v => <option key={v} value={v}>.{v}</option>)}
                </select>
            </div>

            {/* Divider */}
            <div style={{ fontSize: '10px', color: '#334155', textAlign: 'center', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
                {t('craftOrTop5') || 'или ТОП-5'}
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.05)' }} />
            </div>

            {/* City selectors */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                    <div style={SI.label}>{t('craftCity')}</div>
                    <select value={craftCity} onChange={e => setCraftCity(e.target.value)}
                        onWheel={e => { e.preventDefault(); const i = CITIES.indexOf(craftCity); setCraftCity(CITIES[Math.min(Math.max(i + (e.deltaY > 0 ? 1 : -1), 0), CITIES.length - 1)]); }}
                        style={{ ...SI.input, colorScheme: 'dark' }}>
                        {CITIES.map(c => <option key={c} value={c} style={{ background: '#1e2030', color: '#e2e8f0' }}>{c}</option>)}
                    </select>
                </div>
                <div style={{ flex: 1 }}>
                    <div style={SI.label}>{t('craftToCity')}</div>
                    <select value={toCity} onChange={e => setToCity(e.target.value)}
                        onWheel={e => { e.preventDefault(); const i = TO_CITIES.indexOf(toCity); setToCity(TO_CITIES[Math.min(Math.max(i + (e.deltaY > 0 ? 1 : -1), 0), TO_CITIES.length - 1)]); }}
                        style={{ ...SI.input, colorScheme: 'dark' }}>
                        {TO_CITIES.map(c => <option key={c} value={c} style={{ background: '#1e2030', color: '#e2e8f0' }}>{c}</option>)}
                    </select>
                </div>
            </div>

            <button onClick={loadTop5} disabled={loading} style={{ ...SI.btn, width: '100%', marginBottom: '10px' }}>
                {loading ? t('loading') : t('craftLoad')}
            </button>

            {items.length === 0 && !loading && (
                <div style={{ color: '#334155', fontSize: '11px', textAlign: 'center', padding: '12px 0' }}>{t('craftNoItems')}</div>
            )}

            {items.map((row, i) => (
                <div key={row.item} onClick={() => openRecipe(row)}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <span style={{ fontSize: '10px', color: '#475569', width: '14px', flexShrink: 0 }}>{i + 1}</span>
                    <img src={`https://render.albiononline.com/v1/item/${row.item}.png?size=24`} alt="" style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '11px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.item}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: Number(row.margin) >= 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }}>{Number(row.margin).toFixed(1)}%</span>
                    <span style={{ fontSize: '10px', color: '#475569', flexShrink: 0 }}>{fmt(row.profit || 0)}</span>
                </div>
            ))}
        </div>
    );
}
