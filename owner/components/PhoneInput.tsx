import { useState } from 'react';

export interface CountryDialCode {
  name: string;
  dial: string;
}

export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { name: 'Jordan', dial: '+962' },
  { name: 'Saudi Arabia', dial: '+966' },
  { name: 'United Arab Emirates', dial: '+971' },
  { name: 'Kuwait', dial: '+965' },
  { name: 'Qatar', dial: '+974' },
  { name: 'Bahrain', dial: '+973' },
  { name: 'Oman', dial: '+968' },
  { name: 'Egypt', dial: '+20' },
  { name: 'Iraq', dial: '+964' },
  { name: 'Lebanon', dial: '+961' },
  { name: 'Palestine', dial: '+970' },
  { name: 'Syria', dial: '+963' },
  { name: 'Yemen', dial: '+967' },
  { name: 'Libya', dial: '+218' },
  { name: 'Algeria', dial: '+213' },
  { name: 'Morocco', dial: '+212' },
  { name: 'Tunisia', dial: '+216' },
  { name: 'Sudan', dial: '+249' },
  { name: 'United States', dial: '+1' },
  { name: 'Canada', dial: '+1' },
  { name: 'United Kingdom', dial: '+44' },
  { name: 'Ireland', dial: '+353' },
  { name: 'Germany', dial: '+49' },
  { name: 'France', dial: '+33' },
  { name: 'Spain', dial: '+34' },
  { name: 'Italy', dial: '+39' },
  { name: 'Portugal', dial: '+351' },
  { name: 'Netherlands', dial: '+31' },
  { name: 'Belgium', dial: '+32' },
  { name: 'Switzerland', dial: '+41' },
  { name: 'Austria', dial: '+43' },
  { name: 'Sweden', dial: '+46' },
  { name: 'Norway', dial: '+47' },
  { name: 'Denmark', dial: '+45' },
  { name: 'Finland', dial: '+358' },
  { name: 'Poland', dial: '+48' },
  { name: 'Greece', dial: '+30' },
  { name: 'Turkey', dial: '+90' },
  { name: 'Russia', dial: '+7' },
  { name: 'Ukraine', dial: '+380' },
  { name: 'India', dial: '+91' },
  { name: 'Pakistan', dial: '+92' },
  { name: 'Bangladesh', dial: '+880' },
  { name: 'Sri Lanka', dial: '+94' },
  { name: 'Nepal', dial: '+977' },
  { name: 'China', dial: '+86' },
  { name: 'Japan', dial: '+81' },
  { name: 'South Korea', dial: '+82' },
  { name: 'Philippines', dial: '+63' },
  { name: 'Indonesia', dial: '+62' },
  { name: 'Malaysia', dial: '+60' },
  { name: 'Singapore', dial: '+65' },
  { name: 'Thailand', dial: '+66' },
  { name: 'Vietnam', dial: '+84' },
  { name: 'Australia', dial: '+61' },
  { name: 'New Zealand', dial: '+64' },
  { name: 'South Africa', dial: '+27' },
  { name: 'Nigeria', dial: '+234' },
  { name: 'Kenya', dial: '+254' },
  { name: 'Ethiopia', dial: '+251' },
  { name: 'Ghana', dial: '+233' },
  { name: 'Brazil', dial: '+55' },
  { name: 'Mexico', dial: '+52' },
  { name: 'Argentina', dial: '+54' },
  { name: 'Chile', dial: '+56' },
  { name: 'Colombia', dial: '+57' },
  { name: 'Peru', dial: '+51' },
];

const DEFAULT_DIAL_CODE = '+962';

const parsePhone = (value: string) => {
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);
  const match = sorted.find(c => value.startsWith(c.dial));
  return match
    ? { dial: match.dial, number: value.slice(match.dial.length).trim() }
    : { dial: DEFAULT_DIAL_CODE, number: value.trim() };
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const PhoneInput = ({ value, onChange, placeholder, required }: Props) => {
  const initial = parsePhone(value || '');
  const [dial, setDial] = useState(initial.dial);
  const [number, setNumber] = useState(initial.number);

  const emit = (nextDial: string, nextNumber: string) => {
    onChange(nextNumber ? `${nextDial} ${nextNumber}` : '');
  };

  return (
    <div className="flex gap-2" dir="ltr">
      <select
        value={dial}
        onChange={e => { setDial(e.target.value); emit(e.target.value, number); }}
        className="bg-surface-container-low border-none rounded-2xl px-3 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 shrink-0"
      >
        {COUNTRY_DIAL_CODES.map(c => (
          <option key={`${c.name}-${c.dial}`} value={c.dial}>{c.dial} {c.name}</option>
        ))}
      </select>
      <input
        type="tel"
        required={required}
        value={number}
        onChange={e => { setNumber(e.target.value); emit(dial, e.target.value); }}
        placeholder={placeholder}
        className="w-full min-w-0 bg-surface-container-low border-none rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
};
