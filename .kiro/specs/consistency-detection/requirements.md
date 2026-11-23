# Requirements: inventory consistency detection

1. Flag rows sharing a normalized, non-empty product name whose non-empty prices differ ("Inconsistent price").
2. Flag rows sharing a normalized, non-empty product name with different non-empty SKUs ("Same name, different SKU"). SKU comparison ignores case.
3. Name normalization: Unicode NFKC, trim, collapse whitespace, lower-case. Empty names and empty prices/SKUs are ignored.
4. Checks run only when the relevant fields are mapped; unmapped fields are skipped.
5. Each finding has severity, explanation, row-specific detail with related source rows, and human review guidance.
6. Findings appear in the existing issue/severity filters, table badges, analysis panel and CSV export.
7. No network calls; source data is not altered.
