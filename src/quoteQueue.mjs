const keyOf = p => JSON.stringify([p.city, p.itemId, p.quality, p.side]);

// Two bounded batches in flight. Unsent updates replace older observations;
// timestamps are fixed at capture time, never when a delayed request is sent.
export function createQuoteQueue({ send, onStatus = () => {}, now = Date.now, batchSize = 64, concurrency = 2, maxPending = 4096, maxAge = 120_000, flushMs = 75 }) {
    const pending = new Map(), accepted = new Map();
    let active = 0, inFlight = 0, timer, closed = false, sent = 0, failed = 0, dropped = 0;
    const status = () => ({ sent, failed, dropped, pending: pending.size + inFlight });
    const notify = () => { if (!closed) onStatus(status()); };
    function schedule(delay = flushMs) {
        if (!timer && !closed) timer = setTimeout(() => { timer = null; pump(); }, delay);
    }
    async function pump() {
        if (closed) return;
        for (const [key, value] of accepted) if (now() - value.at >= 60_000) accepted.delete(key);
        while (active < concurrency && pending.size) {
            const batch = [];
            for (const [key, value] of pending) {
                pending.delete(key);
                if (now() - value.observedAt > maxAge) { dropped++; continue; }
                const previous = accepted.get(key);
                if (previous?.price === value.price && now() - previous.at < 60_000) continue;
                batch.push(value);
                if (batch.length === batchSize) break;
            }
            if (!batch.length) break;
            active++; inFlight += batch.length; notify();
            // Different batches have disjoint pending entries; SQL timestamps
            // protect newer observations when requests finish out of order.
            Promise.resolve().then(() => send(batch.map(({ attempt, ...p }) => p))).then(results => {
                if (closed) return;
                batch.forEach((p, index) => {
                    if (results[index]?.accepted) {
                        const old = accepted.get(keyOf(p));
                        if (!old || p.observedAt >= old.observedAt) accepted.set(keyOf(p), { price: p.price, at: now(), observedAt: p.observedAt });
                        sent++;
                    } else if (results[index]?.reason !== 'older_observation' && results[index]?.reason !== 'cooldown') failed++;
                });
            }).catch(error => {
                if (closed) return;
                for (const p of batch) {
                    const key = keyOf(p), newer = pending.get(key);
                    if (!error.permanent && !p.attempt && now() - p.observedAt < maxAge && (!newer || newer.observedAt < p.observedAt)) {
                        pending.set(key, { ...p, attempt: 1 });
                        while (pending.size > maxPending) { pending.delete(pending.keys().next().value); dropped++; }
                    } else if (!newer) failed++;
                }
            }).finally(() => {
                active--; inFlight -= batch.length; notify();
                if (pending.size) schedule();
            });
        }
        notify();
    }
    return {
        enqueue(reports) {
            if (closed) return;
            for (const p of reports) {
                const key = keyOf(p), previous = pending.get(key);
                if (previous && previous.observedAt > p.observedAt) continue;
                pending.set(key, { ...p, attempt: 0 });
                while (pending.size > maxPending) { pending.delete(pending.keys().next().value); dropped++; }
            }
            notify(); schedule();
        },
        status,
        close() { closed = true; clearTimeout(timer); pending.clear(); accepted.clear(); },
    };
}
