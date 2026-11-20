import { useEffect, useState } from "react";

// Minimal hash router: "#/requests/<id>" -> ["requests", "<id>"].
// Old tab hashes ("#prereq", "#requests", "#records") keep working and
// open the matching API Explorer tab.
const LEGACY = { prereq: "/explorer/prereq", requests: "/explorer/requests", records: "/explorer/records", overview: "/requests" };

function parse() {
  let hash = window.location.hash.slice(1);
  if (LEGACY[hash]) hash = LEGACY[hash];
  const parts = hash.replace(/^\//, "").split("/").filter(Boolean).map(decodeURIComponent);
  return parts.length ? parts : ["dashboard"];
}

export function useRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function href(...parts) {
  return `#/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
}

export function navigate(...parts) {
  window.location.hash = href(...parts).slice(1);
}
