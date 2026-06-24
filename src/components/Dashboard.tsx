import React from "react";
import { motion } from "motion/react";
import { 
  Flame, Utensils, Droplets, Trophy, ChevronRight, Plus, Calendar, AlertTriangle, Play, Trash, Check, HelpCircle, Sparkles, RefreshCw
} from "lucide-react";
import { UserProfile, LoggedMeal, WaterLog, MealType } from "../types";
import { generateRecommendationsByIA } from "../services/geminiService";

interface DashboardProps {
  profile: UserProfile;
  loggedMeals: LoggedMeal[];
  waterLogs: WaterLog[];
  onOpenFoodLogger: () => void;
  onAddWaterQuick: (amount: number) => void;
  onDeleteMeal: (id: string) => void;
  onNavigateToTab: (tab: "workouts" | "hydration") => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

export default function Dashboard({
  profile,
  loggedMeals,
  waterLogs,
  onOpenFoodLogger,
  onAddWaterQuick,
  onDeleteMeal,
  onNavigateToTab,
  onUpdateProfile
}: DashboardProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  // Targets
  const calTarget = profile.dailyCalorieTarget;
  const pTarget = profile.proteinTarget;
  const cTarget = profile.carbsTarget;
  const fTarget = profile.fatTarget;

  // Remaining
  const remainingCalories = Math.max(0, calTarget - totalCalories);
  const remainingProtein = Math.max(0, pTarget - totalProtein);
  const remainingCarbs = Math.max(0, cTarget - totalCarbs);
  const remainingFat = Math.max(0, fTarget - totalFat);

  // Status warnings
  const calExceeded = totalCalories > calTarget;
  const pExceeded = totalProtein > pTarget;
  const cExceeded = totalCarbs > cTarget;
  const fExceeded = totalFat > fTarget;

  // Percentage for Rings
  const calPercentage = Math.min(100, (totalCalories / calTarget) * 100);
  const pPercentage = Math.min(100, (totalProtein / pTarget) * 100);
  const cPercentage = Math.min(100, (totalCarbs / cTarget) * 100);
  const fPercentage = Math.min(100, (totalFat / fTarget) * 100);

  const getMealEmoji = (type: MealType) => {
    switch (type) {
      case "breakfast": return "🍳";
      case "lunch": return "🥩";
      case "snack": return "🍎";
      case "dinner": return "🥗";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0e15] text-gray-100 overflow-y-auto no-scrollbar pb-24">
      
      {/* Welcome Bar */}
      <div className="p-6 pb-2 border-b border-gray-800/40 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
            {profile.goal === "lose_weight" ? "🔥 Plan definición" : "💪 Plan volumen"}
          </span>
          <h2 className="text-xl font-black text-white tracking-tight">
            Hola, {profile.name}!
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1">
          {profile.bodyFat !== undefined && (
            <div className="bg-[#161824] border border-gray-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-400">
              Grasa: <span className="text-emerald-400">{profile.bodyFat}%</span>
            </div>
          )}
          <div className="bg-[#161824] border border-gray-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-gray-400">
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
                <span className="text-xs font-black text-white block">¿Tomaste tu dosis de Creatina hoy?</span>
                <p className="text-[10px] text-white/50">Mantén tus reservas saturadas para máxima potencia.</p>
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

        {/* 1. Calorie Balance Progress Card */}
        <div className="bg-[#161824] p-5 rounded-3xl border border-gray-800 flex items-center justify-between gap-4 shadow-xl relative overflow-hidden">
          
          {/* Circular progress ring */}
          <div className="relative w-32 h-32 flex-shrink-0 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full">
              <circle
                cx="64"
                cy="64"
                r="56"
                className="stroke-gray-800"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                className={calExceeded ? "stroke-rose-500" : "stroke-emerald-400"}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - calPercentage / 100)}
              />
            </svg>

