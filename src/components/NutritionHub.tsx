import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, BookOpen, Star, Calendar, ShoppingCart, Lock, ArrowLeft, Trash2, Check, X, 
  ChefHat, Flame, Zap, ChevronLeft, ChevronRight, MessageSquare, Lightbulb, Sparkles, AlertCircle, Send, Utensils
} from "lucide-react";
import { UserProfile, LoggedMeal, MealType, CustomFood } from "../types";
import { getCustomFoods, addCustomFood, deleteCustomFood } from "../services/dbService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { getSmartFoodSuggestionsByIA, askNutriCoachIA } from "../services/geminiService";

interface NutritionHubProps {
  profile: UserProfile;
  userId: string;
  loggedMeals: LoggedMeal[];
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  onDeleteMeal: (id: string) => void;
  onOpenFoodLogger: (suggestedType?: MealType, isCustomOnly?: boolean) => void;
  onOpenRecipeAssistant: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  onOpenCoach: () => void;
  userCreationDateStr?: string;
}

const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const getMealEmoji = (type: MealType) => {
  switch (type) {
    case "breakfast": return "🍳";
    case "lunch": return "🥩";
    case "snack": return "🍎";
    case "dinner": return "🥗";
  }
};

const getMealLabel = (type: MealType) => {
  switch (type) {
    case "breakfast": return "Desayuno";
    case "lunch": return "Almuerzo";
    case "snack": return "Snack";
    case "dinner": return "Cena";
  }
};

