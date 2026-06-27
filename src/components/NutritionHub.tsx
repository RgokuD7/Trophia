import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, BookOpen, Star, Calendar, ShoppingCart, Lock, ArrowLeft, Trash2, Check, X, ChefHat, Flame
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
}

export default function NutritionHub({
  profile,
  userId,
  loggedMeals,
  onAddMeal,
  onDeleteMeal,
  onOpenFoodLogger,
  onOpenRecipeAssistant,
}: NutritionHubProps) {
  const [activeSection, setActiveSection] = useState<"custom_foods" | null>(null);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [isLoadingFoods, setIsLoadingFoods] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newCalories, setNewCalories] = useState<number | "">("");
  const [newProtein, setNewProtein] = useState<number | "">("");
  const [newCarbs, setNewCarbs] = useState<number | "">("");
  const [newFat, setNewFat] = useState<number | "">("");
  const [newServing, setNewServing] = useState("1 porción");
  const [newCategory, setNewCategory] = useState<"dish" | "product" | "recipe">("dish");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeSection === "custom_foods") {
      loadCustomFoods();
    }
  }, [activeSection]);

  const loadCustomFoods = async () => {
    setIsLoadingFoods(true);
    try {
      const foods = await getCustomFoods(userId);
      setCustomFoods(foods);
    } catch (err) {
      console.error("Error loading custom foods:", err);
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
      setNewName("");
      setNewCalories("");
      setNewProtein("");
      setNewCarbs("");
      setNewFat("");
      setNewServing("1 porción");
      setShowAddForm(false);
    } catch (err) {
      console.error("Error saving custom food:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFood = async (foodId: string) => {
    try {
      await deleteCustomFood(userId, foodId);
      setCustomFoods(prev => prev.filter(f => f.id !== foodId));
    } catch (err) {
      console.error("Error deleting custom food:", err);
    }
  };

  const handleUseCustomFood = (food: CustomFood) => {
    onAddMeal({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      type: "lunch",
    });
  };

  // Hub cards configuration
  const hubCards = [
    {
      id: "register",
      icon: Plus,
      title: "Registrar Alimento",
      desc: "Busca, escanea o fotografía tus comidas",
      color: "emerald",
      locked: false,
      onClick: () => onOpenFoodLogger(),
    },
    {
      id: "recipes",
      icon: ChefHat,
      title: "Mis Recetas",
      desc: "Crea y guarda recetas con IA",
      color: "emerald",
      locked: false,
      onClick: () => onOpenRecipeAssistant(),
    },
    {
      id: "custom",
      icon: Star,
      title: "Mis Platos",
      desc: "Guarda platos y productos personalizados",
      color: "emerald",
      locked: false,
      onClick: () => setActiveSection("custom_foods"),
    },
    {
      id: "plan",
      icon: Calendar,
      title: "Plan Semanal",
      desc: "Organiza tus comidas de la semana",
      color: "blue",
      locked: true,
      onClick: () => {},
    },
    {
      id: "grocery",
      icon: ShoppingCart,
      title: "Lista de Compras",
      desc: "Genera tu lista a partir de tu plan",
      color: "blue",
      locked: true,
      onClick: () => {},
    },
  ];

  // Custom Foods sub-section
  if (activeSection === "custom_foods") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 overflow-y-auto px-5 py-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection(null)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-black text-white tracking-tight">Mis Platos y Productos</h2>
            <p className="text-[10px] text-white/40">Guarda alimentos que comes frecuentemente</p>
          </div>
        </div>

        {/* Add new button */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full p-4 rounded-2xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Agregar Nuevo Plato / Producto
          </button>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Nuevo Alimento</span>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-white/40 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Input
              placeholder="Nombre del plato o producto *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Calorías *"
                value={newCalories}
                onChange={(e) => setNewCalories(e.target.value ? Number(e.target.value) : "")}
              />
              <Input
                type="number"
                placeholder="Proteínas (g)"
                value={newProtein}
                onChange={(e) => setNewProtein(e.target.value ? Number(e.target.value) : "")}
              />
              <Input
                type="number"
                placeholder="Carbos (g)"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value ? Number(e.target.value) : "")}
              />
              <Input
                type="number"
                placeholder="Grasas (g)"
                value={newFat}
                onChange={(e) => setNewFat(e.target.value ? Number(e.target.value) : "")}
              />
            </div>

            <Input
              placeholder="Porción (ej: 1 plato, 100g)"
              value={newServing}
              onChange={(e) => setNewServing(e.target.value)}
            />

            {/* Category */}
            <div className="flex gap-2">
              {([
                { id: "dish" as const, label: "Plato" },
                { id: "product" as const, label: "Producto" },
                { id: "recipe" as const, label: "Receta" },
              ]).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setNewCategory(cat.id)}
                  className={`flex-1 py-2 rounded-xl border text-[10px] font-bold transition cursor-pointer ${
                    newCategory === cat.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-white/5 border-white/10 text-white/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              onClick={handleAddFood}
              isLoading={isSaving}
              leftIcon={Check}
              className="w-full font-bold"
            >
              Guardar Alimento
            </Button>
          </motion.div>
        )}

        {/* List */}
        {isLoadingFoods ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : customFoods.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Star className="h-10 w-10 text-white/10 mx-auto" />
            <p className="text-xs text-white/30">Aún no has guardado platos personalizados.</p>
            <p className="text-[10px] text-white/20">Los alimentos que guardes aquí estarán disponibles para registrar rápidamente.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {customFoods.map((food) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">{food.name}</span>
                    {food.category && (
                      <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                        {food.category === "dish" ? "Plato" : food.category === "product" ? "Producto" : "Receta"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <Flame className="h-3 w-3" /> {food.calories} kcal
                    </span>
                    <span className="text-[9px] text-white/30">
                      P:{food.protein}g · C:{food.carbs}g · G:{food.fat}g
                    </span>
                    <span className="text-[9px] text-white/20">({food.servingSize})</span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleUseCustomFood(food)}
                    className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Registrar en diario"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteFood(food.id)}
                    className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  // Hub View
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto px-5 py-6 space-y-5"
    >
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-black text-white tracking-tight">Centro de Alimentación</h1>
        <p className="text-[11px] text-white/40 leading-relaxed">
          Gestiona tus comidas, recetas, platos favoritos y planifica tu alimentación semanal.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {hubCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={card.onClick}
              disabled={card.locked}
              className={`relative p-4 rounded-2xl border text-left transition-all flex flex-col gap-3 min-h-[130px] ${
                card.locked
                  ? "bg-white/[0.02] border-white/5 opacity-50 cursor-not-allowed"
                  : "bg-white/[0.04] border-white/10 hover:border-emerald-500/30 hover:bg-white/[0.06] cursor-pointer active:scale-[0.97]"
              }`}
            >
              {/* Lock badge */}
              {card.locked && (
                <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Lock className="h-3 w-3 text-white/30" />
                </div>
              )}

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                card.locked
                  ? "bg-white/5 text-white/20"
                  : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
              }`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="space-y-0.5">
                <span className="text-xs font-bold text-white block leading-tight">
                  {card.title}
                  {card.locked && (
                    <span className="text-[8px] text-amber-400/80 font-bold ml-1.5">Próximamente</span>
                  )}
                </span>
                <span className="text-[9.5px] text-white/35 leading-normal block">{card.desc}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Quick Stats */}
      {loggedMeals.length > 0 && (() => {
        const today = new Date().toISOString().split("T")[0];
        const todayMeals = loggedMeals.filter(m => m.timestamp.startsWith(today));
        const totalCal = todayMeals.reduce((s, m) => s + m.calories, 0);
        const totalP = todayMeals.reduce((s, m) => s + m.protein, 0);
        if (todayMeals.length === 0) return null;
        return (
          <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 rounded-2xl p-4 space-y-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Resumen de Hoy</span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-black text-emerald-400 font-mono">{totalCal}</span>
              <span className="text-[10px] text-white/40">kcal consumidas</span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs font-bold text-white/60">{Math.round(totalP)}g proteína</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                style={{ width: `${Math.min(100, (totalCal / (profile.dailyCalorieTarget || 2000)) * 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-white/25">
              {Math.round((totalCal / (profile.dailyCalorieTarget || 2000)) * 100)}% de tu meta de {profile.dailyCalorieTarget || 2000} kcal
            </span>
          </div>
        );
      })()}
    </motion.div>
  );
}
