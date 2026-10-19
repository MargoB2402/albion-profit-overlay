# albion-profit-overlay

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
