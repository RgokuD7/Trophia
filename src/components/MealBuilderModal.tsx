import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Trash2, Barcode, Search, Sparkles, Check, 
  Utensils, ChefHat, Package, Layers, Star, AlertCircle, RefreshCw
} from "lucide-react";
import { MealType, LoggedMeal, FoodItem, PantryItem, CustomFood } from "../types";
import { searchAllFoods, getProductByBarcode } from "../services/foodDatabaseService";
import { getDefaultServingInfo } from "./FoodLogger";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { addCustomFood } from "../services/dbService";
import { createTimestampForDate } from "../utils/fitnessUtils";

export interface MealBuilderIngredient {
  id: string;
  name: string;
  amount: number;
  unit: "g" | "ml" | "unit";
  unitLabel: string; // e.g. "rebanada", "unidad", "g", "ml"
  equivalentGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  raw100gCalories: number;
  raw100gProtein: number;
  raw100gCarbs: number;
  raw100gFat: number;
  unitWeight: number;
  barcode?: string;
}

export interface MealBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeal: (meal: Omit<LoggedMeal, "id" | "timestamp"> & { timestamp?: string }) => void;
  pantryItems?: PantryItem[];
  customFoods?: CustomFood[];
  userId?: string;
  targetDate?: string;
  defaultMealType?: MealType;
}

const PRESET_IDEAS = [
  { label: "🥪 Sándwich de Atún", name: "Sándwich de atún con huevo y mayo" },
  { label: "🥪 Tostada con Huevo", name: "Tostadas de pan integral con huevo y palta" },
  { label: "🥣 Bowl de Avena", name: "Bowl de avena con leche y proteína" },
  { label: "🥗 Wrap de Pollo", name: "Wrap integral de pollo con palta y lechuga" },
];

