# Release notes

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
