import { useState, useEffect } from 'react';
import { Layout } from 'react-grid-layout';

type BreakpointLayouts = Record<string, Layout[]>;
const STORAGE_KEY = 'rgl-8';

const getInitialLayouts = (): BreakpointLayouts => ({
  lg: [
    { i: 'chart', x: 0, y: 0, w: 9, h: 12, minH: 8, minW: 6 },
    { i: 'metrics', x: 9, y: 0, w: 3, h: 6, minH: 4, minW: 2 },
    { i: 'indicators', x: 9, y: 6, w: 3, h: 6, minH: 4, minW: 2 },
    { i: 'news', x: 0, y: 12, w: 12, h: 8, minH: 6, minW: 4 },
  ],
});

const getFromLS = (key: string): BreakpointLayouts | undefined => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return undefined;
  }
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return undefined;
    const parsed = JSON.parse(storedValue) as Record<string, BreakpointLayouts>;
    return parsed[key];
  } catch {
    return undefined;
  }
};

const saveToLS = (key: string, value: BreakpointLayouts) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      [key]: value,
    }),
  );
};

export const useGridLayout = () => {
  const [layouts, setLayouts] = useState<BreakpointLayouts>(() => getFromLS('layouts') || getInitialLayouts());

  useEffect(() => {
    const savedLayouts = getFromLS('layouts');
    if (savedLayouts) {
      setLayouts(savedLayouts);
    }
  }, []);

  const onLayoutChange = (_layout: Layout[], allLayouts: BreakpointLayouts) => {
    saveToLS('layouts', allLayouts);
    setLayouts(allLayouts);
  };

  const resetLayout = () => {
    setLayouts(getInitialLayouts());
    saveToLS('layouts', getInitialLayouts());
  };

  return { layouts, onLayoutChange, resetLayout };
};
