import React from "react";
import { motion } from "motion/react";
import { 
  Flame, Utensils, Droplets, Trophy, ChevronRight, Plus, Calendar, AlertTriangle, Play, Trash, Check, HelpCircle, Sparkles, RefreshCw, MapPin, BookOpen, Activity, X, Lock, Zap, Package
} from "lucide-react";
import { UserProfile, LoggedMeal, WaterLog, MealType, WorkoutSession } from "../types";
import { generateRecommendationsByIA, generatePreWorkoutSuggestionByIA, adjustSportCaloriesByIA } from "../services/geminiService";
import { getSuggestedMealTypeByTime, getPrePostWorkoutAdvice } from "../utils/fitnessUtils";
import scientificTips from "../data/scientificTips.json";

export const SPORTS_METS: Record<string, { label: string; met: number; emoji: string }> = {
  soccer: { label: "Fútbol", met: 8.0, emoji: "⚽" },
  boxing: { label: "Boxeo / Kickboxing", met: 7.8, emoji: "🥊" },
  gym: { label: "Gimnasio / Musculación", met: 6.0, emoji: "🏋️" },
  swimming: { label: "Natación", met: 7.0, emoji: "🏊" },
  running: { label: "Running / Carrera", met: 9.0, emoji: "🏃" },
  cycling: { label: "Ciclismo / Spinning", met: 7.5, emoji: "🚴" },
  tennis: { label: "Tenis / Pádel", met: 7.3, emoji: "🎾" },
  basketball: { label: "Baloncesto", met: 8.0, emoji: "🏀" },
  martial_arts: { label: "Artes Marciales", met: 10.0, emoji: "🥋" },
  crossfit: { label: "Crossfit / HIIT", met: 9.0, emoji: "🥵" },
  yoga: { label: "Yoga / Pilates", met: 3.0, emoji: "🧘" },
  walking: { label: "Caminata Rápida", met: 4.0, emoji: "🚶" },
  other: { label: "Otro deporte / actividad", met: 6.0, emoji: "⚡" }
};

interface DashboardProps {
  profile: UserProfile;
  loggedMeals: LoggedMeal[];
  waterLogs: WaterLog[];
  workoutHistory: WorkoutSession[];
  onOpenFoodLogger: (suggestedType?: MealType) => void;
  onOpenRecipeAssistant: () => void;
  onAddWaterQuick: (amount: number) => void;
  onDeleteMeal: (id: string) => void;
  onNavigateToTab: (tab: "workouts" | "hydration" | "settings" | "nutrition") => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onAddMeal?: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  onOpenCoach?: () => void;
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
  onUpdateProfile,
  onAddMeal,
  onOpenCoach
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

  // Sports activity logging states
  const [isSportModalOpen, setIsSportModalOpen] = React.useState(false);
  const [selectedSportKey, setSelectedSportKey] = React.useState("soccer");
  const [sportDuration, setSportDuration] = React.useState<number | "">(45);
  const [customSportNameInput, setCustomSportNameInput] = React.useState("");
  const [sportDescription, setSportDescription] = React.useState("");
  const [isAdjustingSport, setIsAdjustingSport] = React.useState(false);
  const [iaAdjustedCalories, setIaAdjustedCalories] = React.useState<number | null>(null);
  const [iaAdjustedMet, setIaAdjustedMet] = React.useState<number | null>(null);
  const [iaAdjustedReason, setIaAdjustedReason] = React.useState<string | null>(null);

