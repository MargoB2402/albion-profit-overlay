import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApiProvider } from './hooks/useApi';

class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { error: null }; }
    static getDerivedStateFromError(e) { return { error: e }; }
    render() {
        if (this.state.error) {
            return (
                <div style={{
                    padding: '20px', color: '#ef4444', fontFamily: 'monospace',
                    background: 'rgba(10,12,20,0.95)', minHeight: '100vh',
                    fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                    <b>React Error:</b>{'\n'}{String(this.state.error)}{'\n'}{this.state.error?.stack}
                </div>
            );
        }
        return this.props.children;
    }
}

// StrictMode убран — двойной mount ломает WebSocket
ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <ApiProvider>
            <App />
        </ApiProvider>
    </ErrorBoundary>
);
