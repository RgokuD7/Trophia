import React from "react";
import { motion } from "motion/react";
import { 
  Flame, Utensils, Droplets, Trophy, ChevronRight, Plus, Calendar, AlertTriangle, Play, Trash, Check, HelpCircle, Sparkles, RefreshCw, MapPin, BookOpen
} from "lucide-react";
import { UserProfile, LoggedMeal, WaterLog, MealType, WorkoutSession } from "../types";
import { generateRecommendationsByIA } from "../services/geminiService";
import { getSuggestedMealTypeByTime, getPrePostWorkoutAdvice } from "../utils/fitnessUtils";
import scientificTips from "../data/scientificTips.json";

interface DashboardProps {
  profile: UserProfile;
  loggedMeals: LoggedMeal[];
  waterLogs: WaterLog[];
  workoutHistory: WorkoutSession[];
  onOpenFoodLogger: (suggestedType?: MealType) => void;
  onOpenRecipeAssistant: () => void;
  onAddWaterQuick: (amount: number) => void;
  onDeleteMeal: (id: string) => void;
  onNavigateToTab: (tab: "workouts" | "hydration" | "settings") => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function Dashboard({
  profile,
  loggedMeals,
  waterLogs,
  workoutHistory,
  onOpenFoodLogger,
  onOpenRecipeAssistant,
  onAddWaterQuick,
  onDeleteMeal,
  onNavigateToTab,
  onUpdateProfile
}: DashboardProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [tipIndex, setTipIndex] = React.useState(() => Math.floor(Math.random() * scientificTips.length));
  
  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % scientificTips.length);
  };
  const suggestedMeal = getSuggestedMealTypeByTime();
  
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySession = workoutHistory.find(w => w.date === todayStr);
  const isWorkoutCompletedToday = todaySession ? todaySession.completed : false;
  const diet = profile.dietType || "standard";
  const goal = profile.goal;
  const prePostAdvice = getPrePostWorkoutAdvice(diet, goal, isWorkoutCompletedToday);

  const [error, setError] = React.useState<string | null>(null);

  const handleToggleRoute = (routeId: string) => {
    const activeRoutes = profile.activeRoutesToday || [];
    const isAlreadyActive = activeRoutes.some(r => r.routeId === routeId && r.date === todayStr);
    
    let updatedActiveRoutes;
    if (isAlreadyActive) {
      updatedActiveRoutes = activeRoutes.filter(r => !(r.routeId === routeId && r.date === todayStr));
    } else {
      updatedActiveRoutes = [...activeRoutes, { routeId, date: todayStr }];
    }
    
    onUpdateProfile({
      ...profile,
      activeRoutesToday: updatedActiveRoutes
    });
  };

  const handleGenerateRecommendations = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const data = await generateRecommendationsByIA(profile.apiKey || "", profile);

      onUpdateProfile({
        ...profile,
        aiRecommendations: {
          ...data,
          lastUpdated: new Date().toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar con la IA.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Calculate daily progress sums
  const totalCalories = loggedMeals.reduce((acc, meal) => acc + meal.calories, 0);
  const totalProtein = loggedMeals.reduce((acc, meal) => acc + meal.protein, 0);
  const totalCarbs = loggedMeals.reduce((acc, meal) => acc + meal.carbs, 0);
  const totalFat = loggedMeals.reduce((acc, meal) => acc + meal.fat, 0);
  const totalWater = waterLogs.reduce((acc, log) => acc + log.amount, 0);

  // Calculate calories burned from active routes today
  const activeRoutesToday = profile.activeRoutesToday || [];
  const todayActiveRoutes = activeRoutesToday.filter(r => r.date === todayStr);
  const routeCaloriesBurned = todayActiveRoutes.reduce((sum, activeRoute) => {
    const routeObj = (profile.frequentRoutes || []).find(r => r.id === activeRoute.routeId);
    return sum + (routeObj ? routeObj.caloriesBurned : 0);
  }, 0);

  // If there's a workout completed today, let's also sum its calories!
  const workoutCaloriesBurned = todaySession && todaySession.completed
    ? todaySession.exercises.reduce((sum, ex) => {
        const completedSetsCount = ex.completedSets.filter(s => s.completed).length;
        return sum + (completedSetsCount * ex.caloriesBurnedPerSet);
      }, 0)
    : 0;

  const totalBurnedCalories = routeCaloriesBurned + workoutCaloriesBurned;

  // Targets
  const calTarget = profile.dailyCalorieTarget;
  const adjustedCalTarget = calTarget + totalBurnedCalories;
  const pTarget = profile.proteinTarget;
  const cTarget = profile.carbsTarget;
  const fTarget = profile.fatTarget;

  // Remaining
  const remainingCalories = Math.max(0, adjustedCalTarget - totalCalories);
  const remainingProtein = Math.max(0, pTarget - totalProtein);
  const remainingCarbs = Math.max(0, cTarget - totalCarbs);
  const remainingFat = Math.max(0, fTarget - totalFat);

  // Status warnings
  const calExceeded = totalCalories > adjustedCalTarget;
  const pExceeded = totalProtein > pTarget;
  const cExceeded = totalCarbs > cTarget;
  const fExceeded = totalFat > fTarget;

  // Percentage for Rings
  const calPercentage = adjustedCalTarget > 0 ? Math.min(100, (totalCalories / adjustedCalTarget) * 100) : 0;
  const pPercentage = pTarget > 0 ? Math.min(100, (totalProtein / pTarget) * 100) : 0;
  const cPercentage = cTarget > 0 ? Math.min(100, (totalCarbs / cTarget) * 100) : 0;
  const fPercentage = fTarget > 0 ? Math.min(100, (totalFat / fTarget) * 100) : 0;

  // Target Range (90% to 105% of adjusted daily calorie target)
  const lowerOptBound = Math.round(adjustedCalTarget * 0.90);
  const upperOptBound = Math.round(adjustedCalTarget * 1.05);
  const inOptimalRange = totalCalories >= lowerOptBound && totalCalories <= upperOptBound && totalCalories > 0;

  // Dynamic scale for the calorie progress bar to handle overflow gracefully
  const barMax = totalCalories > adjustedCalTarget * 1.1 
    ? Math.round(totalCalories * 1.05) 
    : Math.round(adjustedCalTarget * 1.1);

  // Proportions relative to the current barMax
  const targetPercent = barMax > 0 ? (adjustedCalTarget / barMax) * 100 : 0;
  const optMinPercent = barMax > 0 ? ((adjustedCalTarget * 0.90) / barMax) * 100 : 0;
  const optMaxPercent = barMax > 0 ? ((adjustedCalTarget * 1.05) / barMax) * 100 : 0;
  const progressPercent = barMax > 0 ? (totalCalories / barMax) * 100 : 0;

  const getMealEmoji = (type: MealType) => {
    switch (type) {
      case "breakfast": return "🍳";
      case "lunch": return "🥩";
      case "snack": return "🍎";
      case "dinner": return "🥗";
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-24">
      
      {/* Welcome Bar */}
      <div className="p-6 pb-2 border-b border-gray-200 dark:border-gray-800/40 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
            {profile.goal === "lose_weight" ? "🔥 Plan definición" : "💪 Plan volumen"}
          </span>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            Hola, {profile.name}!
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {profile.bodyFat !== undefined && (
            <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-400">
              Grasa: <span className="text-emerald-400">{profile.bodyFat}%</span>
            </div>
          )}
          <div className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-400">
            IMC: <span className="text-emerald-400">{profile.bmi}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">

        {/* Daily Creatine Reminder Card */}
        {profile.takesCreatine && profile.lastCreatineIntake !== new Date().toLocaleDateString("sv-SE") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                💪
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-gray-900 dark:text-white block">¿Tomaste tu dosis de Creatina hoy?</span>
                <p className="text-[10px] text-gray-650 dark:text-white/50 leading-normal">
                  Satura tus depósitos de fosfocreatina para acelerar la resíntesis de ATP y ganar fuerza.{" "}
                  <a
                    href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline inline"
                  >
                    Estudio ISSN ↗
                  </a>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const todayStr = new Date().toLocaleDateString("sv-SE");
                onUpdateProfile({
                  ...profile,
                  lastCreatineIntake: todayStr
                });
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition flex items-center gap-1 active:scale-[0.98] cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Sí, tomada</span>
            </button>
          </motion.div>
        )}

        {/* 1. Calorie Balance Progress Card (Dynamic Scale Calorie Bar) */}
        <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md dark:shadow-xl relative overflow-hidden">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-450 dark:text-gray-500 font-extrabold uppercase tracking-widest block leading-none">
                Consumo Calórico
              </span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                  {totalCalories}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">
                  / {Math.round(adjustedCalTarget)} kcal
                </span>
              </div>
            </div>

            {/* Badges / Ranges feedback */}
            <div>
              {inOptimalRange ? (
                <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-400 bg-emerald-550/10 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
                  🎯 RANGO ÓPTIMO
                </span>
              ) : calExceeded ? (
                <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 bg-rose-550/10 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                  ⚠️ EXCESO: +{Math.round(totalCalories - adjustedCalTarget)} KCAL
                </span>
              ) : (
                <span className="text-[9px] font-black text-blue-500 dark:text-blue-400 bg-blue-550/10 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/10">
                  RESTANTE: {remainingCalories} KCAL
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="space-y-2">
            <div className="relative h-3.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-150 dark:border-gray-800/40">
              
              {/* 1. Optimal range highlighted band (90% to 105%) */}
              <div 
                className="absolute top-0 bottom-0 bg-emerald-500/15 dark:bg-emerald-500/10 border-l border-r border-emerald-400/25 dark:border-emerald-500/15 z-10"
                style={{ left: `${optMinPercent}%`, width: `${optMaxPercent - optMinPercent}%` }}
              />

              {/* 2. Target Line Indicator (100% Meta) */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-gray-400 dark:bg-gray-600 z-20"
                style={{ left: `${targetPercent}%` }}
              />

              {/* 3. Base Progress Bar (Up to Meta or current progress) */}
              <div 
                className={`h-full transition-all duration-500 ${
                  inOptimalRange 
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400" 
                    : calExceeded
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-450" 
                      : "bg-gradient-to-r from-blue-500 to-blue-400"
                }`}
                style={{ width: `${Math.min(targetPercent, progressPercent)}%` }}
              />

              {/* 4. Overflow Red Bar (Only shown if over Target) */}
              {progressPercent > targetPercent && (
                <div 
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-500"
                  style={{ left: `${targetPercent}%`, width: `${progressPercent - targetPercent}%` }}
                />
              )}
            </div>

            {/* Scale Legends below progress bar */}
            <div className="flex justify-between items-center text-[9px] text-gray-400 dark:text-gray-500 font-bold px-0.5">
              <span>0 kcal</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-black">Rango Objetivo: {lowerOptBound} - {upperOptBound} kcal</span>
              <span>Max: {barMax} kcal</span>
            </div>
          </div>

          {/* Desglose de Calorías */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-gray-150 dark:border-gray-800/60 text-[10px] font-bold">
            <div className="bg-gray-50/60 dark:bg-[#0f101a]/30 p-2 rounded-xl border border-gray-150/40 dark:border-gray-800/20 text-center">
              <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase tracking-wider mb-0.5">Objetivo Base</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">{calTarget}</span>
            </div>
            <div className="bg-gray-50/60 dark:bg-[#0f101a]/30 p-2 rounded-xl border border-gray-150/40 dark:border-gray-800/20 text-center">
              <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase tracking-wider mb-0.5">Extra Quemado</span>
              <span className="text-orange-500 font-mono text-[11px]">+{totalBurnedCalories}</span>
            </div>
            <div className="bg-gray-50/60 dark:bg-[#0f101a]/30 p-2 rounded-xl border border-gray-150/40 dark:border-gray-800/20 text-center">
              <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase tracking-wider mb-0.5">Meta Ajustada</span>
              <span className="text-emerald-400 font-mono text-[11px]">{Math.round(adjustedCalTarget)}</span>
            </div>
          </div>

          {/* Context Feedback */}
          {calExceeded ? (
            <div className="flex items-start gap-2 text-[10.5px] text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/15 leading-relaxed text-left">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <div>
                <span className="font-extrabold block">Límite Superado</span>
                <p className="text-[10px] text-rose-400/80">Has consumido {Math.round(totalCalories - adjustedCalTarget)} kcal por encima de tu meta ajustada. Modera las porciones en tus siguientes comidas.</p>
              </div>
            </div>
          ) : inOptimalRange ? (
            <div className="flex items-start gap-2 text-[10.5px] text-emerald-400 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/15 leading-relaxed text-left">
              <Check className="h-4 w-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-extrabold block">¡En Rango Óptimo!</span>
                <p className="text-[10px] text-emerald-400/85">Tu ingesta diaria se encuentra dentro de los márgenes fisiológicos ideales. ¡Mantén esa precisión!</p>
              </div>
            </div>
          ) : (
            <div className="text-[10.5px] text-gray-500 dark:text-gray-400 leading-relaxed text-center italic">
              "La consistencia a largo plazo supera a la perfección a corto plazo. Mantente en rango."
            </div>
          )}
        </div>

        {/* 2. Macronutrients breakdown progress bars */}
        <div className="space-y-3.5">
          <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Distribución de Macronutrientes
          </span>
          <div className="grid grid-cols-3 gap-3">
            {/* Protein Card */}
            <div className="bg-white dark:bg-[#12131d] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex flex-col mb-1 text-[10px]">
                <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Proteína</span>
                <span className={`font-mono text-[9.5px] font-bold mt-0.5 ${pExceeded ? "text-emerald-400" : "text-gray-450 dark:text-gray-500"}`}>
                  {totalProtein}g / {pTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden mb-1.5 mt-1">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                  style={{ width: `${pPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-550 block text-right font-semibold">
                {pExceeded ? "Logrado" : `${remainingProtein}g faltan`}
              </span>
            </div>

            {/* Carbs Card */}
            <div className="bg-white dark:bg-[#12131d] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex flex-col mb-1 text-[10px]">
                <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Carbohidratos</span>
                <span className={`font-mono text-[9.5px] font-bold mt-0.5 ${cExceeded ? "text-rose-400" : "text-gray-450 dark:text-gray-500"}`}>
                  {totalCarbs}g / {cTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden mb-1.5 mt-1">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-300" 
                  style={{ width: `${cPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-550 block text-right font-semibold">
                {cExceeded ? "Excedido" : `${remainingCarbs}g faltan`}
              </span>
            </div>

            {/* Fat Card */}
            <div className="bg-white dark:bg-[#12131d] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex flex-col mb-1 text-[10px]">
                <span className="font-black text-gray-900 dark:text-white uppercase tracking-wider truncate">Grasas</span>
                <span className={`font-mono text-[9.5px] font-bold mt-0.5 ${fExceeded ? "text-rose-400" : "text-gray-450 dark:text-gray-500"}`}>
                  {totalFat}g / {fTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden mb-1.5 mt-1">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-300" 
                  style={{ width: `${fPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400 dark:text-gray-555 block text-right font-semibold">
                {fExceeded ? "Excedido" : `${remainingFat}g faltan`}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Water and Workouts Quick Nav shortcuts */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Water widget */}
          <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Agua</span>
                <span className="text-base font-extrabold text-blue-500 mt-0.5 block">{totalWater} ml</span>
              </div>
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <Droplets className="h-4 w-4" />
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => onAddWaterQuick(250)}
                className="flex-1 py-1 bg-blue-500/15 hover:bg-blue-500 text-blue-500 hover:text-white rounded-lg text-[10px] font-bold transition"
              >
                +250ml
              </button>
              <button
                onClick={() => onNavigateToTab("hydration")}
                className="p-1 bg-gray-50 dark:bg-[#0f101a] text-gray-500 hover:text-gray-700 dark:hover:text-white rounded-lg transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Workout summary */}
          <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Entrenamiento</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block truncate">
                  {profile.level === "beginner" ? "Principiante" : profile.level === "intermediate" ? "Intermedio" : "Avanzado"}
                </span>
              </div>
              <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Play className="h-4 w-4" />
              </div>
            </div>

            <button
              onClick={() => onNavigateToTab("workouts")}
              className="w-full py-1 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1"
            >
              <span>Ver Rutinas</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

        </div>

        {/* Rutas Activas Hoy */}
        <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md">
          <div className="flex justify-between items-center">
            <span className="block text-xs font-semibold text-gray-555 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>Rutas Activas Hoy</span>
            </span>
            <button
              onClick={() => onNavigateToTab("settings")}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold transition bg-transparent border-none cursor-pointer"
            >
              Gestionar Rutas
            </button>
          </div>

          {!profile.frequentRoutes || profile.frequentRoutes.length === 0 ? (
            <div className="text-center py-4 px-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-transparent">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                ¿Tienes trayectos diarios o entrenamientos de cardio al aire libre?
              </p>
              <button
                onClick={() => onNavigateToTab("settings")}
                className="mt-2.5 inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
              >
                <span>Configurar rutas habituales</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-normal">
                Selecciona las rutas que has recorrido hoy para sumar automáticamente su gasto base:
              </p>
              <div className="grid grid-cols-1 gap-2">
                {profile.frequentRoutes.map((route) => {
                  const isActive = (profile.activeRoutesToday || []).some(
                    (r) => r.routeId === route.id && r.date === todayStr
                  );
                  return (
                    <button
                      key={route.id}
                      onClick={() => handleToggleRoute(route.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500/30 text-gray-900 dark:text-white"
                          : "bg-gray-50 dark:bg-[#0f101a] border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-450 hover:border-gray-300 dark:hover:border-gray-700/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isActive
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-300 dark:border-gray-755"
                          }`}
                        >
                          {isActive && <Check className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <span className={`text-xs font-black block ${isActive ? "text-emerald-400" : "text-gray-900 dark:text-white"}`}>
                            {route.name}
                          </span>
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {route.activityType === "walking"
                              ? "🚶 Caminar"
                              : route.activityType === "running"
                              ? "🏃 Correr"
                              : "🚴 Ciclismo"}{" "}
                            · {route.distanceKm} km
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-black ${isActive ? "text-emerald-400" : "text-gray-500 dark:text-gray-400"}`}>
                        +{route.caloriesBurned} kcal
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pre/Post Workout Nutritional Advice Widget */}
        <div className="bg-white dark:bg-[#161824] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3 shadow-md">
          <div className="flex justify-between items-center">
            <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
              Nutrición Deportiva ({diet === "standard" ? "Estándar" : diet.toUpperCase()})
            </span>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              isWorkoutCompletedToday 
                ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}>
              {isWorkoutCompletedToday ? "Post-Entreno" : "Pre-Entreno"}
            </span>
          </div>

          <div className="space-y-1.5 text-left">
            <h4 className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{prePostAdvice.title}</span>
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {prePostAdvice.recommendation}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] text-emerald-500 dark:text-emerald-450 font-bold bg-emerald-500/5 dark:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/10">
            <span className="font-extrabold uppercase">Enfoque:</span>
            <span>{prePostAdvice.macrosFocus}</span>
          </div>
        </div>

        {/* Sabías que... (Evidencia Científica) */}
        <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3.5 shadow-md relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="block text-xs font-semibold text-gray-555 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span>Evidencia Científica</span>
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {scientificTips[tipIndex].category}
            </span>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">
              {scientificTips[tipIndex].title}
            </h4>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
              {scientificTips[tipIndex].text}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800/40 flex justify-between items-center">
            <div className="min-w-0 flex-1 pr-2">
              <span className="block text-[8px] text-gray-400 dark:text-gray-500 uppercase font-bold">Fuente</span>
              <a
                href={scientificTips[tipIndex].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium truncate block hover:underline"
                title="Ver artículo original en PubMed/PMC"
              >
                {scientificTips[tipIndex].source}
              </a>
            </div>
            
            <button
              onClick={handleNextTip}
              className="py-1 px-3 bg-gray-50 hover:bg-gray-100 dark:bg-[#0f101a] dark:hover:bg-[#12131d] border border-gray-200 dark:border-gray-800 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer flex-shrink-0"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Asesoría de IA (Gemini Coaching Hub) */}
        <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md dark:shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Coach de IA (Gemini)
              </span>
            </div>
            {profile.aiRecommendations && (
              <button
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
                <span>Actualizar</span>
              </button>
            )}
          </div>

          {error && (
            <div className="text-[11px] text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {profile.aiRecommendations ? (
            <div className="space-y-4">
              <div className="text-xs text-gray-750 dark:text-gray-300 leading-relaxed italic bg-gray-50/80 dark:bg-[#0f101a]/60 border border-gray-200 dark:border-gray-800/40 p-3.5 rounded-2xl relative">
                <span className="text-emerald-400 font-black text-lg absolute -top-1.5 left-2">“</span>
                <p className="pl-3.5 pr-2">{profile.aiRecommendations.summary}</p>
                <span className="text-emerald-400 font-black text-lg absolute -bottom-3 right-3">”</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                {/* Nutrición */}
                <div className="bg-gray-50 dark:bg-[#0f101a] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/60 space-y-1">
                  <span className="font-bold text-blue-500 dark:text-blue-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    🥑 Estrategia de Nutrición
                  </span>
                  <p className="text-gray-650 dark:text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.nutritionAdvice}
                  </p>
                </div>

                {/* Entrenamiento */}
                <div className="bg-gray-50 dark:bg-[#0f101a] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/60 space-y-1">
                  <span className="font-bold text-orange-500 dark:text-orange-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    🏋️ Enfoque de Entrenamiento
                  </span>
                  <p className="text-gray-650 dark:text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.trainingAdvice}
                  </p>
                </div>

                {/* Salud general */}
                <div className="bg-gray-50 dark:bg-[#0f101a] p-3 rounded-2xl border border-gray-200 dark:border-gray-800/60 space-y-1">
                  <span className="font-bold text-purple-500 dark:text-purple-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    ❤️ Salud y Hábitos
                  </span>
                  <p className="text-gray-650 dark:text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.healthCheck}
                  </p>
                </div>
              </div>

              <div className="text-[9px] text-gray-400 dark:text-gray-500 font-medium text-right uppercase tracking-wider">
                Analizado el: {profile.aiRecommendations.lastUpdated}
              </div>
            </div>
          ) : (
            <div className="text-center py-5 space-y-4">
              <div className="inline-flex p-3.5 bg-emerald-500/10 rounded-full text-emerald-400 animate-pulse">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">¿Quieres tus recomendaciones de IA?</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Gemini analizará tu % de grasa ({profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "por calcular"}), IMC ({profile.bmi}), metas de macros y nivel para darte un plan estratégico optimizado.
                </p>
              </div>
              <button
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Analizando perfil con Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Obtener Recomendaciones de IA</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 4. Logged meals list / history of today */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Comidas de Hoy ({loggedMeals.length})
            </span>
            <div className="flex gap-3">
              <button
                onClick={onOpenRecipeAssistant}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer bg-transparent border-none"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>Despensa IA</span>
              </button>
              <button
                onClick={() => onOpenFoodLogger(suggestedMeal.type)}
                className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1 transition cursor-pointer bg-transparent border-none"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Añadir {suggestedMeal.label}</span>
              </button>
            </div>
          </div>

          {loggedMeals.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800/40 border border-gray-200 dark:border-gray-800/60 rounded-2xl overflow-hidden bg-white dark:bg-[#12131d]">
              {loggedMeals.map((meal) => (
                <div 
                  key={meal.id}
                  className="p-3.5 flex justify-between items-center bg-white dark:bg-[#12131d] hover:bg-gray-50 dark:hover:bg-[#161824] transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{getMealEmoji(meal.type)}</span>
                    <div>
                      <span className="block text-xs font-extrabold text-gray-900 dark:text-white">{meal.name}</span>
                      <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                        P:{meal.protein}g · C:{meal.carbs}g · G:{meal.fat}g
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-emerald-400">{meal.calories} kcal</span>
                    <button
                      onClick={() => onDeleteMeal(meal.id)}
                      className="p-1 bg-gray-50 dark:bg-[#161824] group-hover:bg-rose-950/20 text-gray-500 group-hover:text-rose-450 dark:group-hover:text-rose-400 rounded-lg transition cursor-pointer"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-gray-400 dark:text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-transparent">
              No has registrado comidas todavía. Toca el botón flotante para registrar una comida o tomarle foto por IA.
            </div>
          )}
        </div>

      </div>

      {/* Floating Action Button for rapid comida add */}
      <div className="fixed bottom-20 right-6 z-40">
        <motion.button
          onClick={() => onOpenFoodLogger(suggestedMeal.type)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20 cursor-pointer"
          title={`Registrar ${suggestedMeal.label}`}
        >
          <Utensils className="h-5 w-5" />
        </motion.button>
      </div>

    </div>
  );
}
