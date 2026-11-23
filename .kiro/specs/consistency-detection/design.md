# Design

- `normalizeName` and `consistencyFindings` in `src/inventory.js` group rows by normalized name after per-row values are read through the column mapping.
- `inspectInventory` appends cross-row findings to each row's `findings`, adding `detail` and `related` (source row ids). Because filters are built from finding labels, they pick up the new types without UI changes.
- Prices are compared numerically when parseable (so `12.5` equals `12.50`), otherwise as trimmed text.
- Severity: price mismatch is high when all prices are numeric and the spread is at least 50% of the highest price, otherwise medium. Name/SKU mismatch is medium.
- `main.jsx` shows a "Why it was flagged" section and renames the fix section "Review guidance". The export adds `Details` and `Related source rows` columns.
- The sample CSV gained one row (`ST-1006`, `candy  tote bag`) that demonstrates both findings.
