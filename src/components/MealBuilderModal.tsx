import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Trash2, Barcode, Search, Sparkles, Check, 
  Utensils, ChefHat, Package, Layers, Star, AlertCircle, RefreshCw,
  Camera, Upload
} from "lucide-react";
import { MealType, LoggedMeal, FoodItem, PantryItem, CustomFood, MealBuilderIngredient } from "../types";
import { searchAllFoods, getProductByBarcode } from "../services/foodDatabaseService";
import { getDefaultServingInfo } from "./FoodLogger";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { addCustomFood } from "../services/dbService";
import { createTimestampForDate } from "../utils/fitnessUtils";
import { estimateMacrosFromDescription, analyzeFoodByIA } from "../services/geminiService";

export type { MealBuilderIngredient };

export interface MealBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeal: (meal: Omit<LoggedMeal, "id" | "timestamp"> & { timestamp?: string; compositeIngredients?: MealBuilderIngredient[] }) => void;
  onUpdateMeal?: (meal: LoggedMeal) => void;
  initialMeal?: LoggedMeal | null;
  pantryItems?: PantryItem[];
  customFoods?: CustomFood[];
  userId?: string;
  targetDate?: string;
  defaultMealType?: MealType;
  apiKey?: string;
}

export default function MealBuilderModal({
  isOpen,
  onClose,
  onSaveMeal,
  onUpdateMeal,
  initialMeal,
  pantryItems = [],
  customFoods = [],
  userId,
  targetDate,
  defaultMealType = "lunch",
  apiKey
}: MealBuilderModalProps) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_api_key") : "") || "";

  const [dishName, setDishName] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [ingredients, setIngredients] = useState<MealBuilderIngredient[]>([]);
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Ingredient adding drawer / picker state
  const [addMode, setAddMode] = useState<"search" | "ia_text" | "camera" | "pantry" | "custom" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // IA Text Description state
  const [iaDescription, setIaDescription] = useState("");
  const [isIaEstimating, setIsIaEstimating] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  // IA Camera state
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  // Initialize or reset when modal opens or initialMeal changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialMeal) {
      setDishName(initialMeal.name || "");
      setSelectedMealType(initialMeal.type || defaultMealType);
      if (initialMeal.compositeIngredients && initialMeal.compositeIngredients.length > 0) {
        setIngredients(initialMeal.compositeIngredients);
      } else {
        // Synthesize single initial ingredient from meal data if none saved
        const synthIng: MealBuilderIngredient = {
          id: "ing_" + Date.now(),
          name: initialMeal.name,
          amount: 1,
          unit: "unit",
          unitLabel: initialMeal.servingSize || "porción",
          equivalentGrams: 100,
          calories: initialMeal.calories,
          protein: initialMeal.protein,
          carbs: initialMeal.carbs,
          fat: initialMeal.fat,
          raw100gCalories: initialMeal.calories,
          raw100gProtein: initialMeal.protein,
          raw100gCarbs: initialMeal.carbs,
          raw100gFat: initialMeal.fat,
          unitWeight: 100
        };
        setIngredients([synthIng]);
      }
    } else {
      setDishName("");
      setSelectedMealType(defaultMealType);
      setIngredients([]);
    }
    setAddMode(null);
    setSearchQuery("");
    setSearchResults([]);
    setIaDescription("");
    setPhotoData(null);
    setPhotoDescription("");
    setScannerError(null);
    setIaError(null);
    setConfirmDeleteId(null);
  }, [isOpen, initialMeal, defaultMealType]);

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
    setIaDescription("");
    setPhotoData(null);
    setPhotoDescription("");
    setConfirmDeleteId(null);
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
    setConfirmDeleteId(null);
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

  // IA Text Description estimation
  const handleEstimateWithIa = async () => {
    if (!iaDescription.trim() || isIaEstimating) return;
    setIsIaEstimating(true);
    setIaError(null);
    try {
      const result = await estimateMacrosFromDescription(effectiveApiKey, iaDescription.trim());
      if (result && result.name && typeof result.calories === "number") {
        handleAddFoodAsIngredient({
          name: result.name,
          calories: result.calories,
          protein: Number(result.protein) || 0,
          carbs: Number(result.carbs) || 0,
          fat: Number(result.fat) || 0,
          servingSize: result.servingSize || "1 porción"
        });
      } else {
        setIaError("No pudimos estimar los macros del ingrediente. Intenta ser más descriptivo.");
      }
    } catch (err) {
      console.error("Error estimating ingredient with IA:", err);
      setIaError("Error de conexión al analizar con IA.");
    } finally {
      setIsIaEstimating(false);
    }
  };

  // IA Photo processing
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1024;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoData(canvas.toDataURL("image/jpeg", 0.82));
        } else {
          setPhotoData(rawDataUrl);
        }
      };
      img.onerror = () => setPhotoData(rawDataUrl);
      img.src = rawDataUrl;
      setIaError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhoto = async () => {
    if (!photoData || isAnalyzingPhoto) return;
    setIsAnalyzingPhoto(true);
    setIaError(null);
    try {
      const data = await analyzeFoodByIA(effectiveApiKey, {
        image: photoData,
        mealType: selectedMealType,
        description: photoDescription.trim() || undefined
      });
      if (data && data.name && typeof data.calories === "number") {
        const estimatedGrams = Math.max(1, Number(data.estimatedGrams) || 100);
        handleAddFoodAsIngredient({
          name: data.name,
          calories: data.calories,
          protein: Number(data.protein) || 0,
          carbs: Number(data.carbs) || 0,
          fat: Number(data.fat) || 0,
          servingSize: data.servingSize || `${estimatedGrams}g`
        });
      } else {
        setIaError("No se pudo identificar el alimento en la imagen.");
      }
    } catch (err) {
      console.error("Error analyzing photo:", err);
      setIaError("Error al procesar la foto con IA.");
    } finally {
      setIsAnalyzingPhoto(false);
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
    const finalName = dishName.trim() || (initialMeal ? initialMeal.name : "Sándwich de atún con huevo");
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

      // 2. Either update existing meal or create new one
      if (initialMeal && onUpdateMeal) {
        onUpdateMeal({
          ...initialMeal,
          name: finalName,
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          type: selectedMealType,
          servingSize: ingredientsSummary.slice(0, 120) || initialMeal.servingSize || "1 porción",
          compositeIngredients: ingredients
        });
      } else {
        onSaveMeal({
          name: finalName,
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          type: selectedMealType,
          servingSize: ingredientsSummary.slice(0, 120) || "1 porción",
          compositeIngredients: ingredients,
          timestamp: targetDate ? createTimestampForDate(targetDate) : undefined
        });
      }

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
                <span>{initialMeal ? "Editar Sándwich o Plato" : "Armar Sándwich o Plato"}</span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase">
                  {initialMeal ? "Edición" : "Multicompuesto"}
                </span>
              </h3>
              <p className="text-[10px] text-white/50">
                Combina varios ingredientes (pan, atún, huevo...) y regístralos como 1 sola comida
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

          {/* Dish Name Input */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block">
              Nombre de tu plato o preparación
            </label>
            <input
              type="text"
              value={dishName}
              onChange={(e) => setDishName(e.target.value)}
              placeholder="Ej: Sándwich de atún con huevo y mayo"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 transition font-bold"
            />
          </div>

          {/* Ingredient List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                Ingredientes ({ingredients.length})
              </span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                {totalCalories} kcal acumuladas
              </span>
            </div>

            {ingredients.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                <p className="text-xs text-white/60 font-medium">
                  Aún no has agregado ingredientes.
                </p>
                <p className="text-[10px] text-white/40">
                  Usa cualquiera de las opciones de abajo para añadir pan, atún, huevo, salsas, etc.
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

                    {/* Safeguard delete: two-tap confirmation to prevent accidental taps */}
                    {confirmDeleteId === ing.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ing.id)}
                          className="px-2 py-1 rounded-lg bg-rose-500 text-white font-bold text-[9px] hover:bg-rose-600 transition cursor-pointer"
                        >
                          ¿Borrar?
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 rounded-lg bg-white/10 text-white/60 hover:text-white text-[9px] transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(ing.id)}
                        className="p-1.5 text-white/30 hover:text-rose-400 transition cursor-pointer"
                        title="Eliminar ingrediente"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full Tools to Add Ingredients */}
          <div className="space-y-2 pt-2 border-t border-white/5">
            <span className="text-[9.5px] font-bold text-white/40 uppercase tracking-wider block">
              Agregar ingrediente al plato:
            </span>

            {/* Quick Mode Buttons */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => setAddMode(addMode === "search" ? null : "search")}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border ${
                  addMode === "search"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/[0.03] hover:bg-white/[0.06] text-white/70 border-white/5"
                }`}
              >
                <Search className="h-3.5 w-3.5" />
                <span>Buscar</span>
              </button>

              <button
                type="button"
                onClick={() => setAddMode(addMode === "ia_text" ? null : "ia_text")}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border ${
                  addMode === "ia_text"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/[0.03] hover:bg-white/[0.06] text-white/70 border-white/5"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Describir</span>
              </button>

              <button
                type="button"
                onClick={() => setAddMode(addMode === "camera" ? null : "camera")}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border ${
                  addMode === "camera"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/[0.03] hover:bg-white/[0.06] text-white/70 border-white/5"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Foto</span>
              </button>

              <button
                type="button"
                onClick={() => setAddMode(addMode === "pantry" ? null : "pantry")}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border ${
                  addMode === "pantry"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/[0.03] hover:bg-white/[0.06] text-white/70 border-white/5"
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Despensa</span>
              </button>

              <button
                type="button"
                onClick={() => setAddMode(addMode === "custom" ? null : "custom")}
                className={`py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border ${
                  addMode === "custom"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/[0.03] hover:bg-white/[0.06] text-white/70 border-white/5"
                }`}
              >
                <Star className="h-3.5 w-3.5" />
                <span>Frecuentes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="py-2 px-1 rounded-xl text-[10px] font-bold transition flex flex-col items-center gap-1 cursor-pointer border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25"
              >
                <Barcode className="h-3.5 w-3.5" />
                <span>Escanear</span>
              </button>
            </div>

            {/* Active Drawer Sub-view */}
            {addMode && (
              <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                    {addMode === "search" && <><Search className="h-3 w-3 text-emerald-400" /> Buscar en catálogo</>}
                    {addMode === "ia_text" && <><Sparkles className="h-3 w-3 text-emerald-400" /> Describir con IA</>}
                    {addMode === "camera" && <><Camera className="h-3 w-3 text-emerald-400" /> Foto o Etiqueta con IA</>}
                    {addMode === "pantry" && <><Package className="h-3 w-3 text-emerald-400" /> Mi despensa ({pantryItems.length})</>}
                    {addMode === "custom" && <><Star className="h-3 w-3 text-emerald-400" /> Frecuentes y Guardados ({customFoods.length})</>}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setAddMode(null); setSearchResults([]); setIaError(null); }}
                    className="text-white/40 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>

                {/* Mode 1: Search Catalog */}
                {addMode === "search" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchFoods(e.target.value)}
                        placeholder="Escribe el ingrediente (ej: pan, atún, huevo, palta)..."
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

                {/* Mode 2: Describe with IA */}
                {addMode === "ia_text" && (
                  <div className="space-y-2">
                    <textarea
                      value={iaDescription}
                      onChange={(e) => setIaDescription(e.target.value)}
                      placeholder="Describe el ingrediente, ej: 1 lata de atún al agua, 2 cucharadas de mayonesa light, 50g de queso gauda..."
                      rows={2}
                      className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 font-medium resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!iaDescription.trim() || isIaEstimating}
                        onClick={handleEstimateWithIa}
                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-[11px] font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        {isIaEstimating ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Calculando macros...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Añadir Ingrediente con IA</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode 3: Photo IA */}
                {addMode === "camera" && (
                  <div className="space-y-2.5">
                    {photoData ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-36 flex items-center justify-center bg-black/50">
                          <img src={photoData} alt="Preview" className="w-full h-36 object-contain" />
                          <button
                            type="button"
                            onClick={() => setPhotoData(null)}
                            className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-white hover:text-rose-400"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={photoDescription}
                          onChange={(e) => setPhotoDescription(e.target.value)}
                          placeholder="Contexto adicional opcional (ej: pechuga de pavo cocida)..."
                          className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-[11px] text-white placeholder-white/30 focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isAnalyzingPhoto}
                          onClick={handleAnalyzePhoto}
                          className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {isAnalyzingPhoto ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              <span>Analizando con IA...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                              <span>Analizar y Añadir al Plato</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <label className="p-4 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/40 bg-black/20 flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                        <Camera className="h-6 w-6 text-emerald-400" />
                        <span className="text-xs font-bold text-white/80">
                          Toma o sube una foto del ingrediente o etiqueta
                        </span>
                        <span className="text-[10px] text-white/40">
                          La IA detectará automáticamente el alimento y sus macros
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {/* Mode 4: Pantry Items */}
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

                {/* Mode 5: Custom / Frequent Foods */}
                {addMode === "custom" && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar">
                    {customFoods.length > 0 ? (
                      customFoods.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleAddFoodAsIngredient({
                            name: c.name,
                            calories: c.calories,
                            protein: c.protein,
                            carbs: c.carbs,
                            fat: c.fat,
                            servingSize: c.servingSize
                          })}
                          className="w-full text-left p-2 rounded-xl hover:bg-emerald-500/10 transition flex items-center justify-between gap-2 cursor-pointer border border-white/5"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-white block truncate">{c.name}</span>
                            <span className="text-[9px] text-white/40 font-mono">{c.servingSize}</span>
                          </div>
                          <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">{c.calories} kcal</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-[10px] text-white/40 text-center py-3">No tienes alimentos guardados aún.</p>
                    )}
                  </div>
                )}

                {/* IA Error message */}
                {iaError && (
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{iaError}</span>
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

              {/* Save as favorite custom food (only if creating new) */}
              {!initialMeal && (
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
              )}
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
            ) : initialMeal ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                <span>Guardar Cambios ({totalCalories} kcal)</span>
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
