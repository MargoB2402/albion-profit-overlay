# Windows 1.10.9 — 27 October 2026

The horizontal module row has been replaced with a compact vertical icon rail. Click the burger button to slide section names over the content without resizing calculations. The active icon and current section in the header stay visible.

Selecting a section, pressing Escape, clicking outside or toggling the burger collapses the labels. The rail scrolls in short windows. Keyboard focus returns to the menu button, accessible labels/tooltips identify the icons and reduced-motion preferences disable the slide animation.

Market capture continues while navigating, opening settings or collapsing the panel. The crafting/focus tracker and ledger linking from 1.10.8 remain included. Cloud batch history and ledger links still require the matching API and ledger deployment; this installer does not deploy those services. Android remains at 0.9.8 beta with its existing vertical navigation.

Checks: production Windows UI in English, Russian, German and Spanish; 320/400px navigation, selection and automatic collapse, Escape/focus restoration, outside click and continued market capture. The unpacked installer, embedded agent and updater hashes are verified. Matching open-agent sources are attached; private desktop sources and credentials are excluded.

## По-русски

Слева остаётся узкая колонка иконок. По нажатию на бургер подписи плавно выезжают поверх содержимого и не сдвигают расчёты. После выбора раздела подписи сворачиваются. Также работают Escape, повторный клик на бургер и клик вне меню. Активная иконка выделена, название текущего раздела показано в шапке. Сбор цен при переключениях продолжается. Трекер крафта и фокуса сохранён; для облака и привязки бухгалтерии требуется обновление серверной части.


# Windows 1.10.8 — 27 October 2026

Craft → My crafting and focus records completed batches, output, observed resource returns, station fees and actual focus usage. The collector accepts only the local character and deduplicates repeated packets. Windows live traces verified batches with 0, 72 and 36 focus; Android uses the same event mapping and regression fixtures. Ending a recording leaves the floating window open.

Link real ledger purchases and completed sales to each batch. FIFO suggestions must be reviewed and saved. Resources are costed net of returns; receipt quantities cannot be reused across batches. Partial sales and sales in a different city are supported. Enter exact after-tax proceeds, listing/relisting fees and other batch costs where they are not observed. Legacy estimates are never promoted to actual tax deductions. Manually confirmed amounts and uncertain receipt assignments are marked.

Realized profit and silver per observed focus are separate from estimates using current public prices. Final batch profit remains unknown until all material costs and all output sales are linked with known fees. Zero or unknown focus does not produce a per-focus ratio. A public-price cache failure does not invalidate realized accounting.

Requires the companion website API and ledger update for cloud batches and ledger links. The release does not deploy those services: old servers keep local observations, while cloud sync/linking waits for the update. Recording uses the shared activity session; cloud sync runs while this tracker is open. Cancelled/partial crafting jobs and automatic completion of every gameplay learning block are not included.

Checks: actual-ledger transaction/rollback and PostgreSQL-compatible owner/version/quantity/duplicate tests; live-format Go and Java craft fixtures; exact-cost/focus model tests; shared Android WebView UI, RU/EN and 280–800px touch controls; production packaging checks. A physical Android phone test remains necessary. Matching open-agent source is attached; proprietary desktop sources, credentials and runtime logs are excluded.

## По-русски

В «Крафт → Мой крафт и фокус» появились запись завершённых партий, возвраты ресурсов и фактический расход очков фокуса. В партии можно привязать закупки и продажи из бухгалтерии, учесть частичные продажи, точные комиссии и прочие расходы. Прибыль закрытой партии и серебро на очко считаются отдельно от прогнозной оценки. Неизвестные суммы требуют подтверждения и не заменяются нулём. Для облачной истории и привязок надо обновить серверные API и бухгалтерию. Окно при завершении записи остаётся открытым.


# Windows 1.10.7 — 26 October 2026

Take-all loot recording now retains unresolved objects when chest membership arrives late. One inventory arrival confirms only that object, rather than the entire batch. Both regression scenarios fail against the previous release source and pass with these fixes. Existing stack-merge and duplicate protection remains active.

Loot sessions display start, finish, duration and pickup zones with their timezone. New session metadata is stored separately from the pickup queue and syncs to the subscriber cloud history for 30 days after the companion API update. Ending a session keeps the window open. Legacy records without explicit finish times remain without invented session boundaries. Existing zone filters in the cloud journal can be used to compare pickup results by location.

The shared enchantment interface uses direct buttons for initial and target enchantment levels. Android-specific local fresh-price precedence does not change desktop market-price selection, which already displays verified personal quotes.

