export const aliases = {
  sku: ['sku', 'sku code', 'sku_code', 'product code', 'product_code', 'code', '商品编码', '产品编码', '货号', 'sku编码', '物料编码'],
  name: ['product', 'product name', 'product_name', 'name', '商品名称', '产品名称', '名称', '品名'],
  category: ['category', 'type', '分类', '类别', '商品分类', '产品类别'],
  price: ['price', 'unit price', 'unit_price', '售价', '单价', '价格'],
  stock: ['stock', 'quantity', 'qty', 'inventory', '库存', '库存数量', '数量', '可用库存'],
};

export function parseCSV(text) {
  const input = text.replace(/^\uFEFF/, '');
  const result = [];
  let row = [], cell = '', quoted = false, afterQuote = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; afterQuote = true; }
      else cell += c;
    } else if (afterQuote) {
      if (c === ',') { row.push(cell); cell = ''; afterQuote = false; }
      else if (c === '\n' || c === '\r') {
        row.push(cell); result.push(row); row = []; cell = ''; afterQuote = false;
        if (c === '\r' && input[i + 1] === '\n') i++;
      } else if (c !== ' ' && c !== '\t') throw new Error('Unexpected character after a closing quote.');
    } else if (c === '"') {
      if (cell !== '') throw new Error('Unexpected quote in an unquoted field.');
      quoted = true;
    } else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      row.push(cell); result.push(row); row = []; cell = '';
      if (c === '\r' && input[i + 1] === '\n') i++;
    } else cell += c;
  }
  if (quoted) throw new Error('A quoted field is not closed.');
  if (cell !== '' || row.length || afterQuote) { row.push(cell); result.push(row); }
  while (result.length && result[result.length - 1].every(value => value === '')) result.pop();
  if (!result.length || result[0].every(v => !v.trim())) throw new Error('The CSV has no header row.');
  const headers = result[0];
  if (result.slice(1).some(r => r.length > headers.length)) throw new Error('A row has more fields than the header. Check the delimiter and quoting.');
  return { headers, rows: result.slice(1).filter(r => r.some(v => v.trim())).map((r, i) => ({ id: i + 2, cells: headers.map((_, n) => r[n] ?? '') })) };
}

export function autoMap(headers) {
  return Object.fromEntries(Object.entries(aliases).map(([key, names]) => {
    const index = headers.findIndex(h => names.includes(h.trim().toLowerCase()));
    return [key, index < 0 ? '' : String(index)];
  }));
}

const messages = {
  duplicate: { label: 'Duplicate SKU', severity: 'high', explain: 'This SKU occurs in more than one row. Different products can become difficult to distinguish in orders and inventory reports.', fix: 'Verify whether these rows are duplicates or distinct products. Assign a unique SKU if they are distinct.' },
  missingSku: { label: 'Missing SKU', severity: 'high', explain: 'This row has no SKU, so it cannot be reliably identified across systems.', fix: 'Assign a unique SKU that follows your product coding convention.' },
  negativeStock: { label: 'Negative stock', severity: 'high', explain: 'The stock quantity is below zero. This may indicate an oversell or a synchronization error.', fix: 'Reconcile physical stock, recent orders, and inventory adjustments before changing this value.' },
  invalidStock: { label: 'Invalid stock', severity: 'medium', explain: 'The stock value is not a valid number.', fix: 'Replace the value with a valid numeric stock quantity.' },
  missingPrice: { label: 'Missing price', severity: 'medium', explain: 'This item has no price in the selected price column.', fix: 'Enter the correct unit price if this item should be sold.' },
  invalidPrice: { label: 'Invalid price', severity: 'medium', explain: 'The price is not a valid non-negative number.', fix: 'Check the source and enter a valid non-negative price.' },
  missingName: { label: 'Missing name', severity: 'medium', explain: 'A product name is missing.', fix: 'Add a descriptive name so the product can be recognized.' },
  missingCategory: { label: 'Missing category', severity: 'low', explain: 'This product does not have a category.', fix: 'Choose the most appropriate category for filtering and reporting.' },
};

const consistencyMessages = {
  priceMismatch: { label: 'Inconsistent price', explain: 'Rows with the same normalized product name have different non-empty prices.', fix: 'Compare the listed rows. If they are the same product, confirm the correct price in your source system. If they are different variants, make the names more specific.' },
  nameSkuMismatch: { label: 'Same name, different SKU', explain: 'Rows with the same normalized product name use different non-empty SKUs.', fix: 'Check whether this is one product with several SKUs by mistake, or distinct products that need distinguishing names (size, color, edition).' },
};

export function normalizeName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

const rowList = rows => rows.map(r => r.id).join(', ');

