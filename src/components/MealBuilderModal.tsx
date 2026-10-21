import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Plus, Trash2, Barcode, Search, Sparkles, Check, 
  ChefHat, Package, Layers, Star, AlertCircle, RefreshCw,
  Camera, Pencil, ArrowLeft, History, Flame
} from "lucide-react";
import { MealType, LoggedMeal, FoodItem, PantryItem, CustomFood, MealBuilderIngredient } from "../types";
import { searchAllFoods, getProductByBarcode } from "../services/foodDatabaseService";
import { getDefaultServingInfo } from "./FoodLogger";
import BarcodeScannerModal from "./BarcodeScannerModal";
import AddMissingBarcodeModal from "./AddMissingBarcodeModal";
import { addCustomFood, getBarcodeCorrection } from "../services/dbService";
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
  loggedMeals?: LoggedMeal[];
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
  loggedMeals = [],
  userId,
  targetDate,
  defaultMealType = "lunch",
  apiKey
}: MealBuilderModalProps) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_api_key") : "") || "";

  // Step state: "build" (adding and listing ingredients) or "summary" (final totals and save)
  const [step, setStep] = useState<"build" | "summary">("build");

  const [dishName, setDishName] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType);
  const [ingredients, setIngredients] = useState<MealBuilderIngredient[]>([]);
  const [saveAsCustom, setSaveAsCustom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ingredientToDelete, setIngredientToDelete] = useState<MealBuilderIngredient | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);

  // Ingredient currently being edited in modal
  const [editingIngredient, setEditingIngredient] = useState<MealBuilderIngredient | null>(null);
  const [editAmount, setEditAmount] = useState<number>(1);
  const [editUnit, setEditUnit] = useState<"g" | "ml" | "unit">("unit");

  // Ingredient adding drawer / picker state (default to "search")
  const [addMode, setAddMode] = useState<"search" | "ia_text" | "camera" | "pantry" | "custom" | null>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMissingBarcodeModalOpen, setIsMissingBarcodeModalOpen] = useState(false);
  const [missingBarcode, setMissingBarcode] = useState("");
  const [scannerError, setScannerError] = useState<string | null>(null);
  const isProcessingBarcodeRef = useRef(false);

  // Sub-filters
  const [pantryFilter, setPantryFilter] = useState("");
  const [frequentFilter, setFrequentFilter] = useState("");

  // IA Text Description state
  const [iaDescription, setIaDescription] = useState("");
  const [isIaEstimating, setIsIaEstimating] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);

  // IA Camera state
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState("");
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

  // Calculate genuine frequent foods from loggedMeals (sorted by recency and frequency)
  const frequentHistory = React.useMemo(() => {
    const freqMap = new Map<string, { count: number; lastUsedTs: number; latestMeal: LoggedMeal }>();
    (loggedMeals || []).forEach(m => {
      const key = m.name.trim().toLowerCase();
      const ts = m.timestamp ? new Date(m.timestamp).getTime() : 0;
      const existing = freqMap.get(key);
      if (existing) {
        existing.count += 1;
        if (ts >= existing.lastUsedTs) {
          existing.lastUsedTs = ts;
          existing.latestMeal = m;
        }
      } else {
        freqMap.set(key, { count: 1, lastUsedTs: ts, latestMeal: m });
      }
    });

    return Array.from(freqMap.values())
      .sort((a, b) => {
        if (b.lastUsedTs !== a.lastUsedTs) {
          return b.lastUsedTs - a.lastUsedTs;
        }
        return b.count - a.count;
      })
      .map(({ count, latestMeal }) => {
        let portionGrams = latestMeal.portionGrams || 0;
        let portionValue = latestMeal.portionValue || 1;
        let portionUnit: "g" | "ml" | "unit" = latestMeal.portionUnit || "g";
        let unitWeight = latestMeal.unitWeight || portionGrams || 100;
        let unitLabel = latestMeal.unitLabel || "porción";

        if (!portionGrams && latestMeal.servingSize) {
          const match = latestMeal.servingSize.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
          if (match) {
            portionGrams = parseFloat(match[1]);
            portionUnit = match[2].toLowerCase() === "ml" ? "ml" : "g";
            portionValue = portionGrams;
            unitWeight = portionGrams;
          } else {
            const info = getDefaultServingInfo(latestMeal.name, latestMeal.servingSize);
            portionUnit = info.defaultUnit;
            unitWeight = info.unitWeight;
            unitLabel = info.unitLabel;
            portionValue = info.defaultUnit === "unit" ? 1 : info.unitWeight;
            portionGrams = info.unitWeight;
          }
        }

        let raw100gCalories = latestMeal.raw100gCalories;
        let raw100gProtein = latestMeal.raw100gProtein;
        let raw100gCarbs = latestMeal.raw100gCarbs;
        let raw100gFat = latestMeal.raw100gFat;

        if (raw100gCalories === undefined) {
          if (portionGrams > 0 && portionGrams !== 100) {
            const factor = 100 / portionGrams;
            raw100gCalories = Math.round(latestMeal.calories * factor);
            raw100gProtein = Number((latestMeal.protein * factor).toFixed(1));
            raw100gCarbs = Number((latestMeal.carbs * factor).toFixed(1));
            raw100gFat = Number((latestMeal.fat * factor).toFixed(1));
          } else {
            raw100gCalories = latestMeal.calories;
            raw100gProtein = latestMeal.protein;
            raw100gCarbs = latestMeal.carbs;
            raw100gFat = latestMeal.fat;
          }
        }

        // Safeguard for OpenFoodFacts comma stripping errors in historical logs
        if (raw100gCarbs && raw100gCarbs > 100 && raw100gCarbs <= 1000) raw100gCarbs = raw100gCarbs / 10;
        if (raw100gProtein && raw100gProtein > 100 && raw100gProtein <= 1000) raw100gProtein = raw100gProtein / 10;
        if (raw100gFat && raw100gFat > 100 && raw100gFat <= 1000) raw100gFat = raw100gFat / 10;
        if (raw100gCalories && raw100gCalories > 900 && raw100gCalories <= 9000) raw100gCalories = Math.round(raw100gCalories / 10);

        const calculatedCals = portionGrams > 0 ? Math.round((raw100gCalories * portionGrams) / 100) : latestMeal.calories;
        const calculatedProtein = portionGrams > 0 ? Number(((raw100gProtein * portionGrams) / 100).toFixed(1)) : latestMeal.protein;
        const calculatedCarbs = portionGrams > 0 ? Number(((raw100gCarbs * portionGrams) / 100).toFixed(1)) : latestMeal.carbs;
        const calculatedFat = portionGrams > 0 ? Number(((raw100gFat * portionGrams) / 100).toFixed(1)) : latestMeal.fat;

        return {
          name: latestMeal.name,
          calories: calculatedCals,
          protein: calculatedProtein,
          carbs: calculatedCarbs,
          fat: calculatedFat,
          servingSize: latestMeal.servingSize || (portionGrams > 0 ? `${portionGrams}g` : "1 porción"),
          count,
          raw100gCalories,
          raw100gProtein,
          raw100gCarbs,
          raw100gFat,
          portionGrams: portionGrams > 0 ? portionGrams : 100,
          portionValue,
          portionUnit,
          unitWeight,
          unitLabel,
          barcode: latestMeal.barcode
        };
      });
  }, [loggedMeals]);

  // Initialize or reset when modal opens or initialMeal changes
  useEffect(() => {
    if (!isOpen) return;
    setStep("build");
    if (initialMeal) {
      setDishName(initialMeal.name || "");
      setSelectedMealType(initialMeal.type || defaultMealType);
      if (initialMeal.compositeIngredients && initialMeal.compositeIngredients.length > 0) {
        setIngredients(initialMeal.compositeIngredients);
      } else if (initialMeal.servingSize && initialMeal.servingSize.includes(" + ")) {
        // Parse parts from "2 rebanadas Pan + 1 lata Atún + 15g Mayo"
        const parts = initialMeal.servingSize.split(" + ");
        const frac = 1 / Math.max(1, parts.length);
        const parsedIngs: MealBuilderIngredient[] = parts.map((part, idx) => {
          const trimmed = part.trim();
          const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:([a-zA-ZáéíóúñÁÉÍÓÚÑ]+)\s+)?(.*)$/);
          const amount = match && parseFloat(match[1]) > 0 ? parseFloat(match[1]) : 1;
          const unitLabel = match && match[2] ? match[2] : "porción";
          const ingName = match && match[3] ? match[3].trim() : trimmed;
          const cals = Math.round(initialMeal.calories * frac);
          const p = Math.round((initialMeal.protein * frac) * 10) / 10;
          const c = Math.round((initialMeal.carbs * frac) * 10) / 10;
          const f = Math.round((initialMeal.fat * frac) * 10) / 10;
          return {
            id: "ing_parsed_" + idx + "_" + Date.now(),
            name: ingName || trimmed,
            amount: amount,
            unit: "unit" as const,
            unitLabel: unitLabel,
            equivalentGrams: 50,
            calories: cals,
            protein: p,
            carbs: c,
            fat: f,
            raw100gCalories: cals * 2,
            raw100gProtein: p * 2,
            raw100gCarbs: c * 2,
            raw100gFat: f * 2,
            unitWeight: 50
          };
        });
        setIngredients(parsedIngs);
      } else {
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
    setAddMode("search");
    setSearchQuery("");
    setSearchResults([]);
    setPantryFilter("");
    setFrequentFilter("");
    setIaDescription("");
    setPhotoData(null);
    setPhotoDescription("");
    setScannerError(null);
    setIaError(null);
    setIngredientToDelete(null);
    setEditingIngredient(null);
    isProcessingBarcodeRef.current = false;
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

  const handleAddFoodAsIngredient = async (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string;
    barcode?: string;
    raw100gCalories?: number;
    raw100gProtein?: number;
    raw100gCarbs?: number;
    raw100gFat?: number;
    portionGrams?: number;
    portionValue?: number;
    portionUnit?: "g" | "ml" | "unit";
    unitWeight?: number;
    unitLabel?: string;
    hasNutritionWarning?: boolean;
    nutritionWarningReason?: string;
  }) => {
    let targetFood = { ...food };

    // If barcode exists, check community correction to get the freshest validated macros
    if (food.barcode) {
      try {
        const corr = await getBarcodeCorrection(food.barcode);
        if (corr) {
          const uW = corr.unitWeight && corr.unitWeight > 0 ? corr.unitWeight : 100;
          targetFood.raw100gCalories = corr.calories;
          targetFood.raw100gProtein = corr.protein;
          targetFood.raw100gCarbs = corr.carbs;
          targetFood.raw100gFat = corr.fat;
          targetFood.unitWeight = uW;
          targetFood.portionGrams = uW;
          targetFood.portionValue = uW;
          targetFood.portionUnit = "g";
          targetFood.unitLabel = corr.unitLabel || "porción";
          targetFood.servingSize = corr.servingSize || `${uW}g`;
          targetFood.hasNutritionWarning = false;
          targetFood.nutritionWarningReason = undefined;
        }
      } catch (err) {
        console.warn("Could not check barcode correction for ingredient:", err);
      }
    }

    const info = getDefaultServingInfo(targetFood.name, targetFood.servingSize || "100g");
    const unit = targetFood.portionUnit || info.defaultUnit;
    let unitWeight = targetFood.unitWeight || info.unitWeight;
    const unitLabel = targetFood.unitLabel || info.unitLabel;

    if (unitWeight === 100 && info.unitWeight && info.unitWeight !== 100) {
      unitWeight = info.unitWeight;
    }

    let raw100g = {
      calories: targetFood.raw100gCalories !== undefined ? targetFood.raw100gCalories : targetFood.calories,
      protein: targetFood.raw100gProtein !== undefined ? targetFood.raw100gProtein : targetFood.protein,
      carbs: targetFood.raw100gCarbs !== undefined ? targetFood.raw100gCarbs : targetFood.carbs,
      fat: targetFood.raw100gFat !== undefined ? targetFood.raw100gFat : targetFood.fat,
    };

    let hasNutritionWarning = targetFood.hasNutritionWarning || false;
    let nutritionWarningReason = targetFood.nutritionWarningReason;

    // Detect impossible/suspicious registry values
    if (raw100g.carbs > 100 || raw100g.protein > 100 || raw100g.fat > 100 || raw100g.calories > 900) {
      hasNutritionWarning = true;
      const issues: string[] = [];
      if (raw100g.carbs > 100) issues.push(`Carbos excesivos (${raw100g.carbs}g)`);
      if (raw100g.protein > 100) issues.push(`Proteínas excesivas (${raw100g.protein}g)`);
      if (raw100g.fat > 100) issues.push(`Grasas excesivas (${raw100g.fat}g)`);
      if (raw100g.calories > 900) issues.push(`Calorías sospechosas (${raw100g.calories} kcal)`);
      nutritionWarningReason = issues.join(", ");
    }

    // 10x safeguard for corrupt barcode data
    if (raw100g.carbs > 100 && raw100g.carbs <= 1000) raw100g.carbs = raw100g.carbs / 10;
    if (raw100g.protein > 100 && raw100g.protein <= 1000) raw100g.protein = raw100g.protein / 10;
    if (raw100g.fat > 100 && raw100g.fat <= 1000) raw100g.fat = raw100g.fat / 10;
    if (raw100g.calories > 900 && raw100g.calories <= 9000) raw100g.calories = Math.round(raw100g.calories / 10);

    const initialAmount = (targetFood.portionValue !== undefined && targetFood.portionValue > 0 && targetFood.portionValue !== 100)
      ? targetFood.portionValue
      : (unit === "unit" ? (targetFood.name.toLowerCase().includes("pan ") ? 2 : 1) : (unitWeight && unitWeight > 0 ? unitWeight : 100));

    const calculated = calculateMacros(initialAmount, unit, unitWeight, raw100g);

    const newIng: MealBuilderIngredient = {
      id: "ing_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: targetFood.name,
      amount: initialAmount,
      unit: unit,
      unitLabel: unitLabel,
      equivalentGrams: calculated.equivalentGrams,
      calories: calculated.calories,
      protein: calculated.protein,
      carbs: calculated.carbs,
      fat: calculated.fat,
      raw100gCalories: raw100g.calories,
      raw100gProtein: raw100g.protein,
      raw100gCarbs: raw100g.carbs,
      raw100gFat: raw100g.fat,
      unitWeight: unitWeight,
      barcode: targetFood.barcode,
      hasNutritionWarning,
      nutritionWarningReason,
    };

    setIngredients(prev => [...prev, newIng]);
    
    // Tactile & Visual Feedback
    const unitStr = newIng.unit === "unit" ? (newIng.amount === 1 ? newIng.unitLabel : newIng.unitLabel + "s") : newIng.unit;
    if (hasNutritionWarning) {
      setToastMessage(`⚠️ Agregado: ${newIng.name} (Revisa macros: posible error en base de datos)`);
    } else {
      setToastMessage(`¡Agregado! ${newIng.name} (${newIng.amount} ${unitStr} · ${newIng.calories} kcal)`);
    }
    setLastAddedName(food.name);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(40);
    setTimeout(() => setToastMessage(null), 2500);
    setTimeout(() => setLastAddedName(null), 1500);
  };

  const handleStartEditIngredient = (ing: MealBuilderIngredient) => {
    setEditingIngredient(ing);
    setEditAmount(ing.amount);
    setEditUnit(ing.unit);
  };

  const handleSaveEditedIngredient = () => {
    if (!editingIngredient) return;
    const validAmount = Math.max(0.1, Number(editAmount) || 1);
    const calculated = calculateMacros(
      validAmount,
      editUnit,
      editingIngredient.unitWeight,
      {
        calories: editingIngredient.raw100gCalories,
        protein: editingIngredient.raw100gProtein,
        carbs: editingIngredient.raw100gCarbs,
        fat: editingIngredient.raw100gFat
      }
    );

    setIngredients(prev => prev.map(ing => {
      if (ing.id !== editingIngredient.id) return ing;
      return {
        ...ing,
        amount: validAmount,
        unit: editUnit,
        ...calculated
      };
    }));

    setEditingIngredient(null);
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
    if (isProcessingBarcodeRef.current) return;
    isProcessingBarcodeRef.current = true;
    setIsScannerOpen(false);
    setScannerError(null);
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        handleAddFoodAsIngredient(product);
      } else {
        setMissingBarcode(barcode);
        setIsMissingBarcodeModalOpen(true);
      }
    } catch (err) {
      console.error("Error barcode in meal builder:", err);
      setScannerError("Error al escanear producto.");
    } finally {
      setTimeout(() => {
        isProcessingBarcodeRef.current = false;
      }, 600);
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
        setIaDescription("");
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
        setPhotoData(null);
        setPhotoDescription("");
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
    const finalName = dishName.trim() || (initialMeal ? initialMeal.name : "Sándwich o Plato Compuesto");
    if (ingredients.length === 0) return;

    setIsSaving(true);
    try {
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

  // Preview calculations for the ingredient being edited in modal
  const editingPreview = editingIngredient ? calculateMacros(
    Math.max(0.1, Number(editAmount) || 1),
    editUnit,
    editingIngredient.unitWeight,
    {
      calories: editingIngredient.raw100gCalories,
      protein: editingIngredient.raw100gProtein,
      carbs: editingIngredient.raw100gCarbs,
      fat: editingIngredient.raw100gFat
    }
  ) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-lg bg-[#12131d] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative"
      >
        {/* Floating Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-black px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 font-black text-xs pointer-events-none max-w-[90%] truncate"
            >
              <Check className="h-4 w-4 stroke-[3] shrink-0" />
              <span className="truncate">{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            {step === "summary" ? (
              <button
                type="button"
                onClick={() => setStep("build")}
                className="w-9 h-9 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
                title="Volver a los ingredientes"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ChefHat className="h-5 w-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                <span>
                  {step === "summary" 
                    ? "Resumen del Plato" 
                    : initialMeal 
                      ? "Editar Sándwich o Plato" 
                      : "Armar Sándwich o Plato"}
                </span>
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-mono uppercase">
                  {step === "summary" ? "Resumen" : initialMeal ? "Edición" : "Multicompuesto"}
                </span>
              </h3>
              <p className="text-[10px] text-white/50">
                {step === "summary"
                  ? "Revisa los macros consolidados antes de registrar en tu diario"
                  : "Agrega varios ingredientes y regístralos como 1 sola comida limpia"}
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

        {/* ─── STEP 1: BUILD (Add Ingredients & View Ingredients) ─── */}
        {step === "build" && (
          <>
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

              {/* 1. SECTION: AGREGAR INGREDIENTES (Tabs like FoodLogger) */}
              <div className="space-y-2 pt-1 border-t border-white/5">
                <span className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block">
                  Agregar Ingredientes
                </span>

                {/* Tabs Bar: 2 rows of 3 columns */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAddMode("search")}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      addMode === "search"
                        ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                        : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Buscar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMode("ia_text")}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      addMode === "ia_text"
                        ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                        : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Describir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMode("camera")}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      addMode === "camera"
                        ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                        : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMode("pantry")}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      addMode === "pantry"
                        ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                        : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>Despensa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddMode("custom")}
                    className={`py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                      addMode === "custom"
                        ? "bg-emerald-500 text-black border-emerald-400 font-black shadow-sm"
                        : "bg-white/[0.03] text-white/70 border-white/5 hover:bg-white/[0.06]"
                    }`}
                  >
                    <Star className="h-3.5 w-3.5" />
                    <span>Frecuentes</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="py-2 px-2 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25"
                  >
                    <Barcode className="h-3.5 w-3.5" />
                    <span>Escanear</span>
                  </button>
                </div>

                {/* Tab Content Drawer */}
                <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-2.5">
                  {/* Mode 1: Search Catalog */}
                  {addMode === "search" && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/40" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearchFoods(e.target.value)}
                          placeholder="Buscar ingrediente (ej: pan, atún, huevo, palta)..."
                          className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 font-medium"
                        />
                      </div>

                      {isSearching ? (
                        <div className="text-center py-3 text-[10px] text-white/40 flex items-center justify-center gap-1.5">
                          <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                          <span>Buscando alimentos...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="max-h-44 overflow-y-auto space-y-1 no-scrollbar divide-y divide-white/5">
                          {searchResults.map((f, i) => {
                            const isAdded = lastAddedName === f.name;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleAddFoodAsIngredient(f)}
                                className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                                  isAdded
                                    ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50"
                                    : "hover:bg-emerald-500/10 border-transparent"
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">{f.name}</span>
                                  <span className="text-[9px] text-white/40">{f.brand ? `${f.brand} · ` : ""}{f.servingSize}</span>
                                </div>
                                {isAdded ? (
                                  <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                    <Check className="h-3 w-3 stroke-[3]" /> ¡Agregado!
                                  </span>
                                ) : (
                                  <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">
                                    + {f.calories} kcal
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : searchQuery.trim() ? (
                        <p className="text-[10px] text-white/40 text-center py-2">No se encontraron resultados.</p>
                      ) : (
                        <p className="text-[10px] text-white/40 text-center py-2">Escribe para buscar ingredientes en la base de datos.</p>
                      )}
                    </div>
                  )}

                  {/* Mode 2: Describe with IA */}
                  {addMode === "ia_text" && (
                    <div className="space-y-2">
                      <textarea
                        value={iaDescription}
                        onChange={(e) => setIaDescription(e.target.value)}
                        placeholder="Describe el ingrediente, ej: 1 lata de atún al agua, 2 cucharadas de mayonesa light, 50g de queso..."
                        rows={2}
                        className="w-full p-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 font-medium resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          disabled={!iaDescription.trim() || isIaEstimating}
                          onClick={handleEstimateWithIa}
                          className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-[11px] font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {isIaEstimating ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Calculando...</span>
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
                          <div className="relative rounded-xl overflow-hidden border border-white/10 max-h-32 flex items-center justify-center bg-black/50">
                            <img src={photoData} alt="Preview" className="w-full h-32 object-contain" />
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
                            placeholder="Contexto opcional (ej: atún con mayonesa)..."
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
                                <span>Analizando...</span>
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
                        <label className="p-4 rounded-xl border border-dashed border-white/20 hover:border-emerald-500/40 bg-black/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition">
                          <Camera className="h-5 w-5 text-emerald-400" />
                          <span className="text-xs font-bold text-white/80">
                            Toma o sube una foto del ingrediente o etiqueta
                          </span>
                          <span className="text-[10px] text-white/40">
                            La IA extraerá el alimento y sus macronutrientes
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
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-white/40" />
                        <input
                          type="text"
                          value={pantryFilter}
                          onChange={(e) => setPantryFilter(e.target.value)}
                          placeholder="Filtrar despensa..."
                          className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none font-medium"
                        />
                      </div>

                      <div className="space-y-1 max-h-44 overflow-y-auto no-scrollbar">
                        {(() => {
                          const list = pantryItems.filter(p => !pantryFilter.trim() || p.name.toLowerCase().includes(pantryFilter.toLowerCase()));
                          if (list.length === 0) {
                            return <p className="text-[10px] text-white/40 text-center py-3">No hay productos en tu despensa {pantryFilter ? "que coincidan" : ""}.</p>;
                          }
                          return list.map((p, i) => {
                            const isAdded = lastAddedName === p.name;
                            return (
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
                                className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                                  isAdded
                                    ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50"
                                    : "hover:bg-emerald-500/10 border-white/5"
                                }`}
                              >
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">{p.name}</span>
                                  <span className="text-[9px] text-white/40 font-mono">Disponible: {p.quantity}</span>
                                </div>
                                {isAdded ? (
                                  <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                    <Check className="h-3 w-3 stroke-[3]" /> ¡Agregado!
                                  </span>
                                ) : (
                                  <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">+ {p.calories} kcal</span>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Mode 5: Frecuentes y Guardados */}
                  {addMode === "custom" && (
                    <div className="space-y-2.5">
                      <div className="relative">
                        <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-white/40" />
                        <input
                          type="text"
                          value={frequentFilter}
                          onChange={(e) => setFrequentFilter(e.target.value)}
                          placeholder="Filtrar favoritos o frecuentes..."
                          className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none font-medium"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-3 no-scrollbar">
                        {/* 1. Mis Comidas Guardadas / Favoritos */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block">
                            ⭐ Mis Alimentos Guardados ({customFoods.length})
                          </span>
                          {(() => {
                            const list = customFoods.filter(c => !frequentFilter.trim() || c.name.toLowerCase().includes(frequentFilter.toLowerCase()));
                            if (list.length === 0) {
                              return <p className="text-[9px] text-white/30 italic py-1">Sin alimentos guardados.</p>;
                            }
                            return list.map((c) => {
                              const isAdded = lastAddedName === c.name;
                              return (
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
                                  className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                                    isAdded
                                      ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50"
                                      : "hover:bg-emerald-500/10 border-white/5"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <span className="text-xs font-bold text-white block truncate">{c.name}</span>
                                    <span className="text-[9px] text-white/40 font-mono">{c.servingSize}</span>
                                  </div>
                                  {isAdded ? (
                                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                      <Check className="h-3 w-3 stroke-[3]" /> ¡Agregado!
                                    </span>
                                  ) : (
                                    <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">+ {c.calories} kcal</span>
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>

                        {/* 2. Alimentos Más Frecuentes del Diario */}
                        <div className="space-y-1 pt-1 border-t border-white/5">
                          <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider block">
                            🔁 Más Frecuentes de tu Diario ({frequentHistory.length})
                          </span>
                          {(() => {
                            const list = frequentHistory.filter(f => !frequentFilter.trim() || f.name.toLowerCase().includes(frequentFilter.toLowerCase()));
                            if (list.length === 0) {
                              return <p className="text-[9px] text-white/30 italic py-1">Sin historial de diario aún.</p>;
                            }
                            return list.map((f, i) => {
                              const isAdded = lastAddedName === f.name;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleAddFoodAsIngredient(f)}
                                  className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 cursor-pointer border ${
                                    isAdded
                                      ? "bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-400/50"
                                      : "hover:bg-emerald-500/10 border-white/5"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-white truncate">{f.name}</span>
                                      {f.count > 1 && (
                                        <span className="text-[8px] bg-emerald-500/15 text-emerald-400 font-mono px-1 rounded-sm font-bold">
                                          x{f.count}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-white/40 font-mono">{f.servingSize}</span>
                                  </div>
                                  {isAdded ? (
                                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                                      <Check className="h-3 w-3 stroke-[3]" /> ¡Agregado!
                                    </span>
                                  ) : (
                                    <span className="text-xs font-black text-emerald-400 shrink-0 font-mono">+ {f.calories} kcal</span>
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error messages */}
                  {iaError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{iaError}</span>
                    </div>
                  )}

                  {scannerError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{scannerError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SECTION: INGREDIENTES DEL PLATO (Placed below Agregar Ingredientes) */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-emerald-400" />
                    Ingredientes del Plato ({ingredients.length})
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">
                    {totalCalories} kcal acumuladas
                  </span>
                </div>

                {ingredients.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-1.5">
                    <p className="text-xs text-white/70 font-bold">
                      Aún no has agregado ingredientes.
                    </p>
                    <p className="text-[10px] text-white/40 max-w-xs mx-auto">
                      Usa el buscador, describe con IA, toma foto, escanea o elige de tu despensa arriba para armar el plato.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing) => (
                      <div
                        key={ing.id}
                        className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-between gap-3 transition hover:border-white/20"
                      >
                        {/* Info Column */}
                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Row 1: Porción (pill en la parte superior) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-mono">
                              {ing.amount} {ing.unit === "unit" ? (ing.amount === 1 ? ing.unitLabel : ing.unitLabel + "s") : ing.unit}
                              {ing.unit === "unit" && ing.equivalentGrams ? ` · ${ing.equivalentGrams}g` : ""}
                            </span>
                          </div>

                          {/* Row 2: Nombre del Alimento */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white truncate">
                              {ing.name}
                            </span>
                            {ing.hasNutritionWarning && (
                              <span 
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[8.5px] font-bold text-amber-400"
                                title={ing.nutritionWarningReason || "Valores sospechosos en origen. Te recomendamos verificar."}
                              >
                                <AlertCircle className="h-2.5 w-2.5" />
                                Revisar macros
                              </span>
                            )}
                          </div>

                          {/* Row 3: Macros con colores */}
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9.5px] font-black font-mono text-orange-400">
                              🔥 {ing.calories} kcal
                            </span>
                            <span className="text-[9.5px] font-bold font-mono text-emerald-400">
                              🥩 P: {ing.protein}g
                            </span>
                            <span className="text-[9.5px] font-bold font-mono text-sky-400">
                              ⚡ C: {ing.carbs}g
                            </span>
                            <span className="text-[9.5px] font-bold font-mono text-amber-400">
                              🥑 G: {ing.fat}g
                            </span>
                          </div>
                        </div>

                        {/* Actions: Pencil (Edit) on top, Trash (Delete) below */}
                        <div className="flex flex-col gap-1 items-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditIngredient(ing)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-emerald-400 transition cursor-pointer"
                            title="Editar porción"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setIngredientToDelete(ing)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition cursor-pointer"
                            title="Eliminar ingrediente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Step 1: Armar Plato action */}
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
                disabled={ingredients.length === 0}
                onClick={() => setStep("summary")}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 disabled:text-white/30 text-black text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <span>Armar Plato</span>
                <span>→</span>
              </button>
            </div>
          </>
        )}

        {/* ─── STEP 2: SUMMARY (Resumen del Plato & Registrar) ─── */}
        {step === "summary" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">

              {/* Dish Name Card */}
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block">
                  Nombre del Plato
                </span>
                <h4 className="text-base font-black text-white">
                  {dishName.trim() || (initialMeal ? initialMeal.name : "Sándwich o Plato Compuesto")}
                </h4>
              </div>

              {/* Consolidated Macros Banner */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                    Total Consolidado
                  </span>
                  <span className="text-lg font-black text-white font-mono flex items-center gap-1">
                    <Flame className="h-4 w-4 text-orange-400 fill-orange-400" />
                    {totalCalories} kcal
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/20">
                    <span className="text-[8.5px] font-bold text-emerald-400 uppercase block">Proteína</span>
                    <span className="text-sm font-black text-white font-mono">{totalProtein}g</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-sky-500/20">
                    <span className="text-[8.5px] font-bold text-sky-400 uppercase block">Carbos</span>
                    <span className="text-sm font-black text-white font-mono">{totalCarbs}g</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20">
                    <span className="text-[8.5px] font-bold text-amber-400 uppercase block">Grasas</span>
                    <span className="text-sm font-black text-white font-mono">{totalFat}g</span>
                  </div>
                </div>
              </div>

              {/* Save as favorite toggle (if creating new) */}
              {!initialMeal && (
                <label className="flex items-center gap-2.5 text-xs text-white/80 cursor-pointer p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition">
                  <input
                    type="checkbox"
                    checked={saveAsCustom}
                    onChange={(e) => setSaveAsCustom(e.target.checked)}
                    className="rounded border-white/20 text-emerald-500 focus:ring-0 w-4 h-4"
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400/20" />
                    Guardar como plato favorito para registrarlo en 1 click otro día
                  </span>
                </label>
              )}
            </div>

            {/* Footer Step 2: Final Save to Diary */}
            <div className="p-4 border-t border-white/5 bg-[#121420] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep("build")}
                className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition cursor-pointer"
              >
                Volver
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
                    <span>Guardando...</span>
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
          </>
        )}
      </motion.div>

      {/* ─── INGREDIENT EDIT SUB-MODAL ─── */}
      <AnimatePresence>
        {editingIngredient && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#151624] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Pencil className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Editar Porción
                    </h3>
                    <p className="text-[10px] text-white/50 truncate max-w-[200px]">
                      {editingIngredient.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Amount & Unit selection */}
              <div className="space-y-3">
                <div>
                  <label className="text-[9.5px] font-bold text-white/50 uppercase tracking-wider block mb-1">
                    Cantidad
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={editUnit === "unit" ? "1" : "5"}
                      min="0.1"
                      value={editAmount}
                      onChange={(e) => setEditAmount(parseFloat(e.target.value) || 1)}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-sm font-bold font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-xs font-bold text-white/70 px-2 py-2 bg-white/5 rounded-xl border border-white/5">
                      {editUnit === "unit" ? editingIngredient.unitLabel : editUnit}
                    </span>
                  </div>
                </div>

                {/* Unit Switcher if applicable */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditUnit("unit")}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                      editUnit === "unit"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-white/5 text-white/50 border-white/5"
                    }`}
                  >
                    Porción / {editingIngredient.unitLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUnit("g")}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                      editUnit === "g"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-white/5 text-white/50 border-white/5"
                    }`}
                  >
                    Gramos (g)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUnit("ml")}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold border transition ${
                      editUnit === "ml"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-white/5 text-white/50 border-white/5"
                    }`}
                  >
                    Mililitros (ml)
                  </button>
                </div>

                {/* Live Macro Preview */}
                {editingPreview && (
                  <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-1.5 text-center">
                    <span className="text-sm font-black font-mono text-orange-400 block">
                      🔥 {editingPreview.calories} kcal
                    </span>
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono font-bold">
                      <span className="text-emerald-400">P: {editingPreview.protein}g</span>
                      <span className="text-sky-400">C: {editingPreview.carbs}g</span>
                      <span className="text-amber-400">G: {editingPreview.fat}g</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedIngredient}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition shadow-lg shadow-emerald-500/20"
                >
                  Guardar Porción
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal for Ingredients */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
      />

      {/* Community Barcode Crowdsourcing Modal */}
      <AddMissingBarcodeModal
        isOpen={isMissingBarcodeModalOpen}
        barcode={missingBarcode}
        onClose={() => setIsMissingBarcodeModalOpen(false)}
        onProductCreated={(food) => {
          handleAddFoodAsIngredient(food);
        }}
        apiKey={apiKey}
        userName={userId}
      />

      {/* Confirmation Modal: Delete Ingredient */}
      <AnimatePresence>
        {ingredientToDelete && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#12131d] border border-rose-500/20 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">¿Quitar ingrediente?</h3>
                  <p className="text-[11px] text-white/50">Se descontará del plato y de los macros totales.</p>
                </div>
              </div>

              <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl space-y-1">
                <span className="text-xs font-bold text-white block">{ingredientToDelete.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {ingredientToDelete.amount} {ingredientToDelete.unit === "unit" ? (ingredientToDelete.amount === 1 ? ingredientToDelete.unitLabel : ingredientToDelete.unitLabel + "s") : ingredientToDelete.unit} · {ingredientToDelete.calories} kcal
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIngredientToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleRemoveIngredient(ingredientToDelete.id);
                    setIngredientToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-rose-500/20"
                >
                  Sí, Quitar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