// Get the week dates (Mon-Sun) containing the given date
function getWeekDates(referenceDate: Date): Date[] {
  const dates: Date[] = [];
  const d = new Date(referenceDate);
  const dayOfWeek = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(day);
  }
  return dates;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function NutritionHub({
  profile,
  userId,
  loggedMeals,
  onAddMeal,
  onDeleteMeal,
  onOpenFoodLogger,
  onOpenRecipeAssistant,
  onUpdateProfile,
  onOpenCoach,
  userCreationDateStr,
}: NutritionHubProps) {
  const today = new Date();
  const todayStr = toDateStr(today);
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekDates, setWeekDates] = useState(() => getWeekDates(today));
  const [activeSection, setActiveSection] = useState<"custom_foods" | "calorie_bank" | null>(null);
  
  // Custom foods state
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  // AI Suggestions state
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [foodSuggestions, setFoodSuggestions] = useState<any[]>([]);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);


  // Calorie bank state
  const [bankEventDate, setBankEventDate] = useState("");
  const [bankEventDesc, setBankEventDesc] = useState("");
  const [bankExtraKcal, setBankExtraKcal] = useState<number>(400);
  const [isBankSaving, setIsBankSaving] = useState(false);

  // Filter meals for selected date
  const selectedDayMeals = loggedMeals.filter(m => m.timestamp.startsWith(selectedDate));
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

  // Calorie progress
  const totalCal = selectedDayMeals.reduce((s, m) => s + m.calories, 0);
  const totalP = selectedDayMeals.reduce((s, m) => s + m.protein, 0);
  const totalC = selectedDayMeals.reduce((s, m) => s + m.carbs, 0);
  const totalF = selectedDayMeals.reduce((s, m) => s + m.fat, 0);
  
  // Check if calorie bank plan is active and adjust target
  const bankPlan = profile.calorieBankPlan;
  const bankAdjustment = (bankPlan?.isActive && isToday && selectedDate !== bankPlan.eventDate) ? bankPlan.dailyAdjustment : 0;
  const isBankEventDay = bankPlan?.isActive && selectedDate === bankPlan.eventDate;
  
  const baseCal = profile.dailyCalorieTarget || 2000;
  const adjustedCal = isBankEventDay ? baseCal + (bankPlan?.extraCaloriesTarget || 0) : baseCal - bankAdjustment;
  
  const calPercent = adjustedCal > 0 ? Math.min(100, (totalCal / adjustedCal) * 100) : 0;
  const pTarget = profile.proteinTarget || 140;
  const cTarget = profile.carbsTarget || 230;
  const fTarget = profile.fatTarget || 65;

  // Group meals by type
  const mealTypes: MealType[] = ["breakfast", "lunch", "snack", "dinner"];
  const mealsByType = mealTypes.map(type => ({
    type,
    meals: selectedDayMeals.filter(m => m.type === type),
  }));

  // Navigate weeks
  const goToPrevWeek = () => {
    const firstDay = new Date(weekDates[0]);
    firstDay.setDate(firstDay.getDate() - 7);
    setWeekDates(getWeekDates(firstDay));
  };
  const goToNextWeek = () => {
    const firstDay = new Date(weekDates[0]);
    firstDay.setDate(firstDay.getDate() + 7);
    const nextWeek = getWeekDates(firstDay);
    // Don't go beyond current week
    if (toDateStr(nextWeek[0]) > todayStr) return;
    setWeekDates(nextWeek);
  };

  useEffect(() => {
    if (activeSection === "custom_foods") loadCustomFoods();
  }, [activeSection]);

  useEffect(() => {
    const handleRefresh = () => {
      loadCustomFoods();
    };
    window.addEventListener("trophia_refresh_custom_foods", handleRefresh);
    return () => {
      window.removeEventListener("trophia_refresh_custom_foods", handleRefresh);
    };
  }, [userId]);

  const loadCustomFoods = async () => {
    setIsLoadingFoods(true);
    try {
      const foods = await getCustomFoods(userId);
      setCustomFoods(foods);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFoods(false);
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    try {
      await deleteCustomFood(userId, foodId);
      setCustomFoods(prev => prev.filter(f => f.id !== foodId));
    } catch (err) { console.error(err); }
  };

  const handleActivateBank = () => {
    if (!bankEventDate) return;
    setIsBankSaving(true);
    
    const eventD = new Date(bankEventDate + "T12:00:00");
    const todayD = new Date();
    const daysUntil = Math.max(1, Math.ceil((eventD.getTime() - todayD.getTime()) / 86400000));
    
    // Safety: max 300 kcal/day reduction, never below BMR*0.85
    const bmr = profile.sex === "male" 
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    const minDailyCal = Math.round(bmr * 0.85);
    const maxDailyReduction = Math.min(300, baseCal - minDailyCal);
    const dailyAdj = Math.min(maxDailyReduction, Math.round(bankExtraKcal / daysUntil));
    const actualExtra = dailyAdj * daysUntil;

    const plan = {
      eventDate: bankEventDate,
      eventDescription: bankEventDesc || undefined,
      extraCaloriesTarget: actualExtra,
      dailyAdjustment: dailyAdj,
      startDate: todayStr,
      isActive: true,
    };

    onUpdateProfile({ ...profile, calorieBankPlan: plan });
    setIsBankSaving(false);
    setActiveSection(null);
  };

  const handleDeactivateBank = () => {
    onUpdateProfile({ ...profile, calorieBankPlan: undefined });
  };

  const pRemaining = Math.max(0, pTarget - totalP);
  const cRemaining = Math.max(0, cTarget - totalC);
  const fRemaining = Math.max(0, fTarget - totalF);
  const kcalRemaining = Math.max(0, adjustedCal - totalCal);

  useEffect(() => {
    const key = `trophia_suggestion_${userId}_${selectedDate}_${Math.round(pRemaining)}_${Math.round(cRemaining)}_${Math.round(fRemaining)}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setFoodSuggestions(JSON.parse(cached));
        setSuggestionsError(null);
        return;
      } catch (err) {
        console.error("Failed to parse cached suggestions", err);
      }
    }
    setFoodSuggestions([]);
  }, [selectedDate, pRemaining, cRemaining, fRemaining, userId]);

  const handleGetSuggestions = async () => {
    const key = `trophia_suggestion_${userId}_${selectedDate}_${Math.round(pRemaining)}_${Math.round(cRemaining)}_${Math.round(fRemaining)}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setFoodSuggestions(JSON.parse(cached));
        setSuggestionsError(null);
        return;
      } catch (err) {
        console.error("Failed to parse cached suggestions", err);
      }
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const apiKey = profile.apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || "";
      const result = await getSmartFoodSuggestionsByIA(
        apiKey,
        pRemaining,
        cRemaining,
        fRemaining,
        kcalRemaining,
        profile.goal || "lose_weight"
      );
      setFoodSuggestions(result);
      localStorage.setItem(key, JSON.stringify(result));
    } catch (err: any) {
      console.error(err);
      setSuggestionsError(err.message || "No se pudieron obtener sugerencias.");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };
  const getWeeklyCompliance = () => {
    const compliance = [];
    let cumulativeBalance = 0;
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = toDateStr(d);
      
      let dayTarget = baseCal;
      if (bankPlan?.isActive) {
        if (ds === bankPlan.eventDate) {
          dayTarget = baseCal + (bankPlan.extraCaloriesTarget || 0);
        } else if (ds >= bankPlan.startDate && ds < bankPlan.eventDate) {
          dayTarget = baseCal - bankPlan.dailyAdjustment;
        }
      }
      
      const dayMeals = loggedMeals.filter(m => m.timestamp.startsWith(ds));
      const dayConsumed = dayMeals.reduce((s, m) => s + m.calories, 0);
      const diff = dayTarget - dayConsumed;
      
      if (ds <= todayStr) {
        cumulativeBalance += diff;
      }
      
      let status: "pending" | "success" | "warning" = "pending";
      if (dayMeals.length > 0) {
        if (dayConsumed <= dayTarget * 1.05) {
          status = "success";
        } else {
          status = "warning";
        }
      }
      
      compliance.push({
        date: d,
        dateStr: ds,
        consumed: dayConsumed,
        target: dayTarget,
        status
      });
    }
    
    return { compliance, cumulativeBalance };
  };

  // ─── Custom Foods Sub-view ─────────────────────────
  if (activeSection === "custom_foods") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 overflow-y-auto px-5 py-6 space-y-4 no-scrollbar">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Mis Comidas</h2>
            <p className="text-[10px] text-white/40">Tus platos frecuentes y productos personalizados en la nube</p>
          </div>
        </div>

        <button 
          onClick={() => onOpenFoodLogger(undefined, true)} 
          className="w-full p-4 rounded-2xl border border-dashed border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition flex items-center justify-center gap-2 text-emerald-400 hover:text-emerald-300 font-black text-xs cursor-pointer shadow-md"
        >
          <Plus className="h-4.5 w-4.5" /> Agregar Nueva Comida / Plato
        </button>

        {isLoadingFoods ? (
          <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /></div>
        ) : customFoods.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Star className="h-10 w-10 text-white/10 mx-auto" />
            <p className="text-xs text-white/30">Aún no has guardado platos personalizados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFoods.map((food) => (
              <motion.div key={food.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{food.name}</span>
                    {food.category && <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">{food.category === "dish" ? "Plato" : food.category === "product" ? "Producto" : "Receta"}</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5"><Flame className="h-3 w-3" /> {food.calories} kcal</span>
                    <span className="text-[9px] text-white/30">P:{Number(food.protein).toFixed(1).replace(/\.0$/, "")}g · C:{Number(food.carbs).toFixed(1).replace(/\.0$/, "")}g · G:{Number(food.fat).toFixed(1).replace(/\.0$/, "")}g</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => { onAddMeal({ name: food.name, calories: food.calories, protein: food.protein, carbs: food.carbs, fat: food.fat, type: "lunch" }); }} className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"><Plus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDeleteFood(food.id)} className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // ─── Calorie Bank Sub-view ─────────────────────────
  if (activeSection === "calorie_bank") {
    const bmr = profile.sex === "male"
      ? 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5
      : 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    const minDaily = Math.round(bmr * 0.85);
    
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 overflow-y-auto px-5 py-6 space-y-4 no-scrollbar">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Banco de Calorías ⚡</h2>
            <p className="text-[10px] text-white/40">"Ahorra" calorías para un evento especial</p>
          </div>
        </div>

        {bankPlan?.isActive ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-black text-white">Plan Activo</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Evento:</span>
                  <span className="text-white font-bold">{new Date(bankPlan.eventDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}</span>
                </div>
                {bankPlan.eventDescription && (
                  <div className="flex justify-between text-xs">
                    <span className="text-white/50">Descripción:</span>
                    <span className="text-white font-bold">{bankPlan.eventDescription}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Ajuste diario:</span>
                  <span className="text-amber-400 font-bold">-{bankPlan.dailyAdjustment} kcal/día</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Extra el día del evento:</span>
                  <span className="text-emerald-400 font-bold">+{bankPlan.extraCaloriesTarget} kcal</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">Meta ajustada hoy:</span>
                  <span className="text-white font-bold">{adjustedCal} kcal</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-center space-y-1">
              <p className="text-[10px] text-white/40">Tu límite mínimo seguro es de <b className="text-amber-400">{minDaily} kcal/día</b> (85% de tu TMB)</p>
              <p className="text-[9px] text-white/25">Nunca ajustaremos por debajo de este valor para proteger tu metabolismo y masa muscular.</p>
            </div>

            <button
              onClick={handleDeactivateBank}
              className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Desactivar Plan
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-1.5">
              <p className="text-xs text-white/60 leading-relaxed">
                ¿Tienes un evento donde planeas comer más? Reduce ligeramente tus calorías los días previos para compensar de forma saludable.
              </p>
              <p className="text-[9px] text-amber-400/60 leading-normal">
                ⚠️ Máximo -300 kcal/día extra. Nunca por debajo de {minDaily} kcal/día.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Fecha del Evento</label>
                <input
                  type="date"
                  value={bankEventDate}
                  min={todayStr}
                  onChange={(e) => setBankEventDate(e.target.value)}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500/40 transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">¿Qué planeas? (opcional)</label>
                <Input placeholder="Ej: Cena de cumpleaños, BBQ con amigos..." value={bankEventDesc} onChange={(e) => setBankEventDesc(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Calorías extra deseadas</label>
                <div className="flex gap-2">
                  {[300, 400, 500, 600].map(v => (
                    <button key={v} onClick={() => setBankExtraKcal(v)} className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${bankExtraKcal === v ? "bg-amber-500/15 border-amber-500/40 text-amber-400" : "bg-white/5 border-white/10 text-white/40"}`}>+{v}</button>
                  ))}
                </div>
              </div>

              {bankEventDate && (() => {
                const eventD = new Date(bankEventDate + "T12:00:00");
                const daysUntil = Math.max(1, Math.ceil((eventD.getTime() - new Date().getTime()) / 86400000));
                const maxAdj = Math.min(300, baseCal - minDaily);
                const dailyAdj = Math.min(maxAdj, Math.round(bankExtraKcal / daysUntil));
                const actualExtra = dailyAdj * daysUntil;
                return (
                  <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-400">Vista previa del plan:</span>
                    <p className="text-xs text-white/60">
                      Reducirás <b className="text-amber-400">{dailyAdj} kcal/día</b> durante <b className="text-white">{daysUntil} días</b>, lo que te dará <b className="text-emerald-400">+{actualExtra} kcal extra</b> el día del evento.
                    </p>
                    <p className="text-[9px] text-white/30">Meta diaria ajustada: {baseCal - dailyAdj} kcal (mínimo seguro: {minDaily} kcal)</p>
                  </div>
                );
              })()}
              <Button variant="primary" onClick={handleActivateBank} isLoading={isBankSaving} leftIcon={Zap} className="w-full font-bold" disabled={!bankEventDate}>
                Activar Banco de Calorías
              </Button>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  }
  // Circular stats calculation
  const caloriesRemaining = adjustedCal - totalCal;
  const radius = 38;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, calPercent) / 100) * circumference;

  // Weekly Saved Calories Balance calculation
  let weeklySavedCal = 0;
  weekDates.forEach((d) => {
    const ds = toDateStr(d);
    if (ds <= todayStr) {
      let dayTarget = baseCal;
      if (bankPlan?.isActive) {
        if (ds === bankPlan.eventDate) {
          dayTarget = baseCal + (bankPlan.extraCaloriesTarget || 0);
        } else if (ds >= bankPlan.startDate && ds < bankPlan.eventDate) {
          dayTarget = baseCal - bankPlan.dailyAdjustment;
        }
      }
      const dayConsumed = loggedMeals.filter(m => m.timestamp.startsWith(ds)).reduce((s, m) => s + m.calories, 0);
      weeklySavedCal += (dayTarget - dayConsumed);
    }
  });

  const getDayComplianceStatus = (ds: string, consumed: number, target: number) => {
    if (ds > todayStr) return "future";
    if (userCreationDateStr && ds < userCreationDateStr) return "not_registered";
    if (consumed === 0) {
      return ds === todayStr ? "pending" : "danger";
    }
    const ratio = consumed / target;
    if (ratio >= 0.85 && ratio <= 1.05) return "success";
    if ((ratio > 1.05 && ratio <= 1.15) || (ratio < 0.85 && ratio >= 0.5)) return "warning";
    return "danger";
  };

  // ─── Main Hub View ─────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar pb-24 relative">
      {/* Floating Action Button for rapid comida add */}
      {isToday && (
        <div className="fixed bottom-20 right-6 z-40">
          <motion.button
            onClick={() => onOpenFoodLogger()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20 cursor-pointer"
            title="Registrar Alimento"
          >
            <Utensils className="h-5 w-5" />
          </motion.button>
        </div>
      )}

      {/* Header + Week Calendar */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white tracking-tight">Alimentación</h1>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
              weeklySavedCal >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
            }`}>
              Balance: {weeklySavedCal >= 0 ? `-${Math.round(weeklySavedCal)}` : `+${Math.round(Math.abs(weeklySavedCal))}`} kcal
            </span>
            {bankPlan?.isActive && (
              <button onClick={() => setActiveSection("calorie_bank")} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 cursor-pointer transition hover:bg-amber-500/20">
                <Zap className="h-3 w-3" /> Banco
              </button>
            )}
          </div>
        </div>

        {/* Week Calendar */}
        <div className="flex items-center gap-1">
          <button onClick={goToPrevWeek} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer shrink-0">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex-1 flex gap-1">
            {weekDates.map((d) => {
              const ds = toDateStr(d);
              const isSelected = ds === selectedDate;
              const isTodayDate = ds === todayStr;
              const isFuture = ds > todayStr;
              
              let dayTarget = baseCal;
              if (bankPlan?.isActive) {
                if (ds === bankPlan.eventDate) {
                  dayTarget = baseCal + (bankPlan.extraCaloriesTarget || 0);
                } else if (ds >= bankPlan.startDate && ds < bankPlan.eventDate) {
                  dayTarget = baseCal - bankPlan.dailyAdjustment;
                }
              }
              const dayConsumed = loggedMeals.filter(m => m.timestamp.startsWith(ds)).reduce((s, m) => s + m.calories, 0);
              const status = getDayComplianceStatus(ds, dayConsumed, dayTarget);

              return (
                <button
                  key={ds}
                  onClick={() => !isFuture && setSelectedDate(ds)}
                  disabled={isFuture}
                  className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                      : isFuture
                      ? "opacity-25 cursor-not-allowed text-white/20"
                      : "bg-white/[0.02] border border-transparent text-white/40 hover:bg-white/5"
                  }`}
                >
                  <span className="text-[8px] font-bold uppercase">{DAYS_SHORT[d.getDay()]}</span>
                  <span className={`text-sm font-black ${isSelected ? "text-emerald-400" : isTodayDate ? "text-white" : ""}`}>{d.getDate()}</span>
                  
                  {/* Status Indicator Dot */}
                  <div className="mt-1 flex items-center justify-center">
                    {status === "success" ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    ) : status === "warning" ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    ) : status === "danger" ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                    ) : (
                      <div className="w-1.5 h-1 bg-white/10 rounded-full" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <button onClick={goToNextWeek} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer shrink-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content wrapper */}
      <div className="px-5 py-4 space-y-4">
        
        {/* Daily progress with SVG Ring */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 flex items-center gap-5">
          {/* Left: SVG circular ring */}
          <div className="relative shrink-0 flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              <circle
                stroke="rgba(255,255,255,0.05)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <circle
                stroke={caloriesRemaining >= 0 ? "#10b981" : "#ef4444"}
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[12px] font-black text-white leading-none font-mono">
                {caloriesRemaining >= 0 ? caloriesRemaining : Math.abs(caloriesRemaining)}
              </span>
              <span className="text-[6.5px] text-white/35 font-black uppercase tracking-wider mt-0.5">
                {caloriesRemaining >= 0 ? "Kcal Rest" : "Exceso"}
              </span>
            </div>
          </div>

          {/* Right: Sleek linear progress bars for P, C, G */}
          <div className="flex-1 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                {isToday ? "Progreso de Hoy" : `${new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}`}
              </span>
              {isBankEventDay && (
                <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">🎉 Evento</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {[
                { label: "Proteína", val: totalP, target: pTarget, color: "bg-emerald-400", labelColor: "text-emerald-400" },
                { label: "Carbos", val: totalC, target: cTarget, color: "bg-blue-400", labelColor: "text-blue-400" },
                { label: "Grasas", val: totalF, target: fTarget, color: "bg-amber-400", labelColor: "text-amber-400" },
              ].map((m) => {
                const percent = m.target > 0 ? (m.val / m.target) * 100 : 0;
                return (
                  <div key={m.label} className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[8px] font-bold text-white/35 uppercase">{m.label.substring(0,4)}</span>
                      <span className={`text-[9.5px] font-black ${m.labelColor} font-mono`}>{Math.round(m.val)}g</span>
                    </div>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${m.color}`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {bankAdjustment > 0 && (
              <p className="text-[8px] text-amber-400/60 font-bold uppercase tracking-wider pt-0.5">⚡ Ajuste Banco: -{bankAdjustment} Kcal hoy</p>
            )}
          </div>
        </div>

        {/* IA Smart Food Suggestions */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-5 space-y-4">
          <div className="flex flex-col items-center justify-center text-center gap-1">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center justify-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
              Sugerencias de Alimentos (IA)
            </span>
            <span className="text-[7.5px] font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider text-center block mx-auto">
              En base a tus macros restantes
            </span>
          </div>

          {foodSuggestions.length === 0 ? (
            <div className="space-y-3">
              <p className="text-xs text-white/50 leading-relaxed text-center">
                ¿Te quedan macros hoy y no sabes qué comer? La IA analiza tu saldo de carbohidratos, grasas y proteínas para sugerirte alimentos específicos.
              </p>
              <button
                onClick={handleGetSuggestions}
                disabled={isLoadingSuggestions}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/20 text-black text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer border-none shadow-md"
              >
                {isLoadingSuggestions ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Calculando con IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 fill-black" />
                    Obtener Sugerencias Inteligentes
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="space-y-2">
                {foodSuggestions.map((item: any, idx: number) => (
                  <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white truncate uppercase tracking-tight">{item.name}</span>
                        <span className="text-[9px] font-bold text-emerald-400 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-mono">{item.calories} kcal</span>
                      </div>
                      <span className="block text-[9px] text-white/30 font-medium mt-0.5">Porción sugerida: {item.servingSize}</span>
                      <p className="text-[10px] text-white/50 leading-snug mt-1.5 italic">"{item.reason}"</p>
                      
                      {/* Macro values preview */}
                      <div className="flex gap-2.5 mt-2 pt-2 border-t border-white/[0.03]">
                        <span className="text-[8.5px] text-emerald-400 font-mono">P: <b>{item.protein}g</b></span>
                        <span className="text-[8.5px] text-blue-400 font-mono">C: <b>{item.carbs}g</b></span>
                        <span className="text-[8.5px] text-amber-400 font-mono">F: <b>{item.fat}g</b></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {suggestionsError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-medium bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {suggestionsError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleGetSuggestions}
                  disabled={isLoadingSuggestions}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border-0"
                >
                  <Sparkles className="h-3 w-3" /> Re-generar
                </button>
                <button
                  onClick={() => setFoodSuggestions([])}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 text-[10px] font-bold transition cursor-pointer border-0"
                >
                  Ocultar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Grid menu cards for features */}
        <div className="grid grid-cols-2 gap-3">
          {/* Mis Comidas - first position, full width */}
          <button
            onClick={() => setActiveSection("custom_foods")}
            className="col-span-2 p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 hover:border-emerald-500/40 rounded-3xl text-left hover:scale-[1.01] transition-all duration-300 cursor-pointer shadow-md group animate-fadeIn"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                <Star className="h-6 w-6 fill-emerald-500/10" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-tight uppercase tracking-wide">Mis Comidas</h3>
                <p className="text-[10px] text-white/50 leading-snug mt-0.5">Tus platos habituales y productos en la nube</p>
              </div>
            </div>
          </button>

          {/* Nutri-Coach IA - active */}
          <button
            onClick={onOpenCoach}
            className="p-3.5 bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 hover:border-emerald-500/30 rounded-3xl text-left hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow-md group"
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                <MessageSquare className="h-4.5 w-4.5" />
              </div>
              <span className="text-[7.5px] font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Activo
              </span>
            </div>
            <h4 className="text-[11px] font-black text-white mt-2.5">Nutri-Coach IA</h4>
            <p className="text-[9px] text-white/45 leading-normal mt-0.5">Resuelve tus dudas nutricionales al instante</p>
          </button>

          {/* Crear Dieta - locked */}
          <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-3xl text-left relative opacity-60">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                <Calendar className="h-4.5 w-4.5" />
              </div>
              <span className="text-[8px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Lock className="h-2 w-2" /> Próximamente
              </span>
            </div>
            <h4 className="text-[11px] font-black text-white/70 mt-2.5">Crear Dieta</h4>
            <p className="text-[9px] text-white/30 leading-normal mt-0.5">Planificador semanal</p>
          </div>

          {/* Banco de Calorías - locked */}
          <div className="col-span-2 p-3.5 bg-white/[0.02] border border-white/5 rounded-3xl text-left relative opacity-60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                  <Zap className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black text-white/70">Banco de Calorías</h4>
                  <p className="text-[9px] text-white/30 leading-normal mt-0.5">Planificación de déficit flexible</p>
                </div>
              </div>
              <span className="text-[8px] font-bold text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                <Lock className="h-2 w-2" /> Próximamente
              </span>
            </div>
          </div>
        </div>

        {/* Meals grouped by type */}
        <div className="space-y-2">
          {mealsByType.map(({ type, meals }) => (
            <div key={type} className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getMealEmoji(type)}</span>
                  <span className="text-[11px] font-bold text-white/70">{getMealLabel(type)}</span>
                  {meals.length > 0 && (
                    <span className="text-[9px] text-white/25 font-mono">{meals.reduce((s, m) => s + m.calories, 0)} kcal</span>
                  )}
                </div>
                {isToday && (
                  <button
                    onClick={() => onOpenFoodLogger(type)}
                    className="text-[9px] text-emerald-455 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none transition"
                  >
                    <Plus className="h-3 w-3" /> Añadir
                  </button>
                )}
              </div>

              {meals.length > 0 ? (
                <div className="divide-y divide-white/[0.03]">
                  {meals.map((meal) => (
                    <div key={meal.id} className="px-3.5 py-2.5 flex items-center justify-between group hover:bg-white/[0.02] transition">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">{meal.name}</span>
                        <span className="text-[9px] text-white/30">P:{Number(meal.protein).toFixed(1).replace(/\.0$/, "")}g · C:{Number(meal.carbs).toFixed(1).replace(/\.0$/, "")}g · G:{Number(meal.fat).toFixed(1).replace(/\.0$/, "")}g</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-emerald-400">{meal.calories}</span>
                        {(isToday || isPast) && (
                          <button onClick={() => onDeleteMeal(meal.id)} className="p-1 text-white/10 group-hover:text-rose-400 transition cursor-pointer">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3.5 py-3 text-center">
                  {isToday ? (
                    <button onClick={() => onOpenFoodLogger(type)} className="text-[10px] text-white/20 hover:text-emerald-400 transition cursor-pointer bg-transparent border-none">
                      Pulsa para añadir {getMealLabel(type).toLowerCase()}
                    </button>
                  ) : (
                    <span className="text-[10px] text-white/15 italic">Sin registro</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom spacer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
