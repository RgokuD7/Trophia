import React, { useState, useEffect } from "react";
import { Search, Camera, Plus, History, Trash, AlertCircle, Check, X, RefreshCw, Star } from "lucide-react";
import { LoggedMeal, FoodItem, MealType } from "../types";
import { GLOBAL_FOODS_DB } from "../utils/fitnessUtils";
import { analyzeFoodByIA } from "../services/geminiService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface FoodLoggerProps {
  apiKey?: string;
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  loggedMeals: LoggedMeal[];
  onClose: () => void;
}

export default function FoodLogger({ apiKey, onAddMeal, loggedMeals, onClose }: FoodLoggerProps) {
  const [activeTab, setActiveTab] = useState<"search" | "camera" | "personal">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMealType, setSelectedMealType] = useState<MealType>("lunch");
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState<number | "">("");
  const [customProtein, setCustomProtein] = useState<number | "">("");
  const [customCarbs, setCustomCarbs] = useState<number | "">("");
  const [customFat, setCustomFat] = useState<number | "">("");
  const [portionGrams, setPortionGrams] = useState(100);

  // Search Results
  const [filteredFoods, setFilteredFoods] = useState<FoodItem[]>([]);

  // Camera Analysis
  const [foodPhoto, setFoodPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Favorites / Personal History
  const [personalHistory, setPersonalHistory] = useState<FoodItem[]>([]);

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
    } else {
      const filtered = GLOBAL_FOODS_DB.filter(food =>
        food.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFoods(filtered);
    }
  }, [searchQuery]);

  const handleSelectFood = (food: FoodItem) => {
    const scale = portionGrams / 100;
    setCustomName(food.name);
    setCustomCalories(Math.round(food.calories * scale));
    setCustomProtein(Math.round(food.protein * scale));
    setCustomCarbs(Math.round(food.carbs * scale));
    setCustomFat(Math.round(food.fat * scale));
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
            className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/60 hover:text-white transition"
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
              onClick={() => setSelectedMealType(type.id as MealType)}
              className={`flex-1 py-1.5 rounded-xl border text-[11px] font-bold text-center transition ${
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

        {/* Content body */}
        <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-4 z-10">
          
          {activeTab === "search" && (
            <div className="space-y-3">
              <Input
                type="text"
                icon={Search}
                placeholder="Buscar comida (ej: pollo, arroz, huevo)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-2xl"
                size="md"
              />

              {/* Portion Selector */}
              <div className="flex items-center justify-between bg-white/5 p-3.5 rounded-2xl border border-white/5">
                <span className="text-xs text-white/60 font-bold">Tamaño de Porción</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(Math.max(1, Number(e.target.value) || 100))}
                    className="w-16 bg-black/40 border-white/10 rounded-xl text-center font-mono px-1"
                    size="sm"
                  />
                  <span className="text-xs text-white/40">gramos</span>
                </div>
              </div>

              {/* Autocomplete list */}
              {filteredFoods.length > 0 ? (
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-black/30 max-h-40 overflow-y-auto no-scrollbar divide-y divide-white/5">
                  {filteredFoods.map((food, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFood(food)}
                      className="w-full p-3 text-left hover:bg-white/5 transition flex justify-between items-center"
                    >
                      <div>
                        <span className="block text-xs font-bold text-white">{food.name}</span>
                        <span className="block text-[10px] text-white/40">{portionGrams}g ({food.servingSize} base)</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-extrabold text-emerald-400">
                          {Math.round(food.calories * (portionGrams / 100))} kcal
                        </span>
                        <span className="text-[9px] text-white/40">
                          P: {Math.round(food.protein * (portionGrams / 100))}g · C: {Math.round(food.carbs * (portionGrams / 100))}g
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() !== "" ? (
                <div className="text-center py-4 text-xs text-white/30">
                  No se encontraron alimentos en la base de datos de Strive.
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
                      onClick={() => setFoodPhoto(null)}
                      className="text-xs text-rose-400 hover:underline"
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
                  onClick={handleAnalyzeFood}
                  className="w-full bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
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
                Alimentos frecuentes registrados con anterioridad en tu diario Strive:
              </p>

              {personalHistory.length > 0 ? (
                <div className="divide-y divide-white/5 border border-white/5 rounded-2xl overflow-hidden bg-black/30">
                  {personalHistory.map((food, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCustomName(food.name);
                        setCustomCalories(food.calories);
                        setCustomProtein(food.protein);
                        setCustomCarbs(food.carbs);
                        setCustomFat(food.fat);
                      }}
                      className="w-full p-3 text-left hover:bg-white/5 transition flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400/20" />
                        <span className="text-xs font-bold text-white">{food.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-bold text-emerald-400">{food.calories} kcal</span>
                        <span className="text-[9px] text-white/40">P:{food.protein}g C:{food.carbs}g F:{food.fat}g</span>
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

          {/* Verification & Manual Adjustment Box */}
          <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
            <span className="block text-[10px] font-bold text-white/40 border-b border-white/5 pb-1.5 uppercase tracking-wider">
              Verificar / Ajustar Alimento
            </span>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">Nombre del Plato / Alimento</label>
                <Input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ej: Pollo desmenuzado con arroz..."
                  className="bg-black/40 border-white/10 rounded-xl"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] text-white/40 text-center mb-1">Calorías</label>
                  <Input
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="kcal"
                    className="bg-black/40 border-white/10 rounded-xl text-center text-emerald-400 font-mono font-bold px-1"
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
                    className="bg-black/40 border-white/10 rounded-xl text-center font-mono px-1"
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
                    className="bg-black/40 border-white/10 rounded-xl text-center font-mono px-1"
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
                    className="bg-black/40 border-white/10 rounded-xl text-center font-mono px-1"
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-white/5 bg-[#050505] flex-shrink-0 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1 rounded-xl"
            size="md"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSaveMeal}
            disabled={!customName}
            leftIcon={Check}
            className="flex-1 rounded-xl font-extrabold"
            size="md"
          >
            Registrar
          </Button>
        </div>

      </div>
    </div>
  );
}