// Cross-row checks. Only runs for fields that are mapped (value !== null) and non-empty; originals are never altered.
function consistencyFindings(items) {
  const byRow = new Map();
  const push = (row, finding) => { if (!byRow.has(row.id)) byRow.set(row.id, []); byRow.get(row.id).push(finding); };
  const groups = new Map();
  for (const item of items) {
    if (item.name === null) continue;
    const key = normalizeName(item.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const priced = members.filter(m => m.price);
    const priceKey = m => Number.isFinite(Number(m.price)) ? 'n:' + Number(m.price) : 's:' + m.price;
    const distinctPrices = new Set(priced.map(priceKey));
    if (distinctPrices.size > 1) {
      const nums = priced.map(m => Number(m.price)).filter(n => Number.isFinite(n) && n >= 0);
      const max = Math.max(...nums), min = Math.min(...nums);
      const numeric = nums.length === priced.length;
      const big = numeric && max > 0 && (max - min) / max >= 0.5;
      const severity = big ? 'high' : 'medium';
      for (const row of priced) {
        const others = priced.filter(o => o.id !== row.id && priceKey(o) !== priceKey(row));
        push(row, { code: 'priceMismatch', ...consistencyMessages.priceMismatch, severity,
          detail: `Price "${row.price}" differs from ${others.map(o => `"${o.price}" (row ${o.id})`).join(', ')}. ${big ? 'The difference is 50% or more of the higher price. ' : ''}Related rows: ${rowList(priced)}.`,
          related: priced.map(r => r.id) });
      }
    }
    const withSku = members.filter(m => m.sku);
    const distinctSkus = new Set(withSku.map(m => m.sku.toLocaleUpperCase()));
    if (distinctSkus.size > 1) {
      for (const row of withSku) {
        const others = withSku.filter(o => o.id !== row.id && o.sku.toLocaleUpperCase() !== row.sku.toLocaleUpperCase());
        push(row, { code: 'nameSkuMismatch', ...consistencyMessages.nameSkuMismatch, severity: 'medium',
          detail: `SKU "${row.sku}" shares its name with ${others.map(o => `"${o.sku}" (row ${o.id})`).join(', ')}. Related rows: ${rowList(withSku)}.`,
          related: withSku.map(r => r.id) });
      }
    }
  }
  return byRow;
}

export function inspectInventory(rows, mapping) {
  const value = (row, field) => mapping[field] === '' || mapping[field] == null ? null : (row.cells[Number(mapping[field])] ?? '').trim();
  const counts = new Map();
  rows.forEach(row => { const sku = value(row, 'sku'); if (sku) counts.set(sku.toLocaleUpperCase(), (counts.get(sku.toLocaleUpperCase()) || 0) + 1); });
  const base = rows.map(row => ({ row, sku: value(row, 'sku'), name: value(row, 'name'), price: value(row, 'price'), id: row.id }));
  const cross = consistencyFindings(base);
  return rows.map(row => {
    const found = [];
    const add = code => found.push({ code, ...messages[code] });
    const sku = value(row, 'sku'), name = value(row, 'name'), category = value(row, 'category'), price = value(row, 'price'), stock = value(row, 'stock');
    if (sku !== null && !sku) add('missingSku');
    else if (sku && counts.get(sku.toLocaleUpperCase()) > 1) add('duplicate');
    if (name !== null && !name) add('missingName');
    if (category !== null && !category) add('missingCategory');
    if (price !== null && !price) add('missingPrice');
    else if (price !== null && (!Number.isFinite(Number(price)) || Number(price) < 0)) add('invalidPrice');
    if (stock !== null && stock && !Number.isFinite(Number(stock))) add('invalidStock');
    else if (stock !== null && stock && Number(stock) < 0) add('negativeStock');
    found.push(...(cross.get(row.id) || []));
    return { ...row, sku, name, category, price, stock, findings: found };
  });
}

export function exportReport(rows) {
  const safe = value => {
    let text = String(value ?? '');
    if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  const data = [['Source row', 'SKU', 'Product name', 'Issue', 'Severity', 'Explanation', 'Suggested action', 'Details', 'Related source rows']];
  for (const row of rows) for (const issue of row.findings) data.push([row.id, row.sku, row.name, issue.label, issue.severity, issue.explain, issue.fix, issue.detail ?? '', (issue.related ?? []).join(' ')]);
  return '\uFEFF' + data.map(row => row.map(safe).join(',')).join('\r\n');
}

export const exampleCSV = `SKU,Product name,Category,Price,Stock\nST-1001,Stitched Pumpkin Mug,Home & Decor,14.99,42\nST-1002,Monster Plush - Green,Toys,24.99,18\nST-1002,Monster Plush - Purple,Toys,24.99,20\nST-1003,Witch Hat - Mini,Accessories,,15\nST-1004,Glow Bones Set,,9.99,-5\nST-1005,Candy Tote Bag,Bags,12.50,30\nST-1006,candy  tote bag,Bags,25.00,8`;