export default function MealBuilderModal({
  isOpen,
  onClose,
  onSaveMeal,
  pantryItems = [],
  customFoods = [],
  userId,
  targetDate,
  defaultMealType = "lunch"
}: MealBuilderModalProps) {
  const [dishName, setDishName] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [ingredients, setIngredients] = useState<MealBuilderIngredient[]>([]);
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ingredient adding drawer / picker state
  const [addMode, setAddMode] = useState<"search" | "pantry" | "custom" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Macro calculation helper
  const calculateMacros = (
    amount: number,
    unit: "g" | "ml" | "unit",
    unitWeight: number,
    raw100g: { calories: number; protein: number; carbs: number; fat: number }
  ) => {
    const equivalentGrams = unit === "unit" ? amount * unitWeight : amount;
    const scale = equivalentGrams / 100;
    return {
      equivalentGrams: Math.round(equivalentGrams),
      calories: Math.max(0, Math.round(raw100g.calories * scale)),
      protein: Math.max(0, Math.round(raw100g.protein * scale * 10) / 10),
      carbs: Math.max(0, Math.round(raw100g.carbs * scale * 10) / 10),
      fat: Math.max(0, Math.round(raw100g.fat * scale * 10) / 10),
    };
  };

  const handleAddFoodAsIngredient = (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    barcode?: string;
  }) => {
    const info = getDefaultServingInfo(food.name, food.servingSize || "100g");
    const initialAmount = info.defaultUnit === "unit" ? (food.name.toLowerCase().includes("pan ") ? 2 : 1) : (info.unitWeight || 100);
    const raw100g = {
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };
    const calculated = calculateMacros(initialAmount, info.defaultUnit, info.unitWeight, raw100g);

    const newIng: MealBuilderIngredient = {
      id: "ing_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: food.name,
      amount: initialAmount,
      unit: info.defaultUnit,
      unitLabel: info.unitLabel,
      equivalentGrams: calculated.equivalentGrams,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      raw100gCalories: raw100g.calories,
      raw100gProtein: raw100g.protein,
      raw100gCarbs: raw100g.carbs,
      raw100gFat: raw100g.fat,
      unitWeight: info.unitWeight,
      barcode: food.barcode,
    };

    setIngredients(prev => [...prev, newIng]);
    setAddMode(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleUpdateIngredientAmount = (id: string, newAmount: number) => {
    const validAmount = Math.max(0.1, newAmount);
    setIngredients(prev => prev.map(ing => {
      if (ing.id !== id) return ing;
      const calculated = calculateMacros(
        validAmount,
        ing.unit,
        ing.unitWeight,
        {
          calories: ing.raw100gCalories,
          protein: ing.raw100gProtein,
          carbs: ing.raw100gCarbs,
          fat: ing.raw100gFat
        }
      );
      return {
        ...ing,
        amount: validAmount,
        ...calculated
      };
    }));
  };

  const handleRemoveIngredient = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const handleSearchFoods = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchAllFoods(q.trim());
      setSearchResults(results.slice(0, 15));
    } catch (err) {
      console.error("Error searching foods:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBarcodeScanSuccess = async (barcode: string) => {
    setIsScannerOpen(false);
    setScannerError(null);
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        handleAddFoodAsIngredient(product);
      } else {
        setScannerError("Producto no encontrado por código de barras.");
      }
    } catch (err) {
      console.error("Error barcode in meal builder:", err);
      setScannerError("Error al escanear producto.");
    }
  };

  // Aggregated totals
  const totalCalories = ingredients.reduce((sum, ing) => sum + ing.calories, 0);
  const totalProtein = Math.round(ingredients.reduce((sum, ing) => sum + ing.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(ingredients.reduce((sum, ing) => sum + ing.carbs, 0) * 10) / 10;
  const totalFat = Math.round(ingredients.reduce((sum, ing) => sum + ing.fat, 0) * 10) / 10;

  // Summary breakdown string
  const ingredientsSummary = ingredients.map(ing => {
    const unitStr = ing.unit === "unit" ? (ing.amount === 1 ? ing.unitLabel : ing.unitLabel + "s") : ing.unit;
    return `${ing.amount} ${unitStr} ${ing.name}`;
  }).join(" + ");

  const handleSaveCompositeMeal = async () => {
    const finalName = dishName.trim() || "Plato Compuesto";
    if (ingredients.length === 0) return;

    setIsSaving(true);
    try {
      // 1. Optionally save to personal custom foods
      if (saveAsCustom && userId) {
        await addCustomFood(userId, {
          name: finalName,
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          servingSize: ingredientsSummary.slice(0, 80) || "1 plato",
          category: "dish",
          createdAt: new Date().toISOString()
        });
      }

      // 2. Log into daily meals
      onSaveMeal({
        name: finalName,
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        type: selectedMealType,
        servingSize: ingredientsSummary.slice(0, 120) || "1 porción",
        timestamp: targetDate ? createTimestampForDate(targetDate) : undefined
      });

      onClose();
    } catch (err) {
      console.error("Error saving composite meal:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#12131d] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                <span>Armar Sándwich o Plato</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono">
                  MULTICOMPUESTO
                </span>
              </h3>
              <p className="text-[10px] text-white/50">
                Combina varios ingredientes (pan, atún, huevo...) y regístralos como 1 sola comida limpia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          
          {/* Preset Ideas */}
          {ingredients.length === 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">
                Ideas rápidas de platos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IDEAS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDishName(p.name)}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-white/5 hover:bg-emerald-500/15 hover:text-emerald-400 text-white/70 border border-white/5 transition cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dish Name & Meal Type */}
          <div className="space-y-2">
            <div>
              <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                Nombre de tu plato o preparación
              </label>
              <input
                type="text"
                value={dishName}
                onChange={(e) => setDishName(e.target.value)}
                placeholder="Ej: Sándwich de atún con huevo y mayo light"
                className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition font-bold"
              />
            </div>

            {/* Meal Type Picker */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { type: "breakfast", label: "Desayuno", emoji: "🌅" },
                { type: "lunch", label: "Almuerzo", emoji: "☀️" },
                { type: "snack", label: "Once / Snack", emoji: "☕" },
                { type: "dinner", label: "Cena", emoji: "🌙" }
              ].map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => setSelectedMealType(t.type as MealType)}
                  className={`py-1.5 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                    selectedMealType === t.type
                      ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                      : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white"
                  }`}
                >
                  <span>{t.emoji}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ingredient List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                Ingredientes del Plato ({ingredients.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                {totalCalories} kcal acumuladas
              </span>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                <p className="text-xs text-white/60 font-medium">
                  Tu plato aún no tiene ingredientes añadidos.
                </p>
                <p className="text-[10px] text-white/40">
                  Escanea el código de barras del envase (pan, atún, etc.) o búscalo abajo para armar la mezcla.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-between gap-2.5 transition hover:border-white/10"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-white truncate">
                        {ing.name}
                      </span>
                      <span className="block text-[10px] text-emerald-400 font-mono mt-0.5">
                        {ing.calories} kcal · P: {ing.protein}g · C: {ing.carbs}g · G: {ing.fat}g
                      </span>
                    </div>

                    {/* Amount adjuster */}
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-xl shrink-0">
                      <input
                        type="number"
                        step={ing.unit === "unit" ? "1" : "5"}
                        min="0.1"
                        value={ing.amount}
                        onChange={(e) => handleUpdateIngredientAmount(ing.id, parseFloat(e.target.value) || 1)}
                        className="w-12 text-center text-xs font-bold font-mono text-white bg-transparent focus:outline-none"
                      />
                      <span className="text-[10px] text-white/50 font-bold">
                        {ing.unit === "unit" ? ing.unitLabel : ing.unit}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(ing.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 transition cursor-pointer"
                      title="Eliminar ingrediente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Ingredient Actions */}
          <div className="space-y-2">
            {!addMode ? (
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="py-2.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Barcode className="h-3.5 w-3.5" />
                  <span>Escanear Envase</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddMode("search")}
                  className="py-2.5 px-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-2xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Buscar Catálogo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAddMode("pantry")}
                  className="py-2.5 px-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-2xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Mi Despensa</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                    {addMode === "search" && "Buscar en catálogo"}
                    {addMode === "pantry" && "Seleccionar de mi despensa"}
                    {addMode === "custom" && "Mis alimentos guardados"}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAddMode(null); setSearchResults([]); }}
                    className="text-white/40 hover:text-white text-xs font-bold transition"
                  >
                    Cerrar
                  </button>
                </div>

                {addMode === "search" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchFoods(e.target.value)}
                        placeholder="Escribe el ingrediente (ej: pan de molde, atún, huevo, mayo)..."
                        className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 font-medium"
                      />
                    </div>

                    {isSearching ? (
                      <div className="text-center py-3 text-[10px] text-white/40 flex items-center justify-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                        <span>Buscando alimentos...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar divide-y divide-white/5">
                        {searchResults.map((f, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAddFoodAsIngredient(f)}
                            className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">{f.name}</span>
                              <span className="text-[9px] text-white/40">{f.brand ? `${f.brand} · ` : ""}{f.servingSize}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">{f.calories} kcal</span>
                          </button>
                        ))}
                      </div>
                    ) : searchQuery.trim() ? (
                      <p className="text-[10px] text-white/40 text-center py-2">No se encontraron resultados.</p>
                    ) : null}
                  </div>
                )}

                {addMode === "pantry" && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                    {pantryItems.length > 0 ? (
                      pantryItems.map((p, i) => (
                        <button
                          key={p.id || i}
                          type="button"
                          onClick={() => handleAddFoodAsIngredient({
                            name: p.name,
                            calories: p.calories,
                            protein: p.protein,
                            carbs: p.carbs,
                            fat: p.fat,
                            servingSize: p.quantity || "100g"
                          })}
                          className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition flex items-center justify-between gap-2 cursor-pointer border border-white/5"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{p.name}</span>
                            <span className="text-[9px] text-white/40 font-mono">Disponibles: {p.quantity}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">{p.calories} kcal</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-white/40 text-center py-3">Tu despensa está vacía.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scanner Error */}
          {scannerError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{scannerError}</span>
            </div>
          )}

          {/* Totals Summary Card */}
          {ingredients.length > 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                  Total Consolidado del Plato
                </span>
                <span className="text-sm font-black text-white font-mono">
                  🔥 {totalCalories} kcal
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Proteína</span>
                  <span className="text-xs font-black text-white font-mono">{totalProtein}g</span>
                </div>
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[8.5px] font-bold text-blue-400 uppercase block">Carbos</span>
                  <span className="text-xs font-black text-white font-mono">{totalCarbs}g</span>
                </div>
                <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[8.5px] font-bold text-amber-400 uppercase block">Grasas</span>
                  <span className="text-xs font-black text-white font-mono">{totalFat}g</span>
                </div>
              </div>

              {/* Breakdown Preview */}
              <div className="text-[9.5px] text-white/50 leading-relaxed font-mono bg-black/20 p-2 rounded-xl border border-white/5">
                <strong className="text-white/70">Desglose:</strong> {ingredientsSummary}
              </div>

              {/* Save as favorite custom food */}
              <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveAsCustom}
                  onChange={(e) => setSaveAsCustom(e.target.checked)}
                  className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4"
                />
                <span className="flex items-center gap-1 font-medium">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  Guardar como plato favorito para registrarlo en 1 click otro día
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-[#121420] flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={ingredients.length === 0 || isSaving}
            onClick={handleSaveCompositeMeal}
            className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/30 text-black text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Guardando plato...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Registrar en mi Diario ({totalCalories} kcal)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Barcode Scanner Modal for Ingredients */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
      />
    </div>
  );
}
