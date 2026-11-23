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

CSV parsing supports quoted commas, quoted newlines and escaped quotes. It rejects malformed input and rows with extra fields. Reports prefix spreadsheet formula-like values to reduce formula injection risk. Duplicate SKU detection ignores case and surrounding whitespace. Findings are rule-based suggestions; review them before changing the original data.

## Current limitations

- CSV only. Excel workbooks must first be exported separately as CSV with a known encoding.
- File data is not persisted on the server or modified in place.
- This version does not call an AI model; its explanations are prewritten rule explanations.
- Empty stock quantities are not automatically classified as an error.

## Project status

This is a work in progress for Kiroween 2026. The competition requires actual Kiro usage and evidence in `.kiro/`; that work has not yet been recorded in this repository.

## License

MIT. See [LICENSE](LICENSE).
