import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, X, RefreshCw, AlertCircle, FlipHorizontal } from "lucide-react";

interface BodyPhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  poseType: "front" | "side" | "legs" | "face";
  onCapture: (base64Image: string) => void;
}

export default function BodyPhotoCaptureModal({
  isOpen,
  onClose,
  poseType,
  onCapture
}: BodyPhotoCaptureModalProps) {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCameraError(null);
    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Keep srcObject synced with stream changes and when video element mounts in DOM
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Attempt to play explicitly (critical for iOS webviews/browsers)
      videoRef.current.play().catch(err => {
        console.warn("Explicit video play failed, waiting for autoplay:", err);
      });
    }
  }, [stream, isCameraActive]);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1440 },
          aspectRatio: { ideal: 0.75 } // 3:4 aspect ratio
        },
        audio: false
      });

      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera capture access failed:", err);
      setCameraError(
        "No se pudo acceder a la cámara. Concede los permisos necesarios de cámara en el navegador o sube una foto desde tu galería."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleToggleFacingMode = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Draw frame to canvas
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1440;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror image if using front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL("image/jpeg", 0.85);
      onCapture(base64Image);
      handleClose();
    }
  };

  const handleTriggerCountdown = () => {
    if (countdown !== null) return;
    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setCountdown(null);
        handleCapture();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const getPoseLabel = () => {
    switch (poseType) {
      case "front": return "Pose Frente (Frontal)";
      case "side": return "Pose Perfil (Lateral)";
      case "legs": return "Pose Piernas";
      case "face": return "Pose Rostro / Cara";
      default: return "Foto Corporal";
    }
  };

  const getPoseDescription = () => {
    switch (poseType) {
      case "front": return "Párate erguido de cara a la cámara. Separa tus brazos 15-30 grados (formando una A).";
      case "side": return "Párate completamente de perfil a 90 grados. Brazos cruzados sobre el pecho para dejar libre el abdomen.";
      case "legs": return "Toma de piernas completas para evaluar la distribución de grasa inferior.";
      case "face": return "Encuadra tu rostro centrado dentro del óvalo guía.";
      default: return "";
    }
  };

  // Helper to render the custom transparent silhouette guide paths (improved tech-line guide)
  const renderSilhouetteOverlay = () => {
    if (poseType === "front") {
      return (
        <svg className="absolute w-[85%] h-[90%] text-emerald-400/50 pointer-events-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Head & Neck */}
          <ellipse cx="50" cy="20" rx="7.5" ry="9.5" />
          <path d="M47.5 29.5 c0 3 5 3 5 0" />
          {/* Torso Outline */}
          <path d="M36 36 c3-1 8-2 14-2 s11 1 14 2 c4 2.5 5 7 5 11 c0 16-2 32-4 46 c-1 7-4.5 11-15 11 s-14-4-15-11 c-2-14-4-30-4-46 c0-4 1-8.5 5-11 Z" />
          {/* Arms (A-Pose structure) */}
          <path d="M33 37 c-3.5 9-7.5 21-10.5 33 c-1.5 5 1 7 3 4 c3-5.5 7.5-19 9.5-28.5" />
          <path d="M67 37 c3.5 9 7.5 21 10.5 33 c1.5 5-1 7-3 4 c-3-5.5-7.5-19-9.5-28.5" />
          {/* Legs */}
          <path d="M39 104 c-1 12-2.5 26-3.5 41 c0 2 2.5 3 3.5 1 c2-12 3.5-26 3.5-41" />
          <path d="M61 104 c1 12 2.5 26 3.5 41 c0 2-2.5 3-3.5 1 c-2-12-3.5-26-3.5-41" />
          
          {/* Scientific Overlay Grids */}
          <line x1="50" y1="5" x2="50" y2="145" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1="15" y1="75" x2="85" y2="75" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <circle cx="50" cy="75" r="2" fill="currentColor" opacity="0.6" />
          {/* Frame brackets */}
          <path d="M10 20 h6 M10 20 v6" strokeWidth="1.5" />
          <path d="M90 20 h-6 M90 20 v6" strokeWidth="1.5" />
          <path d="M10 130 h6 M10 130 v-6" strokeWidth="1.5" />
          <path d="M90 130 h-6 M90 130 v-6" strokeWidth="1.5" />
        </svg>
      );
    }
    if (poseType === "side") {
      return (
        <svg className="absolute w-[80%] h-[90%] text-emerald-400/50 pointer-events-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Head & Neck Profile */}
          <ellipse cx="50" cy="20" rx="6.5" ry="8.5" />
          <path d="M49 28.5 c-0.5 2.5 2 2.5 2 0" />
          {/* Torso Profile */}
          <path d="M46 34 c4 0 8.5 2 9.5 7 c2 8.5 3.5 23.5 1.5 37 c-2 13-6.5 21-11.5 26 c-5-5-7.5-12.5-8.5-26 c-1-13.5 1-28.5 4-37 c1-5 2-7 5-7 Z" />
          {/* Crossed arms indicator */}
          <path d="M54 42 c1.5 4.5 3.5 13 0.5 17 c-2 3-5.5 2-7.5 0" />
          {/* Legs */}
          <path d="M44 104 c-1 12-2 27.5-3 44 c0 2 3 3 4 1 c2-12 3-27.5 3-44" />
          
          {/* Grid guides */}
          <line x1="50" y1="5" x2="50" y2="145" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1="15" y1="75" x2="85" y2="75" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          {/* Frame brackets */}
          <path d="M10 20 h6 M10 20 v6" strokeWidth="1.5" />
          <path d="M90 20 h-6 M90 20 v6" strokeWidth="1.5" />
          <path d="M10 130 h6 M10 130 v-6" strokeWidth="1.5" />
          <path d="M90 130 h-6 M90 130 v-6" strokeWidth="1.5" />
        </svg>
      );
    }
    if (poseType === "face") {
      return (
        <svg className="absolute w-[60%] h-[60%] text-emerald-400/50 pointer-events-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Face oval guideline */}
          <ellipse cx="50" cy="50" rx="28" ry="38" strokeDasharray="3 3" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
        </svg>
      );
    }
    if (poseType === "legs") {
      return (
        <svg className="absolute w-[70%] h-[80%] text-emerald-400/50 pointer-events-none drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" viewBox="0 0 100 150" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Leg lines */}
          <path d="M40 20c2 0 3 1.5 3 3.5v110c0 3-1.5 5.5-3.5 6s-4.5-2-4.5-5V20c0-2.5 5 0 5-4.5z" fill="none" />
          <path d="M60 20c2 0 3 1.5 3 3.5v110c0 3-1.5 5.5-3.5 6s-4.5-2-4.5-5V20c0-2.5 5 0 5-4.5z" fill="none" />
          <line x1="10" y1="80" x2="90" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
        </svg>
      );
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[250px] h-[250px] bg-emerald-500 opacity-[0.05] rounded-full blur-[80px]"></div>
      </div>

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#0f101a] md:border md:border-white/10 md:rounded-[32px] h-full md:h-[680px] flex flex-col overflow-hidden relative text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0 z-20 bg-black/40 backdrop-blur-md">
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-white uppercase tracking-wider font-sans">
              {getPoseLabel()}
            </h3>
            <span className="block text-[9px] text-emerald-400 font-bold uppercase tracking-wider leading-none">
              Encuadre Virtual Activo
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition cursor-pointer border-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {/* 
            UNCONDITIONAL RENDERING OF VIDEO ELEMENT WITH MUTED ATTRIBUTE:
            Fixes mounting race conditions on Safari and iOS WebViews,
            ensuring videoRef.current is never null when srcObject is assigned.
          */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover z-0 ${facingMode === "user" ? "scale-x-[-1]" : ""} ${isCameraActive ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          />

          {/* Transparent Silhouette overlay */}
          {isCameraActive && renderSilhouetteOverlay()}

          {/* Countdown indicator overlay */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute z-30 w-24 h-24 rounded-full bg-emerald-500/25 border-4 border-emerald-500 flex items-center justify-center text-4xl font-black text-white font-sans drop-shadow-2xl"
              >
                {countdown}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Camera Loading Spinner */}
          {!isCameraActive && !cameraError && (
            <div className="flex flex-col items-center justify-center space-y-2 z-10 text-white/40">
              <RefreshCw className="h-7 w-7 animate-spin text-emerald-400" />
              <span className="text-[10px] uppercase font-bold tracking-wider font-sans">Iniciando Cámara...</span>
            </div>
          )}

          {/* Error Banner */}
          {cameraError && (
            <div className="p-6 text-center flex flex-col items-center justify-center space-y-3 z-10 max-w-xs">
              <AlertCircle className="h-8 w-8 text-amber-500" />
              <p className="text-[10px] leading-relaxed text-white/60 font-medium">
                {cameraError}
              </p>
            </div>
          )}

          {/* Guide Overlay description banner */}
          {isCameraActive && (
            <div className="absolute top-4 left-4 right-4 bg-black/60 border border-white/10 rounded-2xl p-2.5 z-10 text-[9.5px] leading-relaxed text-white/80 text-center backdrop-blur-md">
              {getPoseDescription()}
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-5 bg-black/40 border-t border-white/5 flex flex-col gap-3.5 z-20 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Front/Rear toggle camera button */}
            <button
              onClick={handleToggleFacingMode}
              disabled={!isCameraActive}
              className="p-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 rounded-2xl text-white/70 hover:text-white transition flex items-center justify-center cursor-pointer border-none"
              title="Cambiar Cámara"
            >
              <FlipHorizontal className="h-4.5 w-4.5" />
            </button>

            {/* Shutter take capture button */}
            <button
              onClick={handleCapture}
              disabled={!isCameraActive}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-black rounded-2xl transition cursor-pointer shadow-lg shadow-emerald-500/15 uppercase tracking-wider flex items-center justify-center gap-1.5 border-none font-sans"
            >
              <Camera className="h-4 w-4" />
              Capturar Foto
            </button>

            {/* Countdown shutter helper */}
            <button
              onClick={handleTriggerCountdown}
              disabled={!isCameraActive || countdown !== null}
              className="p-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 rounded-2xl text-white/70 hover:text-white font-bold transition flex items-center justify-center cursor-pointer text-xs border-none"
              title="Temporizador 3s"
            >
              ⏱️ 3s
            </button>
          </div>

          <div className="text-center">
            <span className="text-[8px] text-white/30 uppercase tracking-widest font-mono block">
              🔒 Privacidad Local Directa · Fotos Procesadas en Memoria
            </span>
          </div>
        </div>

        {/* Canvas reference for drawing captures */}
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}
