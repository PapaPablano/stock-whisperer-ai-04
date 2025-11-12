import { useState, useEffect } from 'react';
import { Layout } from 'react-grid-layout';

const getInitialLayouts = () => {
  return {
    lg: [
      { i: "chart", x: 0, y: 0, w: 9, h: 12, minH: 8, minW: 6 },
      { i: "metrics", x: 9, y: 0, w: 3, h: 6, minH: 4, minW: 2 },
      { i: "indicators", x: 9, y: 6, w: 3, h: 6, minH: 4, minW: 2 },
      { i: "news", x: 0, y: 12, w: 12, h: 8, minH: 6, minW: 4 },
    ],
  };
};

const getFromLS = (key: string) => {
  let ls: any = {};
  if (global.localStorage) {
    try {
      ls = JSON.parse(global.localStorage.getItem('rgl-8') || '{}');
    } catch (e) {
      /*Ignore*/
    }
  }
  return ls[key];
};

const saveToLS = (key: string, value: any) => {
  if (global.localStorage) {
    global.localStorage.setItem(
      'rgl-8',
      JSON.stringify({
        [key]: value,
      })
    );
  }
};

export const useGridLayout = () => {
  const [layouts, setLayouts] = useState(() => {
    const savedLayouts = getFromLS('layouts');
    return savedLayouts || getInitialLayouts();
  });

  useEffect(() => {
    const savedLayouts = getFromLS('layouts');
    if (savedLayouts) {
      setLayouts(savedLayouts);
    }
  }, []);

  const onLayoutChange = (layout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    saveToLS('layouts', allLayouts);
    setLayouts(allLayouts);
  };

  const resetLayout = () => {
    setLayouts(getInitialLayouts());
    saveToLS('layouts', getInitialLayouts());
  }

  return { layouts, onLayoutChange, resetLayout };
};
