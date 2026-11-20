import { Fragment, useMemo, useState } from "react";

// Flattens one level of nested objects into "parent.child" keys so that the
// table can show them as columns. Arrays and deeper objects are rendered as
// compact JSON.
function flatten(item) {
  const out = {};
  if (!item || typeof item !== "object") return { value: item };
  for (const [key, value] of Object.entries(item)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k2, v2] of Object.entries(value)) out[`${key}.${k2}`] = v2;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function formatCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function DataTable({ items, preferredColumns = [], renderDetail, rowKey, onRowClick, cellRenderers = {}, toolbar, rowClassName }) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState({ key: null, dir: 1 });
  const [openKey, setOpenKey] = useState(null);

  const rows = useMemo(() => items.map((item, i) => ({ item, flat: flatten(item), key: rowKey?.(item) ?? i })), [items, rowKey]);

  const columns = useMemo(() => {
    const seen = new Set();
    for (const r of rows) Object.keys(r.flat).forEach((k) => seen.add(k));
    const preferred = preferredColumns.filter((c) => seen.has(c));
    const rest = [...seen].filter((c) => !preferred.includes(c));
    return [...preferred, ...rest];
  }, [rows, preferredColumns]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    let list = needle
      ? rows.filter((r) => Object.values(r.flat).some((v) => formatCell(v).toLowerCase().includes(needle)))
      : rows;
    if (sort.key) {
      list = [...list].sort((a, b) => {
        const av = formatCell(a.flat[sort.key]);
        const bv = formatCell(b.flat[sort.key]);
        return av.localeCompare(bv, undefined, { numeric: true }) * sort.dir;
      });
    }
    return list;
  }, [rows, filter, sort]);

  if (items.length === 0) return <p className="field__help">No entries.</p>;

  return (
    <div>
      <div className="table-toolbar">
        <input type="search" placeholder="Filter rows..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="field__help">
          {visible.length} of {items.length} entries
        </span>
        {toolbar}
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c}
                  onClick={() => setSort((s) => ({ key: c, dir: s.key === c ? -s.dir : 1 }))}
                  title="Sort"
                >
                  {c}
                  {sort.key === c ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <Fragment key={r.key}>
                <tr
                  className={`${openKey === r.key ? "is-open" : ""} ${rowClassName?.(r.item) ?? ""}`}
                  onClick={() => (onRowClick ? onRowClick(r.item) : setOpenKey((k) => (k === r.key ? null : r.key)))}
                >
                  {columns.map((c) => (
                    <td key={c}>{cellRenderers[c] ? cellRenderers[c](r.flat[c], r.item) : formatCell(r.flat[c])}</td>
                  ))}
                </tr>
                {openKey === r.key && (
                  <tr className="detail-row">
                    <td colSpan={columns.length}>
                      {renderDetail ? renderDetail(r.item) : <pre>{JSON.stringify(r.item, null, 2)}</pre>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
