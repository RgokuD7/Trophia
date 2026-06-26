import React, { useState } from "react";
import { X, Sparkles, RefreshCw, Check, MessageSquare, ChevronRight } from "lucide-react";
import { UserProfile, LoggedMeal, MealType } from "../types";
import { generateRecipeFromIngredientsByIA, adjustLoggedMealByChatByIA, suggestFoodSubstitutesByIA } from "../services/geminiService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface RecipeAssistantModalProps {
  profile: UserProfile;
  onAddMeal: (meal: Omit<LoggedMeal, "id" | "timestamp">) => void;
  onClose: () => void;
}

// Categories of common pantry ingredients
const INGREDIENTS_BY_CATEGORY = [
  {
    category: "🥩 Proteínas",
    items: ["Pollo", "Huevo", "Tofu", "Carne de Res", "Salmón", "Atún", "Lentejas", "Garbanzos", "Proteína de Suero", "Pavo"]
  },
  {
    category: "🍞 Carbohidratos",
    items: ["Arroz", "Avena", "Quinoa", "Papa", "Camote", "Pasta", "Pan Integral", "Plátano", "Manzana"]
  },
  {
    category: "🥑 Grasas Saludables",
    items: ["Aguacate (Palta)", "Almendras", "Nueces", "Aceite de Oliva", "Queso", "Yogur Griego"]
  },
  {
    category: "🥦 Verduras y Otros",
    items: ["Espinaca", "Brócoli", "Tomate", "Champiñones", "Cebolla", "Pimiento", "Ajo", "Leche"]
  }
];

interface GeneratedRecipe {
  name: string;
  ingredientsList: string[];
  instructions: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  tip: string;
}