            {/* Inner details */}
            <div className="text-center z-10">
              <span className="text-2xl font-black text-white tracking-tighter">
                {totalCalories}
              </span>
              <span className="block text-[9px] text-gray-500 font-bold uppercase tracking-wider">
                de {calTarget}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <span className="text-xs text-gray-400 font-semibold uppercase">Calorías Restantes</span>
              <div className="text-2xl font-black text-emerald-400 mt-0.5 tracking-tight">
                {calExceeded ? (
                  <span className="text-rose-400">Límite excedido</span>
                ) : (
                  `${remainingCalories} kcal`
                )}
              </div>
            </div>

            {calExceeded ? (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-400 bg-rose-500/10 py-1 px-2 rounded-lg border border-rose-500/20">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Excediste tu meta calórica hoy.</span>
              </div>
            ) : remainingCalories < 150 ? (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 py-1 px-2 rounded-lg border border-amber-500/20">
                <Check className="h-3.5 w-3.5 flex-shrink-0" />
                <span>¡Casi logras la meta calórica!</span>
              </div>
            ) : (
              <div className="text-[10px] text-gray-400">
                Mantente en déficit de 500 kcal para perder grasa eficientemente.
              </div>
            )}
          </div>
        </div>

        {/* 2. Macronutrients breakdown progress bars */}
        <div className="space-y-3.5">
          <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Distribución de Macronutrientes
          </span>

