import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, X, RefreshCw, CheckCircle, AlertCircle, Scan } from "lucide-react";
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
  const [isScanningFile, setIsScanningFile] = useState(false);

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportId = "scanner-viewport";

  useEffect(() => {
    if (!isOpen) {
      hasScannedRef.current = false;
      return;
    }

    // Reset success state
    setSuccessCode(null);
    setScannerError(null);
    hasScannedRef.current = false;

    // Initialize scanner
    const startScanner = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(viewportId);
        qrCodeRef.current = html5Qrcode;

        let cameraConfig: any = { facingMode: "environment" };

        try {
          // Attempt to get device cameras to target back camera directly
          // Using exact deviceId avoids repeated WebRTC permission prompts on Safari/Chrome
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const savedCamId = localStorage.getItem("trophia_scanner_cam_id");
            let targetCam = cameras.find(c => c.id === savedCamId);
            if (!targetCam) {
              targetCam = cameras.find(c => {
                const label = c.label.toLowerCase();
                return label.includes("back") || label.includes("rear") || label.includes("trasera") || label.includes("environment");
              }) || cameras[cameras.length - 1];
            }
            if (targetCam) {
              localStorage.setItem("trophia_scanner_cam_id", targetCam.id);
              cameraConfig = targetCam.id;
            }
          }
        } catch (camErr) {
          console.warn("Could not enumerate camera devices directly, fallback to facingMode:", camErr);
        }

        await html5Qrcode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (width, height) => {
              // Standard barcode box (wide rectangle)
              const boxWidth = Math.min(width * 0.8, 280);
              const boxHeight = Math.min(height * 0.4, 140);
              return { width: boxWidth, height: boxHeight };
            }
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
        setIsCameraActive(true);
      } catch (err: any) {
        console.error("Camera access failed:", err);
        setScannerError(
          "No se pudo acceder a la cámara en vivo. Puedes pulsar 'Tomar foto' para abrir tu cámara de forma nativa sin confirmaciones, o ingresar los dígitos abajo."
        );
        setIsCameraActive(false);
      }
    };

    // Delay start slightly to let modal scale animation finish
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

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

  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanningFile(true);
      setScannerError(null);

      const helperScanner = new Html5Qrcode("scanner-helper-file-viewport");
      const decodedText = await helperScanner.scanFile(file, false);
      try {
        helperScanner.clear();
      } catch (e) {}

      if (decodedText) {
        if (navigator.vibrate) navigator.vibrate(100);
        setSuccessCode(decodedText);
        setTimeout(() => {
          onScanSuccess(decodedText);
          handleClose();
        }, 400);
      } else {
        setScannerError("No se detectó ningún código de barras en la foto. Intenta enfocar más cerca.");
      }
    } catch (err: any) {
      console.error("Error scanning barcode file:", err);
      setScannerError("No se detectó un código nítido en la imagen. Intenta con mejor iluminación o escribe los dígitos abajo.");
    } finally {
      setIsScanningFile(false);
      if (e.target) e.target.value = "";
    }
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
        className="bg-[#0f101a] border border-white/10 rounded-[32px] p-6 max-w-md w-full space-y-5 shadow-2xl relative text-xs text-white"
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

          {/* Success Overlay overlay */}
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
              
              {/* Central cutout (we simulate visually) */}
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
              <span className="text-[10px]">Cargando cámara...</span>
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

        {/* Hidden helper element for static photo decoding */}
        <div id="scanner-helper-file-viewport" style={{ display: "none" }}></div>

        {/* Alternative: Direct Native Camera Photo (Never asks for WebRTC permissions) */}
        <div className="flex items-center justify-between gap-2 bg-white/[0.04] border border-white/5 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2 pl-1 min-w-0">
            <Camera className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="text-left min-w-0">
              <span className="block text-[11px] font-bold text-white truncate">¿Te pide permiso cada vez?</span>
              <span className="block text-[9px] text-white/40 truncate">Toma una foto directa sin confirmaciones</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanningFile}
            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-[10px] transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            {isScanningFile ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Leyendo...</span>
              </>
            ) : (
              <>
                <Camera className="h-3 w-3" />
                <span>Tomar foto</span>
              </>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoScan}
          />
        </div>

        {/* Manual Fallback Input Form */}
        <form onSubmit={handleManualSearch} className="space-y-3 pt-1">
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
