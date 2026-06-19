import { useState, useMemo, useRef, useEffect } from 'react';
import { X, RefreshCw, Plus, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MenuItem, Category } from '../types';

const SEGMENT_COLORS = [
  '#c04b2b', '#e67e22', '#f39c12', '#27ae60',
  '#2980b9', '#8e44ad', '#e91e63', '#00acc1',
  '#ff7043', '#66bb6a', '#42a5f5', '#ab47bc',
];

const MAX_ITEMS = 12;
const WHEEL_CSS_SIZE = 280;

function renderWheel(canvas: HTMLCanvasElement, items: MenuItem[], rotation: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx || items.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const size = WHEEL_CSS_SIZE;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const n = items.length;
  const seg = (2 * Math.PI) / n;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);

  // Outer shadow
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Segments
  for (let i = 0; i < n; i++) {
    const startAngle = i * seg + rotation - Math.PI / 2;
    const endAngle = startAngle + seg;
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(startAngle + seg / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const fontSize = Math.max(8, Math.min(12, 108 / n));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    const label =
      items[i].name.length > 13 ? items[i].name.slice(0, 12) + '…' : items[i].name;
    ctx.fillText(label, radius - 12, 0);
    ctx.restore();
  }

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Center pin
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
  const pinGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 18);
  pinGrad.addColorStop(0, '#ffffff');
  pinGrad.addColorStop(1, '#d0ccc8');
  ctx.fillStyle = pinGrad;
  ctx.fill();
  ctx.strokeStyle = '#b8b2ac';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

// Confetti burst on win
const Confetti = () => {
  const particles = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        id: i,
        x: 5 + (i / 44) * 90,
        delay: (i % 8) * 0.1,
        color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
        size: 5 + (i % 5) * 2,
        isCircle: i % 3 !== 0,
      })),
    [],
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-[210] overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: '-2vh', x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '105vh', opacity: [1, 1, 0.5, 0], rotate: 540, scale: 0.6 }}
          transition={{
            duration: 2.2 + (p.id % 4) * 0.3,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.isCircle ? '50%' : 2,
          }}
        />
      ))}
    </div>
  );
};

interface SpinWheelModalProps {
  items: MenuItem[];
  categories: Category[];
  onClose: () => void;
  onAddToCart: (item: MenuItem) => void;
  onViewDetails: (item: MenuItem) => void;
}

