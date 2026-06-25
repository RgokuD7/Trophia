import React, { useState, useEffect } from "react";
import { Search, Camera, Plus, History, Trash, AlertCircle, Check, X, RefreshCw, Star, Barcode } from "lucide-react";
import { LoggedMeal, FoodItem, MealType } from "../types";
import { GLOBAL_FOODS_DB } from "../utils/fitnessUtils";
import { analyzeFoodByIA } from "../services/geminiService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { searchAllFoods, getProductByBarcode } from "../services/foodDatabaseService";
import BarcodeScannerModal from "./BarcodeScannerModal";

interface FoodLoggerProps {
  apiKey?: string;
  usdaApiKey?: string;
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  loggedMeals: LoggedMeal[];
  onClose: () => void;
}

export default function FoodLogger({ apiKey, usdaApiKey, onAddMeal, loggedMeals, onClose }: FoodLoggerProps) {
  const [activeTab, setActiveTab] = useState<"search" | "camera" | "personal">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState<number | "">("");
  const [customProtein, setCustomProtein] = useState<number | "">("");
  const [customCarbs, setCustomCarbs] = useState<number | "">("");
  const [customFat, setCustomFat] = useState<number | "">("");
  const [portionGrams, setPortionGrams] = useState(100);

  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);

  // Search Results
  const [filteredFoods, setFilteredFoods] = useState<FoodItem[]>([]);

  // Camera Analysis
  const [foodPhoto, setFoodPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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
    setPortionGrams(100);
    const displayName = food.brand ? `${food.name} (${food.brand.split(',')[0].trim()})` : food.name;
    setCustomName(displayName);
    setCustomCalories(food.calories);
    setCustomProtein(food.protein);
    setCustomCarbs(food.carbs);
    setCustomFat(food.fat);
  };

  const updatePortion = (grams: number) => {
    const validGrams = Math.max(1, grams);
    setPortionGrams(validGrams);
    if (selectedFood && selectedFood.name !== "") {
      const scale = validGrams / 100;
      setCustomCalories(Math.round(selectedFood.calories * scale));
      setCustomProtein(Math.round(selectedFood.protein * scale));
      setCustomCarbs(Math.round(selectedFood.carbs * scale));
      setCustomFat(Math.round(selectedFood.fat * scale));
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
      setFoodPhoto(reader.result as string);
      setAiError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeFood = async () => {
    if (!foodPhoto) return;
    setIsAnalyzing(true);
    setAiError(null);

    try {
      const data = await analyzeFoodByIA(apiKey || "", {
        image: foodPhoto,
        mealType: selectedMealType
      });
      if (data) {
        const foodItem: FoodItem = {
          name: data.name,
          calories: data.calories,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          servingSize: "1 Plato",
          source: "local"
        };
        setSelectedFood(foodItem);
        setPortionGrams(100);
        setCustomName(data.name);
        setCustomCalories(data.calories);
        setCustomProtein(data.protein);
        setCustomCarbs(data.carbs);
        setCustomFat(data.fat);
      } else {
        setAiError("No se pudo conectar con el motor de IA.");
      }
    } catch (err: any) {
      setAiError(`Error de red: ${err.message || "Fallo de conexión"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveMeal = () => {
    if (!customName) return;

    onAddMeal({
      name: customName,
      calories: Number(customCalories) || 0,
      protein: Number(customProtein) || 0,
      carbs: Number(customCarbs) || 0,
      fat: Number(customFat) || 0,
      type: selectedMealType
    });

    onClose();
  };

  const pKcal = (Number(customProtein) || 0) * 4;
  const cKcal = (Number(customCarbs) || 0) * 4;
  const fKcal = (Number(customFat) || 0) * 9;
  const totalKcal = pKcal + cKcal + fKcal;
  const pPct = totalKcal > 0 ? Math.round((pKcal / totalKcal) * 100) : 0;
  const cPct = totalKcal > 0 ? Math.round((cKcal / totalKcal) * 100) : 0;
  const fPct = totalKcal > 0 ? Math.round((fKcal / totalKcal) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col justify-end md:justify-center p-0 md:p-4">
      <div className="w-full max-w-md mx-auto bg-[#050505] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl h-[90vh] md:h-[650px] flex flex-col overflow-hidden relative">
        
        {/* Background Neon Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[250px] h-[250px] bg-emerald-500 opacity-[0.05] rounded-full blur-[80px]"></div>
        </div>

        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between flex-shrink-0 z-10 bg-[#050505]/80 backdrop-blur-md">
          <div>
            <h3 className="text-base font-black text-white italic tracking-tight">Registrar Alimento</h3>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Control Diario de Ingesta</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Meal Type selection */}
        <div className="px-5 pt-4 flex gap-1.5 flex-shrink-0 z-10">
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
                  : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              <span className="mr-1">{type.emoji}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Tab Selection */}
        {selectedFood === null && (
          <div className="px-5 pt-3 flex border-b border-white/5 flex-shrink-0 z-10">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition ${
                activeTab === "search" ? "border-emerald-500 text-emerald-400" : "border-transparent text-white/40"
              }`}
            >
              Buscar Alimento
            </button>
            <button
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition flex items-center justify-center gap-1.5 ${
                activeTab === "camera" ? "border-emerald-500 text-emerald-400" : "border-transparent text-white/40"
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              Fotografía IA
            </button>
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex-1 py-3 text-xs font-extrabold border-b-2 text-center transition ${
                activeTab === "personal" ? "border-emerald-500 text-emerald-400" : "border-transparent text-white/40"
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
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 hover:border-emerald-500/30 transition flex items-center justify-center gap-1.5 font-bold text-[10.5px] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
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
                    <div className="text-center py-6 text-xs text-white/40">
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 mx-auto mb-2" />
                      Buscando en bases de datos...
                    </div>
                  ) : filteredFoods.length > 0 ? (
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/30 max-h-60 overflow-y-auto no-scrollbar divide-y divide-white/5">
                      {filteredFoods.map((food, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectFood(food)}
                          className="w-full p-3 text-left hover:bg-white/5 transition flex justify-between items-center gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {food.image ? (
                              <img
                                src={food.image}
                                alt={food.name}
                                className="w-9 h-9 rounded-xl object-cover border border-white/10 bg-black/20 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                <span className="text-sm">🍎</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="block text-xs font-bold text-white truncate">{food.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {getSourceBadge(food.source, food.brand)}
                                <span className="text-[10px] text-white/40">{food.servingSize} base</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="block text-xs font-extrabold text-emerald-400">
                              {food.calories} kcal
                            </span>
                            <span className="text-[9px] text-white/40 block">
                              P: {food.protein}g · C: {food.carbs}g
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() !== "" ? (
                    <div className="text-center py-4 text-xs text-white/30">
                      No se encontraron alimentos en la base de datos de Trophia.
                    </div>
                  ) : null}
                </div>
              )}

              {activeTab === "camera" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-white/50 leading-normal">
                    Sube una foto de tu plato. El modelo de IA identificará los ingredientes y calculará proteínas, carbohidratos, grasas y calorías de manera conservadora.
                  </p>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-emerald-500/20 rounded-2xl p-4 bg-black/30 min-h-32 text-center relative">
                    {foodPhoto ? (
                      <div className="text-center">
                        <img 
                          src={foodPhoto} 
                          alt="Comida" 
                          className="h-28 mx-auto rounded-xl object-contain border border-white/10 mb-2"
                        />
                        <button
                          type="button"
                          onClick={() => setFoodPhoto(null)}
                          className="text-xs text-rose-400 hover:underline cursor-pointer"
                        >
                          Cambiar foto
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer w-full py-4 flex flex-col items-center justify-center">
                        <Camera className="h-7 w-7 text-white/30 mb-1.5" />
                        <span className="text-xs font-bold text-white/70">Seleccionar Foto del Plato</span>
                        <span className="text-[9px] text-white/30 mt-0.5">Soporta JPG, PNG</span>
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
                    <button
                      type="button"
                      onClick={handleAnalyzeFood}
                      className="w-full bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                      Analizar Plato con IA
                    </button>
                  )}

                  {isAnalyzing && (
                    <div className="text-center py-4 space-y-2 bg-black/30 rounded-2xl border border-white/5">
                      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-emerald-400 font-bold">Identificando ingredientes y estimando macros...</p>
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
                          <AlertCircle className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="block text-xs font-bold text-rose-200">
                              {isHighDemand ? "Saturación de Servidores IA (503)" : "Error en el Escáner de Comida"}
                            </span>
                            <span className="block text-[10px] text-white/50 leading-relaxed">
                              {isHighDemand 
                                ? "Los servidores de IA están bajo un pico de tráfico temporal. ¡Puedes reintentar en un instante o rellenar el formulario manual abajo!" 
                                : aiError}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleAnalyzeFood}
                            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-500/80 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reintentar Escáner
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeTab === "personal" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-white/50">
                    Alimentos frecuentes registrados con anterioridad en tu diario Trophia:
                  </p>

                  {personalHistory.length > 0 ? (
                    <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-black/30">
                      {personalHistory.map((food, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectFood(food)}
                          className="w-full p-3 text-left hover:bg-white/5 transition flex justify-between items-center cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400/20" />
                            <span className="text-xs font-bold text-white">{food.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-bold text-emerald-400">{food.calories} kcal</span>
                            <span className="text-[9px] text-white/40 font-mono">P:{food.protein}g C:{food.carbs}g F:{food.fat}g</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-white/40 bg-black/30 rounded-2xl border border-dashed border-white/5">
                      Registra comidas en el buscador o por IA para agregarlas automáticamente a tus frecuentes.
                    </div>
                  )}
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
                className="flex items-center gap-1 text-[10px] font-bold text-white/40 hover:text-emerald-400 uppercase tracking-wider bg-transparent border-0 cursor-pointer transition animate-pulse"
              >
                ← Volver a la búsqueda
              </button>

              {/* Food Info Header Card */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2 relative overflow-hidden">
                <div className="flex justify-between items-start gap-2 z-10 relative">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-white leading-tight uppercase tracking-tight truncate">{customName || "Alimento Personalizado"}</h4>
                    {selectedFood.brand && (
                      <span className="text-[9px] text-white/40 font-mono block mt-0.5 truncate">{selectedFood.brand}</span>
                    )}
                  </div>
                  {getSourceBadge(selectedFood.source, selectedFood.brand)}
                </div>

                <div className="flex items-baseline gap-1 mt-3 z-10 relative">
                  <span className="text-3xl font-black text-emerald-400 tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    {customCalories || 0}
                  </span>
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">kcal</span>
                </div>
              </div>

              {/* Macro Indicators */}
              <div className="grid grid-cols-3 gap-2">
                {/* Protein */}
                <div className="bg-[#f97316]/5 border border-[#f97316]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#f97316]/80 uppercase tracking-wider">Proteína</span>
                  <span className="block text-sm font-extrabold text-white font-mono">{customProtein || 0}g</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#f97316] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 33 : Math.min(100, pPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#f97316]/60 font-bold font-mono">{selectedFood.name === "" ? "-" : `${pPct}%`}</span>
                </div>

                {/* Carbs */}
                <div className="bg-[#3b82f6]/5 border border-[#3b82f6]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#3b82f6]/80 uppercase tracking-wider">Carbos</span>
                  <span className="block text-sm font-extrabold text-white font-mono">{customCarbs || 0}g</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3b82f6] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 33 : Math.min(100, cPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#3b82f6]/60 font-bold font-mono">{selectedFood.name === "" ? "-" : `${cPct}%`}</span>
                </div>

                {/* Fat */}
                <div className="bg-[#eab308]/5 border border-[#eab308]/10 p-3 rounded-2xl text-center space-y-1.5 flex flex-col justify-between">
                  <span className="block text-[8px] font-bold text-[#eab308]/80 uppercase tracking-wider">Grasa</span>
                  <span className="block text-sm font-extrabold text-white font-mono">{customFat || 0}g</span>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#eab308] rounded-full transition-all duration-300"
                      style={{ width: `${selectedFood.name === "" ? 33 : Math.min(100, fPct)}%` }}
                    ></div>
                  </div>
                  <span className="block text-[8px] text-[#eab308]/60 font-bold font-mono">{selectedFood.name === "" ? "-" : `${fPct}%`}</span>
                </div>
              </div>

              {/* Portion Control panel (Only shown for database items) */}
              {selectedFood.name !== "" && (
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Porción Registrada</span>
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        value={portionGrams}
                        onChange={(e) => updatePortion(Number(e.target.value) || 0)}
                        className="w-16 bg-black/40 border-white/10 text-center font-mono rounded-lg h-7 px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                      <span className="text-[10px] text-white/40 font-bold uppercase">gramos</span>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min="10"
                    max="600"
                    step="5"
                    value={portionGrams}
                    onChange={(e) => updatePortion(Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                  />

                  {/* Presets Grid */}
                  <div className="grid grid-cols-6 gap-1 pt-1">
                    {[50, 100, 150, 200, 300, 500].map((grams) => (
                      <button
                        key={grams}
                        type="button"
                        onClick={() => updatePortion(grams)}
                        className={`py-1 text-[10px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                          portionGrams === grams
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10 hover:border-emerald-500/20"
                        }`}
                      >
                        {grams}g
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Adjust Details Accordion Box */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                <span className="block text-[10px] font-bold text-white/40 border-b border-white/5 pb-1.5 uppercase tracking-wider">
                  Verificar / Editar Macros {selectedFood.name === "" && "Manualmente"}
                </span>

                <div className="space-y-2.5">
                  {selectedFood.name === "" && (
                    <div>
                      <label className="block text-[10px] text-white/40 mb-1">Nombre del Alimento</label>
                      <Input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="Ej: Pollo desmenuzado con arroz..."
                        className="bg-[#0c0d15] border-white/10 rounded-xl focus:border-emerald-500/40"
                        size="md"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[9px] text-white/40 text-center mb-1">Calorías</label>
                      <Input
                        type="number"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="kcal"
                        className="bg-[#0c0d15] border-white/10 rounded-xl text-center text-emerald-400 font-mono font-bold px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/40 text-center mb-1">Proteínas</label>
                      <Input
                        type="number"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="g"
                        className="bg-[#0c0d15] border-white/10 rounded-xl text-center font-mono px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/40 text-center mb-1">Carbos</label>
                      <Input
                        type="number"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="g"
                        className="bg-[#0c0d15] border-white/10 rounded-xl text-center font-mono px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-white/40 text-center mb-1">Grasas</label>
                      <Input
                        type="number"
                        value={customFat}
                        onChange={(e) => setCustomFat(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="g"
                        className="bg-[#0c0d15] border-white/10 rounded-xl text-center font-mono px-1 focus:border-emerald-500/40"
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/5 bg-[#050505] flex-shrink-0 flex gap-3">
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
                className="flex-1 rounded-xl font-extrabold"
                size="md"
              >
                Añadir al Diario
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
