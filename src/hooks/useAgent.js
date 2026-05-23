// Хук для подключения к Go-агенту по WebSocket
import { useEffect, useRef, useState, useCallback } from 'react';

const RECONNECT_MS = 3000;
const AGENT_URL    = 'ws://127.0.0.1:9999/ws';

export function useAgent({ onConnect, onDisconnect, onEvent }) {
    const wsRef    = useRef(null);
    const timerRef = useRef(null);
    const [lastEvent, setLastEvent] = useState(null);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket(AGENT_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                onConnect?.();
                if (timerRef.current) clearTimeout(timerRef.current);
            };

            ws.onmessage = (msg) => {
                try {
                    const evt = JSON.parse(msg.data);
                    setLastEvent(evt);
                    onEvent?.(evt);
                } catch {}
            };

            ws.onclose = () => {
                onDisconnect?.();
                // Переподключаемся через 3 сек
                timerRef.current = setTimeout(connect, RECONNECT_MS);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            timerRef.current = setTimeout(connect, RECONNECT_MS);
        }
    }, [onConnect, onDisconnect, onEvent]);

    useEffect(() => {
        // Небольшая задержка чтобы не коннектиться при каждом hot-reload
        const init = setTimeout(connect, 200);
        return () => {
            clearTimeout(init);
            if (timerRef.current) clearTimeout(timerRef.current);
            wsRef.current?.close();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { lastEvent };
}
