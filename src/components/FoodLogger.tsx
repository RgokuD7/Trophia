import React, { useState, useEffect } from "react";
import { Search, Camera, Plus, History, Trash, AlertCircle, Check, X, RefreshCw, Star, Barcode, Sparkles, HelpCircle } from "lucide-react";
import { LoggedMeal, FoodItem, MealType, BarcodeCorrection, CustomFood } from "../types";
import { GLOBAL_FOODS_DB } from "../utils/fitnessUtils";
import { analyzeFoodByIA, estimateMacrosFromDescription, getVisualServingSizesByIA, analyzeNutritionLabelByIA } from "../services/geminiService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { searchAllFoods, getProductByBarcode } from "../services/foodDatabaseService";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { getBarcodeCorrection, saveBarcodeCorrection, voteBarcodeCorrection, addCustomFood, getCustomFoods } from "../services/dbService";

interface FoodLoggerProps {
  apiKey?: string;
  usdaApiKey?: string;
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  loggedMeals: LoggedMeal[];
  onClose: () => void;
  defaultMealType?: MealType;
  userId?: string;
  isCustomFoodOnlyMode?: boolean;
  onCustomFoodAdded?: () => void;
  mode?: "log" | "pantry";
}

export function getDefaultServingInfo(name: string, servingSizeStr: string): {
  defaultUnit: "g" | "ml" | "unit";
  unitWeight: number;
  unitLabel: string;
} {
  const lowercaseName = name.toLowerCase();
  const lowercaseServing = (servingSizeStr || "").toLowerCase();

  let unitLabel = "unidad";
  let unitWeight = 100;
  let defaultUnit: "g" | "ml" | "unit" = "g";

  if (lowercaseName.includes("leche") || lowercaseName.includes("bebida") || lowercaseName.includes("jugo") || lowercaseName.includes("aceite") || lowercaseName.includes("agua") || lowercaseServing.includes("ml")) {
    defaultUnit = "ml";
    unitLabel = "ml";
  }

  if (lowercaseName.includes("huevo")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 50;
  } else if (lowercaseName.includes("pan ") || lowercaseName.includes("pan integral") || lowercaseName.includes("tostada") || lowercaseName.includes("rebanada") || lowercaseName.includes("marraqueta") || lowercaseName.includes("hallulla")) {
    defaultUnit = "unit";
    unitLabel = "rebanada";
    unitWeight = 25;
  } else if (lowercaseName.includes("plátano") || lowercaseName.includes("banana")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 120;
  } else if (lowercaseName.includes("manzana")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 150;
  } else if (lowercaseName.includes("naranja")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 130;
  } else if (lowercaseName.includes("yogur") || lowercaseName.includes("pot")) {
    defaultUnit = "unit";
    unitLabel = "pote";
    unitWeight = 125;
  } else if (lowercaseName.includes("galleta")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 10;
  } else if (lowercaseName.includes("tortilla")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 30;
  }

  if (servingSizeStr) {
    const parenMatch = servingSizeStr.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
    const directMatch = servingSizeStr.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    const spaceMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    
    let totalWeight = 0;
    if (parenMatch) {
      totalWeight = parseFloat(parenMatch[1]);
    } else if (directMatch) {
      totalWeight = parseFloat(directMatch[1]);
    } else if (spaceMatch) {
      totalWeight = parseFloat(spaceMatch[1]);
    }

    if (totalWeight > 0) {
      const countMatch = servingSizeStr.match(/(\d+)\s*(?:slice|rebanada|cookie|galleta|unit|pieza|huevo|pan|vaso|taza|botella|lata|envase|pote|porcion|porción)/i);
      const count = countMatch ? parseInt(countMatch[1]) : 1;
      unitWeight = Math.round(totalWeight / count);
      
      const lowerServing = servingSizeStr.toLowerCase();
      if (lowerServing.includes("slice") || lowerServing.includes("rebanada")) {
        unitLabel = "rebanada";
        defaultUnit = "unit";
      } else if (lowerServing.includes("cookie") || lowerServing.includes("galleta")) {
        unitLabel = "galleta";
        defaultUnit = "unit";
      } else if (lowerServing.includes("vaso")) {
        unitLabel = "vaso";
        defaultUnit = "unit";
      } else if (lowerServing.includes("cup") || lowerServing.includes("taza")) {
        unitLabel = "taza";
        defaultUnit = "unit";
      } else if (lowerServing.includes("bottle") || lowerServing.includes("botella")) {
        unitLabel = "botella";
        defaultUnit = "unit";
      } else if (lowerServing.includes("can") || lowerServing.includes("lata")) {
        unitLabel = "lata";
        defaultUnit = "unit";
      } else if (lowerServing.includes("pot") || lowerServing.includes("pote") || lowerServing.includes("envase")) {
        unitLabel = "pote";
        defaultUnit = "unit";
      } else if (lowerServing.includes("bar") || lowerServing.includes("barra")) {
        unitLabel = "barra";
        defaultUnit = "unit";
      } else if (lowerServing.includes("pack") || lowerServing.includes("paquete")) {
        unitLabel = "paquete";
        defaultUnit = "unit";
      } else {
        unitLabel = "porción";
        if (unitWeight !== 100) {
          defaultUnit = "unit";
        }
      }
    }
  }

  return { defaultUnit, unitWeight, unitLabel };
}

export const formatMacro = (val: number | string | undefined): string => {
  if (val === undefined || val === "") return "0";
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
};

