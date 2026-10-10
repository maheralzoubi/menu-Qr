import { useTranslation } from 'react-i18next';
import { useMg, type PublicRestaurant } from '../../contexts/AppContext';
import { IStar } from './Icons';
import { Img, coverColors, monogram } from './ui';

export function useCuisineLabel() {
  const { t } = useTranslation();
  return (c: string) => t(`home.categories.${c}`, { defaultValue: t(`restaurants.cuisineNames.${c}`, { defaultValue: c }) });
}

export function closedLabel(r: { openTime: string | null }, tm: (k: string, o?: Record<string, unknown>) => string) {
  return r.openTime ? tm('closedNowAt', { time: r.openTime }) : tm('closedNowPlain');
}

/** Restaurant card — `web` switches between the phone list card and the web grid card. */
export function RestaurantCard({ r, web, onOpen }: { r: PublicRestaurant; web: boolean; onOpen: () => void }) {
  const tm = useMg();
  const cuisine = useCuisineLabel();
  const { cover, ink } = coverColors(r._id, r.primaryColor);
  const meta = [
    r.cuisine.length ? r.cuisine.slice(0, 3).map(cuisine).join(' · ') : null,
    r.prepTime ? `${r.prepTime} ${tm('min')}` : null,
    r.address || null,
  ].filter(Boolean) as string[];

  const mono = (
    <span dir="ltr" className={`font-display font-extrabold leading-none ${web ? 'text-[64px] tracking-[-0.05em]' : 'text-[44px] tracking-[-0.04em]'}`} style={{ color: ink }}>
      {monogram(r.name)}
    </span>
  );
  const pill = web ? 'top-3.5 px-[11px] py-[5px] text-[13px]' : 'top-3 px-2.5 py-1 text-[12px]';

  return (
    <button onClick={onOpen}
      className={`flex flex-col text-start p-0 border border-line overflow-hidden bg-card text-fg shadow-mg-sm transition-[transform,box-shadow] ${web
        ? 'rounded-3xl duration-[180ms] hover:shadow-mg-lg hover:-translate-y-0.5'
        : 'rounded-[20px] duration-[160ms] hover:shadow-mg-md hover:-translate-y-px'}`}>
      <div className={`relative w-full flex items-end box-border ${web ? 'aspect-[16/9] p-[18px]' : 'h-32 p-3.5'}`} style={{ background: cover }}>
        <Img src={r.logo} alt={r.name} fallback={mono}
          className={`object-cover bg-card shadow-mg ${web ? 'w-[72px] h-[72px] rounded-[20px]' : 'w-14 h-14 rounded-[14px]'}`} />
        {(r.reviewCount ?? 0) > 0 && (
          <span className={`absolute ${web ? 'end-3.5' : 'end-3'} flex items-center gap-1 rounded-full bg-card font-semibold leading-4 shadow-mg ${pill}`}>
            <IStar size={web ? 13 : 12} />{r.averageRating.toFixed(1)}
          </span>
        )}
        {!r.isOpen && (
          <span className={`absolute ${web ? 'start-3.5' : 'start-3'} rounded-full bg-fg text-bg font-semibold leading-4 ${pill}`}>
            {closedLabel(r, tm)}
          </span>
        )}
      </div>
      <div className={`w-full flex flex-col ${web ? 'pt-4 px-5 pb-5 gap-1.5' : 'pt-3.5 px-4 pb-4 gap-1'}`}>
        <span className={`font-display font-bold tracking-[-0.02em] ${web ? 'text-[20px] leading-[26px]' : 'text-[18px] leading-6'}`}>{r.name}</span>
        {meta.length > 0 && (
          <span className={`flex items-center gap-2 flex-wrap font-normal text-muted-fg ${web ? 'text-[14px] leading-5' : 'text-[13px] leading-[18px]'}`}>
            {meta.map((m, i) => (
              <span key={i} className="contents">
                {i > 0 && <span aria-hidden="true">·</span>}
                <span className={i > 0 ? 'whitespace-nowrap' : ''}>{m}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    </button>
  );
}

export function RestaurantCardSkeleton({ web }: { web: boolean }) {
  return (
    <div className={`flex flex-col border border-line overflow-hidden bg-card ${web ? 'rounded-3xl' : 'rounded-[20px]'}`}>
      <div className={`bg-muted animate-mg-pulse ${web ? 'aspect-[16/9]' : 'h-32'}`} />
      <div className={`flex flex-col gap-2 ${web ? 'pt-4 px-5 pb-5' : 'pt-3.5 px-4 pb-4'}`}>
        <div className="w-1/2 h-[18px] rounded bg-muted animate-mg-pulse" />
        <div className="w-2/3 h-3 rounded bg-muted animate-mg-pulse" />
      </div>
    </div>
  );
}
