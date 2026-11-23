# Stockstitch

Stockstitch is an inventory data detective for CSV files. It combines browser-side file import, configurable field mapping, deterministic anomaly checks, explanations, and a downloadable findings report. The included inventory is fictional sample data.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. To produce a static build, run `npm run build`.

## Workflow

1. Open the sample inventory or choose a CSV file. Select UTF-8 or GB18030/GBK according to the original file's encoding.
2. Review column mappings for SKU, product name, category, price, and stock. Unmapped fields are skipped.
3. Search or filter products and select a row to review findings and suggested fixes.
4. Export findings as CSV. Imported files are processed in the browser and are not uploaded by the application.

CSV parsing supports quoted commas, quoted newlines and escaped quotes. It rejects malformed input and rows with extra fields. Reports prefix spreadsheet formula-like values to reduce formula injection risk. Duplicate SKU detection ignores case and surrounding whitespace. Consistency checks compare rows by normalized product name (Unicode NFKC, trimmed, whitespace collapsed, case-insensitive). Rows with the same name but different non-empty prices are flagged "Inconsistent price" (high when the gap is at least 50% of the higher price, otherwise medium). Rows with the same name but different non-empty SKUs are flagged "Same name, different SKU" (medium). Empty names, prices and SKUs are ignored, checks are skipped when the field is unmapped, and the source values are never changed. The analysis panel lists the related source rows, and the CSV export includes them. Findings are rule-based suggestions; review them before changing the original data.

## Current limitations

- CSV only. Excel workbooks must first be exported separately as CSV with a known encoding.
- File data is not persisted on the server or modified in place.
- This version does not call an AI model; its explanations are prewritten rule explanations.
- Empty stock quantities are not automatically classified as an error.

## Project status

This is a work in progress for Kiroween 2026. The consistency detection feature was built with Kiro; its requirements, design and status are in `.kiro/specs/consistency-detection/` and `.kiro/steering/`. This change has not been tested or built: verification was explicitly skipped, so review it before relying on it.

## License

MIT. See [LICENSE](LICENSE).
