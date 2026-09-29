import { useEffect, useState } from 'react';

// Breakpoints from the Menu Go Web design: <720 phone (Menu Go v2 layout),
// ≥720 web header + grids, ≥1024 sidebars.
export function useViewport() {
  const [vw, setVw] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { vw, small: vw < 720, mid: vw >= 720, wide: vw >= 1024, narrow: vw < 1024 };
}
