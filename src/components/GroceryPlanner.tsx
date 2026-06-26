import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingCart, RefreshCw, Sparkles, Check, Square, Plus, Trash2, Share2, ClipboardCheck
} from "lucide-react";
import { UserProfile } from "../types";
import { generateGroceryListByIA } from "../services/geminiService";

interface GroceryPlannerProps {
  apiKey?: string;
  userProfile: UserProfile;
}

interface GroceryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  checked: boolean;
  nutritionalValue?: string;
}

export default function GroceryPlanner({ apiKey, userProfile }: GroceryPlannerProps) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Custom item inputs
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Despensa y Grasas");

  // Copy success indicator
  const [copied, setCopied] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const cached = localStorage.getItem("trophia_grocery_list");
    if (cached) {
      try {
        setItems(JSON.parse(cached));
      } catch (e) {
        console.error("Error reading cached grocery list", e);
      }
    }
  }, []);

  const saveItems = (newItems: GroceryItem[]) => {
    setItems(newItems);
    localStorage.setItem("trophia_grocery_list", JSON.stringify(newItems));
  };

  // Generate with IA
  const handleGenerateList = async () => {
    setIsGenerating(true);
    try {
      const data = await generateGroceryListByIA(apiKey || "", userProfile);
      if (data && data.categories) {
        const flatItems: GroceryItem[] = [];
        data.categories.forEach((cat: any) => {
          (cat.items || []).forEach((item: any) => {
            flatItems.push({
              id: Math.random().toString(36).substr(2, 9),
              name: item.name,
              quantity: item.quantity || "1 u",
              category: cat.name || "Despensa",
              checked: false,
              nutritionalValue: item.nutritionalValue
            });
          });
        });
        saveItems(flatItems);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle item check status
  const handleToggleItem = (id: string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    saveItems(updated);
  };

  // Delete single item
  const handleDeleteItem = (id: string) => {
    const updated = items.filter(item => item.id !== id);
    saveItems(updated);
  };

  // Add custom item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: GroceryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName.trim(),
      quantity: newItemQty.trim() || "1 u",
      category: newItemCategory,
      checked: false
    };

    saveItems([...items, newItem]);
    setNewItemName("");
    setNewItemQty("");
  };

  // Clear list
  const handleClearList = () => {
    saveItems([]);
  };

  // Share/Copy formatted text to Clipboard
  const handleCopyClipboard = () => {
    if (items.length === 0) return;
    
    // Group by category for export formatting
    const categories: Record<string, GroceryItem[]> = {};
    items.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });

    let text = `🛒 LISTA DE COMPRAS TROPHIA 🛒\n`;
    text += `Dieta: ${userProfile.dietType || "Estándar"} | Calorías: ${userProfile.dailyCalorieTarget || 2000} kcal\n\n`;

    Object.keys(categories).forEach(catName => {
      text += `■ ${catName.toUpperCase()}\n`;
      categories[catName].forEach(item => {
        const checkMark = item.checked ? "[x]" : "[ ]";
        text += `  ${checkMark} ${item.name} (${item.quantity})${item.nutritionalValue ? ` - ${item.nutritionalValue}` : ""}\n`;
      });
      text += `\n`;
    });

    text += `Planifica tus ingestas y entrena fuerte. ¡Trophia AI Assistant!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Group current items for display
  const groupedDisplay: Record<string, GroceryItem[]> = {};
  items.forEach(item => {
    if (!groupedDisplay[item.category]) {
      groupedDisplay[item.category] = [];
    }
    groupedDisplay[item.category].push(item);
  });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0d0e15] text-gray-900 dark:text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Header Title */}
      <div className="px-6 pt-5 border-b border-gray-200 dark:border-gray-800/40">
        <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">Módulo Compras</span>
        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <span>Lista de Compras</span>
        </h2>
      </div>

      <div className="p-6 space-y-6 flex-1 flex flex-col justify-start">
        
        {/* Controls Bar */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerateList}
            disabled={isGenerating}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generando lista...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generar con IA</span>
              </>
            )}
          </button>

          {items.length > 0 && (
            <>
              <button
                onClick={handleCopyClipboard}
                className="bg-white dark:bg-[#161824] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-250 dark:border-gray-800 p-3 rounded-xl transition cursor-pointer flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300"
                title="Copiar lista de compras"
              >
                {copied ? <ClipboardCheck className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                <span>{copied ? "Copiado" : "Exportar"}</span>
              </button>
              <button
                onClick={handleClearList}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 p-3 rounded-xl text-rose-500 transition cursor-pointer"
                title="Limpiar lista"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Custom Item Form */}
        <form onSubmit={handleAddCustomItem} className="bg-white dark:bg-[#161824] border border-gray-200 dark:border-gray-800 p-4 rounded-2xl space-y-3 shadow-sm text-left">
          <span className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Añadir Ingrediente Manual</span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Ingrediente (ej: Manzanas)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-800/85 bg-gray-50 dark:bg-[#0d0e15] px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50"
            />
            <input
              type="text"
              placeholder="Cantidad (ej: 4 u, 500g)"
              value={newItemQty}
              onChange={(e) => setNewItemQty(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-800/85 bg-gray-50 dark:bg-[#0d0e15] px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={newItemCategory}
              onChange={(e) => setNewItemCategory(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800/85 bg-gray-50 dark:bg-[#0d0e15] px-2 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="Proteínas y Carnes">Proteínas y Carnes</option>
              <option value="Cereales y Tubérculos">Cereales y Tubérculos</option>
              <option value="Lácteos y Derivados">Lácteos y Derivados</option>
              <option value="Verdulería y Frutas">Verdulería y Frutas</option>
              <option value="Despensa y Grasas">Despensa y Grasas</option>
            </select>
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir</span>
            </button>
          </div>
        </form>

        {/* Ingredients List */}
        {items.length > 0 ? (
          <div className="space-y-4 text-left">
            {Object.keys(groupedDisplay).map((catName) => (
              <div key={catName} className="space-y-2">
                <span className="block text-[10px] font-black text-amber-500 uppercase tracking-wider font-mono">
                  {catName}
                </span>

                <div className="space-y-1.5">
                  {groupedDisplay[catName].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleItem(item.id)}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition cursor-pointer shadow-sm group ${
                        item.checked 
                          ? "bg-gray-100/50 dark:bg-gray-900/40 border-gray-200/50 dark:border-gray-900 text-gray-400 dark:text-gray-600"
                          : "bg-white dark:bg-[#161824] border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white hover:border-amber-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button className="flex-shrink-0 cursor-pointer">
                          {item.checked ? (
                            <div className="w-4 h-4 rounded bg-amber-500 flex items-center justify-center text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border border-gray-300 dark:border-gray-700" />
                          )}
                        </button>
                        <div className="space-y-0.5">
                          <span className={`text-xs font-bold ${item.checked ? "line-through" : ""}`}>
                            {item.name}
                          </span>
                          {item.nutritionalValue && (
                            <span className="block text-[9px] text-gray-450 dark:text-gray-500 leading-none">
                              {item.nutritionalValue}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono bg-gray-100 dark:bg-[#0d0e15] px-2 py-0.5 rounded-lg border border-gray-200 dark:border-gray-800/40 text-gray-600 dark:text-gray-400">
                          {item.quantity}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                          className="text-gray-400 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-center text-gray-450 dark:text-gray-550 flex flex-col items-center justify-center gap-2">
            <ShoppingCart className="h-8 w-8 opacity-45" />
            <div>
              <span className="block text-xs font-extrabold text-gray-700 dark:text-gray-350">Tu lista está vacía</span>
              <span className="block text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Usa la IA para generar tu despensa semanal</span>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
