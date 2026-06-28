import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, BookOpen, Star, Calendar, ShoppingCart, Lock, ArrowLeft, Trash2, Check, X, 
  ChefHat, Flame, Zap, ChevronLeft, ChevronRight
} from "lucide-react";
import { UserProfile, LoggedMeal, MealType, CustomFood } from "../types";
import { getCustomFoods, addCustomFood, deleteCustomFood } from "../services/dbService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface NutritionHubProps {
  profile: UserProfile;
  userId: string;
  loggedMeals: LoggedMeal[];
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  onDeleteMeal: (id: string) => void;
  onOpenFoodLogger: (suggestedType?: MealType) => void;
  onOpenRecipeAssistant: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
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
}: NutritionHubProps) {
  const today = new Date();
  const todayStr = toDateStr(today);
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [weekDates, setWeekDates] = useState(() => getWeekDates(today));
  const [activeSection, setActiveSection] = useState<"custom_foods" | "calorie_bank" | null>(null);
  
  // Custom foods state
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState<number | "">("");
  const [newProtein, setNewProtein] = useState<number | "">("");
  const [newCarbs, setNewCarbs] = useState<number | "">("");
  const [newFat, setNewFat] = useState<number | "">("");
  const [newServing, setNewServing] = useState("1 porción");
  const [newCategory, setNewCategory] = useState<"dish" | "product" | "recipe">("dish");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleAddFood = async () => {
    if (!newName.trim() || !newCalories) return;
    setIsSaving(true);
    try {
      const food = await addCustomFood(userId, {
        name: newName.trim(),
        calories: Number(newCalories) || 0,
        protein: Number(newProtein) || 0,
        carbs: Number(newCarbs) || 0,
        fat: Number(newFat) || 0,
        servingSize: newServing || "1 porción",
        category: newCategory,
        createdAt: new Date().toISOString(),
      });
      setCustomFoods(prev => [food, ...prev]);
      setNewName(""); setNewCalories(""); setNewProtein(""); setNewCarbs(""); setNewFat("");
      setNewServing("1 porción"); setShowAddForm(false);
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
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

  // ─── Custom Foods Sub-view ─────────────────────────
  if (activeSection === "custom_foods") {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 overflow-y-auto px-5 py-6 space-y-4 no-scrollbar">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSection(null)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Mis Platos y Productos</h2>
            <p className="text-[10px] text-white/40">Guarda alimentos que comes frecuentemente</p>
          </div>
        </div>

        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs cursor-pointer">
            <Plus className="h-4 w-4" /> Agregar Nuevo Plato / Producto
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Nuevo Alimento</span>
              <button onClick={() => setShowAddForm(false)} className="text-white/40 hover:text-white transition cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <Input placeholder="Nombre del plato o producto *" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Calorías *" value={newCalories} onChange={(e) => setNewCalories(e.target.value ? Number(e.target.value) : "")} />
              <Input type="number" placeholder="Proteínas (g)" value={newProtein} onChange={(e) => setNewProtein(e.target.value ? Number(e.target.value) : "")} />
              <Input type="number" placeholder="Carbos (g)" value={newCarbs} onChange={(e) => setNewCarbs(e.target.value ? Number(e.target.value) : "")} />
              <Input type="number" placeholder="Grasas (g)" value={newFat} onChange={(e) => setNewFat(e.target.value ? Number(e.target.value) : "")} />
            </div>
            <Input placeholder="Porción (ej: 1 plato, 100g)" value={newServing} onChange={(e) => setNewServing(e.target.value)} />
            <div className="flex gap-2">
              {([{ id: "dish" as const, label: "Plato" }, { id: "product" as const, label: "Producto" }, { id: "recipe" as const, label: "Receta" }]).map((cat) => (
                <button key={cat.id} onClick={() => setNewCategory(cat.id)} className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition cursor-pointer ${newCategory === cat.id ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400" : "bg-white/5 border-white/10 text-white/40"}`}>{cat.label}</button>
              ))}
            </div>
            <Button variant="primary" onClick={handleAddFood} isLoading={isSaving} leftIcon={Check} className="w-full font-bold">Guardar Alimento</Button>
          </motion.div>
        )}

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
                    <span className="text-[9px] text-white/30">P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g</span>
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

  // ─── Main Hub View ─────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header + Week Calendar */}
      <div className="px-5 pt-5 pb-3 border-b border-white/5 flex-shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white tracking-tight">Alimentación</h1>
          {bankPlan?.isActive && (
            <button onClick={() => setActiveSection("calorie_bank")} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-400 cursor-pointer transition hover:bg-amber-500/20">
              <Zap className="h-3 w-3" /> Banco Activo
            </button>
          )}
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
              const dayHasMeals = loggedMeals.some(m => m.timestamp.startsWith(ds));
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
                  {dayHasMeals && !isSelected && <div className="w-1 h-1 rounded-full bg-emerald-400/50 mt-0.5" />}
                </button>
              );
            })}
          </div>
          <button onClick={goToNextWeek} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white transition cursor-pointer shrink-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
        
        {/* Action Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: "Registrar", icon: Plus, onClick: () => onOpenFoodLogger(), color: "emerald" },
            { label: "Recetas", icon: ChefHat, onClick: onOpenRecipeAssistant, color: "emerald" },
            { label: "Mis Platos", icon: Star, onClick: () => setActiveSection("custom_foods"), color: "emerald" },
            { label: "⚡ Banco", icon: Zap, onClick: () => setActiveSection("calorie_bank"), color: "amber" },
          ].map((chip) => {
            const Icon = chip.icon;
            return (
              <button
                key={chip.label}
                onClick={chip.onClick}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-[10px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  chip.color === "amber"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Day Progress */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {isToday ? "Progreso de Hoy" : isPast ? `${new Date(selectedDate + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" })}` : ""}
            </span>
            {isBankEventDay && (
              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">🎉 DÍA DEL EVENTO</span>
            )}
          </div>
          
          {/* Calorie bar */}
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-white font-mono">{totalCal}</span>
              <span className="text-xs text-white/30">/ {adjustedCal} kcal</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  totalCal > adjustedCal ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
                }`}
              />
            </div>
            {bankAdjustment > 0 && (
              <p className="text-[9px] text-amber-400/60">⚡ Banco activo: -{bankAdjustment} kcal ajustadas hoy</p>
            )}
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Proteína", val: totalP, target: pTarget, color: "emerald" },
              { label: "Carbos", val: totalC, target: cTarget, color: "blue" },
              { label: "Grasas", val: totalF, target: fTarget, color: "amber" },
            ].map((m) => (
              <div key={m.label} className="text-center space-y-0.5">
                <span className="text-[8px] font-bold text-white/30 uppercase">{m.label}</span>
                <div className="text-xs font-black text-white">{Math.round(m.val)}<span className="text-white/30 font-normal">/{m.target}g</span></div>
                <div className="w-full h-1 rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.color === "emerald" ? "bg-emerald-400" : m.color === "blue" ? "bg-blue-400" : "bg-amber-400"
                    }`}
                    style={{ width: `${Math.min(100, m.target > 0 ? (m.val / m.target) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
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
                    className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer bg-transparent border-none transition"
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
                        <span className="text-[9px] text-white/30">P:{meal.protein}g · C:{meal.carbs}g · G:{meal.fat}g</span>
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
