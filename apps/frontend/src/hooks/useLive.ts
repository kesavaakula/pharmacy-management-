import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

/** Fired after every successful or failed background refresh (the header "Live" pill listens). */
export const liveBus = new EventTarget();

/** Fired whenever the user changes data, so every open view refreshes immediately. */
const CHANGE_EVENT = 'pharma:changed';
let lastLocalChange = 0;

export const wasChangedLocallyRecently = (ms = 6000) => Date.now() - lastLocalChange < ms;

export const notifyChange = (local = true) => {
  if (local) {
    lastLocalChange = Date.now();
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

/**
 * Loads `path` now, then re-fetches every `intervalMs` while the tab is visible,
 * when the tab regains focus, and right after any notifyChange().
 */
export function useLive<T>(path: string, intervalMs = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await api<T>(path);
      setData(result);
      setError(null);
      setLastUpdated(Date.now());
      liveBus.dispatchEvent(new CustomEvent('live', { detail: { ok: true, at: Date.now() } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      liveBus.dispatchEvent(new CustomEvent('live', { detail: { ok: false, at: Date.now() } }));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, intervalMs);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(CHANGE_EVENT, load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(CHANGE_EVENT, load);
    };
  }, [load, intervalMs]);

  return { data, error, loading, lastUpdated, refresh: load };
}
