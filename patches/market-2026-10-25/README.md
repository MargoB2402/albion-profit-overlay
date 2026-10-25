# Windows market capture fix (unreleased)

This branch fixes ordinary market rows with no auction LocationId: physical city IDs from Join (Fort Sterling 4000 versus its auction 4002) now resolve through the known city mapping. Explicit unknown auction IDs remain rejected. Explicit known auction rows reach the local overlay before Join and before AODP upload.

The renderer handles every market frame directly rather than consuming only the last React event. Loot/activity frames no longer erase the selected market item. Support reports now include numeric market-stage counters and failure/recovery states, without item lists, prices or tokens. Existing backend diagnostic fields are reused.

`agent.patch` applies to the `agent/` sources in [APH-Agent-1.10.0-source.zip](https://github.com/MargoB2402/albion-profit-overlay/releases/download/v1.10.0/APH-Agent-1.10.0-source.zip). It contains all six Go source changes, including regressions. Apply from the extracted agent root with `git apply /path/to/agent.patch`.

The updated `assets/agent.exe` was built from those sources with `go build -trimpath -ldflags "-s -w" -o agent.exe .`. SHA256: `333e2c0451c3939b6e862c30dc9e390b059f2014d5b9092c9fe906806019b26e`.

Validation: Go client tests; 20 Node diagnostic/market/ingestion tests; Chrome across RU/EN/DE/ES/FR/IT/PT at 360 px, 45 distinct market quotes interleaved with other events, tab switching, minimized view and private mode. Vite production build and Node syntax checks passed. Live verification on the reporting player's machine remains pending.

This is a source/bundled-agent fix, not a published installer release. The version, updater manifest, trusted installer registration and production website were not changed. Installed clients require a subsequent protected application release containing both the renderer and agent fixes.
