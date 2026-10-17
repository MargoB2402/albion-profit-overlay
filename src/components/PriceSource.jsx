import React from 'react';

export function PriceSource({ source, t }) {
    if (!source) return null;
    const key = { private: 'sourcePrivate', cache: 'sourceCache', history: 'sourceHistory', calculated: 'sourceCalculated', mixed: 'sourceMixed' }[source];
    if (!key) return null;
    return <small data-price-source={source} style={{ display: 'inline-block', fontSize: '10px', lineHeight: 1.4, fontWeight: 500, color: source === 'private' ? '#65b98a' : 'inherit', opacity: .85, marginLeft: 5 }}>{t(key)}</small>;
}