  // Pre-Workout state
  const [isPreWorkoutOpen, setIsPreWorkoutOpen] = React.useState(false);
  const [preWorkoutTime, setPreWorkoutTime] = React.useState<number>(60); // minutes
  const [preWorkoutIntensity, setPreWorkoutIntensity] = React.useState<"hypertrophy" | "cardio" | "recovery">("hypertrophy");
  const [preWorkoutFormat, setPreWorkoutFormat] = React.useState<"liquid" | "solid">("solid");
  const [preWorkoutGoal, setPreWorkoutGoal] = React.useState<"low_cal" | "high_protein" | "high_carb">("high_protein");
  const [preWorkoutAllergies, setPreWorkoutAllergies] = React.useState<string[]>(profile.allergies || []);
  const [preWorkoutExtraNotes, setPreWorkoutExtraNotes] = React.useState("");
  const [preWorkoutRestrictToPantry, setPreWorkoutRestrictToPantry] = React.useState(false);
  const [isGeneratingPreWorkout, setIsGeneratingPreWorkout] = React.useState(false);
  const [preWorkoutRecommendation, setPreWorkoutRecommendation] = React.useState<any | null>(null);
  const [preWorkoutError, setPreWorkoutError] = React.useState<string | null>(null);

  // Sync allergies if profile updates
  React.useEffect(() => {
    if (profile.allergies) {
      setPreWorkoutAllergies(profile.allergies);
    }
  }, [profile.allergies]);

  const handleGeneratePreWorkout = async () => {
    setIsGeneratingPreWorkout(true);
    setPreWorkoutError(null);
    setPreWorkoutRecommendation(null);
    try {
      const apiKey = profile.apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || "";
      const pantryIngredients = profile.pantry 
        ? profile.pantry.map(item => `${item.name} (${item.quantity})`)
        : [];

      const result = await generatePreWorkoutSuggestionByIA(
        apiKey,
        {
          timeRemainingMinutes: preWorkoutTime,
          trainingType: preWorkoutIntensity,
          formatPreference: preWorkoutFormat,
          nutritionalGoal: preWorkoutGoal,
          allergies: preWorkoutAllergies,
          availableIngredients: pantryIngredients,
          restrictToPantryOnly: preWorkoutRestrictToPantry,
          extraNotes: preWorkoutExtraNotes,
          dietType: profile.dietType || "standard",
          remainingCalories: profile.dailyCalorieTarget - totalCalories
        }
      );
      setPreWorkoutRecommendation(result);
    } catch (err: any) {
      console.error(err);
      setPreWorkoutError(err.message || "Error al generar la recomendación pre-entrenamiento.");
    } finally {
      setIsGeneratingPreWorkout(false);
    }
  };

  const handleAdjustSportWithIA = async () => {
    if (!sportDescription.trim()) return;
    setIsAdjustingSport(true);
    try {
      const apiKey = profile.apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || "";
      const sportInfo = SPORTS_METS[selectedSportKey];
      const label = selectedSportKey === "other" && customSportNameInput.trim() !== ""
        ? customSportNameInput.trim()
        : sportInfo.label;
      const result = await adjustSportCaloriesByIA(
        apiKey,
        label,
        sportInfo.met,
        Number(sportDuration) || 45,
        profile.weight,
        sportDescription
      );
      setIaAdjustedCalories(result.caloriesBurned);
      setIaAdjustedMet(result.adjustedMet);
      setIaAdjustedReason(result.reason);
    } catch (err) {
      console.error("Failed to adjust sport with IA", err);
    } finally {
      setIsAdjustingSport(false);
    }
  };

  const handleLogSport = () => {
    const duration = Number(sportDuration);
    if (!duration || duration <= 0) return;

    const sportInfo = SPORTS_METS[selectedSportKey];
    const name = selectedSportKey === "other" && customSportNameInput.trim() !== ""
      ? customSportNameInput.trim()
      : sportInfo.label;

    const caloriesBurned = iaAdjustedCalories !== null 
      ? iaAdjustedCalories 
      : Math.round(sportInfo.met * 0.0175 * profile.weight * duration);

    const newSportLog = {
      id: Math.random().toString(36).substring(2, 9),
      name: iaAdjustedMet !== null ? `${name} (Ajustado IA)` : name,
      durationMinutes: duration,
      caloriesBurned,
      date: todayStr
    };

    const currentSports = profile.loggedSportsToday || [];
    onUpdateProfile({
      ...profile,
      loggedSportsToday: [...currentSports, newSportLog]
    });

    // Reset states and close
    setIsSportModalOpen(false);
    setSportDuration(45);
    setCustomSportNameInput("");
    setSportDescription("");
    setIaAdjustedCalories(null);
    setIaAdjustedMet(null);
    setIaAdjustedReason(null);
    setSelectedSportKey("soccer");
  };