export default function RecipeAssistantModal({ profile, onAddMeal, onClose }: RecipeAssistantModalProps) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  
  // Chat-adjust state
  const [chatMessage, setChatMessage] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustmentLog, setAdjustmentLog] = useState<string | null>(null);
  const [originalRecipe, setOriginalRecipe] = useState<GeneratedRecipe | null>(null);

  // Substitution state
  const [substitutingIngredient, setSubstitutingIngredient] = useState<string | null>(null);
  const [substitutesList, setSubstitutesList] = useState<any[]>([]);
  const [loadingSubstitutes, setLoadingSubstitutes] = useState(false);

  const handleFetchSubstitutes = async (ingredientText: string) => {
    setSubstitutingIngredient(ingredientText);
    setLoadingSubstitutes(true);
    setSubstitutesList([]);
    try {
      const apiKey = profile.apiKey || localStorage.getItem("trophia_api_key") || "";
      // Clean up ingredient quantity prefix (e.g. "100g de avena" -> "avena")
      let cleanName = ingredientText.replace(/^\d+(\.\d+)?\s*(g|kg|taza|tazas|ml|l|cucharada|cucharadas|u|unidades)?\s*(de\s+)?/i, "");
      const data = await suggestFoodSubstitutesByIA(apiKey, cleanName, profile.dietType || "standard");
      if (data && data.substitutes) {
        setSubstitutesList(data.substitutes);
      } else {
        setSubstitutesList([]);
      }
    } catch (err) {
      console.error("Error fetching substitutes:", err);
      setSubstitutesList([]);
    } finally {
      setLoadingSubstitutes(false);
    }
  };

  const toggleIngredient = (item: string) => {
    if (selectedIngredients.includes(item)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== item));
    } else {
      setSelectedIngredients([...selectedIngredients, item]);
    }
  };

  const handleGenerateRecipe = async () => {
    if (selectedIngredients.length === 0) return;
    setLoading(true);
    setRecipe(null);
    setAdjustmentLog(null);
    try {
      const apiKey = profile.apiKey || localStorage.getItem("trophia_api_key") || "";
      const result = await generateRecipeFromIngredientsByIA(apiKey, profile, selectedIngredients);
      setRecipe(result);
      setOriginalRecipe(result);
    } catch (err) {
      console.error("Error generating recipe:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !recipe) return;
    setAdjusting(true);
    try {
      const apiKey = profile.apiKey || localStorage.getItem("trophia_api_key") || "";
      const adjusted = await adjustLoggedMealByChatByIA(apiKey, recipe, chatMessage);
      
      setRecipe({
        ...recipe,
        name: adjusted.name,
        calories: adjusted.calories,
        protein: adjusted.protein,
        carbs: adjusted.carbs,
        fat: adjusted.fat
      });
      setAdjustmentLog(adjusted.adjustmentExplanation);
      setChatMessage("");
    } catch (err) {
      console.error("Error adjusting recipe:", err);
    } finally {
      setAdjusting(false);
    }
  };

  const handleResetAdjustment = () => {
    if (originalRecipe) {
      setRecipe(originalRecipe);
      setAdjustmentLog(null);
    }
  };

  const handleSaveRecipe = () => {
    if (!recipe) return;
    
    // Auto-detect meal type based on hour
    const hour = new Date().getHours();
    let type: MealType = "lunch";
    if (hour >= 5 && hour < 11) type = "breakfast";
    else if (hour >= 11 && hour < 16) type = "lunch";
    else if (hour >= 16 && hour < 19) type = "snack";
    else if (hour >= 19 && hour < 23) type = "dinner";
    else type = "snack";

    onAddMeal({
      name: recipe.name,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      type
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-[#0d0e15] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden relative shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-800/60 flex justify-between items-center bg-gray-50 dark:bg-black/20 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
              Asistente de Recetas IA
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/5 rounded-xl transition text-gray-500 dark:text-white/40 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
          
          {recipe === null ? (
            /* STEP 1: Ingredient Pantry Selection */
            <div className="space-y-5">
              <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-2xl p-4.5 space-y-1.5 text-center">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-wide block">Despensa Trophia</span>
                <p className="text-[11px] text-gray-650 dark:text-gray-400 leading-relaxed">
                  Selecciona los ingredientes que tienes listos en tu cocina. La IA de Trophia creará una receta saludable adecuada a tu régimen (<b>{profile.dietType === "standard" ? "Estándar" : profile.dietType.toUpperCase()}</b>).
                </p>
              </div>

              {/* Grid of categories */}
              <div className="space-y-4">
                {INGREDIENTS_BY_CATEGORY.map((cat, idx) => (
                  <div key={idx} className="space-y-2">
                    <span className="block text-[10px] font-bold text-gray-550 dark:text-gray-400 uppercase tracking-wide">
                      {cat.category}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map((item) => {
                        const isSelected = selectedIngredients.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleIngredient(item)}
                            className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition cursor-pointer select-none ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-400 text-white shadow-md shadow-emerald-500/10"
                                : "bg-gray-50 hover:bg-gray-100 dark:bg-[#161824] hover:dark:bg-[#1c1e2f] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <Button
                  onClick={handleGenerateRecipe}
                  disabled={selectedIngredients.length === 0 || loading}
                  isLoading={loading}
                  variant="primary"
                  className="w-full cursor-pointer py-3.5"
                  leftIcon={Sparkles}
                >
                  Generar Receta por IA ({selectedIngredients.length})
                </Button>
              </div>
            </div>
          ) : (
            /* STEP 2: Display Generated Recipe & Portions Chat */
            <div className="space-y-5">
              
              {/* Reset to Step 1 */}
              <button
                onClick={() => setRecipe(null)}
                className="text-[10px] font-extrabold text-gray-500 dark:text-white/40 hover:text-emerald-500 dark:hover:text-emerald-400 uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-transparent border-none transition"
              >
                ← Cambiar Ingredientes / Volver
              </button>

              {/* Header card with Macros */}
              <div className="bg-white dark:bg-[#161824] p-4.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-md text-center">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white leading-tight uppercase tracking-wide">
                    {recipe.name}
                  </h4>
                  <span className="text-[10px] text-gray-450 dark:text-gray-500 font-mono mt-0.5 block">
                    Porción sugerida: {recipe.servingSize}
                  </span>
                </div>

                {/* Macro metrics row */}
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="bg-gray-50 dark:bg-black/30 p-2.5 rounded-xl border border-gray-150 dark:border-white/5">
                    <span className="block text-[15px] font-extrabold text-gray-950 dark:text-white leading-none">{recipe.calories}</span>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold uppercase mt-1 block">Kcal</span>
                  </div>
                  <div className="bg-orange-500/5 dark:bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/10">
                    <span className="block text-[15px] font-extrabold text-orange-500 leading-none">{recipe.protein}g</span>
                    <span className="text-[9px] text-orange-500 dark:text-orange-400 font-bold uppercase mt-1 block">Prot</span>
                  </div>
                  <div className="bg-blue-500/5 dark:bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/10">
                    <span className="block text-[15px] font-extrabold text-blue-500 leading-none">{recipe.carbs}g</span>
                    <span className="text-[9px] text-blue-500 dark:text-blue-400 font-bold uppercase mt-1 block">Carb</span>
                  </div>
                  <div className="bg-amber-500/5 dark:bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/10">
                    <span className="block text-[15px] font-extrabold text-amber-500 leading-none">{recipe.fat}g</span>
                    <span className="text-[9px] text-amber-500 dark:text-amber-400 font-bold uppercase mt-1 block">Grasa</span>
                  </div>
                </div>

                {recipe.tip && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-2.5 rounded-xl text-left leading-relaxed">
                    💡 <b>Tip de Nutrición:</b> {recipe.tip}
                  </p>
                )}
              </div>

              {/* Recipe Ingredients list */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  📋 Ingredientes necesarios:
                </span>
                <ul className="bg-gray-50 dark:bg-black/20 border border-gray-150 dark:border-white/5 rounded-2xl p-4.5 space-y-2 text-xs text-gray-850 dark:text-gray-300">
                  {recipe.ingredientsList.map((ing, idx) => (
                    <li key={idx} className="flex justify-between items-center py-1 border-b border-gray-200/50 dark:border-gray-800/30 last:border-0">
                      <div className="flex gap-2 items-start flex-1 pr-2">
                        <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{ing}</span>
                      </div>
                      <button
                        onClick={() => handleFetchSubstitutes(ing)}
                        className="text-[9px] font-black text-amber-500 hover:text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 transition cursor-pointer flex-shrink-0"
                      >
                        Sustituir
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Substitutes Sub-Panel */}
              <AnimatePresence>
                {substitutingIngredient && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-amber-500/5 dark:bg-[#161824] border border-amber-500/15 dark:border-gray-800/80 p-4 rounded-2xl space-y-3.5 shadow-inner overflow-hidden text-left"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-amber-500 font-bold uppercase tracking-wider">
                        Sustitutos para: "{substitutingIngredient.replace(/^\d+(\.\d+)?\s*(g|kg|taza|tazas|ml|l|cucharada|cucharadas|u|unidades)?\s*(de\s+)?/i, "")}"
                      </span>
                      <button
                        onClick={() => { setSubstitutingIngredient(null); setSubstitutesList([]); }}
                        className="text-[10px] font-black text-gray-400 hover:text-gray-650 cursor-pointer bg-transparent border-none"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    {loadingSubstitutes ? (
                      <div className="py-4 flex items-center justify-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold animate-pulse">Buscando alternativas...</span>
                      </div>
                    ) : substitutesList.length > 0 ? (
                      <div className="space-y-2">
                        {substitutesList.map((sub, idx) => (
                          <div key={idx} className="bg-white dark:bg-black/30 border border-gray-150 dark:border-white/5 p-3 rounded-xl space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black text-gray-900 dark:text-white">{sub.name}</span>
                              <span className="text-[9px] font-bold text-amber-500 font-mono bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                Ratio: {sub.ratioText}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-650 dark:text-gray-400 leading-normal">
                              {sub.benefit}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-rose-500 block">No se encontraron sustitutos válidos para esta dieta.</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Recipe Instructions list */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  🍳 Instrucciones de preparación:
                </span>
                <ol className="bg-gray-50 dark:bg-black/20 border border-gray-150 dark:border-white/5 rounded-2xl p-4.5 space-y-3.5 text-xs text-gray-850 dark:text-gray-300">
                  {recipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3 items-start">
                      <span className="w-5 h-5 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 rounded-full font-extrabold flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Interactive Portion Adjust Chat */}
              <div className="border-t border-gray-200 dark:border-gray-800/80 pt-4.5 space-y-3">
                <div className="flex gap-1.5 items-center">
                  <MessageSquare className="h-4 w-4 text-emerald-400" />
                  <span className="block text-[10.5px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Ajustar porción consumida (Chat IA)
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-500 leading-normal">
                  ¿No te comiste todo o comiste de más? Indícaselo a la IA (ej. <i>"dejé la mitad"</i>, <i>"me comí un plato y medio"</i>) para ajustar los macros.
                </p>

                {/* Adjustment Banner Notification */}
                {adjustmentLog && (
                  <div className="bg-amber-500/15 border border-amber-500/20 p-3 rounded-xl flex items-start gap-2.5 text-[10.5px] text-amber-600 dark:text-amber-300 font-medium">
                    <span className="shrink-0 mt-0.5 text-amber-500">⚡</span>
                    <div className="flex-1 space-y-1">
                      <p className="leading-relaxed">{adjustmentLog}</p>
                      <button 
                        type="button" 
                        onClick={handleResetAdjustment}
                        className="text-[9.5px] font-bold underline text-amber-600 dark:text-amber-400 hover:text-amber-500 cursor-pointer block text-left"
                      >
                        Restaurar porción original
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAdjustRecipe} className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Ej: 'dejé la mitad de las verduras'..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={adjusting}
                    className="flex-1 rounded-xl bg-gray-50 dark:bg-black/30 border-gray-200 dark:border-gray-800"
                    size="sm"
                  />
                  <Button
                    type="submit"
                    disabled={!chatMessage.trim() || adjusting}
                    isLoading={adjusting}
                    variant="secondary"
                    className="px-4 py-2 shrink-0 rounded-xl cursor-pointer"
                    size="sm"
                  >
                    Ajustar
                  </Button>
                </form>
              </div>

              {/* Final Confirm Button */}
              <div className="pt-3 border-t border-gray-250 dark:border-gray-805">
                <Button
                  onClick={handleSaveRecipe}
                  variant="primary"
                  className="w-full cursor-pointer py-3.5"
                  leftIcon={Check}
                >
                  Registrar Receta en mi Diario
                </Button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