          <div className="grid grid-cols-3 gap-3">
            {/* Protein Card */}
            <div className="bg-[#12131d] p-3 rounded-2xl border border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1">
                <span>P (Muscular)</span>
                <span className={pExceeded ? "text-emerald-400" : "text-gray-500"}>
                  {totalProtein}g/{pTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300" 
                  style={{ width: `${pPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 block text-right font-semibold">
                {pExceeded ? "Meta lograda" : `${remainingProtein}g restantes`}
              </span>
            </div>

            {/* Carbs Card */}
            <div className="bg-[#12131d] p-3 rounded-2xl border border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1">
                <span>C (Fuerza)</span>
                <span className={cExceeded ? "text-rose-400" : "text-gray-500"}>
                  {totalCarbs}g/{cTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-300" 
                  style={{ width: `${cPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 block text-right font-semibold">
                {cExceeded ? "Excedido" : `${remainingCarbs}g restantes`}
              </span>
            </div>

            {/* Fat Card */}
            <div className="bg-[#12131d] p-3 rounded-2xl border border-gray-800/80 flex flex-col justify-between shadow-sm">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1">
                <span>G (Hormonal)</span>
                <span className={fExceeded ? "text-rose-400" : "text-gray-500"}>
                  {totalFat}g/{fTarget}g
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden mb-1.5">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-300" 
                  style={{ width: `${fPercentage}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-500 block text-right font-semibold">
                {fExceeded ? "Excedido" : `${remainingFat}g restantes`}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Water and Workouts Quick Nav shortcuts */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Water widget */}
          <div className="bg-[#161824] p-4 rounded-2xl border border-gray-800 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Agua</span>
                <span className="text-base font-extrabold text-blue-400 mt-0.5 block">{totalWater} ml</span>
              </div>
              <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                <Droplets className="h-4 w-4" />
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => onAddWaterQuick(250)}
                className="flex-1 py-1 bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-bold transition"
              >
                +250ml
              </button>
              <button
                onClick={() => onNavigateToTab("hydration")}
                className="p-1 bg-[#0f101a] text-gray-500 hover:text-white rounded-lg transition"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Workout summary */}
          <div className="bg-[#161824] p-4 rounded-2xl border border-gray-800 flex flex-col justify-between gap-3 shadow-md">
            <div className="flex justify-between items-start">
              <div>
                <span className="block text-[10px] text-gray-400 font-bold uppercase">Entrenamiento</span>
                <span className="text-xs font-bold text-white mt-1 block truncate">
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

        {/* Asesoría de IA (Gemini Coaching Hub) */}
        <div className="bg-[#161824] p-5 rounded-3xl border border-gray-800 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
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
              <div className="text-xs text-gray-300 leading-relaxed italic bg-[#0f101a]/60 border border-gray-800/40 p-3.5 rounded-2xl relative">
                <span className="text-emerald-400 font-black text-lg absolute -top-1.5 left-2">“</span>
                <p className="pl-3.5 pr-2">{profile.aiRecommendations.summary}</p>
                <span className="text-emerald-400 font-black text-lg absolute -bottom-3 right-3">”</span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                {/* Nutrición */}
                <div className="bg-[#0f101a] p-3 rounded-2xl border border-gray-800/60 space-y-1">
                  <span className="font-bold text-blue-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    🥑 Estrategia de Nutrición
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.nutritionAdvice}
                  </p>
                </div>

                {/* Entrenamiento */}
                <div className="bg-[#0f101a] p-3 rounded-2xl border border-gray-800/60 space-y-1">
                  <span className="font-bold text-orange-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    🏋️ Enfoque de Entrenamiento
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.trainingAdvice}
                  </p>
                </div>

                {/* Salud general */}
                <div className="bg-[#0f101a] p-3 rounded-2xl border border-gray-800/60 space-y-1">
                  <span className="font-bold text-purple-400 flex items-center gap-1 text-[11px] uppercase tracking-wide">
                    ❤️ Salud y Hábitos
                  </span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">
                    {profile.aiRecommendations.healthCheck}
                  </p>
                </div>
              </div>

              <div className="text-[9px] text-gray-500 font-medium text-right uppercase tracking-wider">
                Analizado el: {profile.aiRecommendations.lastUpdated}
              </div>
            </div>
          ) : (
            <div className="text-center py-5 space-y-4">
              <div className="inline-flex p-3.5 bg-emerald-500/10 rounded-full text-emerald-400 animate-pulse">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-xs mx-auto">
                <h4 className="text-xs font-bold text-white">¿Quieres tus recomendaciones de IA?</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Gemini analizará tu % de grasa ({profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "por calcular"}), IMC ({profile.bmi}), metas de macros y nivel para darte un plan estratégico optimizado.
                </p>
              </div>
              <button
                onClick={handleGenerateRecommendations}
                disabled={isGenerating}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
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
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Comidas de Hoy ({loggedMeals.length})
            </span>
            <button
              onClick={onOpenFoodLogger}
              className="text-emerald-400 hover:text-emerald-300 text-xs font-bold flex items-center gap-1 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir</span>
            </button>
          </div>

          {loggedMeals.length > 0 ? (
            <div className="divide-y divide-gray-800/40 border border-gray-800/60 rounded-2xl overflow-hidden bg-[#12131d]">
              {loggedMeals.map((meal) => (
                <div 
                  key={meal.id}
                  className="p-3.5 flex justify-between items-center bg-[#12131d] hover:bg-[#161824] transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{getMealEmoji(meal.type)}</span>
                    <div>
                      <span className="block text-xs font-extrabold text-white">{meal.name}</span>
                      <span className="block text-[9px] text-gray-500 font-medium">
                        P:{meal.protein}g · C:{meal.carbs}g · G:{meal.fat}g
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-black text-emerald-400">{meal.calories} kcal</span>
                    <button
                      onClick={() => onDeleteMeal(meal.id)}
                      className="p-1 bg-[#161824] group-hover:bg-rose-950/20 text-gray-500 group-hover:text-rose-400 rounded-lg transition"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl">
              No has registrado comidas todavía. Toca el botón flotante para registrar una comida o tomarle foto por IA.
            </div>
          )}
        </div>

      </div>

      {/* Floating Action Button for rapid comida add */}
      <div className="fixed bottom-20 right-6 z-40">
        <motion.button
          onClick={onOpenFoodLogger}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20"
        >
          <Utensils className="h-5 w-5" />
        </motion.button>
      </div>

    </div>
  );
}