  const handleDeleteSport = (id: string) => {
    const currentSports = profile.loggedSportsToday || [];
    onUpdateProfile({
      ...profile,
      loggedSportsToday: currentSports.filter(s => s.id !== id)
    });
  };

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

  // Calculate calories burned from logged sports today
  const loggedSportsToday = profile.loggedSportsToday || [];
  const todaySports = loggedSportsToday.filter(s => s.date === todayStr);
  const sportsCaloriesBurned = todaySports.reduce((sum, sport) => sum + sport.caloriesBurned, 0);

  const totalBurnedCalories = routeCaloriesBurned + workoutCaloriesBurned + sportsCaloriesBurned;

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

  // Undereating warning when it is late (after 20:00) and calories are below the target range
  const isLate = new Date().getHours() >= 20;
  const isUndereatingLate = isLate && totalCalories < lowerOptBound;

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
              {isUndereatingLate ? (
                <span className="text-[9px] font-black text-rose-500 dark:text-rose-450 bg-rose-550/15 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 animate-pulse">
                  ⚠️ DÉFICIT EXCESIVO
                </span>
              ) : inOptimalRange ? (
                <span className="text-[9px] font-black text-emerald-500 dark:text-emerald-450 bg-emerald-550/10 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm animate-pulse">
                  🎯 RANGO ÓPTIMO
                </span>
              ) : calExceeded ? (
                <span className="text-[9px] font-black text-rose-500 dark:text-rose-455 bg-rose-550/10 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
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
                  isUndereatingLate
                    ? "bg-gradient-to-r from-rose-500 to-rose-400"
                    : inOptimalRange 
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
              <span className="text-[8px] text-gray-400 dark:text-gray-555 block uppercase tracking-wider mb-0.5">Objetivo Base</span>
              <span className="text-gray-700 dark:text-gray-300 font-mono text-[11px]">{calTarget}</span>
            </div>
            <div className="bg-gray-50/60 dark:bg-[#0f101a]/30 p-2 rounded-xl border border-gray-150/40 dark:border-gray-800/20 text-center">
              <span className="text-[8px] text-gray-400 dark:text-gray-555 block uppercase tracking-wider mb-0.5">Extra Quemado</span>
              <span className="text-orange-500 font-mono text-[11px]">+{totalBurnedCalories}</span>
            </div>
            <div className="bg-gray-50/60 dark:bg-[#0f101a]/30 p-2 rounded-xl border border-gray-150/40 dark:border-gray-800/20 text-center">
              <span className="text-[8px] text-gray-400 dark:text-gray-555 block uppercase tracking-wider mb-0.5">Meta Ajustada</span>
              <span className="text-emerald-400 font-mono text-[11px]">{Math.round(adjustedCalTarget)}</span>
            </div>
          </div>

          {/* Context Feedback */}
          {isUndereatingLate ? (
            <div className="flex items-start gap-2 text-[10.5px] text-rose-450 dark:text-rose-400 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/15 leading-relaxed text-left">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5 animate-bounce" />
              <div>
                <span className="font-extrabold block">Alerta de Ingesta Insuficiente</span>
                <p className="text-[10px] text-rose-400/80">Es tarde y tu ingesta calórica está muy por debajo de tu rango mínimo recomendado. Comer muy por debajo de tu rango óptimo ralentiza el metabolismo y destruye masa muscular. Intenta hacer una colación o cena nutritiva antes de dormir.</p>
              </div>
            </div>
          ) : calExceeded ? (
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
            <div className="text-[10.5px] text-gray-550 dark:text-gray-400 leading-relaxed text-center italic">
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

        {/* Última Comida Widget */}
        {loggedMeals.length > 0 && (() => {
          const lastMeal = loggedMeals[0]; // Already sorted desc
          const mealTime = new Date(lastMeal.timestamp);
          const now = new Date();
          const diffMs = now.getTime() - mealTime.getTime();
          const diffHrs = Math.floor(diffMs / 3600000);
          const diffMins = Math.floor((diffMs % 3600000) / 60000);
          const timeAgo = diffHrs > 0 ? `hace ${diffHrs}h ${diffMins}m` : `hace ${diffMins}m`;
          return (
            <div className="bg-white dark:bg-[#161824] p-4 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="h-3.5 w-3.5 text-emerald-400" />
                  Última Comida
                </span>
                <button
                  onClick={() => onNavigateToTab("nutrition" as any)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none transition"
                >
                  Ver todo
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{getMealEmoji(lastMeal.type)}</span>
                  <div>
                    <span className="block text-xs font-extrabold text-gray-900 dark:text-white">{lastMeal.name}</span>
                    <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                      P:{Number(lastMeal.protein).toFixed(1).replace(/\.0$/, "")}g · C:{Number(lastMeal.carbs).toFixed(1).replace(/\.0$/, "")}g · G:{Number(lastMeal.fat).toFixed(1).replace(/\.0$/, "")}g
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-black text-emerald-400">{lastMeal.calories} kcal</span>
                  <span className="block text-[9px] text-gray-400 dark:text-gray-500">{timeAgo}</span>
                </div>
              </div>
              {loggedMeals.length > 1 && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500">
                    Hoy: {loggedMeals.length} comidas · {loggedMeals.reduce((s, m) => s + m.calories, 0)} kcal totales
                  </span>
                </div>
              )}
            </div>
          );
        })()}

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

          {/* Workout summary - Locked */}
          <div className="bg-white dark:bg-[#161824] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col justify-between gap-3 shadow-md opacity-60 relative">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase">Entrenamiento</span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block truncate">
                  {profile.level === "beginner" ? "Principiante" : profile.level === "intermediate" ? "Intermedio" : "Avanzado"}
                </span>
              </div>
              <span className="text-[7.5px] font-black text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Lock className="h-2 w-2" /> Próximamente
              </span>
            </div>

            <div
              className="w-full py-1.5 bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
            >
              <span>Ver Rutinas</span>
            </div>
          </div>

        </div>

        {/* Combustible Pre-Entrenamiento Widget */}
        <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl p-5 space-y-3.5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500">
              <Zap className="h-5 w-5 fill-amber-500/10" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Combustible Inteligente</span>
              <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">Comida Pre-Entreno IA</h3>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
            La IA analiza la hora, tu meta de macros y tus ingredientes disponibles para recomendarte el combustible perfecto según el tiempo restante para entrenar.
          </p>
          <button
            onClick={() => setIsPreWorkoutOpen(true)}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer border-none shadow-md"
          >
            <Sparkles className="h-3.5 w-3.5 fill-white" />
            Planificar Comida Pre-Entreno
          </button>
        </div>

        <div className="bg-white dark:bg-[#161824] p-5 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md">
          <div className="flex justify-between items-center">
            <span className="block text-xs font-semibold text-gray-555 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-orange-500 animate-pulse" />
              <span>Deportes y Actividades de Hoy</span>
            </span>
            <button
              onClick={() => setIsSportModalOpen(true)}
              className="text-[10px] text-orange-400 hover:text-orange-350 font-bold transition bg-transparent border-none cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Deporte</span>
            </button>
          </div>

          {todaySports.length === 0 ? (
            <div className="text-center py-5 px-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-transparent">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                ¿Entrenaste fútbol, boxeo u otro deporte hoy?
              </p>
              <button
                onClick={() => setIsSportModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-[10px] text-orange-450 hover:text-orange-400 font-bold"
              >
                <span>Registrar actividad deportiva</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-150 dark:divide-gray-800/40 border border-gray-200 dark:border-gray-800/60 rounded-2xl overflow-hidden bg-gray-50/20 dark:bg-transparent">
              {todaySports.map((sport) => (
                <div 
                  key={sport.id}
                  className="p-3.5 flex justify-between items-center bg-white dark:bg-[#12131d]/20 hover:bg-gray-50 dark:hover:bg-[#161824]/40 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">
                      {Object.values(SPORTS_METS).find(s => s.label === sport.name || sport.name.includes(s.label))?.emoji || "⚡"}
                    </span>
                    <div>
                      <span className="block text-xs font-extrabold text-gray-900 dark:text-white">{sport.name}</span>
                      <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                        Duración: {sport.durationMinutes} minutos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-orange-500">-{sport.caloriesBurned} kcal</span>
                    <button
                      onClick={() => handleDeleteSport(sport.id)}
                      className="p-1 bg-gray-50 dark:bg-[#161824] hover:bg-rose-950/20 text-gray-400 hover:text-rose-400 rounded-lg transition cursor-pointer border-none"
                      title="Eliminar registro"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
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

        {/* Banner Nutri-Coach Chat IA */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-5 space-y-3.5 shadow-md flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 fill-emerald-500/10" />
              Asesor Experto
            </div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white">Conversa con tu Nutri-Coach IA</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
              Resuelve dudas sobre suplementación, porciones o recetas en tiempo real.
            </p>
          </div>
          {onOpenCoach && (
            <button
              onClick={onOpenCoach}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shrink-0 transition cursor-pointer border-none shadow-md"
            >
              Chatear
            </button>
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

      {/* Log Sport Modal */}
      {isSportModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-[#0c0d14] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden text-gray-900 dark:text-white"
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <h3 className="text-sm font-black tracking-tight uppercase">Registrar Actividad</h3>
              </div>
              <button 
                onClick={() => setIsSportModalOpen(false)}
                className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-gray-400 hover:text-gray-655 dark:hover:text-white transition cursor-pointer border-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select Sport */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deporte / Actividad</label>
                <select
                  value={selectedSportKey}
                  onChange={(e) => setSelectedSportKey(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition cursor-pointer"
                >
                  {Object.entries(SPORTS_METS).map(([key, info]) => (
                    <option key={key} value={key} className="bg-white dark:bg-[#0c0d14]">
                      {info.emoji} {info.label} (MET: {info.met})
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Name (Only if "other" is selected) */}
              {selectedSportKey === "other" && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre del Deporte</label>
                  <input
                    type="text"
                    value={customSportNameInput}
                    onChange={(e) => setCustomSportNameInput(e.target.value)}
                    placeholder="Ej: Fútbol de salón, Pilates aéreo..."
                    className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition placeholder-gray-400"
                  />
                </div>
              )}

              {/* Duration Input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duración (minutos)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={sportDuration}
                    onChange={(e) => setSportDuration(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white font-mono focus:outline-none focus:border-orange-500/50 transition"
                  />
                </div>
              </div>

              {/* Detailed Description for IA */}
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Detalles de la sesión (Opcional - Para IA)
                </label>
                <textarea
                  value={sportDescription}
                  onChange={(e) => setSportDescription(e.target.value)}
                  placeholder="Ej: Sparring continuo de 6 rounds, o solo golpear saco suave sin cardio intenso..."
                  rows={2}
                  className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-orange-500/50 transition placeholder-gray-400 resize-none font-sans"
                />
                
                {sportDescription.trim().length > 4 && (
                  <button
                    type="button"
                    onClick={handleAdjustSportWithIA}
                    disabled={isAdjustingSport}
                    className="w-full py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-[10px] font-extrabold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border-none"
                  >
                    {isAdjustingSport ? (
                      <>
                        <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        Ajustando con IA...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3 fill-orange-500/10" />
                        Ajustar Calorías con IA
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Estimation Preview */}
              {Number(sportDuration) > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-555 dark:text-gray-400 font-bold uppercase">Calorías estimadas:</span>
                    <span className="text-xs font-black text-orange-500 font-mono">
                      -{iaAdjustedCalories !== null ? iaAdjustedCalories : Math.round(SPORTS_METS[selectedSportKey].met * 0.0175 * profile.weight * Number(sportDuration))} kcal
                    </span>
                  </div>
                  {iaAdjustedReason && (
                    <div className="text-[9px] text-orange-400 bg-orange-500/10 p-1.5 rounded-lg border border-orange-500/10">
                      ⚡ <b>Ajuste IA:</b> {iaAdjustedReason} (MET: {iaAdjustedMet})
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-black/20 flex gap-3">
              <button
                type="button"
                onClick={() => setIsSportModalOpen(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-800 text-gray-550 dark:text-gray-400 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogSport}
                disabled={!sportDuration}
                className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-200 dark:disabled:bg-white/5 disabled:text-gray-400 dark:disabled:text-white/30 text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-orange-500/10"
              >
                Guardar registro
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal Pre-Entrenamiento */}
      {isPreWorkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fadeIn">
          <div className="fixed inset-0" onClick={() => {
            setIsPreWorkoutOpen(false);
            setPreWorkoutRecommendation(null);
            setPreWorkoutExtraNotes("");
            setPreWorkoutRestrictToPantry(false);
          }} />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-md bg-[#0c0d14] border border-gray-800 rounded-t-[32px] md:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-black/25">
              <div className="flex items-center gap-2">
                <Zap className="h-4.5 w-4.5 text-amber-500 fill-amber-500/10" />
                <h2 className="text-sm font-black text-white uppercase tracking-tight">Combustible Pre-Entreno</h2>
              </div>
              <button
                onClick={() => {
                  setIsPreWorkoutOpen(false);
                  setPreWorkoutRecommendation(null);
                  setPreWorkoutExtraNotes("");
                  setPreWorkoutRestrictToPantry(false);
                }}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition cursor-pointer border-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="p-5 space-y-5 overflow-y-auto no-scrollbar flex-1 pb-8">
              {!preWorkoutRecommendation ? (
                <>
                  {/* 1. Tiempo hasta el entrenamiento */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      ¿En cuánto tiempo vas a entrenar?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { val: 30, label: "30 min" },
                        { val: 60, label: "1 hora" },
                        { val: 120, label: "2 horas" },
                        { val: 180, label: "3+ horas" }
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setPreWorkoutTime(item.val)}
                          className={`py-2 px-1 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer ${
                            preWorkoutTime === item.val
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                              : "bg-white/5 border-white/5 text-gray-400 hover:border-white/10"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Formato preferido */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Preferencia de Formato
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "solid", label: "🥞 Sólido", desc: "Pan, bowls, snacks" },
                        { id: "liquid", label: "🥤 Líquido", desc: "Batido de rápida absorción" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreWorkoutFormat(item.id as any)}
                          className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center cursor-pointer ${
                            preWorkoutFormat === item.id
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold"
                              : "bg-white/5 border-white/10 text-gray-405"
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{item.label}</span>
                          <span className="text-[8px] opacity-60 leading-tight mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Tipo de entrenamiento */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Tipo de entrenamiento
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "hypertrophy", label: "🏋️ Pesas / Fuerza" },
                        { id: "cardio", label: "🏃 Cardio / HIIT" },
                        { id: "recovery", label: "🧘 Movilidad / Suave" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreWorkoutIntensity(item.id as any)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col justify-center items-center h-[52px] cursor-pointer ${
                            preWorkoutIntensity === item.id
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold"
                              : "bg-white/5 border-white/10 text-gray-400 text-xs"
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-tight text-center">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Meta de macronutrientes */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Enfoque Nutricional
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "low_cal", label: "🥗 Bajo Calo" },
                        { id: "high_protein", label: "💪 Proteico" },
                        { id: "high_carb", label: "⚡ Enérgico" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPreWorkoutGoal(item.id as any)}
                          className={`p-2 rounded-xl border text-center transition flex flex-col justify-center items-center h-[46px] cursor-pointer ${
                            preWorkoutGoal === item.id
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold"
                              : "bg-white/5 border-white/10 text-gray-405 text-xs"
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 5. Mi Despensa (Ingredientes disponibles) */}
                  <div className="space-y-3 border-t border-gray-800 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Package className="h-3.5 w-3.5 text-amber-500" />
                        Ingredientes en Despensa ({profile.pantry?.length || 0})
                      </label>
                      <button
                        onClick={() => {
                          setIsPreWorkoutOpen(false);
                          onNavigateToTab("nutrition");
                        }}
                        className="text-[9px] text-amber-500 hover:underline font-bold bg-transparent border-none cursor-pointer"
                      >
                        Gestionar Despensa →
                      </button>
                    </div>

                    {profile.pantry && profile.pantry.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar p-1">
                        {profile.pantry.map((item) => (
                          <span
                            key={item.id}
                            className="py-1 px-2.5 rounded-full bg-white/5 border border-white/5 text-[9px] text-gray-300 font-bold"
                          >
                            {item.category === "protein" ? "💪" : item.category === "carb" ? "⚡" : item.category === "fat" ? "🥑" : item.category === "supplement" ? "🥤" : "✨"} {item.name} ({item.quantity})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-gray-800 rounded-xl bg-white/[0.01] text-center">
                        <p className="text-[10px] text-gray-500">
                          No tienes ingredientes guardados. Puedes agregar huevos, avena, plátano, etc. en la sección Alimentación &gt; Mi Despensa.
                        </p>
                      </div>
                    )}

                    {profile.pantry && profile.pantry.length > 0 && (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <div className="space-y-0.5">
                          <span className="block text-[10px] font-bold text-white">Restringir a mi despensa</span>
                          <span className="block text-[8.5px] text-gray-450 leading-none">Generar comida estrictamente con lo que tienes</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={preWorkoutRestrictToPantry}
                          onChange={(e) => setPreWorkoutRestrictToPantry(e.target.checked)}
                          className="w-4 h-4 text-amber-500 bg-black/40 border-gray-800 rounded focus:ring-0 cursor-pointer accent-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* 6. Preferencias / Notas adicionales */}
                  <div className="space-y-2 border-t border-gray-800 pt-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      ¿Tienes alguna otra preferencia o detalle? (Opcional)
                    </label>
                    <input
                      type="text"
                      value={preWorkoutExtraNotes}
                      onChange={(e) => setPreWorkoutExtraNotes(e.target.value)}
                      placeholder="Ej: Quiero algo con chocolate, sin cocinar, etc..."
                      className="w-full p-2.5 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-650 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  {/* Restricciones activas de tu perfil */}
                  {profile.allergies && profile.allergies.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
                      <span className="text-[9px] text-red-400 font-bold uppercase">Filtros activos de perfil:</span>
                      <div className="flex gap-1">
                        {profile.allergies.map(a => (
                          <span key={a} className="text-[8px] font-black uppercase bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">
                            {a === "lactose" ? "🥛 Sin lactosa" : a === "gluten" ? "🌾 Sin gluten" : a === "nuts" ? "🥜 Sin nueces" : a === "seafood" ? "🍤 Sin mariscos" : "🫘 Sin soya"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {preWorkoutError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-medium font-sans">
                      ⚠️ {preWorkoutError}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleGeneratePreWorkout}
                    disabled={isGeneratingPreWorkout}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-800 disabled:text-gray-500 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/15 uppercase tracking-wide flex items-center justify-center gap-1.5 border-none font-sans"
                  >
                    {isGeneratingPreWorkout ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analizando macros e ingredientes...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 fill-white/10" />
                        Generar Recomendación IA
                      </>
                    )}
                  </button>
                </>
              ) : (
                /* IA suggestion response screen */
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-gradient-to-br from-amber-500/10 to-transparent p-4 rounded-2xl border border-amber-500/25 space-y-3.5">
                    <div>
                      <span className="text-[8px] bg-amber-500/20 text-amber-400 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded">
                        Combustible {preWorkoutRecommendation.format} sugerido
                      </span>
                      <h4 className="text-sm font-black text-white mt-1.5 leading-snug">
                        {preWorkoutRecommendation.mealName}
                      </h4>
                      <p className="text-[9.5px] text-gray-400 mt-0.5 font-medium">
                        Porción: {preWorkoutRecommendation.servingSize}
                      </p>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 pt-2.5 border-t border-white/5">
                      <div className="bg-white/5 py-1.5 rounded-lg border border-white/5 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Kcal</span>
                        <span className="text-xs font-extrabold text-white font-mono">{preWorkoutRecommendation.calories}</span>
                      </div>
                      <div className="bg-white/5 py-1.5 rounded-lg border border-white/5 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Prot</span>
                        <span className="text-xs font-extrabold text-white font-mono">{preWorkoutRecommendation.protein}g</span>
                      </div>
                      <div className="bg-white/5 py-1.5 rounded-lg border border-white/5 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Carbs</span>
                        <span className="text-xs font-extrabold text-white font-mono">{preWorkoutRecommendation.carbs}g</span>
                      </div>
                      <div className="bg-white/5 py-1.5 rounded-lg border border-white/5 text-center">
                        <span className="block text-[8px] text-gray-500 uppercase font-bold">Grasa</span>
                        <span className="text-xs font-extrabold text-white font-mono">{preWorkoutRecommendation.fat}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Ingredientes necesarios</span>
                    <ul className="text-[11px] text-gray-300 space-y-1 pl-4 list-disc font-medium leading-normal">
                      {preWorkoutRecommendation.ingredientsUsed.map((ing: string, idx: number) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Preparación rápida</span>
                    <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                      {preWorkoutRecommendation.instructions}
                    </p>
                  </div>

                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 space-y-1">
                    <span className="block text-[8.5px] text-amber-500 font-bold uppercase tracking-wider">Justificación Científica</span>
                    <p className="text-[10px] text-gray-400 leading-normal font-medium">
                      {preWorkoutRecommendation.scientificReason}
                    </p>
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      onClick={() => {
                        setPreWorkoutRecommendation(null);
                        setPreWorkoutExtraNotes("");
                        setPreWorkoutRestrictToPantry(false);
                      }}
                      className="flex-1 py-2 border border-gray-800 text-gray-400 hover:text-white text-xs font-bold rounded-xl hover:bg-white/5 transition cursor-pointer bg-transparent"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={() => {
                        if (onAddMeal && preWorkoutRecommendation) {
                          onAddMeal({
                            name: `Pre-Entreno: ${preWorkoutRecommendation.mealName}`,
                            calories: Number(preWorkoutRecommendation.calories),
                            protein: Number(preWorkoutRecommendation.protein),
                            carbs: Number(preWorkoutRecommendation.carbs),
                            fat: Number(preWorkoutRecommendation.fat),
                            type: "snack",
                            servingSize: preWorkoutRecommendation.servingSize
                          });
                          setIsPreWorkoutOpen(false);
                          setPreWorkoutRecommendation(null);
                          setPreWorkoutExtraNotes("");
                          setPreWorkoutRestrictToPantry(false);
                        }
                      }}
                      disabled={!onAddMeal}
                      className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition cursor-pointer border-none"
                    >
                      Registrar en Diario
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
