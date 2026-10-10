import { useState } from 'react';
import { useApp, useMg } from '../../contexts/AppContext';
import { IMapPin, ITrash } from './Icons';
import { RadioDot, Sheet } from './ui';

interface Props {
  web: boolean;
  onClose: () => void;
  /** When set, rows are selectable (checkout); otherwise the sheet only manages the list. */
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

export function AddressSheet({ web, onClose, selectedId, onSelect }: Props) {
  const tm = useMg();
  const { addresses, saveAddresses } = useApp();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [label, setLabel] = useState('');
  const [line, setLine] = useState('');
  const [err, setErr] = useState(false);

  const add = async () => {
    if (!line.trim()) { setErr(true); return; }
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await saveAddresses([...addresses, { id, label: label.trim(), line: line.trim() }]);
    setLabel(''); setLine(''); setAdding(false);
    onSelect?.(id);
  };

  const remove = (id: string) => saveAddresses(addresses.filter(a => a.id !== id));

  const input = `px-3.5 border border-input rounded-[14px] text-fg text-[16px] leading-none ${web ? 'h-[50px] bg-card' : 'h-12 bg-bg'}`;
  const primary = `border-0 bg-primary text-on-primary font-semibold text-[16px] leading-none ${web ? 'h-[52px] rounded-full' : 'h-12 rounded-[14px]'}`;
  const outline = `border border-line bg-transparent text-fg font-semibold text-[16px] leading-none hover:bg-accent ${web ? 'h-12 rounded-full' : 'h-12 rounded-[14px]'}`;

  return (
    <Sheet open onClose={onClose} label={tm('addresses')} web={web}>
      <h2 className={`m-0 font-display ${web ? 'font-extrabold text-[28px] leading-8 tracking-[-0.03em]' : 'font-bold text-[24px] leading-8 tracking-[-0.02em]'}`}>
        {onSelect ? tm('chooseAddress') : tm('addresses')}
      </h2>

      {addresses.length > 0 ? (
        <div role={onSelect ? 'radiogroup' : undefined} className="border border-line rounded-[14px] overflow-hidden">
          {addresses.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-line -mb-px">
              <button role={onSelect ? 'radio' : undefined} aria-checked={onSelect ? a.id === selectedId : undefined}
                onClick={() => { if (onSelect) { onSelect(a.id); onClose(); } }}
                className={`flex-1 min-w-0 flex items-center gap-3 border-0 bg-transparent p-0 text-fg text-start ${onSelect ? '' : 'cursor-default'}`}>
                {onSelect ? <RadioDot on={a.id === selectedId} web={web} /> : <IMapPin size={18} className="shrink-0 text-muted-fg" />}
                <span className="flex-1 min-w-0 flex flex-col">
                  <span className="font-semibold text-[14px] leading-5">{a.label || a.line}</span>
                  {a.label && <span className="text-[12px] leading-4 text-muted-fg">{a.line}</span>}
                </span>
              </button>
              <button aria-label={tm('deleteLbl')} onClick={() => remove(a.id)}
                className="w-9 h-9 shrink-0 rounded-[10px] border-0 bg-transparent text-muted-fg flex items-center justify-center hover:bg-accent hover:text-destructive">
                <ITrash size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : !adding && (
        <p className="m-0 text-[14px] leading-5 text-muted-fg">{tm('noAddresses')}</p>
      )}

      {adding ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-[14px] leading-5">{tm('addressLabel')} <span className="font-normal text-[12px] text-muted-fg">· {tm('optional')}</span></span>
            <input value={label} onChange={e => setLabel(e.target.value.slice(0, 40))} placeholder={tm('addressLabelPh')} className={input} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="font-semibold text-[14px] leading-5">{tm('addressLine')}</span>
            <input value={line} onChange={e => { setLine(e.target.value.slice(0, 200)); setErr(false); }} placeholder={tm('addressLinePh')}
              aria-invalid={err} className={`${input} ${err ? 'border-destructive' : ''}`} />
            {err && <span role="alert" className="text-[12px] leading-4 text-destructive">{tm('addressErr')}</span>}
          </label>
          <button onClick={add} className={primary}>{tm('save')}</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className={outline}>{tm('addAddress')}</button>
      )}
      <div style={web ? undefined : { height: 'env(safe-area-inset-bottom, 0px)' }} />
    </Sheet>
  );
}
