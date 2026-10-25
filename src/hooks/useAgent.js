// Хук для подключения к Go-агенту по WebSocket
import { useEffect, useRef, useState, useCallback } from 'react';

const RECONNECT_MS = 3000;
const AGENT_URL    = 'ws://127.0.0.1:9999/ws';

export function useAgent({ onConnect, onDisconnect, onEvent }) {
    const wsRef    = useRef(null);
    const timerRef = useRef(null);
    const [lastEvent, setLastEvent] = useState(null);
    const [captureStatus,setCaptureStatus]=useState(null);
    const callbacks = useRef({ onConnect, onDisconnect, onEvent });
    callbacks.current = { onConnect, onDisconnect, onEvent };

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(AGENT_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                callbacks.current.onConnect?.();
                if (timerRef.current) clearTimeout(timerRef.current);
            };

            ws.onmessage = (msg) => {
                try {
                    const evt = JSON.parse(msg.data);
                    if(evt.type==='capture_status')setCaptureStatus({...evt.payload,receivedAt:Date.now()});
                    // PriceWidget consumes the latest market selection. Loot,
                    // location and activity frames must not erase that selection.
                    else if(evt.type==='market_view')setLastEvent(evt);
                    callbacks.current.onEvent?.(evt);
                } catch {}
            };

            ws.onclose = () => {
                callbacks.current.onDisconnect?.();
                // Переподключаемся через 3 сек
                timerRef.current = setTimeout(connect, RECONNECT_MS);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            timerRef.current = setTimeout(connect, RECONNECT_MS);
        }
    }, []);

    useEffect(() => {
        // Небольшая задержка чтобы не коннектиться при каждом hot-reload
        const init = setTimeout(connect, 200);
        return () => {
            clearTimeout(init);
            if (timerRef.current) clearTimeout(timerRef.current);
            wsRef.current?.close();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { lastEvent, captureStatus };
}
