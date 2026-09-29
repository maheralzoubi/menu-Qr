// Icon set used by the Menu Go designs (Lucide geometry, drawn inline so
// sizes and stroke widths match the mockups exactly).
import type { CSSProperties } from 'react';

interface P { size?: number; sw?: number; className?: string; style?: CSSProperties }

const Svg = ({ size = 20, sw = 2, className, style, children }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden="true">
    {children}
  </svg>
);

/** Arrow and chevron icons mirror in RTL. */
const flip = 'rtl:-scale-x-100';

export const IArrowLeft = (p: P) => <Svg {...p} className={`${flip} ${p.className ?? ''}`}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Svg>;
export const IChevronRight = (p: P) => <Svg {...p} className={`${flip} ${p.className ?? ''}`}><path d="m9 18 6-6-6-6" /></Svg>;
export const IBell = (p: P) => <Svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>;
export const ISearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></Svg>;
export const IX = (p: P) => <Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>;
export const IClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>;
export const IMapPin = (p: P) => <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Svg>;
export const IUtensils = (p: P) => <Svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></Svg>;
export const IBag = (p: P) => <Svg {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></Svg>;
export const ITrash = (p: P) => <Svg {...p}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></Svg>;
export const IMinus = (p: P) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const IPlus = (p: P) => <Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>;
export const ICheck = (p: P) => <Svg {...p}><path d="M20 6 9 17l-5-5" /></Svg>;
export const IHome = (p: P) => <Svg {...p}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></Svg>;
export const IReceipt = (p: P & { short?: boolean }) => (
  <Svg {...p}>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6" /><path d="M16 12h-6" />
    {!p.short && <path d="M13 16h-3" />}
  </Svg>
);
export const IUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></Svg>;

export const IStar = ({ size = 12, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--color-warn5)" className={className} aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
  </svg>
);
