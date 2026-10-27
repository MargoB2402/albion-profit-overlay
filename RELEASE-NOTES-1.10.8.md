# Windows 1.10.8 — 27 October 2026

Craft → My crafting and focus records completed batches, output, observed resource returns, station fees and actual focus usage. The collector accepts only the local character and deduplicates repeated packets. Windows live traces verified batches with 0, 72 and 36 focus; Android uses the same event mapping and regression fixtures. Ending a recording leaves the floating window open.

Link real ledger purchases and completed sales to each batch. FIFO suggestions must be reviewed and saved. Resources are costed net of returns; receipt quantities cannot be reused across batches. Partial sales and sales in a different city are supported. Enter exact after-tax proceeds, listing/relisting fees and other batch costs where they are not observed. Legacy estimates are never promoted to actual tax deductions. Manually confirmed amounts and uncertain receipt assignments are marked.

Realized profit and silver per observed focus are separate from estimates using current public prices. Final batch profit remains unknown until all material costs and all output sales are linked with known fees. Zero or unknown focus does not produce a per-focus ratio. A public-price cache failure does not invalidate realized accounting.

Requires the companion website API and ledger update for cloud batches and ledger links. The release does not deploy those services: old servers keep local observations, while cloud sync/linking waits for the update. Recording uses the shared activity session; cloud sync runs while this tracker is open. Cancelled/partial crafting jobs and automatic completion of every gameplay learning block are not included.

Checks: actual-ledger transaction/rollback and PostgreSQL-compatible owner/version/quantity/duplicate tests; live-format Go and Java craft fixtures; exact-cost/focus model tests; shared Android WebView UI, RU/EN and 280–800px touch controls; production packaging checks. A physical Android phone test remains necessary. Matching open-agent source is attached; proprietary desktop sources, credentials and runtime logs are excluded.

## По-русски

В «Крафт → Мой крафт и фокус» появились запись завершённых партий, возвраты ресурсов и фактический расход очков фокуса. В партии можно привязать закупки и продажи из бухгалтерии, учесть частичные продажи, точные комиссии и прочие расходы. Прибыль закрытой партии и серебро на очко считаются отдельно от прогнозной оценки. Неизвестные суммы требуют подтверждения и не заменяются нулём. Для облачной истории и привязок надо обновить серверные API и бухгалтерию. Окно при завершении записи остаётся открытым.