export const SpinWheelModal = ({
  items,
  categories,
  onClose,
  onAddToCart,
  onViewDetails,
}: SpinWheelModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [filter, setFilter] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<MenuItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animRef = useRef(0);
  const itemsRef = useRef<MenuItem[]>([]);
  const canvasReady = useRef(false);

  // Build eligible items list for the wheel
  const eligibleItems = useMemo(() => {
    let filtered: MenuItem[];
    if (filter === 'all') {
      filtered = [...items];
    } else if (filter === 'featured') {
      filtered = items.filter((i) => i.featured);
      if (filtered.length === 0) filtered = [...items];
    } else {
      filtered = items.filter((i) => i.category === filter);
      if (filtered.length === 0) filtered = [...items];
    }
    if (filtered.length > MAX_ITEMS) {
      // Deterministic shuffle by index so it doesn't change on every render
      return filtered.slice(0, MAX_ITEMS);
    }
    return filtered;
  }, [items, filter]);

  useEffect(() => {
    itemsRef.current = eligibleItems;
  }, [eligibleItems]);

  // Init canvas with DPR
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_CSS_SIZE * dpr;
    canvas.height = WHEEL_CSS_SIZE * dpr;
    canvasReady.current = true;
    renderWheel(canvas, eligibleItems, rotationRef.current);
  }, []);

  // Redraw when items change (filter switch)
  useEffect(() => {
    if (!canvasReady.current) return;
    const canvas = canvasRef.current;
    if (canvas) renderWheel(canvas, eligibleItems, rotationRef.current);
  }, [eligibleItems]);

  const handleSpin = () => {
    const currentItems = itemsRef.current;
    const n = currentItems.length;
    if (isSpinning || n < 2) return;

    setIsSpinning(true);
    setShowResult(false);
    setWinner(null);

    const seg = (2 * Math.PI) / n;
    const winIdx = Math.floor(Math.random() * n);

    // Target: center of winner segment lands at pointer (top, -π/2)
    // rotation needed so: (winIdx + 0.5) * seg + rotation - π/2 = -π/2 + 2πk
    // → rotation = -(winIdx + 0.5) * seg mod 2π
    const targetInCycle =
      ((2 * Math.PI - (winIdx + 0.5) * seg) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const currentNorm =
      ((rotationRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const delta = (targetInCycle - currentNorm + 2 * Math.PI) % (2 * Math.PI);
    const fullRounds = 6 + Math.floor(Math.random() * 4); // 6–9 full rotations
    const targetRotation = rotationRef.current + fullRounds * 2 * Math.PI + delta;

    const startRot = rotationRef.current;
    const startTime = performance.now();
    const duration = 4200 + Math.random() * 1800; // 4.2 – 6 s

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4); // quartic ease-out
      rotationRef.current = startRot + (targetRotation - startRot) * eased;

      const canvas = canvasRef.current;
      if (canvas) renderWheel(canvas, currentItems, rotationRef.current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = targetRotation;
        setIsSpinning(false);
        setWinner(currentItems[winIdx]);
        setShowResult(true);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3600);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const handleSpinAgain = () => {
    setShowResult(false);
    setWinner(null);
    // Small delay so result panel slides out before spin starts
    setTimeout(() => handleSpin(), 320);
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(animRef.current);
    },
    [],
  );

  const handleFilterChange = (key: string) => {
    if (isSpinning) return;
    setFilter(key);
    setShowResult(false);
    setWinner(null);
  };

  const canSpin = eligibleItems.length >= 2;

  const filters = [
    { key: 'all', label: t('spinWheel.filterAll') },
    { key: 'featured', label: t('spinWheel.filterPopular') },
    ...categories.map((c) => ({ key: c.name, label: c.name })),
  ];

  return (
    <>
      {showConfetti && <Confetti />}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="w-full max-w-md bg-surface rounded-t-[2rem] overflow-hidden flex flex-col"
          style={{ maxHeight: '94dvh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-outline-variant/10 flex-shrink-0">
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">
                {t('spinWheel.title')}
              </h2>
              <p className="text-on-surface-variant text-xs mt-0.5">{t('spinWheel.subtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter chips */}
          <div
            className={`flex overflow-x-auto no-scrollbar gap-2 px-6 py-3 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => handleFilterChange(f.key)}
                disabled={isSpinning}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
                  filter === f.key
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Wheel area */}
          <div className="flex flex-col items-center px-6 pb-4 flex-shrink-0">
            {!canSpin ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-on-surface-variant font-medium text-sm">
                  {t('spinWheel.notEnoughItems')}
                </p>
                <button
                  onClick={() => handleFilterChange('all')}
                  className="text-primary font-bold text-sm"
                >
                  {t('spinWheel.showAll')}
                </button>
              </div>
            ) : (
              <>
                {/* Wheel + pointer */}
                <div
                  className="relative"
                  style={{ width: WHEEL_CSS_SIZE, height: WHEEL_CSS_SIZE }}
                >
                  {/* Pointer triangle (top center) */}
                  <div
                    className="absolute top-0 left-1/2 z-10"
                    style={{ transform: 'translateX(-50%) translateY(-4px)' }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '11px solid transparent',
                        borderRight: '11px solid transparent',
                        borderTop: '22px solid var(--color-primary)',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                      }}
                    />
                  </div>

                  <canvas
                    ref={canvasRef}
                    style={{ width: WHEEL_CSS_SIZE, height: WHEEL_CSS_SIZE }}
                    className="rounded-full"
                  />
                </div>

                {/* Item count label */}
                <p className="mt-2 text-on-surface-variant/50 text-xs">
                  {t('spinWheel.itemCount', { count: eligibleItems.length })}
                </p>

                {/* Spin button */}
                <motion.button
                  onClick={handleSpin}
                  disabled={isSpinning || !canSpin}
                  whileTap={{ scale: 0.94 }}
                  className="mt-4 px-10 py-3.5 bg-signature-gradient text-white font-headline font-extrabold text-base rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-opacity"
                >
                  {isSpinning ? t('spinWheel.spinning') : t('spinWheel.spinButton')}
                </motion.button>
              </>
            )}
          </div>

          {/* Result panel */}
          <AnimatePresence>
            {showResult && winner && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="bg-surface border-t border-outline-variant/10 rounded-t-[2rem] p-6 space-y-4 flex-shrink-0"
              >
                <div className="text-center">
                  <span className="text-2xl">🎉</span>
                  <h3 className="font-headline text-base font-bold text-on-surface mt-1">
                    {t('spinWheel.resultTitle')}
                  </h3>
                </div>

                <div className="flex gap-4 bg-surface-container-low rounded-2xl p-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img
                      src={winner.image}
                      alt={winner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <h4 className="font-headline font-bold text-on-surface leading-tight">
                      {winner.name}
                    </h4>
                    <p className="text-on-surface-variant text-xs mt-1 line-clamp-2">
                      {winner.description}
                    </p>
                    <span className="font-headline font-bold text-primary mt-1.5 text-sm">
                      ${winner.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      onAddToCart(winner);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-2 bg-signature-gradient text-white py-3 rounded-xl font-headline font-bold text-sm shadow-md shadow-primary/20 active:scale-95 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                    {t('spinWheel.addToCart')}
                  </button>
                  <button
                    onClick={handleSpinAgain}
                    className="flex items-center justify-center gap-2 bg-surface-container-highest text-on-surface py-3 rounded-xl font-headline font-bold text-sm active:scale-95 transition-transform"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('spinWheel.spinAgain')}
                  </button>
                </div>

                <button
                  onClick={() => {
                    onViewDetails(winner);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-center gap-1 text-primary text-sm font-bold py-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('spinWheel.viewDetails')}
                  <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
};
