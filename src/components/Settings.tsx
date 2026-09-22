import React, { useState, useEffect } from "react";
import { 
  Settings, Key, CircleUser, RefreshCw, Check, Info, AlertCircle, 
  LogOut, Bell, Utensils, Activity, Sliders, ShieldAlert, Sparkles, Scale, Target, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, BiologicalSex, FitnessGoal, ExperienceLevel, DietType } from "../types";
import { calculateRequirements, calculateBMI } from "../utils/fitnessUtils";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { savePushSubscription, deletePushSubscription } from "../services/dbService";
import BodyEvolutionTracker from "./BodyEvolutionTracker";

interface SettingsProps {
  profile: UserProfile;
  userId: string;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetApp: () => void;
  onOpenRecalibration: () => void;
}

type SettingsSection = "profile" | "nutrition" | "system";

export default function SettingsView({ 
  profile, 
  userId, 
  onUpdateProfile, 
  onResetApp,
  onOpenRecalibration
}: SettingsProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("profile");

  // Profile data
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [sex, setSex] = useState<BiologicalSex>(profile.sex);
  const [weight, setWeight] = useState(profile.weight);
  const [height, setHeight] = useState(profile.height);
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor">(profile.activityLevel || "sedentary");
  const [stepsRange, setStepsRange] = useState<"under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k">(profile.stepsRange || "under_4k");
  const [deficitPace] = useState<"conservative" | "moderate" | "aggressive">("moderate");

  // Nutrition data
  const [dietType, setDietType] = useState<DietType>(profile.dietType || "standard");
  const [customDiet, setCustomDiet] = useState<string>(profile.customDiet || "");
  const [allergies, setAllergies] = useState<string[]>(profile.allergies || []);
  const [customAllergies, setCustomAllergies] = useState<string>(profile.customAllergies || "");
  const [solidMealsCount, setSolidMealsCount] = useState<number>(profile.solidMealsCount || 4);
  const [takesCreatine, setTakesCreatine] = useState(profile.takesCreatine || false);

  // System data
  const [apiKey, setApiKey] = useState(profile.apiKey || "");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Push Notifications state
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Keep local state in sync when profile updates
  useEffect(() => {
    setName(profile.name);
    setAge(profile.age);
    setSex(profile.sex);
    setWeight(profile.weight);
    setHeight(profile.height);
    setGoal(profile.goal);
    setDietType(profile.dietType || "standard");
    setCustomDiet(profile.customDiet || "");
    setAllergies(profile.allergies || []);
    setCustomAllergies(profile.customAllergies || "");
    setSolidMealsCount(profile.solidMealsCount || 4);
    setTakesCreatine(profile.takesCreatine || false);
    setActivityLevel(profile.activityLevel || "sedentary");
    setStepsRange(profile.stepsRange || "under_4k");
    setApiKey(profile.apiKey || "");
  }, [profile]);

  // Live BMI calculation
  const currentBMI = height > 0 ? (weight / Math.pow(height / 100, 2)).toFixed(1) : "0.0";
  const numBMI = parseFloat(currentBMI);
  const bmiCategory = 
    numBMI < 18.5 ? { label: "Bajo peso", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" } :
    numBMI < 25.0 ? { label: "Peso saludable", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" } :
    numBMI < 30.0 ? { label: "Sobrepeso", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" } :
    { label: "Obesidad", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };

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
    const cleanStr = base64String.trim().replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (cleanStr.length % 4)) % 4);
    const base64 = cleanStr + padding;

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
        throw new Error("Notificaciones no soportadas en este navegador.");
      }

      if (isSubscribed) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deletePushSubscription(userId, subscription.endpoint);
        }
        setIsSubscribed(false);
      } else {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
          setNotificationPermission(permission);
        }

        if (permission !== "granted") {
          throw new Error("Permiso de notificaciones denegado.");
        }

        const registration = await navigator.serviceWorker.ready;
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
    const reqs = calculateRequirements({ 
      weight, 
      height, 
      age, 
      sex, 
      goal, 
      level: profile.level || "beginner",
      bodyFat: profile.bodyFat,
      activityLevel,
      stepsRange,
      deficitPace,
      dietType
    });
    const bmi = calculateBMI(weight, height);

    const updatedProfile: UserProfile = {
      ...profile,
      name,
      age,
      sex,
      weight,
      height,
      goal,
      bmi,
      dailyCalorieTarget: reqs.calories,
      proteinTarget: reqs.protein,
      carbsTarget: reqs.carbs,
      fatTarget: reqs.fat,
      apiKey: apiKey || undefined,
      takesCreatine,
      dietType,
      customDiet: dietType === "other" && customDiet.trim() ? customDiet.trim() : undefined,
      activityLevel,
      stepsRange,
      deficitPace,
      solidMealsCount,
      allergies: allergies.length > 0 ? allergies : undefined,
      customAllergies: allergies.includes("other") && customAllergies.trim() ? customAllergies.trim() : undefined
    };

    onUpdateProfile(updatedProfile);
    if (apiKey && apiKey.trim().length >= 15) {
      localStorage.setItem("trophia_api_key", apiKey);
    } else {
      localStorage.removeItem("trophia_api_key");
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const sections = [
    { id: "profile" as SettingsSection, label: "Perfil & Objetivos", icon: CircleUser },
    { id: "nutrition" as SettingsSection, label: "Nutrición & Dieta", icon: Utensils },
    { id: "system" as SettingsSection, label: "Sistema & App", icon: Sliders },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-24">
      
      {/* Header */}
      <div className="p-5 pb-3 border-b border-gray-200 dark:border-gray-800/60 bg-white/70 dark:bg-[#0d0e15]/70 backdrop-blur-md sticky top-0 z-20">
        <div>
          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">Panel de Configuración</span>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
            <Settings className="h-5 w-5 text-emerald-400" />
            <span>Ajustes</span>
          </h2>
        </div>

        {/* 3 Categories Tab Bar */}
        <div className="grid grid-cols-3 gap-1.5 mt-3.5 p-1 bg-gray-100 dark:bg-[#161824] rounded-2xl border border-gray-200 dark:border-gray-800">
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`relative py-2.5 px-1 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  isActive
                    ? "text-emerald-500 dark:text-emerald-400 font-black"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeSettingsTab"
                    className="absolute inset-0 bg-white dark:bg-[#202334] rounded-xl shadow-sm border border-gray-200 dark:border-gray-700/60"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center">
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="relative z-10 text-[10px] truncate max-w-full font-bold">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 max-w-2xl mx-auto w-full">
        
        {/* Success Alert */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-emerald-500/15 border border-emerald-500/30 p-3.5 rounded-2xl text-xs text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-2.5 shadow-sm"
          >
            <Check className="h-4 w-4 stroke-[3px]" />
            <span>Ajustes guardados y metas recalculadas con éxito.</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* SECCIÓN 1: PERFIL */}
          {/* ========================================================================= */}
          {activeSection === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Evolution & Progress Tracking */}
              <BodyEvolutionTracker
                profile={profile}
                onUpdateProfile={onUpdateProfile}
                onOpenRecalibration={onOpenRecalibration}
              />

              {/* BMI Summary Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-white dark:via-[#161824] to-emerald-500/5 p-4 rounded-3xl border border-emerald-500/20 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/15 text-emerald-500 rounded-2xl">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">IMC Actual</span>
                    <span className="text-xl font-black text-gray-900 dark:text-white">{currentBMI}</span>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black border ${bmiCategory.color}`}>
                  {bmiCategory.label}
                </div>
              </div>

              {/* Biometrics Card */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CircleUser className="h-4 w-4 text-emerald-400" />
                  <span>Datos Antropométricos</span>
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Nombre Completo</label>
                    <Input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-medium"
                      size="md"
                    />
                  </div>

                  {/* Edad & Sexo Biológico (Custom Pill Toggle) */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Edad</label>
                      <Input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                        className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-bold"
                        size="md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Sexo Biológico</label>
                      <div className="flex bg-gray-50 dark:bg-[#0f101a] p-1 rounded-xl border border-gray-200 dark:border-gray-800 h-[42px] items-center">
                        <button
                          type="button"
                          onClick={() => setSex("male")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                            sex === "male"
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          <span>Hombre</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSex("female")}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                            sex === "female"
                              ? "bg-emerald-500 text-white shadow-xs"
                              : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                          }`}
                        >
                          <span>Mujer</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Peso Base (kg)</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                        className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-bold"
                        size="md"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Estatura (cm)</label>
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                        className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-bold"
                        size="md"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Goal & Daily Activity (NEAT) */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span>Meta Nutricional y Actividad Base</span>
                </span>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Objetivo Nutricional</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                      className="w-full h-10 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs text-gray-900 dark:text-white outline-none font-bold transition"
                    >
                      <option value="lose_weight">Bajar de peso / Definición</option>
                      <option value="gain_muscle">Ganar masa muscular / Volumen</option>
                      <option value="aesthetics">Recomposición Estética</option>
                      <option value="maintenance">Mantenimiento general</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Actividad Diaria / Laboral (NEAT)</label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value as any)}
                      className="w-full h-10 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs text-gray-900 dark:text-white outline-none font-bold transition"
                    >
                      <option value="sedentary">Actividad Sedentaria (oficina, escritorio, estudio)</option>
                      <option value="lightly_active">Actividad Ligera (escritorio + caminatas, tareas del hogar)</option>
                      <option value="moderately_active">Actividad Moderada (de pie gran parte del día, caminar frecuente)</option>
                      <option value="highly_active">Actividad Intensa (esfuerzo físico constante diario)</option>
                      <option value="heavy_labor">Trabajo Físico / Labor Pesada (construcción, carga, agricultura)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1">Promedio de Pasos Diarios</label>
                    <select
                      value={stepsRange}
                      onChange={(e) => setStepsRange(e.target.value as any)}
                      className="w-full h-10 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs text-gray-900 dark:text-white outline-none font-bold transition"
                    >
                      <option value="under_4k">Menos de 4,000 pasos</option>
                      <option value="5k_7k">5,000 - 7,000 pasos</option>
                      <option value="8k_10k">8,000 - 10,000 pasos</option>
                      <option value="12k_15k">12,000 - 15,000 pasos</option>
                      <option value="over_18k">Más de 18,000 pasos</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN 2: NUTRICIÓN */}
          {/* ========================================================================= */}
          {activeSection === "nutrition" && (
            <motion.div
              key="nutrition"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Diet Type */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="h-4 w-4 text-emerald-400" />
                  <span>Tipo de Alimentación</span>
                </span>

                <div className="space-y-2.5">
                  <select
                    value={dietType}
                    onChange={(e) => setDietType(e.target.value as DietType)}
                    className="w-full h-10 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs text-gray-900 dark:text-white outline-none font-bold transition"
                  >
                    <option value="standard">Estándar (Todo / Sin restricciones)</option>
                    <option value="vegetarian">Vegetariana</option>
                    <option value="vegan">Vegana</option>
                    <option value="keto">Cetogénica (Keto)</option>
                    <option value="paleo">Paleolítica (Paleo)</option>
                    <option value="mediterranean">Mediterránea</option>
                    <option value="other">Otra (Personalizada)</option>
                  </select>

                  {dietType === "other" && (
                    <Input
                      type="text"
                      value={customDiet}
                      onChange={(e) => setCustomDiet(e.target.value)}
                      placeholder="Describe tu tipo de dieta personalizada..."
                      className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-medium"
                      size="md"
                    />
                  )}
                </div>
              </div>

              {/* Allergies & Intolerances */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-emerald-400" />
                  <span>Alergias e Intolerancias</span>
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "lactose", label: "🥛 Sin Lactosa" },
                    { id: "gluten", label: "🌾 Sin Gluten" },
                    { id: "nuts", label: "🥜 Sin Frutos Secos" },
                    { id: "seafood", label: "🍤 Sin Mariscos" },
                    { id: "soy", label: "🫘 Sin Soya" },
                    { id: "other", label: "✏️ Otra" }
                  ].map((item) => {
                    const isSelected = allergies.includes(item.id);
                    const handleToggle = () => {
                      if (isSelected) {
                        setAllergies(allergies.filter(a => a !== item.id));
                        if (item.id === "other") setCustomAllergies("");
                      } else {
                        setAllergies([...allergies, item.id]);
                      }
                    };
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={handleToggle}
                        className={`py-2 px-3 rounded-xl border text-center transition text-xs font-bold cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-500 dark:text-emerald-400"
                            : "bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        <span>{item.label}</span>
                        {isSelected && <Check className="h-3 w-3 text-emerald-500 stroke-[3px]" />}
                      </button>
                    );
                  })}
                </div>

                {allergies.includes("other") && (
                  <Input
                    type="text"
                    value={customAllergies}
                    onChange={(e) => setCustomAllergies(e.target.value)}
                    placeholder="Especifica tus alergias adicionales..."
                    className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-medium"
                    size="md"
                  />
                )}
              </div>

              {/* Meals Count & Creatine */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">Cantidad de Comidas al Día</label>
                  <select
                    value={solidMealsCount}
                    onChange={(e) => setSolidMealsCount(parseInt(e.target.value) || 4)}
                    className="w-full h-10 bg-gray-50 dark:bg-[#0f101a] border border-gray-200 dark:border-gray-800 rounded-xl px-3 text-xs text-gray-900 dark:text-white outline-none font-bold transition"
                  >
                    <option value={2}>2 comidas al día</option>
                    <option value={3}>3 comidas al día</option>
                    <option value={4}>4 comidas al día</option>
                    <option value={5}>5 comidas al día</option>
                    <option value={6}>6 comidas al día</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <span className="text-xs font-black text-gray-900 dark:text-white block">Consumo Diario de Creatina</span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Recordatorio diario en tu Dashboard</span>
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
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* SECCIÓN 3: SISTEMA & APP */}
          {/* ========================================================================= */}
          {activeSection === "system" && (
            <motion.div
              key="system"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Push Notifications */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-emerald-400" />
                  <span>Notificaciones y Recordatorios</span>
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                  Recibe avisos directos en tu pantalla para beber agua, tomar creatina y registrar tus comidas diarias.
                </p>

                {pushError && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-[10px] text-red-400 font-semibold flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>{pushError}</span>
                  </div>
                )}

                {pushSupported === false ? (
                  <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-left space-y-1">
                    <span className="text-[10px] font-extrabold text-amber-400 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" />
                      <span>No Soportado</span>
                    </span>
                    <p className="text-[9px] text-gray-400 leading-relaxed">
                      Las notificaciones no son compatibles con este navegador o dispositivo.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1">
                    <div className="space-y-0.5 text-left">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">Avisos y Alertas</span>
                      <span className="text-[9px] text-gray-500 dark:text-gray-400">
                        {notificationPermission === "denied"
                          ? "Permisos bloqueados en el navegador."
                          : isSubscribed
                          ? "Suscripción activa y sincronizada."
                          : "Activa avisos directos en tu dispositivo."}
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
              </div>

              {/* Gemini AI Key */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-sm">
                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-emerald-400" />
                  <span>Credencial de IA (Gemini API)</span>
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                  Ingresa tu clave de API de Google AI Studio para análisis de comidas con fotos y planes sin límites.
                </p>
                
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      type="password"
                      icon={Key}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 font-mono"
                      size="md"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handlePasteApiKey}
                    className="shrink-0 h-[42px] px-3.5 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Pegar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Save Button (Always visible at bottom) */}
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={handleSave}
            leftIcon={Check}
            className="w-full font-black py-3.5 rounded-2xl text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
            size="lg"
          >
            Guardar Cambios y Recalcular Metas
          </Button>
        </div>

        {/* Global Account Logout Section (Always visible across all tabs) */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que deseas cerrar la sesión? Se reiniciará la sesión y volverás a la pantalla inicial.")) {
                onResetApp();
              }
            }}
            leftIcon={LogOut}
            className="w-full font-extrabold cursor-pointer py-3 rounded-2xl"
            size="md"
          >
            Cerrar Sesión
          </Button>

          {/* Credits footer (Independent from the logout button) */}
          <div className="text-center pt-2 text-[10px] text-gray-400 font-mono tracking-wider">
            <span>Trophia • by Richard Bouryssieres</span>
            <span className="mx-1.5">•</span>
            <span>v0.1.10</span>
          </div>
        </div>

      </div>
    </div>
  );
}
