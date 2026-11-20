import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "../lib/i18n.jsx";

// Searchable dropdown: type to filter, arrow keys + Enter to pick, Escape
// to close. options: [{ value, label, hint? }]. Every typed word must appear
// in the label or hint (case-insensitive).
export default function Combobox({ options, value, onChange, placeholder, ariaLabel }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return options;
    return options.filter((o) => {
      const text = `${o.label} ${o.hint ?? ""}`.toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [options, query]);

  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (opt) => {
    onChange(opt.value);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[active]) {
        e.preventDefault();
        pick(filtered[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="combo" ref={rootRef}>
      <div className="combo__field">
        <input
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
          placeholder={selected ? selected.label : placeholder}
          value={open ? query : selected?.label ?? ""}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {selected && !open && (
          <button type="button" className="combo__clear" aria-label={t("Clear selection")} onClick={() => onChange("")}>
            ×
          </button>
        )}
        <span className="combo__caret" aria-hidden>
          ▾
        </span>
      </div>
      {open && (
        <ul className="combo__list" role="listbox" id={listId} ref={listRef}>
          {filtered.length === 0 && <li className="combo__empty">{t("No matches")}</li>}
          {filtered.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`combo__option ${i === active ? "combo__option--active" : ""} ${o.value === value ? "combo__option--selected" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
            >
              <span className="combo__label">{o.label}</span>
              {o.hint && <span className="combo__hint">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
