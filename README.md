# albion-profit-overlay

## Windows 1.10.5 - 2026-10-26

[Download and release notes](https://github.com/MargoB2402/albion-profit-overlay/releases/tag/v1.10.5)

Windows 1.10.5 — world zone names

The location badge now shows ordinary zones outside cities, using the same existing world catalog as Android 0.9.4. Both the expanded and collapsed panel update on zone changes. Unknown zones show their ID.

The bundled capture agent now includes the raw location ID in its local WebSocket location event. Display names remain separate from the validated auction city; zone names do not become market-price destinations. Photon framing, CRC validation, IP reassembly and private-price delivery remain unchanged.

Checks: client and Photon Go suites; world-name/market-isolation tests; the protected production UI in seven languages with market bursts, private-mode delivery, tab changes, collapsed view and a non-city zone transition. The shipped agent matches the build output; matching complete open-agent source is included. No physical live-game retest has been performed for this update.

Русский: панель теперь показывает названия зон вне городов, в том числе в свёрнутом виде. Название зоны используется только для отображения; город для рыночных цен проверяется отдельно. Установите 1.10.5 поверх предыдущей версии и смените зону после запуска захвата.


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


## Windows 1.10.2

[Download and release notes](https://github.com/MargoB2402/albion-profit-overlay/releases/tag/v1.10.2)

Windows 1.10.2 fixes fragmented market-page assembly and improves gathering capture status.

- Fragment retransmissions no longer complete a partial market response; fragments from different channels/connections are isolated. Assembly size, lifetime and memory are bounded.
- Accepts signed own-player IDs and validates complete zone-entry responses while preserving ownership checks.
- The free gathering tab distinguishes disconnected capture from a character that has not yet been identified. If capture starts after entering a zone, change zones or reconnect with capture running, then continue gathering.
- Seven-language guidance and counters show received harvest events, recognized own harvest and events skipped before identification. Previously missed harvest is not reconstructed.

Update: restart the overlay, allow the update to download and choose Restart Now. Alternatively, run the attached installer over the previous version; settings are preserved. Existing private-price mode, market fixes and subscription gates are retained.

Go regressions, session/valuation tests, protected renderer checks and installer contents passed. The owner confirmed live gathering/fishing on the existing version. The affected player's large market pages still need confirmation after updating. Regression fixtures reproduce the parser defects without using private packet captures.

Includes the protected installer, updater blockmap/latest.yml, matching open-source agent archive and SHA256SUMS.txt. Npcap remains required.


## Windows 1.10.0 — Gathering and fishing

[Download the Windows installer](https://github.com/MargoB2402/albion-profit-overlay/releases/tag/v1.10.0).

The free **Gather** tab records local sessions, groups harvested resources and fish, and compares selling estimates across seven cities. Choose instant sale or a sell order, set fees and a freshness limit, and expand an item to see its observation history.

Price estimates require the updated website API. Unknown prices are not zero; an estimate does not guarantee order depth or sale completion. Live verification of the new capture remains in beta. Existing Loot Tracker gates are unchanged. See [release notes](CHANGELOG.md).

New closed application implementation is distributed in protected installers; private source and obfuscation mappings are not added to this repository. Historical sources remain in Git history. Modified open-source agent sources and notices accompany the release.

## 1.9.6 — VPN adapter discovery and support diagnostics

Windows capture now opens all Npcap-visible adapters, rediscovers devices after VPN/network changes and retries unavailable interfaces. Shared processing suppresses cross-adapter duplicates. The overlay displays capture status and packet/decoder counters.

Important technical failures and recovery summaries are sent automatically to the website support dashboard, using the connected account. Reports exclude tokens, raw packets, chat, item lists, adapter addresses and full filesystem paths. Failed reports are queued locally with bounded storage and retries. This requires the updated website diagnostics endpoint.

Npcap remains required. TAP adapters are eligible for capture; this does not make WinTun visible to Npcap. WinDivert is not enabled in this release, and compatibility with a particular VPN must be verified in gameplay.

The upstream Albion Data Client uses the MIT license. The modified agent source, build instructions and third-party notices are provided as a release asset alongside the installer.

## 1.9.0 — Loot tracker and recording sessions

In Settings, connect your PRO/PRO+ account and choose the actual game server. Tap **Start loot session** before collecting loot; **End loot session** stops recording. Each new start creates a separate session. Ordinary Save and application restart preserve the current session. Existing queued pickups continue uploading after recording ends.

Observed silver (after taxes), item drops, chest pickups and merges into existing stacks are recorded. The private disk queue retries failed uploads and stays separate by account/site/server. Pickup diagnostics and queued/sent counters appear in Settings.

Open `/loot-logger` on your website and load account history. The updated website groups silver and identical equipment, supports session filters and sorting, and expands each card into individual pickups. File import and splitting are free; automatic capture/history require PRO or PRO+. Website/server 1.9.0 changes must be deployed to retain session metadata.

Windows capture was validated in gameplay, including dungeon chest stack merges. Session/UI/queue and access tests passed. No game automation is included.

## 1.7.1 — Island Tracker beta · PRO+ only

Enable **Island tracking** in Settings, save, then enter an island while capture is running. Observed crops, animals and confirmed farming actions are sent privately to your website account. The island queue survives restarts and stays separate for each account and region; its pending count and errors appear in Settings.

View observations, estimated readiness/food/care timers and history at your website's `/farming-tracker` page. Collection, server storage, state and history require **PRO+**. FREE and PRO cannot save island records. Market public/private mode does not make island records public.

This is a beta feature. Packet fixtures, delivery/session scenarios and UI checks passed; a real island session is still unverified. Planting and care actions/Focus attribution are not recorded yet. Timer estimates describe the last observation and cannot see later actions by other players while capture is absent.

Downloads: https://github.com/MargoB2402/albion-profit-overlay/releases/latest
