import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import DE from "./i18n.de.js";

// UI texts are written in English and used as keys; `t("...")` returns the
// German translation when German is selected (falling back to English).
// Placeholders: t("Hello {name}", { name: "x" }).

export const LANGUAGES = [
  { id: "de", name: "Deutsch", flag: "🇩🇪" },
  { id: "en", name: "English", flag: "🇬🇧" },
];

const DICTS = { de: DE, en: {} };

function initialLang() {
  try {
    const nav = (navigator.languages?.[0] ?? navigator.language ?? "").toLowerCase();
    return nav.startsWith("de") ? "de" : "en";
  } catch {
    return "en";
  }
}

export function translate(lang, text, vars) {
  if (text === null || text === undefined) return text;
  let out = DICTS[lang]?.[text] ?? text;
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
  return out;
}

const I18nContext = createContext({ lang: "en", setLang: () => {}, t: (s, v) => translate("en", s, v) });

// The language lives in memory only (nothing is stored in the browser); the
// default follows the browser language.
export function LangProvider({ children }) {
  const [lang, setLang] = useState(initialLang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = useCallback((text, vars) => translate(lang, text, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
