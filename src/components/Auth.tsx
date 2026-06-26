import React, { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Smartphone, ChevronRight } from "lucide-react";
import { loginWithGoogle } from "../services/authService";
import logo from "../assets/logo.png";
import { Button } from "./ui/Button";

interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isMobile: boolean;
}

const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === "undefined") {
    return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false, isMobile: false };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua);

  return { isIOS, isAndroid, isSafari, isChrome, isMobile };
};

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const deviceInfo = getDeviceInfo();
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || 
                               (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
  }, []);

  if (deviceInfo.isMobile && !isStandalone) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] px-6 py-12 justify-between items-center relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[150px] h-[150px] rounded-full bg-emerald-500/10 blur-[80px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[180px] h-[180px] rounded-full bg-blue-500/10 blur-[80px]"></div>

        {/* Header section (Logo and App Name) */}
        <div className="flex flex-col items-center text-center mt-6 space-y-4 z-10 w-full">
          <div className="relative p-2 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/10 dark:border-emerald-500/20 shadow-lg dark:shadow-emerald-950/10">
            <img src={logo} alt="Trophia Logo" className="w-16 h-16 object-contain rounded-xl" />
          </div>

          <div className="space-y-1">
            <h1 className="text-3.5xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 dark:from-emerald-400 dark:via-teal-300 dark:to-blue-400 bg-clip-text text-transparent">
              Trophia
            </h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/70">
              Intelligent Fitness
            </p>
          </div>
        </div>

        {/* Installation Instructions Content */}
        <div className="w-full space-y-6 z-10 my-auto max-w-sm">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
              <Smartphone className="h-7 w-7 text-amber-400" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">Instalación Necesaria</h2>
            <p className="text-[11px] text-white/50 leading-relaxed px-4">
              Trophia debe ejecutarse como aplicación web para funcionar. {deviceInfo.isIOS && "iOS aísla los datos del navegador, por lo que "}debes agregar la app a tu pantalla de inicio antes de iniciar sesión.
            </p>
          </div>

          <div className="bg-white dark:bg-[#121420]/60 border border-gray-200 dark:border-[#1e2238] rounded-2xl p-4 space-y-3.5 shadow-md">
            <span className="text-xs font-black text-emerald-400 block uppercase tracking-wider">
              ¿Cómo instalar en tu {deviceInfo.isIOS ? "iPhone / iPad" : "Android"}?
            </span>

            {deviceInfo.isIOS && deviceInfo.isSafari && (
              <div className="space-y-2.5 text-[10px] text-white/70 leading-relaxed font-medium">
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">1</span>
                  <span>Presiona el botón de <b>Compartir</b> (el icono de cuadrado con una flecha hacia arriba 📤) en Safari.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">2</span>
                  <span>Desplázate hacia abajo y selecciona <b>Agregar a Inicio</b> (el icono con un signo <b>+</b>).</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">3</span>
                  <span>Asegúrate de dejar activada la opción de abrir como app web y pulsa <b>Agregar</b> arriba a la derecha.</span>
                </div>
              </div>
            )}

            {deviceInfo.isIOS && deviceInfo.isChrome && (
              <div className="space-y-2.5 text-[10px] text-white/70 leading-relaxed font-medium">
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">1</span>
                  <span>Presiona el menú de tres puntos (<b>...</b>) al lado de la barra de direcciones de Chrome.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">2</span>
                  <span>Selecciona la opción <b>Compartir</b> y luego pulsa <b>Agregar a pantalla de inicio</b>.</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">3</span>
                  <span>Presiona <b>Agregar</b> para confirmar.</span>
                </div>
              </div>
            )}

            {deviceInfo.isIOS && !deviceInfo.isSafari && !deviceInfo.isChrome && (
              <div className="space-y-2 text-[10px] text-white/70 leading-relaxed font-medium">
                <p>
                  En iOS, la instalación de aplicaciones web solo está soportada a través de <span className="font-bold text-white">Safari</span> o <span className="font-bold text-white">Chrome</span>.
                </p>
                <p className="bg-white/5 p-2 rounded-xl border border-white/5 text-[9px] font-mono select-all text-center break-all">
                  {window.location.href}
                </p>
                <p className="text-amber-400 text-[9px]">
                  * Copia el enlace superior, ábrelo en Safari y realiza la instalación.
                </p>
              </div>
            )}

            {deviceInfo.isAndroid && (
              <div className="space-y-2.5 text-[10px] text-white/70 leading-relaxed font-medium">
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">1</span>
                  <span>Abre el menú del navegador (los tres puntos verticales <b>⋮</b> arriba a la derecha).</span>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="bg-white/10 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">2</span>
                  <span>Presiona en <b>Instalar aplicación</b> o <b>Agregar a pantalla de inicio</b>.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action instruction footer */}
        <div className="w-full space-y-4 z-10 mb-4 text-center">
          <p className="text-[10px] text-gray-500 leading-normal px-6">
            Una vez agregada a tu pantalla de inicio, cierra esta pestaña, abre la aplicación desde tu pantalla de inicio e inicia sesión para comenzar.
          </p>
          <div className="text-[9px] text-gray-400 dark:text-white/20 font-mono tracking-wider">
            <span>by Richard Bouryssieres</span>
            <span className="mx-1.5">•</span>
            <span>v0.0.2</span>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      console.error("Auth error:", err);
      // Friendly Spanish error message based on common issues
      if (err.code === "auth/popup-closed-by-user") {
        setError("El inicio de sesión fue cancelado. Inténtalo de nuevo.");
      } else if (err.code === "auth/blocked-by-popup-toggler") {
        setError("El navegador bloqueó la ventana emergente. Por favor, habilítala.");
      } else {
        setError("Ocurrió un error al iniciar sesión. Inténtalo más tarde.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] px-6 py-12 justify-between items-center relative overflow-hidden">
      
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[150px] h-[150px] rounded-full bg-emerald-500/10 blur-[80px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[180px] h-[180px] rounded-full bg-blue-500/10 blur-[80px]"></div>

      {/* Header section (Logo and App Name) */}
      <div className="flex flex-col items-center text-center mt-12 space-y-4 z-10 w-full">
        <div className="relative p-2 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/10 dark:border-emerald-500/20 shadow-lg dark:shadow-emerald-950/10">
          <img src={logo} alt="Trophia Logo" className="w-16 h-16 object-contain rounded-xl" />
        </div>

        <div className="space-y-1">
          <h1 className="text-3.5xl font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 dark:from-emerald-400 dark:via-teal-300 dark:to-blue-400 bg-clip-text text-transparent">
            Trophia
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/70">
            Intelligent Fitness
          </p>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm max-w-[280px] leading-relaxed pt-2">
          Tu evolución física y nutricional optimizada de forma personalizada con Inteligencia Artificial.
        </p>
      </div>

      {/* Main Login Action Area */}
      <div className="w-full space-y-5 z-10 mb-8">
        
        {/* Error Alert */}
        {error && (
          <div className="flex items-start space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs p-3.5 rounded-xl transition-all duration-300">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="leading-tight">{error}</p>
          </div>
        )}

        {/* Feature Highlights Carousel/List */}
        <div className="bg-white dark:bg-[#121420]/60 border border-gray-200 dark:border-[#1e2238] rounded-2xl p-4 space-y-3 shadow-md dark:shadow-inner">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Análisis de composición corporal por IA</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Rutinas dinámicas personalizadas</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">Registro inteligente de alimentos</p>
          </div>
        </div>


        {/* Google Login Button */}
        <Button
          onClick={handleGoogleLogin}
          isLoading={loading}
          variant="white"
          className="w-full font-bold cursor-pointer"
          hoverScale={true}
          size="md"
        >
          {/* Custom SVG Google Icon */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>Continuar con Google</span>
        </Button>

        {/* Footer/Disclaimer with Developer Credits */}
        <div className="space-y-3.5 text-center pt-2">
          <p className="text-[10px] text-gray-500 px-4 leading-normal">
            Al continuar, aceptas la sincronización y el almacenamiento de tus métricas y registros en la base de datos segura de Trophia.
          </p>
          <div className="text-[9px] text-gray-400 dark:text-white/20 font-mono tracking-wider">
            <span>by Richard Bouryssieres</span>
            <span className="mx-1.5">•</span>
            <span>v0.0.2</span>
          </div>
        </div>
      </div>

    </div>
  );
}
