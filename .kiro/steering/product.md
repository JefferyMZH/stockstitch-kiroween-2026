# Stockstitch steering

- Browser-local React/Vite CSV inventory tool. No network calls; inventory data must never be transmitted.
- Analysis is deterministic and rule-based. Do not describe it as AI at runtime.
- Unmapped fields are skipped, never treated as missing. Source values are never modified; normalization is used for comparison only.
- Preserve UTF-8 and the existing Chinese header aliases.
- Findings are suggestions for human review.
- Core logic lives in `src/inventory.js`; UI in `src/main.jsx`.
