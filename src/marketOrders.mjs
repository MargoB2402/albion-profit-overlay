export const MARKET_CITIES = ['Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Martlock', 'Caerleon', 'Brecilien', 'Black Market'];

// Every row has its own item ID. The payload's item_id is only a UI selection.
export function groupMarketOrders({ city, orders }) {
    if (!MARKET_CITIES.includes(city) || !Array.isArray(orders)) return [];
    const groups = new Map();
    for (const order of orders) {
        const itemId = order?.item_id;
        const quality = Number(order?.quality);
        const price = Math.round(Number(order?.price) / 10000);
        if (typeof itemId !== 'string' || !itemId.trim() || !Number.isInteger(quality) || quality < 1 || quality > 5 ||
            !Number.isFinite(price) || price < 1 || price > 500_000_000 || typeof order.is_offer !== 'boolean') continue;
        const side = order.is_offer ? 'sell' : 'buy';
        const key = JSON.stringify([itemId, quality, side]);
        const previous = groups.get(key);
        if (!previous || (side === 'sell' ? price < previous.price : price > previous.price)) {
            groups.set(key, { itemId, city, quality, side, price });
        }
    }
    return [...groups.values()];
}
