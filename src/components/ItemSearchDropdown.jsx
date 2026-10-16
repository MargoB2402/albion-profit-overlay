import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../hooks/useI18n';

const PAGE = 30;
const labels = {
    en: ['More results', 'Loading…', 'No matching items', 'Search failed. Retry', 'results'],
    ru: ['Ещё результаты', 'Загрузка…', 'Предметы не найдены', 'Ошибка поиска. Повторить', 'найдено'],
    de: ['Weitere Ergebnisse', 'Laden…', 'Keine Gegenstände gefunden', 'Suche fehlgeschlagen. Wiederholen', 'Ergebnisse'],
    es: ['Más resultados', 'Cargando…', 'No se encontraron objetos', 'Error de búsqueda. Reintentar', 'resultados'],
};

/** One search for all desktop and Android modules. Older servers return an array;
 * load their full matching set once and page it locally until the server is updated. */
export default function ItemSearchDropdown({ query, onSelect, config, tierFilter = '', enchantFilter = '' }) {
    const { lang } = useI18n();
    const text = labels[lang] || labels.en;
    const [state, setState] = useState({ items: [], total: 0, hasMore: false, loading: true });
    const current = useRef(null);
    const list = useRef(null);
    const { apiBase = 'https://promptly.sbs', wallet = '', token = '' } = config;
    const load = async (search, offset) => {
        if (search.loading || current.current !== search) return;
        search.loading = true;
        setState(old => ({ ...old, loading: true, error: false }));
        try {
            const request = async params => {
                const url = `${apiBase}/api/overlay/item-search?${new URLSearchParams({ wallet, token, q: query.trim(), lang, ...params })}`;
                if (window.electron?.apiFetch) { const r = await window.electron.apiFetch({ url }); if (r.ok === false) throw Error(); return r.data ?? r; }
                const r = await fetch(url); if (!r.ok) throw Error(); return r.json();
            };
            let page;
            if (!search.legacy) {
                page = await request({ paged: '1', limit: String(PAGE), offset: String(offset), tier: tierFilter, enchant: enchantFilter });
                if (current.current !== search) return;
                if (Array.isArray(page)) {
                    // No tiny limit and no broken independent filters on legacy servers.
                    const all = await request({ limit: '20000' });
                    if (!Array.isArray(all)) throw Error();
                    search.legacy = all.filter(item => (!tierFilter || Number(item.id.match(/^T(\d+)/)?.[1]) === Number(tierFilter)) && (enchantFilter === '' || Number(item.id.match(/@(\d+)$/)?.[1] || 0) === Number(enchantFilter)));
                }
            }
            if (search.legacy) page = { items: search.legacy.slice(offset, offset + PAGE), total: search.legacy.length, nextOffset: offset + PAGE, hasMore: offset + PAGE < search.legacy.length };
            if (!Array.isArray(page?.items)) throw Error();
            if (current.current !== search) return;
            search.offset = page.nextOffset;
            setState(old => ({ items: offset ? [...old.items, ...page.items] : page.items, total: page.total, hasMore: page.hasMore, loading: false }));
        } catch { if (current.current === search) setState(old => ({ ...old, loading: false, error: true })); }
        finally { search.loading = false; }
    };
    useEffect(() => {
        const search = { offset: 0, loading: false }; current.current = search;
        setState({ items: [], total: 0, hasMore: false, loading: true });
        if (list.current) list.current.scrollTop = 0;
        const timer = setTimeout(() => { if (query.trim().length >= 2) load(search, 0); }, 250);
        return () => { clearTimeout(timer); if (current.current === search) current.current = null; };
    }, [query, apiBase, wallet, token, tierFilter, enchantFilter, lang]);
    if (query.trim().length < 2) return null;
    return <div className="item-search-results" onMouseDown={e => e.preventDefault()} style={{ marginTop: 4, border: '1px solid #725a2e', borderRadius: 8, background: '#17130c', minWidth: 0 }}>
        <div aria-live="polite" style={{ padding: '6px 10px', color: '#b4a286', fontSize: 12 }}>{state.total} {text[4]}{state.loading ? ` · ${text[1]}` : ''}</div>
        <div ref={list} role="listbox" aria-label={query} style={{ maxHeight: 'clamp(96px, 30vh, 240px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {state.items.map(item => <button key={item.id} type="button" role="option" aria-selected="false" data-item-id={item.id} onClick={() => onSelect(item)} style={{ display: 'block', textAlign: 'left', width: '100%', minHeight: 44, padding: '8px 10px', border: 0, borderBottom: '1px solid #463821', background: 'transparent', color: '#f0e8d4', cursor: 'pointer', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
                {item.name}<span style={{ display: 'block', fontSize: 11, color: '#c8a050' }}>T{item.id.match(/^T(\d+)/)?.[1] || '—'}.{item.id.match(/@(\d+)$/)?.[1] || '0'}</span>
            </button>)}
            {!state.loading && !state.error && state.total === 0 && <div style={{ padding: 10, color: '#b4a286' }}>{text[2]}</div>}
            {(state.hasMore || state.error) && <button type="button" disabled={state.loading} onClick={() => load(current.current, current.current.offset)} style={{ width: '100%', minHeight: 44, color: '#c8a050', background: '#211b11', border: 0 }}>{state.error ? text[3] : text[0]}</button>}
        </div>
    </div>;
}
