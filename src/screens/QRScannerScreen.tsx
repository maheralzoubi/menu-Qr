import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import jsQR from 'jsqr';
import { ArrowLeft, AlertCircle, Loader2, RefreshCw, Zap, ZapOff, ImagePlus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseQRCode, fetchRestaurantContext } from '../services/AppEntryHandler';
import type { RestaurantContext } from '../hooks/useRestaurant';

interface Props {
  onBack: () => void;
  onScan: (ctx: RestaurantContext) => void;
}

type Phase = 'scanning' | 'loading' | 'success' | 'error';

export const QRScannerScreen = ({ onBack, onScan }: Props) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number>(0);
  const detectedRef = useRef(false);
  const pendingCtx  = useRef<RestaurantContext | null>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);

  const [phase, setPhase]           = useState<Phase>('scanning');
  const [errorMsg, setErrorMsg]     = useState('');
  const [torchOn, setTorchOn]       = useState(false);
  const [torchAvail, setTorchAvail] = useState(false);
  const [scanLine, setScanLine]     = useState(0); // for the animated scan line position

  /* ── Camera lifecycle ─────────────────────────────────── */
  useEffect(() => {
    startCamera();
    return stopCamera;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate scan line
  useEffect(() => {
    if (phase !== 'scanning') return;
    let dir = 1;
    let pos = 0;
    const iv = setInterval(() => {
      pos += dir * 2.5;
      if (pos >= 100) dir = -1;
      if (pos <= 0)   dir = 1;
      setScanLine(pos);
    }, 16);
    return () => clearInterval(iv);
  }, [phase]);

  async function startCamera() {
    detectedRef.current = false;
    setPhase('scanning');
    setErrorMsg('');
    setTorchOn(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      // Check torch availability
      const track = stream.getVideoTracks()[0];
      const caps  = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
      setTorchAvail(!!caps.torch);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch {
      setErrorMsg('Camera access denied. Allow camera permission and try again.');
      setPhase('error');
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  /* ── QR decode loop ────────────────────────────────────── */
  function tick() {
    if (detectedRef.current) return;

    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' });

    if (code) {
      detectedRef.current = true;
      handleDetected(code.data);
    } else {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  /* ── Handle decoded QR string ──────────────────────────── */
  async function handleDetected(qrData: string) {
    const restaurantId = parseQRCode(qrData);
    if (!restaurantId) {
      detectedRef.current = false;
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    stopCamera();
    setPhase('loading');

    const ctx = await fetchRestaurantContext(restaurantId);
    if (ctx) {
      pendingCtx.current = ctx;
      setPhase('success');
      setTimeout(() => {
        if (pendingCtx.current) onScan(pendingCtx.current);
      }, 1300);
    } else {
      setErrorMsg('Restaurant not found. Check the QR code and try again.');
      setPhase('error');
    }
  }

  /* ── Torch toggle ──────────────────────────────────────── */
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(prev => !prev);
    } catch {}
  };

  /* ── Gallery / image upload ────────────────────────────── */
  const handleGalleryChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (galleryRef.current) galleryRef.current.value = '';

    stopCamera();
    setPhase('loading');

    try {
      const bitmap = await createImageBitmap(file);
      const c = document.createElement('canvas');
      c.width  = bitmap.width;
      c.height = bitmap.height;
      const gctx = c.getContext('2d')!;
      gctx.drawImage(bitmap, 0, 0);
      const imgData = gctx.getImageData(0, 0, c.width, c.height);
      const code    = jsQR(imgData.data, imgData.width, imgData.height);
      if (code) {
        detectedRef.current = true;
        handleDetected(code.data);
      } else {
        setErrorMsg('No valid restaurant QR code found in this image.');
        setPhase('error');
      }
    } catch {
      setErrorMsg('Could not read the selected image. Please try again.');
      setPhase('error');
    }
  };

  const handleBack = () => { stopCamera(); onBack(); };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden gallery input */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryChange}
      />

      {/* ── Dark vignette overlay with transparent scan window ── */}
      {(phase === 'scanning' || phase === 'loading') && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative"
            style={{
              width: 260,
              height: 260,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.58)',
              borderRadius: 6,
            }}
          >
            {/* Corner brackets */}
            {([
              'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-[14px]',
              'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-[14px]',
              'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-[14px]',
              'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-[14px]',
            ] as const).map((cls, i) => (
              <div key={i} className={`absolute w-9 h-9 border-white ${cls}`} />
            ))}

            {/* Scan line */}
            {phase === 'scanning' && (
              <div
                className="absolute left-3 right-3 h-[2px] rounded-full"
                style={{
                  top: `${scanLine}%`,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                  boxShadow: '0 0 8px 2px rgba(255,255,255,0.35)',
                  transition: 'top 16ms linear',
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-white/90 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Torch button (only on scanning phase + torch available) */}
        {torchAvail && phase === 'scanning' && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${
              torchOn
                ? 'bg-amber-400 text-black'
                : 'bg-white/15 text-white'
            }`}
          >
            {torchOn ? <Zap className="w-4 h-4 fill-black" /> : <ZapOff className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* ── Bottom panel ─────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-14 px-6 flex flex-col items-center gap-5">

        {/* Scanning instructions */}
        {phase === 'scanning' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-white font-headline font-bold text-base">Align QR code in the frame</p>
            <p className="text-white/50 text-sm mt-1">Scanning automatically — no tap needed</p>
          </motion.div>
        )}

        {/* Loading */}
        {phase === 'loading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-white animate-spin" />
            </div>
            <p className="text-white font-semibold text-sm">Loading restaurant…</p>
          </motion.div>
        )}

        {/* Error */}
        {phase === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col items-center gap-3"
          >
            <AlertCircle className="w-7 h-7 text-red-400" />
            <p className="text-white text-sm text-center leading-relaxed">{errorMsg}</p>
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-white text-black text-sm font-bold px-5 py-2.5 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </motion.div>
        )}

        {/* Gallery upload button (only when scanning) */}
        {phase === 'scanning' && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => galleryRef.current?.click()}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full"
          >
            <ImagePlus className="w-4 h-4" />
            Upload from Gallery
          </motion.button>
        )}
      </div>

      {/* ── Success overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {phase === 'success' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/65 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="bg-surface rounded-[28px] px-10 py-10 flex flex-col items-center gap-4 mx-8 shadow-2xl"
            >
              {/* Pulsing ring */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute w-20 h-20 rounded-full bg-emerald-500/30"
                />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 350, damping: 18 }}
                  className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40"
                >
                  <CheckCircle2 className="w-9 h-9 text-white" />
                </motion.div>
              </div>

              <div className="text-center">
                <h3 className="font-headline font-extrabold text-xl text-on-surface">Restaurant Found!</h3>
                <p className="text-on-surface-variant text-sm mt-1">Opening your menu…</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