export default function FoodLogger({
  apiKey,
  usdaApiKey,
  onAddMeal,
  loggedMeals,
  onClose,
  defaultMealType,
  userId,
  isCustomFoodOnlyMode = false,
  onCustomFoodAdded,
  mode = "log"
}: FoodLoggerProps) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_SYSTEM_GEMINI_API_KEY || (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_api_key") : "") || "";
  const [activeTab, setActiveTab] = useState<"search" | "camera" | "personal">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>(defaultMealType || "lunch");

  useEffect(() => {
    if (defaultMealType) {
      setSelectedMealType(defaultMealType);
    }
  }, [defaultMealType]);

  useEffect(() => {
    if (isCustomFoodOnlyMode) {
      handleCreateCustom();
    }
  }, [isCustomFoodOnlyMode]);
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState<number | "">("");
  const [customProtein, setCustomProtein] = useState<number | "">("");
  const [customCarbs, setCustomCarbs] = useState<number | "">("");
  const [customFat, setCustomFat] = useState<number | "">("");
  const [portionGrams, setPortionGrams] = useState(100);
  const [alsoSaveToCustom, setAlsoSaveToCustom] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customFoodsList, setCustomFoodsList] = useState<CustomFood[]>([]);
  const [isLoadingCustomList, setIsLoadingCustomList] = useState(false);

  useEffect(() => {
    if (userId) {
      setIsLoadingCustomList(true);
      getCustomFoods(userId)
        .then((foods) => {
          setCustomFoodsList(foods);
        })
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingCustomList(false));
    }
  }, [userId]);

  // New portion unit states
  const [portionUnit, setPortionUnit] = useState<"g" | "ml" | "unit">("g");
  const [unitWeight, setUnitWeight] = useState(100);
  const [unitLabel, setUnitLabel] = useState("unidad");
  const [portionValue, setPortionValue] = useState(100);

  // IA estimation for manual custom foods
  const [showIaEstimation, setShowIaEstimation] = useState(false);
  const [iaDescription, setIaDescription] = useState("");
  const [isEstimating, setIsEstimating] = useState(false);
  const [iaEstimationError, setIaEstimationError] = useState<string | null>(null);

  // Community correction states
  const [communityCorrection, setCommunityCorrection] = useState<BarcodeCorrection | null>(null);
  const [showCommunityPrompt, setShowCommunityPrompt] = useState(false);
  const [isCorrectingBarcode, setIsCorrectingBarcode] = useState(false);
  const [showBarcodeHelp, setShowBarcodeHelp] = useState(false);
  const [barcodeSaveSuccess, setBarcodeSaveSuccess] = useState(false);
  const [isScanningLabel, setIsScanningLabel] = useState(false);
  const [labelScanError, setLabelScanError] = useState<string | null>(null);

  // IA visual portions states
  const [visualPortions, setVisualPortions] = useState<{ label: string; value: number }[]>([]);
  const [isLoadingPortions, setIsLoadingPortions] = useState(false);
  const [portionsError, setPortionsError] = useState<string | null>(null);
  const [showPortionsInfo, setShowPortionsInfo] = useState(false);

  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Search Results
  const [filteredFoods, setFilteredFoods] = useState<FoodItem[]>([]);

  // Camera Analysis
  const [foodPhoto, setFoodPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [correction, setCorrection] = useState("");
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Favorites / Personal History
  const [personalHistory, setPersonalHistory] = useState<FoodItem[]>([]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    // Dynamically suggest meal type based on local time
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) {
      setSelectedMealType("breakfast");
    } else if (hour >= 11 && hour < 16) {
      setSelectedMealType("lunch");
    } else if (hour >= 16 && hour < 20) {
      setSelectedMealType("snack");
    } else {
      setSelectedMealType("dinner");
    }

    // Load personal history of foods from loggedMeals
    const uniqueFoods: FoodItem[] = [];
    const seenNames = new Set<string>();

    loggedMeals.forEach(m => {
      if (!seenNames.has(m.name.toLowerCase())) {
        seenNames.add(m.name.toLowerCase());
        uniqueFoods.push({
          name: m.name,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          servingSize: "1 Ración"
        });
      }
    });

    setPersonalHistory(uniqueFoods);
  }, [loggedMeals]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFoods([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    const delayDebounce = setTimeout(async () => {
      try {
        const results = await searchAllFoods(searchQuery, personalHistory, usdaApiKey);
        setFilteredFoods(results);
      } catch (err: any) {
        console.error("Error fetching foods:", err);
        setSearchError("Error al conectar con las bases de datos de alimentos.");
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, personalHistory, usdaApiKey]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    
    // Reset community correction and portion assistant states
    setCommunityCorrection(null);
    setShowCommunityPrompt(false);
    setIsCorrectingBarcode(false);
    setBarcodeSaveSuccess(false);
    setVisualPortions([]);
    setShowPortionsInfo(false);
    setPortionsError(null);

    const info = getDefaultServingInfo(food.name, food.servingSize);
    setPortionUnit(info.defaultUnit);
    setUnitWeight(info.unitWeight);
    setUnitLabel(info.unitLabel);
    
    const initialVal = info.defaultUnit === "unit" ? 1 : 100;
    setPortionValue(initialVal);
    setPortionGrams(info.defaultUnit === "unit" ? info.unitWeight : 100);

    const displayName = food.brand ? `${food.name} (${food.brand.split(',')[0].trim()})` : food.name;
    setCustomName(displayName);

    const scale = info.defaultUnit === "unit" ? info.unitWeight / 100 : 1;
    setCustomCalories(Math.round(food.calories * scale));
    setCustomProtein(Number((food.protein * scale).toFixed(1)));
    setCustomCarbs(Number((food.carbs * scale).toFixed(1)));
    setCustomFat(Number((food.fat * scale).toFixed(1)));

    // Check Firestore for community correction if it has a barcode
    if (food.barcode) {
      getBarcodeCorrection(food.barcode).then((correction) => {
        if (correction) {
          const netVotes = (correction.yesVotes || 0) - (correction.noVotes || 0);
          if (netVotes >= 0) {
            setCommunityCorrection(correction);
            setShowCommunityPrompt(true);
          }
        }
      }).catch((err) => console.error("Error checking barcode correction:", err));
    }
  };

  const updatePortion = (val: number, unit = portionUnit) => {
    const validVal = Math.max(0.1, val);
    setPortionValue(validVal);
    
    let equivalentGrams = validVal;
    if (unit === "unit") {
      equivalentGrams = validVal * unitWeight;
    }
    setPortionGrams(Math.round(equivalentGrams));

    if (selectedFood && selectedFood.name !== "") {
      const scale = equivalentGrams / 100;
      setCustomCalories(Math.round(selectedFood.calories * scale));
      setCustomProtein(Number((selectedFood.protein * scale).toFixed(1)));
      setCustomCarbs(Number((selectedFood.carbs * scale).toFixed(1)));
      setCustomFat(Number((selectedFood.fat * scale).toFixed(1)));
    }
  };

  const handleUnitChange = (newUnit: "g" | "ml" | "unit") => {
    setPortionUnit(newUnit);
    if (newUnit === "unit") {
      updatePortion(1, "unit");
    } else {
      updatePortion(unitWeight > 0 ? unitWeight : 100, newUnit);
    }
  };

  const handleCreateCustom = () => {
    const dummyFood: FoodItem = {
      name: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: "100g",
      source: "local"
    };
    setSelectedFood(dummyFood);
    setPortionGrams(100);
    setCustomName("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
  };

  const handleEstimateMacrosByText = async () => {
    if (!iaDescription.trim()) return;
    setIsEstimating(true);
    setIaEstimationError(null);

    try {
      const data = await estimateMacrosFromDescription(effectiveApiKey, iaDescription.trim());
      if (data) {
        setCustomName(data.name || "Alimento IA");
        setCustomCalories(data.calories || 0);
        setCustomProtein(Number(data.protein) || 0);
        setCustomCarbs(Number(data.carbs) || 0);
        setCustomFat(Number(data.fat) || 0);
        
        const foodItem: FoodItem = {
          name: "",
          calories: data.calories || 0,
          protein: Number(data.protein) || 0,
          carbs: Number(data.carbs) || 0,
          fat: Number(data.fat) || 0,
          servingSize: data.servingSize || "1 porción",
          source: "local",
          ingredients: data.ingredients || []
        };
        setSelectedFood(foodItem);
        setShowIaEstimation(false);
        setIaDescription("");
      } else {
        setIaEstimationError("No se pudo estimar los macros del alimento. Intenta describirlo de otra forma.");
      }
    } catch (err: any) {
      console.error(err);
      setIaEstimationError(`Error al estimar macros con IA: ${err.message || "Fallo de conexión"}`);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleAcceptCommunityCorrection = async () => {
    if (!communityCorrection || !selectedFood?.barcode) return;
    setShowCommunityPrompt(false);
    
    const scale = portionUnit === "unit" ? unitWeight / 100 : portionValue / 100;
    setCustomCalories(Math.round(communityCorrection.calories * scale));
    setCustomProtein(Number((communityCorrection.protein * scale).toFixed(1)));
    setCustomCarbs(Number((communityCorrection.carbs * scale).toFixed(1)));
    setCustomFat(Number((communityCorrection.fat * scale).toFixed(1)));
    
    setSelectedFood(prev => prev ? {
      ...prev,
      calories: communityCorrection.calories,
      protein: communityCorrection.protein,
      carbs: communityCorrection.carbs,
      fat: communityCorrection.fat
    } : null);

    voteBarcodeCorrection(selectedFood.barcode, true).catch(err => console.error(err));
  };

  const handleRejectCommunityCorrection = () => {
    if (!selectedFood?.barcode) return;
    setShowCommunityPrompt(false);
    voteBarcodeCorrection(selectedFood.barcode, false).catch(err => console.error(err));
  };

  const handleSaveBarcodeCorrection = async () => {
    if (!selectedFood?.barcode || !customName) return;
    setIsCorrectingBarcode(true);
    setBarcodeSaveSuccess(false);

    try {
      const barcode = selectedFood.barcode;
      const scale = portionUnit === "unit" ? unitWeight / 100 : portionValue / 100;
      
      const baseCal = Math.round(Number(customCalories) / scale);
      const baseProt = Number((Number(customProtein) / scale).toFixed(1));
      const baseCarb = Number((Number(customCarbs) / scale).toFixed(1));
      const baseFat = Number((Number(customFat) / scale).toFixed(1));

      await saveBarcodeCorrection(barcode, {
        barcode,
        name: customName,
        calories: baseCal,
        protein: baseProt,
        carbs: baseCarb,
        fat: baseFat
      });

      setSelectedFood(prev => prev ? {
        ...prev,
        calories: baseCal,
        protein: baseProt,
        carbs: baseCarb,
        fat: baseFat
      } : null);

      setBarcodeSaveSuccess(true);
      setIsCorrectingBarcode(false);
    } catch (err) {
      console.error(err);
      setIsCorrectingBarcode(false);
    }
  };

  const handleLabelPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isManualMode = !selectedFood || selectedFood.name === "";

    setIsScanningLabel(true);
    setLabelScanError(null);
    if (!isManualMode) {
      setIsCorrectingBarcode(true);
    }
    setBarcodeSaveSuccess(false);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Image = reader.result as string;
        const data = await analyzeNutritionLabelByIA(effectiveApiKey, base64Image);
        
        if (data && data.calories !== undefined) {
          const scale = portionUnit === "unit" ? unitWeight / 100 : portionValue / 100;
          setCustomCalories(Math.round(data.calories * scale));
          setCustomProtein(Number((data.protein * scale).toFixed(1)));
          setCustomCarbs(Number((data.carbs * scale).toFixed(1)));
          setCustomFat(Number((data.fat * scale).toFixed(1)));
          if (isManualMode && data.productName) {
            setCustomName(data.productName);
          }
        } else {
          setLabelScanError("No se pudo detectar una tabla de información nutricional legible. Intenta con otra foto.");
          setIsCorrectingBarcode(false);
        }
      } catch (err: any) {
        console.error("Error doing OCR label scan:", err);
        setLabelScanError(`Error al escanear la tabla: ${err.message || "Fallo de conexión"}`);
        setIsCorrectingBarcode(false);
      } finally {
        setIsScanningLabel(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLoadVisualPortions = async () => {
    if (!selectedFood) return;
    setIsLoadingPortions(true);
    setPortionsError(null);
    try {
      const data = await getVisualServingSizesByIA(effectiveApiKey, selectedFood.name);
      if (data && Array.isArray(data.suggestions)) {
        setVisualPortions(data.suggestions);
        setShowPortionsInfo(true);
      } else {
        setPortionsError("No se encontraron porciones comunes para este alimento.");
      }
    } catch (err: any) {
      console.error(err);
      setPortionsError("Error al obtener porciones por IA.");
    } finally {
      setIsLoadingPortions(false);
    }
  };

  const handleBarcodeScanSuccess = async (barcode: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const product = await getProductByBarcode(barcode);
      if (product) {
        handleSelectFood(product);
      } else {
        setSearchError("Producto no encontrado por código de barras.");
      }
    } catch (err: any) {
      console.error("Error al buscar producto por código de barras:", err);
      setSearchError("Error al buscar producto por código de barras.");
    } finally {
      setIsSearching(false);
    }
  };

  const getSourceBadge = (source?: "local" | "history" | "usda" | "off", brand?: string) => {
    switch (source) {
      case "history":
        return (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            Frecuente
          </span>
        );
      case "usda":
        return (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
            Natural
          </span>
        );
      case "off":
        return (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0 truncate max-w-[80px]">
            {brand ? brand.split(",")[0] : "Marca"}
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-white/10 text-white/50 border border-white/5 shrink-0">
            Local
          </span>
        );
    }
  };

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
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.82);
          setFoodPhoto(compressedDataUrl);
        } else {
          setFoodPhoto(rawDataUrl);
        }
      };
      img.onerror = () => setFoodPhoto(rawDataUrl);
      img.src = rawDataUrl;

      setAiError(null);
      setDescription(""); // Reset description for a new photo
      setCorrection("");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeFood = async () => {
    if (!foodPhoto) return;
    setIsAnalyzing(true);
    setAiError(null);

    try {
      const data = await analyzeFoodByIA(effectiveApiKey, {
        image: foodPhoto,
        mealType: selectedMealType,
        description: description.trim() || undefined
      });
      if (data) {
        const estimatedGrams = Math.max(1, Number(data.estimatedGrams) || (data.servingSize ? (parseFloat(data.servingSize.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i)?.[1] || "100")) : 100));
        const servingLabel = data.servingSize || (data.isPackagedProduct ? `1 paquete (${estimatedGrams}g)` : `1 porción (${estimatedGrams}g)`);

        // Base food scaled to 100g so portion multiplier works accurately
        const scaleTo100 = 100 / estimatedGrams;
        const foodItem: FoodItem = {
          name: data.name,
          calories: Math.round(data.calories * scaleTo100),
          protein: Number((data.protein * scaleTo100).toFixed(1)),
          carbs: Number((data.carbs * scaleTo100).toFixed(1)),
          fat: Number((data.fat * scaleTo100).toFixed(1)),
          servingSize: servingLabel,
          source: "local",
          ingredients: data.ingredients
        };

        setSelectedFood(foodItem);
        setPortionUnit("unit");
        setUnitWeight(estimatedGrams);
        setUnitLabel(data.isPackagedProduct ? "paquete/unidad" : "porción");
        setPortionValue(1);
        setPortionGrams(estimatedGrams);

        setCustomName(data.name);
        setCustomCalories(data.calories);
        setCustomProtein(Number(Number(data.protein).toFixed(1)));
        setCustomCarbs(Number(Number(data.carbs).toFixed(1)));
        setCustomFat(Number(Number(data.fat).toFixed(1)));
      } else {
        setAiError("La IA no pudo procesar la imagen de comida. Reintenta o ingresa los detalles manuales.");
      }
    } catch (err: any) {
      setAiError(`La IA de Gemini no pudo analizar la imagen. Por favor guarda la foto e inténtalo más tarde. Detalles: ${err.message || "Fallo de conexión"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCorrectFood = async () => {
    if (!correction.trim() || !selectedFood) return;
    setIsCorrecting(true);
    setAiError(null);

    try {
      const data = await analyzeFoodByIA(effectiveApiKey, {
        image: foodPhoto,
        mealType: selectedMealType,
        existingIngredients: selectedFood.ingredients || [],
        correction: correction.trim()
      });

      if (data) {
        const estimatedGrams = Math.max(1, Number(data.estimatedGrams) || (data.servingSize ? (parseFloat(data.servingSize.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i)?.[1] || "100")) : 100));
        const servingLabel = data.servingSize || (data.isPackagedProduct ? `1 paquete (${estimatedGrams}g)` : `1 porción (${estimatedGrams}g)`);

        const scaleTo100 = 100 / estimatedGrams;
        const foodItem: FoodItem = {
          name: data.name,
          calories: Math.round(data.calories * scaleTo100),
          protein: Number((data.protein * scaleTo100).toFixed(1)),
          carbs: Number((data.carbs * scaleTo100).toFixed(1)),
          fat: Number((data.fat * scaleTo100).toFixed(1)),
          servingSize: servingLabel,
          source: "local",
          ingredients: data.ingredients
        };

        setSelectedFood(foodItem);
        setPortionUnit("unit");
        setUnitWeight(estimatedGrams);
        setUnitLabel(data.isPackagedProduct ? "paquete/unidad" : "porción");
        setPortionValue(1);
        setPortionGrams(estimatedGrams);

        setCustomName(data.name);
        setCustomCalories(data.calories);
        setCustomProtein(Number(Number(data.protein).toFixed(1)));
        setCustomCarbs(Number(Number(data.carbs).toFixed(1)));
        setCustomFat(Number(Number(data.fat).toFixed(1)));
        setCorrection(""); // Clear correction input
      } else {
        setAiError("No se pudo procesar la corrección por IA.");
      }
    } catch (err: any) {
      setAiError(`Error al procesar la corrección: ${err.message || "Fallo de conexión"}`);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSaveMeal = async () => {
    if (!customName) return;

    setIsSavingCustom(true);
    try {
      const calVal = Number(customCalories) || 0;
      const protVal = Number(customProtein) || 0;
      const carbVal = Number(customCarbs) || 0;
      const fatVal = Number(customFat) || 0;
      const servVal = `${portionValue}${portionUnit === "unit" ? " unidad" : portionUnit}`;

      if (isCustomFoodOnlyMode) {
        if (userId) {
          await addCustomFood(userId, {
            name: customName,
            calories: calVal,
            protein: protVal,
            carbs: carbVal,
            fat: fatVal,
            servingSize: servVal,
            category: "dish",
            createdAt: new Date().toISOString()
          });
          if (onCustomFoodAdded) {
            onCustomFoodAdded();
          }
        }
      } else {
        // Normal log
        onAddMeal({
          name: customName,
          calories: calVal,
          protein: protVal,
          carbs: carbVal,
          fat: fatVal,
          type: selectedMealType,
          servingSize: servVal
        });

        // Also save to template collection
        if (alsoSaveToCustom && userId) {
          await addCustomFood(userId, {
            name: customName,
            calories: calVal,
            protein: protVal,
            carbs: carbVal,
            fat: fatVal,
            servingSize: servVal,
            category: "dish",
            createdAt: new Date().toISOString()
          });
        }
      }
      onClose();
    } catch (err) {
      console.error("Error in handleSaveMeal:", err);
    } finally {
      setIsSavingCustom(false);
    }
  };

  const pKcal = (Number(customProtein) || 0) * 4;
  const cKcal = (Number(customCarbs) || 0) * 4;
  const fKcal = (Number(customFat) || 0) * 9;
  const totalKcal = pKcal + cKcal + fKcal;
  const pPct = totalKcal > 0 ? Math.round((pKcal / totalKcal) * 100) : 0;
  const cPct = totalKcal > 0 ? Math.round((cKcal / totalKcal) * 100) : 0;
  const fPct = totalKcal > 0 ? Math.round((fKcal / totalKcal) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end md:justify-center p-0 md:p-4">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-[#12131d]/95 border border-gray-200 dark:border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl h-[90vh] md:h-[650px] flex flex-col overflow-hidden relative text-gray-900 dark:text-white backdrop-blur-md">
        
        {/* Background Neon Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[250px] h-[250px] bg-emerald-500 opacity-[0.05] rounded-full blur-[80px]"></div>
        </div>

        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-shrink-0 z-10 bg-white/80 dark:bg-[#12131d]/80 backdrop-blur-md">
          <div>
            <h3 className="text-base font-black text-gray-900 dark:text-white italic tracking-tight font-sans">
              {mode === "pantry" ? "Agregar a Mi Despensa" : isCustomFoodOnlyMode ? "Guardar en Mis Comidas" : "Registrar Alimento"}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-widest font-mono">
              {mode === "pantry" ? "Inventario de Ingredientes" : isCustomFoodOnlyMode ? "Platos y Productos Frecuentes" : "Control Diario de Ingesta"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Meal Type selection */}
        {mode !== "pantry" && !isCustomFoodOnlyMode && (
          <div className="px-5 pt-4 flex gap-1.5 flex-shrink-0 z-10 font-sans">
            {[
              { id: "breakfast", label: "Desayuno", emoji: "🍳" },
              { id: "lunch", label: "Almuerzo", emoji: "🥩" },
              { id: "snack", label: "Snack", emoji: "🍎" },
              { id: "dinner", label: "Cena", emoji: "🥗" }
            ].map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedMealType(type.id as MealType)}
                className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer ${
                  selectedMealType === type.id
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                    : "bg-gray-50 hover:bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-550 dark:text-white/50"
                }`}
              >
                <span className="mr-1">{type.emoji}</span>
                {type.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Selection */}
        {selectedFood === null && (
          <div className="px-5 pt-3 flex border-b border-gray-100 dark:border-white/5 flex-shrink-0 z-10">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition cursor-pointer ${
                activeTab === "search" ? "border-emerald-500 text-emerald-500 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-white/40"
              }`}
            >
              Buscar Alimento
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "camera" ? "border-emerald-500 text-emerald-500 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-white/40"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Fotografía IA
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition cursor-pointer ${
                activeTab === "personal" ? "border-emerald-500 text-emerald-500 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-white/40"
              }`}
            >
              Frecuentes
            </button>
          </div>
        )}

        {/* Content body */}
        <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-4 z-10">
          
          {selectedFood === null ? (
            <>
              {activeTab === "search" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      icon={Search}
                      placeholder="Buscar comida (ej: pollo, arroz, huevo)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-2xl pl-11 focus:border-emerald-500/30"
                      size="md"
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3 bg-emerald-500 hover:bg-emerald-600 border border-emerald-500 rounded-2xl flex items-center justify-center text-white transition shrink-0 cursor-pointer"
                      title="Escanear Código de Barras"
                    >
                      <Barcode className="h-5 w-5" />
                    </button>
                  </div>
                         {/* Create Custom Food Shortcut */}
                  <button
                    type="button"
                    onClick={handleCreateCustom}
                    className="w-full py-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-emerald-500/30 text-white/70 hover:text-white rounded-xl transition flex items-center justify-center gap-1.5 font-bold text-xs cursor-pointer shadow-sm"
                  >
                    <Plus className="h-4 w-4 text-emerald-400" />
                    Crear Alimento Personalizado
                  </button>

                  {/* Search Error banner */}
                  {searchError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-[10.5px] text-rose-400 font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {/* Autocomplete list */}
                  {isSearching ? (
                    <div className="text-center py-6 text-xs text-gray-500 dark:text-white/40">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 mx-auto mb-2" />
                      Buscando en bases de datos...
                    </div>
                  ) : filteredFoods.length > 0 ? (
                    <div className="border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/30 max-h-[380px] overflow-y-auto no-scrollbar divide-y divide-gray-150 dark:divide-white/5 shadow-inner">
                      {filteredFoods.map((food, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectFood(food)}
                          className="w-full p-3.5 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition flex justify-between items-center gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 flex-1 min-w-0">
                            {food.image ? (
                              <img
                                src={food.image}
                                alt={food.name}
                                className="w-14 h-14 rounded-2xl object-cover border border-gray-205 dark:border-white/10 bg-gray-100 dark:bg-black/20 shrink-0 shadow-md"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-205 dark:border-white/10 flex items-center justify-center shrink-0 text-xl shadow-sm">
                                🍎
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{food.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {getSourceBadge(food.source, food.brand)}
                                <span className="text-[9.5px] text-gray-400 dark:text-white/40 font-medium">{food.servingSize} base</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-xs font-black text-emerald-500">
                              {food.calories} kcal
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-white/40 block font-mono">
                              P: {formatMacro(food.protein)}g · C: {formatMacro(food.carbs)}g
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() !== "" ? (
                    <div className="text-center py-4 text-xs text-gray-500 dark:text-white/30">
                      No se encontraron alimentos en la base de datos de Trophia.
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "camera" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500 dark:text-white/50 leading-normal">
                    Sube una foto de tu plato. El modelo de IA identificará los ingredientes y calculará proteínas, carbohidratos, grasas y calorías de manera conservadora.
                  </p>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-500/20 rounded-2xl p-3 bg-gray-50 dark:bg-black/30 text-center relative overflow-hidden">
                    {foodPhoto ? (
                      <div className="w-full space-y-2.5">
                        <div className="relative w-full h-56 sm:h-64 bg-black/40 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-inner">
                          <img 
                            src={foodPhoto} 
                            alt="Comida para analizar" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Foto lista para análisis
                          </span>
                          <button
                            type="button"
                            onClick={() => setFoodPhoto(null)}
                            className="text-xs text-rose-500 dark:text-rose-400 hover:underline cursor-pointer font-bold bg-transparent border-none"
                          >
                            Cambiar / Retomar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full py-8 flex flex-col items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400 dark:text-white/30 mb-2" />
                        <span className="text-xs font-bold text-gray-700 dark:text-white/70">Tomar o Seleccionar Foto del Alimento</span>
                        <span className="text-[9px] text-gray-400 dark:text-white/30 mt-0.5">Platos preparados o productos envasados con empaque</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {foodPhoto && !isAnalyzing && (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-200 dark:border-white/10 space-y-1">
                        <label className="block text-[9.5px] font-black text-gray-500 dark:text-white/40 uppercase tracking-wider">
                          Descripción Opcional (Recomendado)
                        </label>
                        <Input
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Ej: almuerzo arroz con pollo..."
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl focus:border-emerald-500/40 text-xs px-3 h-8.5"
                          size="md"
                        />
                        <span className="text-[8.5px] text-gray-400 dark:text-white/30 block">
                          Ayuda a la IA a identificar ingredientes ocultos o específicos.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAnalyzeFood}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                        Analizar Plato con IA
                      </button>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="text-center py-4 space-y-2 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-150 dark:border-white/5">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Identificando ingredientes y estimando macros...</p>
                    </div>
                  )}

                  {aiError && (() => {
                    const errorStr = String(aiError);
                    const isHighDemand = 
                      errorStr.includes("503") || 
                      errorStr.toLowerCase().includes("high demand") || 
                      errorStr.toLowerCase().includes("unavailable") || 
                      errorStr.toLowerCase().includes("spikes in demand") || 
                      errorStr.toLowerCase().includes("try again later");

                    return (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl space-y-3">
                        <div className="flex gap-2.5 items-start">
                          <AlertCircle className="h-4.5 w-4.5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-rose-800 dark:text-rose-200">
                              {isHighDemand ? "Saturación de Servidores IA (503)" : "Error en el Escáner de Comida"}
                            </span>
                            <span className="block text-[10px] text-gray-500 dark:text-white/50 leading-relaxed">
                              {isHighDemand 
                                ? "Los servidores de IA están bajo un pico de tráfico temporal. ¡Puedes reintentar en un instante o rellenar el formulario manual abajo!" 
                                : aiError}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-gray-200 dark:border-white/5">
                          <button
                            type="button"
                            onClick={handleAnalyzeFood}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-500/80 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                                             Reintentar Escáner
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "personal" && (
                <div className="space-y-4 max-h-[380px] overflow-y-auto no-scrollbar">
                  {/* Mis Comidas templates (Saved custom foods) */}
                  <div className="space-y-2">
                    <h4 className="text-[9.5px] font-black text-emerald-400 uppercase tracking-wider">
                      Mis Comidas (Guardadas)
                    </h4>
                    {isLoadingCustomList ? (
                      <div className="text-center py-4 text-[10px] text-white/40">
                        Cargando comidas guardadas...
                      </div>
                    ) : customFoodsList.length > 0 ? (
                      <div className="divide-y divide-gray-150 dark:divide-white/5 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/30 shadow-inner">
                        {customFoodsList.map((food, idx) => (
                          <button
                            key={food.id || idx}
                            type="button"
                            onClick={() => handleSelectFood({
                              name: food.name,
                              calories: food.calories,
                              protein: food.protein,
                              carbs: food.carbs,
                              fat: food.fat,
                              servingSize: food.servingSize || "100g",
                              source: "local"
                            })}
                            className="w-full p-3.5 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition flex justify-between items-center cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Star className="h-3.5 w-3.5 text-emerald-400 fill-emerald-500/10" />
                              <div>
                                <span className="block text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{food.name}</span>
                                {food.servingSize && (
                                  <span className="text-[9px] text-gray-400 dark:text-white/20 font-medium">Porción: {food.servingSize}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-black text-emerald-500">{food.calories} kcal</span>
                              <span className="text-[9px] text-gray-450 dark:text-white/40 font-mono">P:{formatMacro(food.protein)}g C:{formatMacro(food.carbs)}g F:{formatMacro(food.fat)}g</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 text-[10px] text-gray-455 dark:text-white/30 bg-gray-50 dark:bg-transparent border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                        Aún no tienes comidas guardadas. Puedes crear una desde "Mis Comidas" en Alimentación.
                      </div>
                    )}
                  </div>

                  {/* Últimos Agregados (logged meals history) */}
                  <div className="space-y-2">
                    <h4 className="text-[9.5px] font-black text-white/40 uppercase tracking-wider">
                      Últimos Agregados (Historial)
                    </h4>
                    {personalHistory.length > 0 ? (
                      <div className="divide-y divide-gray-150 dark:divide-white/5 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden bg-gray-50 dark:bg-black/30 shadow-inner">
                        {personalHistory.map((food, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectFood(food)}
                            className="w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-white/5 transition flex justify-between items-center cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <History className="h-3.5 w-3.5 text-gray-400" />
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{food.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-xs font-bold text-emerald-500 dark:text-emerald-400">{food.calories} kcal</span>
                              <span className="text-[9px] text-gray-400 dark:text-white/40 font-mono">P:{formatMacro(food.protein)}g C:{formatMacro(food.carbs)}g F:{formatMacro(food.fat)}g</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 text-[10px] text-gray-400 dark:text-white/30 bg-gray-50 dark:bg-transparent border border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                        Aquí verás los alimentos que registres en tu diario.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* PASO 2: Confirmación y Ajuste de Porción */
            <div className="space-y-4">
              
              {/* Back button */}
              <button
                type="button"
                onClick={() => setSelectedFood(null)}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 dark:text-white/40 hover:text-emerald-500 dark:hover:text-emerald-400 uppercase tracking-wider bg-transparent border-0 cursor-pointer transition animate-pulse"
              >
                ← Volver a la búsqueda
              </button>

              {/* Community Correction Banner */}
              {showCommunityPrompt && communityCorrection && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl space-y-2.5 animate-fadeIn">
                  <div className="flex gap-2 items-start">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="block text-[10.5px] font-black text-amber-400 uppercase tracking-wider leading-none">Macros de la Comunidad</span>
                      <p className="text-[10px] text-gray-700 dark:text-white/60 leading-normal">
                        Nuestra comunidad ha sugerido una corrección para este código de barras:
                        <span className="block font-mono mt-1 text-[9px] bg-white/5 p-1 rounded border border-white/5">
                          Cal: {communityCorrection.calories} | P: {communityCorrection.protein}g | C: {communityCorrection.carbs}g | G: {communityCorrection.fat}g
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-amber-500/10 pt-2">
                    <button
                      type="button"
                      onClick={handleAcceptCommunityCorrection}
                      className="flex-1 py-1 bg-amber-500 text-black text-[9.5px] font-black rounded-lg transition hover:bg-amber-450 cursor-pointer"
                    >
                      Sí, usar
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectCommunityCorrection}
                      className="flex-1 py-1 bg-white/5 border border-white/10 text-white/50 text-[9.5px] font-bold rounded-lg transition hover:bg-white/10 cursor-pointer"
                    >
                      No, ignorar
                    </button>
                  </div>
                </div>
              )}

              {/* Food Info Header Card */}
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 flex gap-4 items-center relative overflow-hidden">
                {selectedFood.image && (
                  <img
                    src={selectedFood.image}
                    alt={customName}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 shrink-0 shadow-lg"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1 z-10 relative">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tight truncate">{customName || "Alimento Personalizado"}</h4>
                    {!selectedFood.image && getSourceBadge(selectedFood.source, selectedFood.brand)}
                  </div>
                  {selectedFood.brand && (
                    <span className="text-[9px] text-gray-400 dark:text-white/40 font-mono block mt-0.5 truncate">{selectedFood.brand}</span>
                  )}
                  {selectedFood.image && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {getSourceBadge(selectedFood.source, selectedFood.brand)}
                    </div>
                  )}
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      {customCalories || 0}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider">kcal</span>
                  </div>
                </div>
              </div>

              {/* Macro Indicators */}
              <div className="grid grid-cols-3 gap-2">
                {/* Protein */}
                <div className="bg-[#f97316]/5 border border-[#f97316]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#f97316]/80 uppercase tracking-wider">Proteína</span>
                  <span className="block text-sm font-extrabold text-gray-900 dark:text-white font-mono">{formatMacro(customProtein)}g</span>
                  <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#f97316] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 0 : Math.min(100, pPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#f97316]/60 font-bold font-mono">{selectedFood.name === "" ? "0%" : `${pPct}%`}</span>
                </div>

                {/* Carbs */}
                <div className="bg-[#3b82f6]/5 border border-[#3b82f6]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#3b82f6]/80 uppercase tracking-wider">Carbos</span>
                  <span className="block text-sm font-extrabold text-gray-900 dark:text-white font-mono">{formatMacro(customProtein ? customCarbs : 0)}g</span>
                  <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 0 : Math.min(100, cPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#3b82f6]/60 font-bold font-mono">{selectedFood.name === "" ? "0%" : `${cPct}%`}</span>
                </div>

                {/* Fat */}
                <div className="bg-[#eab308]/5 border border-[#eab308]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#eab308]/80 uppercase tracking-wider">Grasa</span>
                  <span className="block text-sm font-extrabold text-gray-900 dark:text-white font-mono">{formatMacro(customProtein ? customFat : 0)}g</span>
                  <div className="w-full h-1 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#eab308] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 0 : Math.min(100, fPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#eab308]/60 font-bold font-mono">{selectedFood.name === "" ? "0%" : `${fPct}%`}</span>
                </div>
              </div>

              {/* Identified Ingredients & Corrections (only for AI analyzed foods) */}
              {selectedFood.ingredients && selectedFood.ingredients.length > 0 && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
                  <span className="block text-[10px] font-black text-gray-550 dark:text-white/40 uppercase tracking-widest leading-none">
                    Ingredientes Encontrados
                  </span>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFood.ingredients.map((ing, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white dark:bg-[#0c0d15] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-250 rounded-xl text-[10.5px] font-medium"
                      >
                        • {ing}
                      </span>
                    ))}
                  </div>

                  {/* Correction input */}
                  <div className="border-t border-gray-150 dark:border-white/5 pt-3.5 space-y-2">
                    <label className="block text-[9.5px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                      ¿Corregir ingredientes?
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={correction}
                        onChange={(e) => setCorrection(e.target.value)}
                        placeholder="Ej: este ingrediente es mayo no queso..."
                        className="flex-1 bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 text-xs rounded-xl focus:border-emerald-500/40 px-3 h-8.5"
                        size="md"
                      />
                      <button
                        type="button"
                        onClick={handleCorrectFood}
                        disabled={isCorrecting || !correction.trim()}
                        className="px-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 dark:disabled:bg-white/5 text-white disabled:text-gray-400 dark:disabled:text-white/30 text-[10.5px] font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shrink-0 shadow-md h-8.5"
                      >
                        {isCorrecting ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Recalcular"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Portion Control panel (Only shown for database items) */}
              {selectedFood.name !== "" && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-205 dark:border-white/5 space-y-3.5">
                  {/* Selector de Unidades */}
                  <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
                    <button
                      type="button"
                      onClick={() => handleUnitChange("g")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                        portionUnit === "g"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold"
                          : "border-transparent text-white/40 hover:text-white"
                      }`}
                    >
                      Gramos (g)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange("ml")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                        portionUnit === "ml"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold"
                          : "border-transparent text-white/40 hover:text-white"
                      }`}
                    >
                      Ml (ml)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUnitChange("unit")}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg border transition ${
                        portionUnit === "unit"
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-extrabold"
                          : "border-transparent text-white/40 hover:text-white"
                      }`}
                    >
                      Porción ({unitLabel}{unitWeight && unitWeight !== 100 ? ` · ${unitWeight}${portionUnit === "ml" || selectedFood.servingSize?.toLowerCase().includes("ml") ? "ml" : "g"}` : ""})
                    </button>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Cantidad</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={portionValue}
                        onChange={(e) => updatePortion(Number(e.target.value) || 0)}
                        className="w-16 bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 text-center text-gray-900 dark:text-white font-mono rounded-lg h-7 px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                      <span className="text-[10px] text-gray-500 dark:text-white/40 font-bold uppercase">
                        {portionUnit === "unit" ? unitLabel : portionUnit === "ml" ? "ml" : "g"}
                      </span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={portionUnit === "unit" ? "0.5" : "10"}
                    max={portionUnit === "unit" ? "10" : "600"}
                    step={portionUnit === "unit" ? "0.5" : "5"}
                    value={portionValue}
                    onChange={(e) => updatePortion(Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                  />

                  {/* Presets Grid */}
                  <div className="grid grid-cols-6 gap-1 pt-1">
                    {(portionUnit === "unit" ? [0.5, 1, 1.5, 2, 3, 5] : [50, 100, 150, 200, 300, 500]).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => updatePortion(preset)}
                        className={`py-1 text-[10px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                          portionValue === preset
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-700 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-emerald-550 dark:hover:border-emerald-500/20"
                        }`}
                      >
                        {preset}{portionUnit === "unit" ? "" : portionUnit === "ml" ? "ml" : "g"}
                      </button>
                    ))}
                  </div>

                  {/* Botón "¿Medir al ojo?" abajo de la cantidad para mejor responsividad */}
                  <div className="flex justify-center pt-1 border-t border-gray-200 dark:border-white/5">
                    <button
                      type="button"
                      onClick={handleLoadVisualPortions}
                      disabled={isLoadingPortions}
                      className="w-full flex items-center justify-center gap-1.5 text-[9.5px] text-emerald-450 hover:text-emerald-450 font-black bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-2 rounded-xl cursor-pointer transition shadow-md"
                    >
                      {isLoadingPortions ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <>
                          <HelpCircle className="h-3.5 w-3.5" />
                          ¿Cómo medir al ojo? Equivalencias con IA
                        </>
                      )}
                    </button>
                  </div>

                  {/* IA Visual Portions scroll */}
                  {showPortionsInfo && visualPortions.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-xl space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Medidas Visuales Encontradas</span>
                        <button
                          type="button"
                          onClick={() => setShowPortionsInfo(false)}
                          className="text-white/40 hover:text-white transition cursor-pointer bg-transparent border-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {visualPortions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              const isMl = selectedFood.servingSize?.toLowerCase().includes("ml") || selectedFood.name.toLowerCase().includes("leche") || selectedFood.name.toLowerCase().includes("bebida");
                              setPortionUnit(isMl ? "ml" : "g");
                              updatePortion(sug.value, isMl ? "ml" : "g");
                            }}
                            className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 animate-fadeIn"
                          >
                            {sug.label} ({sug.value}{selectedFood.servingSize?.toLowerCase().includes("ml") || selectedFood.name.toLowerCase().includes("leche") ? "ml" : "g"})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {portionsError && (
                    <span className="block text-[8.5px] text-rose-400 font-bold mt-1">
                      ⚠️ {portionsError}
                    </span>
                  )}
                </div>
              )}

              {/* Adjust Details Accordion Box */}
              {(selectedFood.name === "" || selectedFood.barcode) && (
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/5 pb-1.5">
                    <span className="block text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">
                      {selectedFood.name === "" ? "Verificar / Editar Macros Manualmente" : "Información de Macros (OFF)"}
                    </span>
                    {selectedFood.barcode && isCorrectingBarcode && (
                      <button
                        type="button"
                        onClick={() => setShowBarcodeHelp(!showBarcodeHelp)}
                        className="text-amber-400 hover:text-amber-300 transition cursor-pointer bg-transparent border-0 flex items-center gap-0.5 text-[9px] font-bold"
                      >
                        <HelpCircle className="h-3 w-3" />
                        ¿Dónde buscar?
                      </button>
                    )}
                  </div>

                  {showBarcodeHelp && isCorrectingBarcode && (
                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-[9px] text-gray-700 dark:text-white/60 leading-normal space-y-1 animate-fadeIn">
                      <p className="font-black text-amber-500 dark:text-amber-400 uppercase tracking-wider">💡 ¿Cómo buscar los macros?</p>
                      <p>Busca la tabla nutricional en el envase físico. Modifica los campos inferiores ingresando los macros **según tu porción actual**. El sistema calculará automáticamente la proporción de 100g para guardarlo en la comunidad.</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {selectedFood.name === "" && (
                      <div className="mb-2">
                        {labelScanError && (
                          <span className="block text-[8.5px] text-rose-455 font-bold text-center mb-1">
                            ⚠️ {labelScanError}
                          </span>
                        )}
                        {!isScanningLabel ? (
                          <label className="text-[10px] text-amber-500 hover:text-amber-450 font-black transition cursor-pointer flex items-center gap-1.5 justify-center py-2 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl font-sans">
                            <Camera className="h-3.5 w-3.5" />
                            Escanear Tabla de Macros con IA (Foto/Etiqueta)
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleLabelPhotoUpload}
                              className="hidden"
                            />
                          </label>
                        ) : (
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-xl text-center">
                            <span className="text-[9.5px] font-bold text-emerald-400 flex items-center justify-center gap-1.5 font-sans">
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              Analizando tabla nutricional con IA...
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedFood.name === "" && (
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-white/40 mb-1">Nombre del Alimento</label>
                        <Input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Ej: Pollo desmenuzado con arroz..."
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl focus:border-emerald-500/40 text-gray-900 dark:text-white"
                          size="md"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[9px] text-gray-500 dark:text-white/40 text-center mb-1">Calorías</label>
                        <Input
                          type="number"
                          value={customCalories}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Math.round(Number(e.target.value));
                            setCustomCalories(val);
                          }}
                          placeholder="kcal"
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl text-center text-emerald-600 dark:text-emerald-400 font-mono font-bold px-1 focus:border-emerald-500/40 disabled:opacity-50"
                          size="sm"
                          disabled={selectedFood.name !== ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 dark:text-white/40 text-center mb-1">Proteínas</label>
                        <Input
                          type="number"
                          value={customProtein}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(Number(e.target.value).toFixed(1));
                            setCustomProtein(val);
                          }}
                          placeholder="g"
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl text-center text-gray-900 dark:text-white font-mono px-1 focus:border-emerald-500/40 disabled:opacity-50"
                          size="sm"
                          disabled={selectedFood.name !== ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 dark:text-white/40 text-center mb-1">Carbos</label>
                        <Input
                          type="number"
                          value={customCarbs}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(Number(e.target.value).toFixed(1));
                            setCustomCarbs(val);
                          }}
                          placeholder="g"
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl text-center text-gray-900 dark:text-white font-mono px-1 focus:border-emerald-500/40 disabled:opacity-50"
                          size="sm"
                          disabled={selectedFood.name !== ""}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 dark:text-white/40 text-center mb-1">Grasas</label>
                        <Input
                          type="number"
                          value={customFat}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(Number(e.target.value).toFixed(1));
                            setCustomFat(val);
                          }}
                          placeholder="g"
                          className="bg-white dark:bg-[#0c0d15] border-gray-200 dark:border-white/10 rounded-xl text-center text-gray-900 dark:text-white font-mono px-1 focus:border-emerald-500/40 disabled:opacity-50"
                          size="sm"
                          disabled={selectedFood.name !== ""}
                        />
                      </div>
                    </div>

                    {/* Option to also save to My Meals as a template */}
                    {/* Option to also save to My Meals as a template */}
                    {!isCustomFoodOnlyMode && userId && selectedFood.name === "" && (
                      <div className="flex items-center justify-between mt-2 px-3 py-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl select-none">
                        <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wide">
                          Guardar también en Mis Comidas
                        </span>
                        <button
                          type="button"
                          onClick={() => setAlsoSaveToCustom(!alsoSaveToCustom)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            alsoSaveToCustom ? "bg-emerald-500" : "bg-gray-250 dark:bg-white/10"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              alsoSaveToCustom ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    )}

                    {/* Community Correction workflow for barcode foods */}
                    {selectedFood.name !== "" && selectedFood.barcode && (
                      <div className="pt-1.5 flex flex-col gap-2">
                        {labelScanError && (
                          <span className="block text-[8.5px] text-rose-450 font-bold text-center">
                            ⚠️ {labelScanError}
                          </span>
                        )}
                        {!isCorrectingBarcode && !barcodeSaveSuccess ? (
                          <label className="text-[10px] text-amber-400 hover:text-amber-350 font-black transition cursor-pointer flex items-center gap-1 justify-center py-2 bg-amber-500/5 border border-dashed border-amber-500/20 rounded-xl">
                            <Camera className="h-3.5 w-3.5" />
                            ¿Macros incorrectos? Escanear Tabla con IA
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleLabelPhotoUpload}
                              className="hidden"
                            />
                          </label>
                        ) : isCorrectingBarcode ? (
                          <div className="bg-amber-500/5 border border-amber-500/20 p-2.5 rounded-xl space-y-2.5 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                {isScanningLabel ? "Escaneando tabla..." : "Revisar Macros Detectados"}
                              </span>
                              {isScanningLabel && <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />}
                            </div>

                            {isScanningLabel ? (
                              <p className="text-[9px] text-white/50 animate-pulse text-center py-2">
                                Analizando la foto y extrayendo macros con IA. Por favor espera...
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[9px] text-emerald-450 font-bold text-center leading-normal">
                                  ✓ Tabla escaneada con éxito. Confirma si los valores de arriba corresponden al empaque físico.
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={handleSaveBarcodeCorrection}
                                    className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-[9.5px] font-black rounded-lg transition cursor-pointer"
                                  >
                                    Confirmar y Guardar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCorrectingBarcode(false);
                                      // Restore original values
                                      handleSelectFood(selectedFood);
                                    }}
                                    className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 hover:text-white text-[9.5px] font-bold rounded-lg transition cursor-pointer"
                                  >
                                    Descartar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-center animate-fadeIn">
                            <span className="text-[9.5px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                              <Check className="h-3 w-3" />
                              ¡Macros corregidos y guardados en la comunidad!
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedFood.name === "" && (
                    <div className="mt-3 pt-3 border-t border-gray-150 dark:border-white/5">
                      {!showIaEstimation ? (
                        <button
                          type="button"
                          onClick={() => setShowIaEstimation(true)}
                          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          ¿No te sabes los macros? Calcular con IA
                        </button>
                      ) : (
                        <div className="space-y-2.5 p-3 bg-white/[0.02] border border-gray-250 dark:border-white/5 rounded-xl animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-wider">Calcular con IA</span>
                            <button
                              type="button"
                              onClick={() => setShowIaEstimation(false)}
                              className="text-gray-400 hover:text-white transition cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          <p className="text-[9px] text-gray-500 dark:text-white/40 leading-normal">
                            Describe el plato e ingredientes y la IA estimará los macros de forma conservadora.
                          </p>

                          <textarea
                            value={iaDescription}
                            onChange={(e) => setIaDescription(e.target.value)}
                            placeholder="Ej: 2 rebanadas de pan de molde con palta y 1 huevo revuelto..."
                            className="w-full p-2 bg-white dark:bg-[#0c0d15] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/40 transition placeholder-gray-450 min-h-[60px] resize-none font-sans"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowIaEstimation(false);
                                setSelectedFood(null);
                                setActiveTab("camera");
                              }}
                              className="flex-1 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-white/70 hover:text-white rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Tomar Foto
                            </button>
                            <button
                              type="button"
                              onClick={handleEstimateMacrosByText}
                              disabled={isEstimating || !iaDescription.trim()}
                              className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/5 text-white disabled:text-white/30 rounded-lg text-[9px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {isEstimating ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3" />
                                  Calcular
                                  </>
                              )}
                            </button>
                          </div>

                          {iaEstimationError && (
                            <span className="block text-[9px] text-rose-400 font-bold">
                              ⚠️ {iaEstimationError}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#12131d]/90 flex-shrink-0 flex gap-3">
          {selectedFood === null ? (
            <Button
              variant="secondary"
              onClick={onClose}
              className="w-full rounded-xl"
              size="md"
            >
              Cancelar
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => setSelectedFood(null)}
                className="flex-1 rounded-xl"
                size="md"
              >
                Volver
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveMeal}
                disabled={!customName}
                leftIcon={Check}
                className="flex-1 rounded-xl font-extrabold font-sans"
                size="md"
              >
                {mode === "pantry" ? "Añadir a Despensa" : "Añadir al Diario"}
              </Button>
            </>
          )}
        </div>

      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanSuccess}
      />
    </div>
  );
}
