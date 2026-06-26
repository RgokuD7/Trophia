import React, { useState, useEffect } from "react";
import { 
  Settings, Key, Eye, User, Weight, Ruler, Award, RefreshCw, Check, Info, AlertCircle, Sun, Moon, LogOut, Bell, MapPin, Plus, Trash2
} from "lucide-react";
import { UserProfile, BiologicalSex, FitnessGoal, ExperienceLevel, TrainingEnvironment, DietType, FrequentRoute } from "../types";
import { calculateRequirements, calculateBMI } from "../utils/fitnessUtils";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { savePushSubscription, deletePushSubscription } from "../services/dbService";

interface SettingsProps {
  profile: UserProfile;
  userId: string;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetApp: () => void;
}

export default function SettingsView({ profile, userId, onUpdateProfile, onResetApp }: SettingsProps) {
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [level, setLevel] = useState<ExperienceLevel>(profile.level);
  const [environment, setEnvironment] = useState<TrainingEnvironment>(profile.environment);
  const [apiKey, setApiKey] = useState(profile.apiKey || "");
  const [usdaApiKey, setUsdaApiKey] = useState(profile.usdaApiKey || "");
  const [showKey, setShowKey] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(profile.theme || "dark");
  const [takesCreatine, setTakesCreatine] = useState(profile.takesCreatine || false);
  const [dietType, setDietType] = useState<DietType>(profile.dietType || "standard");
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor">(profile.activityLevel || "sedentary");
  const [stepsRange, setStepsRange] = useState<"under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k">(profile.stepsRange || "under_4k");
  const [deficitPace, setDeficitPace] = useState<"conservative" | "moderate" | "aggressive">(profile.deficitPace || "moderate");
  const [solidMealsCount, setSolidMealsCount] = useState<number>(profile.solidMealsCount || 4);
  const [jointPainAreas, setJointPainAreas] = useState<("knee" | "back" | "shoulder")[]>(profile.jointPainAreas || []);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handlePasteApiKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  // States for frequent routes
  const [frequentRoutes, setFrequentRoutes] = useState<FrequentRoute[]>(profile.frequentRoutes || []);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteDistance, setNewRouteDistance] = useState<number | "">("");
  const [newRouteActivity, setNewRouteActivity] = useState<"walking" | "running" | "cycling">("walking");

  const handleAddRoute = () => {
    if (!newRouteName.trim() || !newRouteDistance || newRouteDistance <= 0) return;
    
    const multiplier = 
      newRouteActivity === "walking" ? 0.75 :
      newRouteActivity === "running" ? 1.03 :
      0.35; // cycling
    
    const cal = Math.round(newRouteDistance * weight * multiplier);
    
    const newRoute: FrequentRoute = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      name: newRouteName.trim(),
      distanceKm: newRouteDistance,
      activityType: newRouteActivity,
      caloriesBurned: cal
    };
    
    setFrequentRoutes([...frequentRoutes, newRoute]);
    setNewRouteName("");
    setNewRouteDistance("");
  };

  const handleDeleteRoute = (id: string) => {
    setFrequentRoutes(frequentRoutes.filter(r => r.id !== id));
  };

  // States for Push Notifications PWA
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const checkPushSubscription = async () => {
    try {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      setPushSupported(isSupported);
      
      if (!isSupported) {
        setNotificationPermission("unsupported");
        return;
      }
      
      setNotificationPermission(Notification.permission);
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error al comprobar suscripción push:", err);
      setPushError("Error al verificar soporte de notificaciones.");
    }
  };

  useEffect(() => {
    checkPushSubscription();
  }, []);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleToggleNotifications = async () => {
    setPushLoading(true);
    setPushError(null);
    try {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      if (!isSupported) {
        throw new Error("Push no soportado en este navegador.");
      }

      if (isSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deletePushSubscription(userId, subscription.endpoint);
        }
        setIsSubscribed(false);
      } else {
        // Subscribe
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
          setNotificationPermission(permission);
        }

        if (permission !== "granted") {
          throw new Error("Permiso de notificaciones denegado.");
        }

        const registration = await navigator.serviceWorker.ready;
        
        // Get public VAPID key from environment
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("Falta la clave pública VAPID en las variables de entorno.");
        }
        
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        await savePushSubscription(userId, subscription.toJSON());
        setIsSubscribed(true);
      }
    } catch (err: any) {
      console.error("Error al configurar notificaciones:", err);
      setPushError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setPushLoading(false);
    }
  };

  const handleSave = () => {
    // Recalculate targets based on updated parameters
    const reqs = calculateRequirements({ 
      weight, 
      height, 
      age, 
      sex, 
      goal, 
      level,
      bodyFat: profile.bodyFat,
      activityLevel,
      stepsRange,
      deficitPace,
      dietType
    });
    const bmi = calculateBMI(weight, height);

    // Recalculate frequent routes calories based on new weight!
    const recalculatedRoutes = frequentRoutes.map(r => {
      const multiplier = 
        r.activityType === "walking" ? 0.75 :
        r.activityType === "running" ? 1.03 :
        0.35; // cycling
      return {
        ...r,
        caloriesBurned: Math.round(r.distanceKm * weight * multiplier)
      };
    });

    const requiresMedicalClearance = profile.parqAnswers ? (profile.parqAnswers.q1 || profile.parqAnswers.q2 || profile.parqAnswers.q3 || profile.parqAnswers.q7) : false;

    const updatedProfile: UserProfile = {
      ...profile,
      name,
      age,
      sex,
      weight,
      height,
      goal,
      level,
      environment,
      bmi,
      dailyCalorieTarget: reqs.calories,
      proteinTarget: reqs.protein,
      carbsTarget: reqs.carbs,
      fatTarget: reqs.fat,
      apiKey: apiKey || undefined,
      usdaApiKey: usdaApiKey || undefined,
      theme,
      takesCreatine,
      dietType,
      activityLevel,
      stepsRange,
      deficitPace,
      solidMealsCount,
      requiresMedicalClearance,
      jointPainAreas,
      frequentRoutes: recalculatedRoutes
    };

    onUpdateProfile(updatedProfile);
    if (apiKey && apiKey.trim().length >= 15) {
      localStorage.setItem("trophia_api_key", apiKey);
    } else {
      localStorage.removeItem("trophia_api_key");
    }
    if (usdaApiKey && usdaApiKey.trim().length >= 10) {
      localStorage.setItem("trophia_usda_api_key", usdaApiKey);
    } else {
      localStorage.removeItem("trophia_usda_api_key");
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Title */}
      <div className="p-6 pb-2 border-b border-gray-200 dark:border-gray-800/40">
        <span className="text-xs font-mono font-bold text-gray-555 dark:text-gray-400 uppercase tracking-wider">Ajustes y Parámetros</span>
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <Settings className="h-5 w-5 text-emerald-400" />
          <span>Configuración</span>
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        
        {/* Success Alert */}
        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 font-bold flex items-center gap-2">
            <Check className="h-4 w-4" />
            <span>Ajustes guardados e indicadores actualizados con éxito.</span>
          </div>
        )}

        {/* Theme Settings */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tema Visual</span>
          <div className="flex bg-gray-50 dark:bg-[#0f101a] rounded-lg p-1 border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setTheme("light")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                theme === "light" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Sun className="h-3.5 w-3.5" />
              Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition cursor-pointer ${
                theme === "dark" ? "bg-emerald-500 text-white shadow-sm" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <Moon className="h-3.5 w-3.5" />
              Oscuro
            </button>
          </div>
        </div>

        {/* Notificaciones Push Settings */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-emerald-400" />
            <span>Notificaciones Push</span>
          </span>
          <p className="text-[10px] text-gray-650 dark:text-gray-400 leading-normal">
            Mantente al día con recordatorios personalizados de agua, creatina y registro de tus comidas diarias.
          </p>

          {pushError && (
            <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-[10px] text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{pushError}</span>
            </div>
          )}

          {pushSupported === false ? (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-left space-y-1.5">
              <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                <span>No Soportado</span>
              </span>
              <p className="text-[9px] text-gray-650 dark:text-gray-400 leading-relaxed">
                Las notificaciones push no son compatibles con este navegador o dispositivo.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5 text-left">
                <span className="text-xs font-bold text-gray-900 dark:text-white block">Notificaciones Diarias</span>
                <span className="text-[9px] text-gray-500 dark:text-gray-400">
                  {notificationPermission === "denied"
                    ? "Permisos bloqueados en el navegador."
                    : isSubscribed
                    ? "Suscripción activa y sincronizada."
                    : "Recibe avisos directos en tu pantalla."}
                </span>
              </div>

              <button
                type="button"
                disabled={pushLoading || notificationPermission === "denied"}
                onClick={handleToggleNotifications}
                className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSubscribed ? "bg-emerald-500 justify-end" : "bg-gray-200 dark:bg-gray-800 justify-start"
                }`}
              >
                {pushLoading ? (
                  <RefreshCw className="w-4.5 h-4.5 rounded-full bg-white shadow-md animate-spin p-1 text-gray-700" />
                ) : (
                  <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md"></span>
                )}
              </button>
            </div>
          )}

          {notificationPermission === "denied" && (
            <p className="text-[9px] text-amber-400/80 leading-normal text-left">
              * El permiso de notificaciones fue denegado. Para activarlo, ingresa a la configuración del sitio en tu navegador y habilita el permiso de notificaciones para este dominio.
            </p>
          )}
        </div>

        {/* AI Key Configuration */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Credencial de IA Descentralizada</span>
          <p className="text-[10px] text-gray-650 dark:text-gray-400 leading-normal">
            Cambia o actualiza tu clave de API de Gemini de Google AI Studio para mantener tus llamadas independientes de cuotas.
          </p>
          
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                type="password"
                icon={Key}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Ingresa tu clave de API de Gemini..."
                className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 focus:border-emerald-500/30 font-mono"
                size="md"
              />
            </div>
            <Button
              variant="secondary"
              onClick={handlePasteApiKey}
              className="shrink-0 h-[42px] px-3.5 text-[11px] font-bold rounded-xl"
            >
              Pegar
            </Button>
          </div>
        </div>

        {/* USDA API Key Configuration */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-555 dark:text-gray-400 uppercase">Credencial de USDA FoodData Central</span>
          <p className="text-[10px] text-gray-650 dark:text-gray-400 leading-normal">
            Configura tu propia clave de API de la USDA para la búsqueda de ingredientes y alimentos naturales. De forma predeterminada se usa una clave pública compartida.
          </p>
          
          <Input
            type="password"
            icon={Key}
            value={usdaApiKey}
            onChange={(e) => setUsdaApiKey(e.target.value)}
            placeholder="Ingresa tu clave de API de USDA..."
            className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 focus:border-emerald-500/30 font-mono"
            size="md"
          />
        </div>

        {/* Biometric Override Fields */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Perfil Físico</span>

          <div className="space-y-2.5">
             <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Nombre</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-50 dark:bg-[#0f101a] border-gray-250 dark:border-gray-800"
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Edad</label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  className="bg-gray-50 dark:bg-[#0f101a] border-gray-250 dark:border-gray-800"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Sexo Biológico</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as BiologicalSex)}
                  className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Peso (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                  className="bg-gray-50 dark:bg-[#0f101a] border-gray-250 dark:border-gray-800"
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Estatura (cm)</label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                  className="bg-gray-50 dark:bg-[#0f101a] border-gray-250 dark:border-gray-800"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Training Objectives Settings */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Meta y Plan deportivo</span>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Meta Nutricional</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="lose_weight">Bajar de peso / Definición</option>
                <option value="gain_muscle">Ganar masa muscular / Volumen</option>
                <option value="aesthetics">Recomposición Estética</option>
                <option value="maintenance">Mantenimiento general</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Tipo de Dieta</label>
              <select
                value={dietType}
                onChange={(e) => setDietType(e.target.value as DietType)}
                className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="standard">Estándar (Todo / Sin restricciones)</option>
                <option value="vegetarian">Vegetariana</option>
                <option value="vegan">Vegana</option>
                <option value="keto">Cetogénica (Keto)</option>
                <option value="paleo">Paleolítica (Paleo)</option>
                <option value="mediterranean">Mediterránea</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Nivel Histórico</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as ExperienceLevel)}
                  className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
                >
                  <option value="beginner">Principiante</option>
                  <option value="intermediate">Intermedio</option>
                  <option value="advanced">Avanzado</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Entorno de Ejercicio</label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as TrainingEnvironment)}
                  className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
                >
                  <option value="home">Casa</option>
                  <option value="gym">Gimnasio</option>
                  <option value="outdoor">Aire Libre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Actividad Diaria / Laboral (NEAT)</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="sedentary">Actividad Sedentaria (ej. estudio, clases, oficina, escritorio)</option>
                <option value="lightly_active">Actividad Ligera (ej. estudio/escritorio con caminatas, tareas del hogar)</option>
                <option value="moderately_active">Actividad Moderada (ej. de pie gran parte del día, caminar frecuente)</option>
                <option value="highly_active">Actividad Intensa (ej. esfuerzo constante, deporte intensivo diario)</option>
                <option value="heavy_labor">Trabajo Físico / Labor Pesada (ej. construcción, agricultura, carga)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Promedio de Pasos Diarios (NEAT)</label>
              <select
                value={stepsRange}
                onChange={(e) => setStepsRange(e.target.value as any)}
                className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value="under_4k">Menos de 4,000 pasos</option>
                <option value="5k_7k">5,000 - 7,000 pasos</option>
                <option value="8k_10k">8,000 - 10,000 pasos</option>
                <option value="12k_15k">12,000 - 15,000 pasos</option>
                <option value="over_18k">Más de 18,000 pasos</option>
              </select>
            </div>

            {goal === "lose_weight" && (
              <div>
                <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Ritmo del Déficit (Pérdida de Peso)</label>
                <select
                  value={deficitPace}
                  onChange={(e) => setDeficitPace(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
                >
                  <option value="conservative">Conservador (lento y seguro, protege músculo)</option>
                  <option value="moderate">Moderado (ritmo estándar clínico)</option>
                  <option value="aggressive">Agresivo (rápido, solo si tu porcentaje de grasa es alto)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Cantidad de Comidas al Día</label>
              <select
                value={solidMealsCount}
                onChange={(e) => setSolidMealsCount(parseInt(e.target.value) || 4)}
                className="w-full bg-gray-50 dark:bg-[#0f101a] border border-gray-250 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
              >
                <option value={2}>2 comidas al día</option>
                <option value={3}>3 comidas al día</option>
                <option value={4}>4 comidas al día</option>
                <option value={5}>5 comidas al día</option>
                <option value={6}>6 comidas al día</option>
              </select>
            </div>

            <div className="pt-1.5">
              <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">Molestias / Dolores Articulares</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "knee", label: "Rodilla" },
                  { id: "back", label: "Espalda Baja" },
                  { id: "shoulder", label: "Hombro" }
                ].map((area) => {
                  const selected = jointPainAreas.includes(area.id as any);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        const newArea = area.id as any;
                        if (selected) {
                          setJointPainAreas(jointPainAreas.filter(a => a !== newArea));
                        } else {
                          setJointPainAreas([...jointPainAreas, newArea]);
                        }
                      }}
                      className={`py-1.5 px-2 rounded-lg border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        selected
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
                          : "bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                        selected ? "bg-amber-500 border-amber-500 text-white" : "border-gray-300 dark:border-gray-700"
                      }`}>
                        {selected && <Check className="h-2.5 w-2.5 text-white stroke-[3px]" />}
                      </div>
                      <span className="text-[10px]">{area.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 leading-normal">
                Al seleccionar zonas, el generador de rutinas de IA evitará ejercicios contraindicados para las articulaciones afectadas.
              </p>
            </div>
          </div>
        </div>

        {/* Rutas Habituales y Gasto Base */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Rutas Habituales y Gasto Base</span>
          </span>
          <p className="text-[10px] text-gray-650 dark:text-gray-400 leading-normal">
            Registra los trayectos o actividades frecuentes que realizas (caminar, correr o ciclismo). Podrás marcarlos en el Dashboard para sumar de forma directa las calorías quemadas a tu gasto calórico diario.
          </p>

          {/* Formulario de nueva ruta */}
          <div className="bg-gray-50 dark:bg-[#0f101a] p-3 rounded-lg border border-gray-200 dark:border-gray-800 space-y-3">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Agregar Nueva Ruta</span>
            
            <div className="space-y-2">
              <div>
                <label className="block text-[9px] text-gray-550 dark:text-gray-400 mb-0.5">Nombre / Identificador de la Ruta</label>
                <Input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Ej: Camino al trabajo, Trote matutino..."
                  className="bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800"
                  size="sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] text-gray-550 dark:text-gray-400 mb-0.5">Distancia (km)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newRouteDistance}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setNewRouteDistance(isNaN(val) ? "" : val);
                    }}
                    placeholder="Ej: 3.5"
                    className="bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800"
                    size="sm"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-550 dark:text-gray-400 mb-0.5">Actividad</label>
                  <select
                    value={newRouteActivity}
                    onChange={(e) => setNewRouteActivity(e.target.value as "walking" | "running" | "cycling")}
                    className="w-full bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-3 text-xs text-gray-900 dark:text-white outline-none"
                  >
                    <option value="walking">Caminar</option>
                    <option value="running">Correr</option>
                    <option value="cycling">Ciclismo</option>
                  </select>
                </div>
              </div>

              {newRouteDistance && newRouteDistance > 0 && (
                <div className="text-[10px] text-emerald-400/90 font-bold bg-emerald-500/5 p-2 rounded border border-emerald-500/10 flex items-center justify-between">
                  <span>Gasto calórico estimado:</span>
                  <span>
                    {Math.round(
                      newRouteDistance *
                        weight *
                        (newRouteActivity === "walking"
                          ? 0.75
                          : newRouteActivity === "running"
                          ? 1.03
                          : 0.35)
                    )}{" "}
                    kcal
                  </span>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleAddRoute}
                leftIcon={Plus}
                className="w-full text-xs font-bold"
                size="sm"
              >
                Agregar Ruta
              </Button>
            </div>
          </div>

          {/* Listado de rutas actuales */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Mis Rutas Guardadas ({frequentRoutes.length})</span>
            {frequentRoutes.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-xs text-gray-450 dark:text-gray-500">
                Aún no tienes rutas habituales registradas.
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto no-scrollbar">
                {frequentRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-lg hover:border-gray-300 dark:hover:border-gray-700/60 transition"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-gray-900 dark:text-white truncate">{route.name}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-gray-200 dark:bg-gray-800 text-gray-550 dark:text-gray-400">
                          {route.activityType === "walking" ? "Caminar" : route.activityType === "running" ? "Correr" : "Ciclismo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-450 font-bold">
                        <span>Distancia: {route.distanceKm} km</span>
                        <span>•</span>
                        <span className="text-emerald-500">{route.caloriesBurned} kcal</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoute(route.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 transition rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/80 cursor-pointer"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Supplements Configuration */}
        <div className="bg-white dark:bg-[#161824] p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md dark:shadow-lg">
          <span className="block text-xs font-bold text-gray-550 dark:text-gray-400 uppercase">Suplementación</span>
          
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5 text-left">
              <span className="text-xs font-bold text-gray-900 dark:text-white block">Consumo de Creatina</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Activa recordatorios diarios en tu dashboard.</span>
            </div>
            
            <button
              type="button"
              onClick={() => setTakesCreatine(!takesCreatine)}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex items-center cursor-pointer ${
                takesCreatine ? "bg-emerald-500 justify-end" : "bg-gray-200 dark:bg-gray-800 justify-start"
              }`}
            >
              <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md"></span>
            </button>
          </div>
        </div>

        {/* Trigger save */}
        <Button
          variant="primary"
          onClick={handleSave}
          leftIcon={Check}
          className="w-full cursor-pointer"
          size="md"
        >
          Guardar Cambios y Recalcular Metas
        </Button>

        {/* Reset App */}
        <div className="border-t border-gray-200 dark:border-gray-800/80 pt-4 space-y-4">
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que deseas cerrar la sesión? Se borrará tu historial y volverás al onboarding.")) {
                onResetApp();
              }
            }}
            leftIcon={LogOut}
            className="w-full font-extrabold cursor-pointer"
            size="md"
          >
            Cerrar Sesión (Reiniciar Datos)
          </Button>

          <div className="text-center pt-2 text-[9px] text-gray-400 dark:text-white/20 font-mono tracking-wider">
            <span>by Richard Bouryssieres</span>
            <span className="mx-1.5">•</span>
            <span>v0.0.2</span>
          </div>
        </div>

      </div>
    </div>
  );
}
