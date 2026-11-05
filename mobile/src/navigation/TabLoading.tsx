import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lets the data hooks inside a tab tell the tab that they are still loading, so the tab keeps its
 * skeleton until every one of them has its first data, instead of showing half-filled content that
 * then fills in. Outside a tab (no provider) reporting does nothing.
 */
interface TabLoadingApi {
  report: (id: string, loading: boolean) => void;
  forget: (id: string) => void;
}

const TabLoadingContext = createContext<TabLoadingApi | null>(null);

/** Provides the registry and returns, through `onChange`, whether anything inside is still loading. */
export function TabLoadingProvider({
  onChange,
  children,
}: {
  onChange: (anyLoading: boolean) => void;
  children: ReactNode;
}) {
  const loadingIds = useRef(new Set<string>());
  const onChangeRef = useRef(onChange);
  const lastAny = useRef(false);
  const [api] = useState<TabLoadingApi>(() => {
    const notify = () => {
      const any = loadingIds.current.size > 0;
      if (any === lastAny.current) return;
      lastAny.current = any;
      onChangeRef.current(any);
    };
    return {
      report: (id, loading) => {
        if (loading) loadingIds.current.add(id);
        else loadingIds.current.delete(id);
        notify();
      },
      // Silent on purpose: this runs when a hook unmounts or its tab is frozen, and a state update
      // from there makes the frozen tree re-render, which freezes it again, without end.
      forget: (id) => {
        loadingIds.current.delete(id);
      },
    };
  });
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  return <TabLoadingContext.Provider value={api}>{children}</TabLoadingContext.Provider>;
}

/** Called by a data hook with its loading flag. */
export function useReportLoading(loading: boolean): void {
  const api = useContext(TabLoadingContext);
  const id = useId();
  useLayoutEffect(() => {
    api?.report(id, loading);
  }, [api, id, loading]);
  useLayoutEffect(() => () => api?.forget(id), [api, id]);
}
