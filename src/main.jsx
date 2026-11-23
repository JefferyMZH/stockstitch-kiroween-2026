import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { autoMap, exampleCSV, exportReport, inspectInventory, parseCSV } from './inventory.js';
import './style.css';

const labels = { sku: 'SKU', name: 'Product name', category: 'Category', price: 'Price', stock: 'Stock' };
const icons = { overview: '⌂', imports: '⇧', findings: '⌕', about: 'ⓘ' };

function App() {
  const [dataset, setDataset] = useState(() => parseCSV(exampleCSV));
  const [mapping, setMapping] = useState(() => autoMap(parseCSV(exampleCSV).headers));
  const [source, setSource] = useState('Sample data');
  const [importedAt, setImportedAt] = useState(null);
  const [encoding, setEncoding] = useState('utf-8');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [issueFilter, setIssueFilter] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [selected, setSelected] = useState(3);
  const [view, setView] = useState('overview');
  const [showMapping, setShowMapping] = useState(false);
  const input = useRef(null);
  const analysed = useMemo(() => inspectInventory(dataset.rows, mapping), [dataset, mapping]);
  const findings = useMemo(() => analysed.flatMap(row => row.findings.map(finding => ({ ...finding, row }))), [analysed]);
  const issueTypes = useMemo(() => [...new Set(findings.map(item => item.label))].sort(), [findings]);
  const visible = useMemo(() => analysed.filter(row => {
    const matchesText = !query || row.cells.some(cell => cell.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
    const matchesIssue = issueFilter === 'all' || (issueFilter === 'any' ? row.findings.length : row.findings.some(item => item.label === issueFilter));
    const matchesSeverity = severity === 'all' || row.findings.some(item => item.severity === severity && (issueFilter === 'all' || issueFilter === 'any' || item.label === issueFilter));
    return matchesText && matchesIssue && matchesSeverity;
  }), [analysed, query, issueFilter, severity]);
  const chosen = analysed.find(row => row.id === selected) || visible[0] || null;
  const currentFinding = chosen?.findings.find(f => (issueFilter === 'all' || issueFilter === 'any' || f.label === issueFilter) && (severity === 'all' || f.severity === severity)) || chosen?.findings[0];
  const missingMapping = Object.values(mapping).every(v => v === '');

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('The file is larger than 10 MB. Please use a smaller CSV.');
      const bytes = await file.arrayBuffer();
      const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
      if (text.includes('\uFFFD')) throw new Error('The file contains replacement characters. Choose the correct encoding and try again.');
      const parsed = parseCSV(text);
      if (!parsed.rows.length) throw new Error('The CSV has a header but no product rows.');
      setDataset(parsed); setMapping(autoMap(parsed.headers)); setSelected(parsed.rows[0].id); setSource(file.name); setImportedAt(new Date());
      setError(''); setQuery(''); setIssueFilter('all'); setSeverity('all'); setShowMapping(true); setView('overview');
    } catch (err) { setError(err instanceof TypeError ? 'Cannot decode this file with the selected encoding. Try the other encoding.' : err.message); }
    event.target.value = '';
  }
  function useSample() {
    const parsed = parseCSV(exampleCSV); setDataset(parsed); setMapping(autoMap(parsed.headers)); setSource('Sample data'); setImportedAt(null); setSelected(3); setQuery(''); setIssueFilter('all'); setSeverity('all'); setView('overview'); setError('');
  }
  function download() {
    const blob = new Blob([exportReport(analysed)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'stockstitch-findings.csv'; a.click(); URL.revokeObjectURL(url);
  }
  function navigate(next) {
    setView(next);
    if (next === 'findings') setIssueFilter('any');
    if (next === 'overview') setIssueFilter('all');
    if (next === 'imports') input.current?.click();
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-creature">✦</span><span>Stockstitch</span><small>INVENTORY DETECTIVE</small></div>
      <nav aria-label="Main navigation">{Object.entries(icons).map(([key, icon]) => <button key={key} className={view === key ? 'nav active' : 'nav'} onClick={() => navigate(key)}><span className="nav-icon" aria-hidden="true">{icon}</span>{key[0].toUpperCase() + key.slice(1)}</button>)}</nav>
      <div className="side-bottom"><span className="privacy-dot"/> Your data stays here<br/><small>Processed in your browser</small></div>
    </aside>
    <main className="workspace">
      <header className="hero">
        <div><div className="eyebrow">A LITTLE ORDER IN THE CHAOS <span>✦</span></div><h1>Inventory detective<span className="title-spark">✳</span></h1><p>Find the little things hiding in your inventory.</p><div className="method"><span>✣</span> Rule-based analysis <span className="method-dot">●</span> Private by design</div></div>
        <div className="hero-actions"><label className="encoding-label">CSV encoding <select aria-label="CSV encoding" value={encoding} onChange={e => setEncoding(e.target.value)}><option value="utf-8">UTF-8</option><option value="gb18030">GB18030 / GBK</option></select></label><button className="primary" onClick={() => input.current?.click()}><span>⇧</span> Import CSV</button><input ref={input} type="file" accept=".csv,text/csv" onChange={onFile} hidden/></div>
      </header>
      <div className="stitch" aria-hidden="true"/>
      <section className="stats" aria-label="Inventory summary">
        <Stat icon="⬡" label="Products" value={analysed.length} detail="rows inspected"/>
        <Stat icon="⌕" label="Findings" value={findings.length} detail="issues to review"/>
        <Stat icon="△" label="Critical" value={findings.filter(i => i.severity === 'high').length} detail="high priority" accent/>
        <Stat icon="▣" label="Current source" value={source} detail={importedAt ? `Imported ${importedAt.toLocaleString()}` : 'Example inventory'} compact/>
      </section>
      {error && <div role="alert" className="alert">{error} <button onClick={() => setError('')}>Dismiss</button></div>}
      {view === 'about' ? <section className="about"><div className="section-kicker">ABOUT STOCKSTITCH</div><h2>Untangle your inventory.</h2><p>Stockstitch checks CSV inventories for common data quality issues. Your file stays in your browser: it is not uploaded to a server.</p><p>Findings are deterministic rules, not AI-generated conclusions. They are suggestions for human review, and do not change your source file.</p><h3>How to use it</h3><ol><li>Select your CSV encoding and import a file.</li><li>Review the column mappings and choose the fields to inspect.</li><li>Filter the findings, review suggested fixes, and export a report.</li></ol><button className="secondary" onClick={() => navigate('overview')}>Back to overview</button></section> : <div className="content">
        <section className="inventory">
          <div className="section-heading"><div><div className="section-kicker">YOUR INVENTORY <span>✦</span></div><h2>All products <span>{analysed.length}</span></h2></div><button className="text-button" onClick={() => setShowMapping(true)}>⚙ &nbsp; Map columns</button></div>
          <div className="toolbar"><label className="search"><span>⌕</span><input placeholder="Search SKU, product, or category..." value={query} onChange={e => setQuery(e.target.value)} aria-label="Search products"/></label><select aria-label="Filter by issue" value={issueFilter} onChange={e => setIssueFilter(e.target.value)}><option value="all">All issues</option><option value="any">With findings</option>{issueTypes.map(type => <option key={type}>{type}</option>)}</select><select aria-label="Filter by severity" value={severity} onChange={e => setSeverity(e.target.value)}><option value="all">All severities</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          {missingMapping && <div className="hint">No columns were recognized. Select “Map columns” to choose the fields in your file.</div>}
          <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Product name</th><th>Category</th><th>Price</th><th>Stock</th><th>Issues</th></tr></thead><tbody>{visible.map(row => <tr key={row.id} className={chosen?.id === row.id ? 'selected' : ''} onClick={() => setSelected(row.id)} onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(row.id); }}} tabIndex="0" aria-label={`Source row ${row.id}, ${row.sku || 'missing SKU'}, ${row.findings.length} findings`}><td className="sku">{row.sku || <em>—</em>}</td><td>{row.name || <em>—</em>}</td><td>{row.category || <em>—</em>}</td><td>{row.price || <em>—</em>}</td><td>{row.stock || <em>—</em>}</td><td><div className="badges">{row.findings.length ? row.findings.map(f => <span key={f.code} className={`badge ${f.severity}`}>{f.label}</span>) : <span className="muted">—</span>}</div></td></tr>)}</tbody></table>{!visible.length && <div className="empty">No matching products. Try another filter.</div>}</div>
          <div className="table-footer"><span>Showing {visible.length} of {analysed.length} products <span className="muted">({source === 'Sample data' ? 'sample data' : 'source rows'})</span></span><button className="text-button" onClick={useSample}>Load sample data ↗</button></div>
        </section>
        <aside className="analysis"><div className="section-kicker">THE DETAILS <span>✦</span></div><h2>Analysis</h2><p className="analysis-sub">{chosen ? `${chosen.sku || `Row ${chosen.id}`} · ${chosen.name || 'Unnamed product'}` : 'Select a product'}</p>{chosen && currentFinding ? <div className="analysis-card"><div className="analysis-top"><span className={`badge ${currentFinding.severity}`}>{currentFinding.label}</span><span className={`severity ${currentFinding.severity}`}>{currentFinding.severity} priority</span></div><h3>What it means</h3><p>{currentFinding.explain}</p>{currentFinding.detail && <><h3>Why it was flagged</h3><p>{currentFinding.detail}</p></>}<h3>Review guidance</h3><p className="fix"><span>✦</span>{currentFinding.fix}</p>{chosen.findings.length > 1 && <div className="other">This row has {chosen.findings.length} findings: {chosen.findings.map(x => x.label).join(', ')}.</div>}<div className="card-line"/><button className="outline" onClick={download}>⇩ &nbsp; Export report (CSV)</button></div> : <div className="analysis-card calm"><div className="calm-icon">✧</div><h3>{chosen ? 'All clear on this row' : 'Nothing selected'}</h3><p>{chosen ? 'No issues were found in the mapped columns.' : 'Select a row to see what needs attention.'}</p><button className="outline" onClick={download}>⇩ &nbsp; Export report (CSV)</button></div>}<div className="helper"><strong>A friendly reminder</strong><p>Review suggestions before changing your source data. We never edit it for you.</p></div></aside>
      </div>}
      <footer>Made for curious humans <span>✦</span> Stockstitch</footer>
    </main>
    {showMapping && <div className="modal-backdrop" onClick={() => setShowMapping(false)}><section role="dialog" aria-modal="true" aria-labelledby="mapping-title" className="modal" onClick={e => e.stopPropagation()}><div className="modal-top"><div><div className="section-kicker">SET UP YOUR FILE</div><h2 id="mapping-title">Map your columns</h2></div><button aria-label="Close column mapping" onClick={() => setShowMapping(false)}>×</button></div><p>Choose which source column matches each field. Unmapped fields are skipped, not treated as missing.</p><div className="mapping-list">{Object.keys(labels).map(key => <label key={key}><span>{labels[key]}</span><select value={mapping[key]} onChange={e => setMapping(prev => ({ ...prev, [key]: e.target.value }))}><option value="">Not mapped</option>{dataset.headers.map((header, index) => <option key={index} value={String(index)}>{header || `(Column ${index + 1})`}</option>)}</select></label>)}</div><div className="modal-footer"><span>{dataset.rows.length} rows in {source}</span><button className="primary" onClick={() => setShowMapping(false)}>Apply mapping</button></div></section></div>}
  </div>;
}

function Stat({ icon, label, value, detail, accent, compact }) { return <div className="stat"><span className={accent ? 'stat-icon lime' : 'stat-icon'}>{icon}</span><div><div className="stat-label">{label}</div><div className={compact ? 'stat-value compact' : 'stat-value'} title={String(value)}>{value}</div><div className="stat-detail">{detail}</div></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
