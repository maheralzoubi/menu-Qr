import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMg } from '../../contexts/AppContext';
import type { MenuItem } from '../../types';
import { IUtensils, IX } from './Icons';
import { Img, Sheet, Stepper, money } from './ui';

interface Props {
  item: MenuItem;
  currency: string;
  inCart: number;
  web: boolean;
  onClose: () => void;
  onAdd: (qty: number, note: string) => void;
}

export function ItemSheet({ item, currency, inCart, web, onClose, onAdd }: Props) {
  const tm = useMg();
  const { t } = useTranslation();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const desc = item.longDescription || item.description;

  const inCartBadge = inCart > 0 && (
    <span className="absolute top-3.5 start-3.5 px-2.5 py-1 rounded-full bg-primary text-on-primary font-semibold text-[12px] leading-4">
      {inCart} {t('product.inCart')}
    </span>
  );

  const hero = web ? (
    <div className="relative h-[200px] shrink-0 bg-acc-soft flex items-center justify-center text-acc overflow-hidden">
      <Img src={item.image} alt={item.name} className="w-full h-full object-cover"
        fallback={<IUtensils size={40} sw={1.5} className="opacity-50" />} />
      {inCartBadge}
      <button aria-label="Close" onClick={onClose}
        className="absolute top-3.5 end-3.5 w-10 h-10 rounded-full border-0 bg-card text-fg shadow-mg-md flex items-center justify-center">
        <IX size={18} />
      </button>
    </div>
  ) : (
    <div className="relative h-40 rounded-[14px] bg-muted flex items-center justify-center text-muted-fg overflow-hidden shrink-0">
      <Img src={item.image} alt={item.name} className="w-full h-full object-cover"
        fallback={<IUtensils size={32} sw={1.5} className="opacity-60" />} />
      {inCartBadge}
    </div>
  );

  const footer = (
    <div className={`flex gap-3 border-t border-line ${web ? 'pt-4 px-6 pb-5' : 'pt-3 px-5'}`}
      style={web ? undefined : { paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}>
      <Stepper variant={web ? 'webSheet' : 'sheet'} qty={qty} onDec={() => setQty(q => Math.max(1, q - 1))} onInc={() => setQty(q => q + 1)} />
      <button onClick={() => onAdd(qty, note)}
        className={`flex-1 border-0 bg-primary flex items-center justify-between font-semibold text-[16px] leading-none hover:opacity-90 ${web
          ? 'h-[54px] px-[22px] rounded-full text-white'
          : 'h-[52px] px-4 rounded-[14px] text-on-primary'}`}>
        <span>{tm('addToCart')}</span><span>{money(item.price * qty, currency)}</span>
      </button>
    </div>
  );

  const groupTitle = web ? 'font-display font-bold text-[17px] leading-[22px]' : 'font-semibold text-[16px] leading-[22px]';

  return (
    <Sheet open onClose={onClose} label={item.name} web={web} hero={hero} footer={footer}>
      <div className="flex justify-between gap-3 items-start">
        <div className="flex flex-col gap-1">
          <h2 className={`m-0 font-display ${web ? 'font-extrabold text-[28px] leading-8 tracking-[-0.03em]' : 'font-bold text-[24px] leading-8 tracking-[-0.02em]'}`}>{item.name}</h2>
          {desc && <span className={`text-muted-fg ${web ? 'text-[15px] leading-[22px]' : 'text-[14px] leading-5'}`}>{desc}</span>}
        </div>
        <span className={`shrink-0 ${web ? 'font-display font-bold text-[18px] leading-6 mt-1' : 'font-semibold text-[16px] leading-[22px] mt-[5px]'}`}>{money(item.price, currency)}</span>
      </div>

      {item.allergens?.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className={groupTitle}>{tm('allergens')}</span>
          <div className="flex flex-wrap gap-1.5">
            {item.allergens.map(a => (
              <span key={a} className="px-2.5 py-0.5 rounded-full bg-warn1 text-warn7 font-semibold text-[12px] leading-4">{a}</span>
            ))}
          </div>
        </div>
      )}
      {item.ingredients?.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className={groupTitle}>{tm('ingredients')}</span>
          <span className="text-[14px] leading-5 text-muted-fg">{item.ingredients.join(', ')}</span>
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className={groupTitle}>
          {tm('specialReq')} <span className={`font-normal font-sans text-muted-fg ${web ? 'text-[13px]' : 'text-[12px]'}`}>· {tm('optional')}</span>
        </span>
        <input value={note} onChange={e => setNote(e.target.value.slice(0, 200))} placeholder={tm('specialPh')}
          className={`px-3.5 border border-input rounded-[14px] text-fg text-[16px] leading-none ${web ? 'h-[50px] px-4 bg-card' : 'h-12 bg-bg'}`} />
      </label>
    </Sheet>
  );
}
