import { useState, useCallback } from "react";

export function useApiCall(fn) {
  const [state, setState] = useState({ loading: false, error: null, result: null });

  const run = useCallback(
    async (...args) => {
      setState({ loading: true, error: null, result: null });
      try {
        const result = await fn(...args);
        setState({ loading: false, error: null, result });
        return result;
      } catch (err) {
        setState({ loading: false, error: err.message || String(err), result: null });
        return null;
      }
    },
    [fn]
  );

  return [state, run];
}
