import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, RefreshCw, CheckCircle, AlertCircle, Scan } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess
}: BarcodeScannerModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const viewportId = "scanner-viewport";

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      return;
    }

    // Reset success state and remove any obsolete camera id from localStorage
    setSuccessCode(null);
    setScannerError(null);
    hasScannedRef.current = false;
    try {
      localStorage.removeItem("trophia_scanner_cam_id");
    } catch (e) {
      // Ignore
    }

    // Initialize scanner with native environment camera and continuous autofocus
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(viewportId);
        qrCodeRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: (width, height) => {
              // Standard barcode box (wide rectangle)
              const boxWidth = Math.min(width * 0.85, 290);
              const boxHeight = Math.min(height * 0.45, 150);
              return { width: boxWidth, height: boxHeight };
            },
            aspectRatio: 1.333334
          },
          (decodedText) => {
            if (hasScannedRef.current) return;
            hasScannedRef.current = true;

            // Vibrate if supported
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            setSuccessCode(decodedText);

            // Pause further camera scanning immediately to prevent duplicate triggers
            if (qrCodeRef.current && qrCodeRef.current.isScanning) {
              try {
                qrCodeRef.current.pause(true);
              } catch (e) {
                // Ignore pause error
              }
            }
            
            // Wait brief moment for visual success state before returning
            setTimeout(() => {
              onScanSuccess(decodedText);
              handleClose();
            }, 400);
          },
          () => {
            // Ignore normal scanning logs
          }
        );

        // Attempt continuous auto-focus if device capabilities expose it
        try {
          const track = (html5Qrcode as any).renderedCamera?.cameraOutput?.stream?.getVideoTracks?.()[0];
          if (track && track.getCapabilities) {
            const capabilities = track.getCapabilities();
            if (capabilities && (capabilities as any).focusMode && (capabilities as any).focusMode.includes("continuous")) {
              await track.applyConstraints({
                advanced: [{ focusMode: "continuous" }]
              });
            }
          }
        } catch (focusErr) {
          // Native environment mode handles focus automatically
        }

        setIsCameraActive(true);
      } catch (err: any) {
        console.error("Camera access failed:", err);
        setScannerError(
          "No se pudo acceder a la cámara en vivo. Verifica los permisos de cámara en tu navegador o escribe los dígitos abajo."
        );
        setIsCameraActive(false);
      }
    };

    // Delay start slightly to let modal scale animation finish
    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      try {
        await qrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner on cleanup:", err);
      }
    }
    setIsCameraActive(false);
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim() !== "" && !hasScannedRef.current) {
      hasScannedRef.current = true;
      onScanSuccess(manualCode.trim());
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <style>{`
        #scanner-viewport {
          position: absolute !important;
          width: 100% !important;
          height: 100% !important;
          top: 0 !important;
          left: 0 !important;
        }
        #scanner-viewport video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#0f101a] border border-white/10 rounded-[32px] p-6 max-w-md w-full space-y-4 shadow-2xl relative text-xs text-white"
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5 uppercase">
            <Scan className="h-4 w-4 text-emerald-400" />
            <span>Escáner de Código</span>
          </h3>
          <button
            onClick={handleClose}
            className="text-white/40 hover:text-white p-1.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Viewport Container */}
        <div className="relative w-full aspect-[4/3] bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
          
          {/* Viewport Div for html5-qrcode */}
          <div id={viewportId} className="absolute inset-0 w-full h-full object-cover"></div>

          {/* Success Overlay */}
          <AnimatePresence>
            {successCode && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm z-10 flex flex-col items-center justify-center space-y-2 border-2 border-emerald-500"
              >
                <CheckCircle className="h-10 w-10 text-emerald-400 animate-bounce" />
                <span className="text-xs font-mono font-bold bg-black/60 px-3 py-1 rounded-xl border border-emerald-500/30">
                  {successCode}
                </span>
                <span className="text-[10px] text-emerald-400/80 font-bold">¡Código detectado con éxito!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanning Box Guide Overlay (only when camera is active and no success yet) */}
          {isCameraActive && !successCode && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer darkened layout overlay */}
              <div className="absolute inset-0 bg-black/40"></div>
              
              {/* Central cutout */}
              <div className="relative w-[280px] h-[140px] border-2 border-emerald-500/40 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Glowing Laser Scanline */}
                <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_8px_#10b981] top-1/2 -translate-y-1/2 animate-pulse"></div>
                {/* 4 Corner brackets */}
                <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-4 border-l-4 border-emerald-500 rounded-tl-md"></div>
                <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-4 border-r-4 border-emerald-500 rounded-tr-md"></div>
                <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-4 border-l-4 border-emerald-500 rounded-bl-md"></div>
                <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-4 border-r-4 border-emerald-500 rounded-br-md"></div>
              </div>
            </div>
          )}

          {/* Camera Loading State */}
          {!isCameraActive && !scannerError && !successCode && (
            <div className="flex flex-col items-center justify-center space-y-2 text-white/40">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
              <span className="text-[10px]">Iniciando cámara y enfoque...</span>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {scannerError && (
            <div className="p-5 text-center flex flex-col items-center justify-center space-y-2 z-10">
              <AlertCircle className="h-7 w-7 text-amber-500" />
              <span className="text-[10.5px] leading-relaxed text-white/60">
                {scannerError}
              </span>
            </div>
          )}
        </div>

        {/* Helpful camera prompt */}
        <div className="flex items-center justify-between text-[11px] text-white/50 px-1">
          <span className="flex items-center gap-1.5">
            <Scan className="h-3.5 w-3.5 text-emerald-400" />
            Apunta la cámara al código de barras del producto
          </span>
        </div>

        {/* Manual Fallback Input Form */}
        <form onSubmit={handleManualSearch} className="space-y-2.5 pt-1">
          <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Ingreso Manual de Código de Barras
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ej: 7622300336738"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ""))}
              className="bg-black/40 border-white/10 font-mono"
              size="md"
            />
            <Button
              type="submit"
              variant="primary"
              disabled={manualCode.trim().length < 5}
              className="px-5 font-bold shrink-0"
            >
              Buscar
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