Until the new server API is deployed, ordinary loot uploads continue; session metadata remains queued with a separate status indication. No production deployment was performed by this release.

Checks: Go client/Photon regression suites and prior-release negative tests; PostgreSQL-compatible schema/upsert/owner/expiry and old-server compatibility tests; protected desktop UI in seven languages, existing private market delivery/minimized-zone tests; cloud session time-range/duration/zone browser checks. Live game/device confirmation is still needed. Matching full open-agent source is included; proprietary desktop implementation is excluded.


# Windows 1.10.6 — 26 October 2026

The new loot tab uses the same session screen as Android 0.9.6: personal silver, collected item value, combined totals, observed fame and hourly rates. Exact-quality public sell quotes up to 24 hours old may fill missing item values; market estimates and unpriced items are clearly marked. Estimates are not sale proceeds.

The capture agent observes fame awards for the local character, with reported premium/satchel/quick-learn components. It does not add cumulative fame or duplicated destiny-board credits. Captured fame is not classified as PvE only.

Session aggregates are stored separately from the cloud upload queue, so acknowledged uploads do not erase the totals. Ending a session preserves its results and keeps the overlay open. Starting another session resets local session counters. Market privacy and entitlement checks remain active.

The companion server handler can resolve exact indexed IDs for dungeon maps without localized names. Deploy that backend change separately; the Windows installer alone does not update the website API.

Checks: Go client/Photon suites; valuation, persistence, account isolation and queue/session regressions; protected production desktop UI in all seven languages, loot totals/fame/end-without-closing and narrow layout; existing market bursts, private delivery, tabs, minimized view and ordinary zone transitions. No live-game/physical device test was available. Matching complete open-agent source is included; the proprietary desktop implementation is not published.


# Windows 1.10.5 - 2026-10-26

Windows 1.10.5 — world zone names

The location badge now shows ordinary zones outside cities, using the same existing world catalog as Android 0.9.4. Both the expanded and collapsed panel update on zone changes. Unknown zones show their ID.

The bundled capture agent now includes the raw location ID in its local WebSocket location event. Display names remain separate from the validated auction city; zone names do not become market-price destinations. Photon framing, CRC validation, IP reassembly and private-price delivery remain unchanged.

Checks: client and Photon Go suites; world-name/market-isolation tests; the protected production UI in seven languages with market bursts, private-mode delivery, tab changes, collapsed view and a non-city zone transition. The shipped agent matches the build output; matching complete open-agent source is included. No physical live-game retest has been performed for this update.

Русский: панель теперь показывает названия зон вне городов, в том числе в свёрнутом виде. Название зоны используется только для отображения; город для рыночных цен проверяется отдельно. Установите 1.10.5 поверх предыдущей версии и смените зону после запуска захвата.

# Release notes

## Windows 1.10.4 - 2026-10-25

