import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, X, RefreshCw, AlertCircle, CheckCircle, FlipHorizontal } from "lucide-react";
import { Button } from "./ui/Button";

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
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
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

  // Helper to render the custom transparent silhouette guide paths
  const renderSilhouetteOverlay = () => {
    if (poseType === "front") {
      return (
        <svg className="absolute w-[80%] h-[85%] text-emerald-500/20 pointer-events-none drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" viewBox="0 0 100 150" fill="currentColor">
          {/* Front body outline silhouette */}
          <path d="M50 15c4.5 0 8-3.5 8-8s-3.5-8-8-8-8 3.5-8 8 3.5 8 8 8zm15 17c-2-3-6-4.5-11-5h-8c-5 .5-9 2-11 5-4.5 7-7.5 22-8.5 29-.5 4 1 6 3.5 5s4.5-3 5-7.5l2-16.5c.5-2 1.5-3.5 3-4 1.5-.5 3 .5 3 2.5v44c0 3 1.5 5.5 3.5 6s4.5-2 4.5-5V42c0-2.5 3.5-2.5 3.5 0v39.5c0 3 2.5 5 4.5 5s3.5-3 3.5-6V35c0-2 1.5-3 3-2.5 1.5.5 2.5 2 3 4l2 16.5c.5 4.5 2.5 8.5 5 7.5s4-1 3.5-5c-1-7-4-22-8.5-29z" />
          {/* Alignment guide circles */}
          <circle cx="50" cy="7" r="9" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
          <circle cx="50" cy="50" r="16" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
        </svg>
      );
    }
    if (poseType === "side") {
      return (
        <svg className="absolute w-[75%] h-[85%] text-emerald-500/20 pointer-events-none drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" viewBox="0 0 100 150" fill="currentColor">
          {/* Side profile silhouette */}
          <path d="M48 16c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7zm-5 13c3-3 8-4.5 13-4h2c4 1 6 3 6 7 0 5-2.5 15-4.5 25-.5 4-3 5-5 4s-3-3.5-3.5-7.5l-1.5-12.5c0-2-1.5-3-2.5-3-1 0-2 1-2 2.5v40c0 3-1 5-3 5s-3-2-3-5V45c0-2-3-2-3 0v30c0 3-2 5-4 5s-3-3-3-6V38c0-2-1-3-2-2.5s-1.5 2-2 4l-1 12.5c-.5 4-2.5 5-4.5 4.5s-2.5-2.5-2-6c1.5-7 4.5-20.5 8-26.5z" />
          <circle cx="48" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2" />
        </svg>
      );
    }
    if (poseType === "face") {
      return (
        <svg className="absolute w-[60%] h-[60%] text-emerald-500/20 pointer-events-none drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
          {/* Face oval guideline */}
          <ellipse cx="50" cy="50" rx="30" ry="40" strokeDasharray="3 3" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 4" />
        </svg>
      );
    }
    if (poseType === "legs") {
      return (
        <svg className="absolute w-[70%] h-[75%] text-emerald-500/20 pointer-events-none drop-shadow-[0_0_15px_rgba(16,185,129,0.2)] animate-pulse" viewBox="0 0 100 150" fill="currentColor">
          {/* Legs outline only */}
          <path d="M40 20c2 0 3 1.5 3 3.5v110c0 3-1.5 5.5-3.5 6s-4.5-2-4.5-5V20c0-2.5 5 0 5-4.5zm20 0c2 0 3 1.5 3 3.5v110c0 3-1.5 5.5-3.5 6s-4.5-2-4.5-5V20c0-2.5 5 0 5-4.5z" />
          <line x1="10" y1="80" x2="90" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
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
          {isCameraActive && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`absolute inset-0 w-full h-full object-cover z-0 ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          )}

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
