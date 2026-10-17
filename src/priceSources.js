const langs = ['en', 'ru', 'de', 'es', 'fr', 'it', 'pt'];
const entries = {
    marketLoadTimeout: ['The server did not respond in time. Please try again.', 'Сервер не ответил вовремя. Повтори запрос.', 'Der Server antwortet nicht rechtzeitig. Bitte erneut versuchen.', 'El servidor no respondió a tiempo. Inténtalo de nuevo.', 'Le serveur n’a pas répondu à temps. Réessayez.', 'Il server non ha risposto in tempo. Riprova.', 'O servidor não respondeu a tempo. Tente novamente.'],
    marketLoadInvalid: ['Could not read market data. Please try again.', 'Не удалось прочитать данные рынка. Повтори запрос.', 'Marktdaten konnten nicht gelesen werden. Bitte erneut versuchen.', 'No se pudieron leer los datos. Inténtalo de nuevo.', 'Impossible de lire les données. Réessayez.', 'Impossibile leggere i dati. Riprova.', 'Não foi possível ler os dados. Tente novamente.'],
    marketLoadFailed: ['Could not load market data. Please try again.', 'Не удалось загрузить данные рынка. Повтори запрос.', 'Marktdaten konnten nicht geladen werden. Bitte erneut versuchen.', 'No se pudieron cargar los datos. Inténtalo de nuevo.', 'Impossible de charger les données. Réessayez.', 'Impossibile caricare i dati. Riprova.', 'Não foi possível carregar os dados. Tente novamente.'],
    marketLoadRetry: ['Try again', 'Повторить', 'Erneut versuchen', 'Reintentar', 'Réessayer', 'Riprova', 'Tentar novamente'],
    bmMineOnlyHint: ['Only pairs where both purchase and Black Market sale prices were scanned by you, for the same quality.', 'Только пары, где и цена покупки, и цена продажи на ЧР проверены тобой для одного качества.', 'Nur Paare mit eigenen Kauf- und Schwarzmarktpreisen derselben Qualität.', 'Solo pares con precios propios de compra y venta en el Mercado Negro de la misma calidad.', 'Uniquement vos prix d’achat et de vente au Marché noir de même qualité.', 'Solo coppie con prezzi propri di acquisto e vendita al Mercato Nero della stessa qualità.', 'Apenas pares com preços próprios de compra e venda no Mercado Negro da mesma qualidade.'],
    bmMineRowHint: ['Both prices were scanned by you.', 'Обе цены проверены тобой.', 'Beide Preise selbst geprüft.', 'Ambos precios comprobados por ti.', 'Les deux prix ont été vérifiés par vous.', 'Entrambi i prezzi verificati da te.', 'Ambos os preços verificados por você.'],
    capturePending: ['Queued', 'В очереди', 'Wartend', 'En cola', 'En attente', 'In coda', 'Na fila'],
    captureDropped: ['Expired/skipped', 'Устарело/пропущено', 'Abgelaufen/übersprungen', 'Caducados/omitidos', 'Expirés/ignorés', 'Scaduti/saltati', 'Expirados/ignorados'],
    sourcePrivate: ['My price', 'Моя цена', 'Mein Preis', 'Mi precio', 'Mon prix', 'Il mio prezzo', 'Meu preço'],
    sourceCache: ['Site cache', 'Кеш сайта', 'Website-Cache', 'Caché del sitio', 'Cache du site', 'Cache del sito', 'Cache do site'],
    sourceHistory: ['History', 'История цен', 'Historie', 'Historial', 'Historique', 'Storico', 'Histórico'],
    sourceCalculated: ['Calculated cost', 'Расчётная стоимость', 'Berechnete Kosten', 'Coste calculado', 'Coût calculé', 'Costo calcolato', 'Custo calculado'],
    sourceMixed: ['Mixed sources', 'Разные источники', 'Gemischte Quellen', 'Fuentes mixtas', 'Sources mixtes', 'Fonti miste', 'Fontes mistas'],
    capturedQuotes: ['Quotes synced', 'Цен отправлено', 'Preise synchronisiert', 'Precios sincronizados', 'Prix synchronisés', 'Prezzi sincronizzati', 'Preços sincronizados'],
    captureFailed: ['Not synced', 'Не отправлено', 'Nicht synchronisiert', 'Sin sincronizar', 'Non synchronisés', 'Non sincronizzati', 'Não sincronizados'],
};
export const priceSourceLocales = Object.fromEntries(langs.map((lang, index) => [lang,
    Object.fromEntries(Object.entries(entries).map(([key, values]) => [key, values[index]])),
]));