[Download and release notes](https://github.com/MargoB2402/albion-profit-overlay/releases/tag/v1.10.4)

Windows 1.10.4 fixes Photon packet framing in captured game traffic.

- Consecutive packets in one capture payload are all decoded. Previously only the first packet was read, silently discarding the remainder and preventing fragmented responses from completing.
- CRC-enabled packet headers are validated. Incorrect CRC, mismatched connection identity and truncated command framing are rejected.
- Existing unique-coverage message reassembly and IPv4 fragment capture remain intact.

Regression tests reproduced the old decoder delivering only 1 of 20 consecutive responses and losing a response split across coalesced packets. The fixed decoder passes those cases with and without CRC, malformed-input cases and full capture-to-market processing. All client/photon regressions and protected UI delivery/private-mode checks in seven languages pass.

The player's 1.10.3 timeline still shows 66 market requests, 8 responses and 1 row. Local health shows zero IPv4 fragments, so the prior IP fix was not involved in that session. These are confirmed implementation defects, but confirmation on the affected PC is still pending; no claim is made that a VPN, ISP or antivirus is the cause.

Install the EXE over the previous version, or restart the overlay, allow the update to download and choose Restart Now. Browse a full market page. If the issue remains, send a new support report and the local http://127.0.0.1:9999/health contents after seven minutes of capture.

Includes installer, updater manifest/blockmap, matching open-source agent and checksums. Private application sources and obfuscation maps are excluded. Older releases remain available for rollback.


## Windows 1.10.3 - 2026-10-25

[Download and release notes](https://github.com/MargoB2402/albion-profit-overlay/releases/tag/v1.10.3)

Windows 1.10.3 adds IPv4 UDP fragment capture and reassembly before Photon decoding.

- The capture filter now retains non-initial UDP fragments. A complete datagram is passed to the game decoder only after its first fragment confirms a game port (5056).
- Reassembly supports out-of-order and duplicate fragments, rejects conflicting data, and is bounded to 32 incomplete datagrams with a 30-second lifetime. No raw packet data is sent to support reports.
- Counter snapshots are sent every five minutes even without a capture-state change. New numeric IP-fragment counters are available locally; retaining those additional fields on the website requires the updated diagnostic sanitizer. Existing market counters work with the existing backend.

The reported player installed 1.10.2, but that timeline contains only an initial 1.10.2 snapshot. The previous release repaired Photon-message fragments; it did not reconstruct IPv4 fragments before transport decoding. These are different layers.

Checks: the old BPF filter rejects the continuation fixture and the new one accepts it; the old capture pipeline loses the IP-fragmented response. The corrected pipeline delivers a complete 20-order market page through IP/UDP/Photon decoding, including reversed fragments and repeats. Bounds/conflict/expiry, Go regressions, diagnostic snapshot tests, protected UI and package checks pass. The affected PC still needs confirmation after updating; no private packet capture was used to claim an exact diagnosis.

Restart the overlay to download the update, then choose Restart Now. Alternatively install the attached EXE over the previous version. Settings, privacy and subscription gates are preserved. Browse a full market page, keep capture running for at least six minutes, then send the new support timeline if the issue remains.

Includes installer, blockmap/latest.yml, matching open-source agent archive and SHA256SUMS.txt. Private application sources and obfuscation mappings are not published.


## Windows 1.10.2 - 2026-10-25

Windows 1.10.2 fixes fragmented market-page assembly and improves gathering capture status.

- Fragment retransmissions no longer complete a partial market response; fragments from different channels/connections are isolated. Assembly size, lifetime and memory are bounded.
- Accepts signed own-player IDs and validates complete zone-entry responses while preserving ownership checks.
- The free gathering tab distinguishes disconnected capture from a character that has not yet been identified. If capture starts after entering a zone, change zones or reconnect with capture running, then continue gathering.
- Seven-language guidance and counters show received harvest events, recognized own harvest and events skipped before identification. Previously missed harvest is not reconstructed.

Update: restart the overlay, allow the update to download and choose Restart Now. Alternatively, run the attached installer over the previous version; settings are preserved. Existing private-price mode, market fixes and subscription gates are retained.

Go regressions, session/valuation tests, protected renderer checks and installer contents passed. The owner confirmed live gathering/fishing on the existing version. The affected player's large market pages still need confirmation after updating. Regression fixtures reproduce the parser defects without using private packet captures.

Includes the protected installer, updater blockmap/latest.yml, matching open-source agent archive and SHA256SUMS.txt. Npcap remains required.


## 1.10.1 - 2026-10-25

- Fixed ordinary market rows without an auction ID by resolving known physical city IDs, including Fort Sterling. Explicit unknown markets remain rejected.
- Market orders with an explicit auction no longer wait for a character Join response or AODP upload before reaching the overlay.
- Market frames are processed individually and are no longer replaced by loot/activity events in React. Collection continues across tabs and while minimized, preserving private mode.
- Added numeric market-processing diagnostics without item lists or prices in support reports.

Restart the overlay to check for the update, then choose Restart Now when the downloaded update is ready. Installing the EXE manually over the current version also preserves settings.

Validation: Go regressions; 20 Node tests; protected renderer in Chrome across seven languages, private mode, 45 market entries, tabs and minimized view. Live confirmation on the affected player's machine remains pending.

## 1.10.0 — 2026-10-24

- Free Gathering tab with local recording sessions, grouped resource/fish stacks and expandable observation history.
- Seven-city valuation for instant sale or sell orders, best cities per item and whole harvest, configurable fees and quote freshness.
- Unknown/stale prices remain unknown; estimates do not guarantee order depth or completion. Transport costs are excluded.
- Hardened application journal and renderer. Existing Loot Tracker subscription rules are unchanged.

City valuation requires the updated `/api/overlay/harvest-prices` website endpoint. The new gameplay capture still needs live verification. Sessions are local; cloud sync, trade/awakened history and combat charts are not introduced by this release.

The installer contains protected application code. Private application sources and obfuscation mappings are not uploaded. The modified open-source agent, build instructions and third-party notices are attached separately. Npcap remains required; WinDivert is not enabled.
