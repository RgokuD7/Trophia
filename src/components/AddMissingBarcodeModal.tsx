import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  X,
  Sparkles,
  CheckCircle,
  AlertCircle,
  FileText,
  Save,
  ArrowRight,
  RefreshCw,
  Barcode
} from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { FoodItem } from "../types";
import { saveBarcodeCorrection } from "../services/dbService";
import { analyzeCommunityProductPhotosByIA } from "../services/geminiService";

interface AddMissingBarcodeModalProps {
  isOpen: boolean;
  barcode: string;
  onClose: () => void;
  onProductCreated: (food: FoodItem) => void;
  apiKey?: string;
  userName?: string;
}

export default function AddMissingBarcodeModal({
  isOpen,
  barcode,
  onClose,
  onProductCreated,
  apiKey,
  userName
}: AddMissingBarcodeModalProps) {
  // Photos state
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [nutritionPhoto, setNutritionPhoto] = useState<string | null>(null);

  // Flow state
  const [step, setStep] = useState<"capture" | "review">("capture");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [servingSize, setServingSize] = useState("100g");
  const [calories, setCalories] = useState<number | "">("");
  const [protein, setProtein] = useState<number | "">("");
  const [carbs, setCarbs] = useState<number | "">("");
  const [fat, setFat] = useState<number | "">("");
  const [unitWeight, setUnitWeight] = useState<number>(100);
  const [unitLabel, setUnitLabel] = useState("porción");

  const frontInputRef = useRef<HTMLInputElement>(null);
  const nutritionInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "front" | "nutrition") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === "front") {
        setFrontPhoto(dataUrl);
      } else {
        setNutritionPhoto(dataUrl);
      }
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRunAiAnalysis = async () => {
    const imagesToAnalyze: string[] = [];
    if (frontPhoto) imagesToAnalyze.push(frontPhoto);
    if (nutritionPhoto) imagesToAnalyze.push(nutritionPhoto);

    if (imagesToAnalyze.length === 0) {
      setAnalysisError("Sube al menos una foto del producto o de la tabla nutricional.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const effectiveKey = apiKey || (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_api_key") : "") || "";
      const result = await analyzeCommunityProductPhotosByIA(effectiveKey, imagesToAnalyze, barcode);

      if (result && result.name) {
        setName(result.name);
        setBrand(result.brand || "");
        setCalories(result.calories);
        setProtein(result.protein);
        setCarbs(result.carbs);
        setFat(result.fat);
        setServingSize(result.servingSize || "100g");
        setUnitWeight(result.unitWeight || 100);
        setUnitLabel(result.unitLabel || "porción");
        setStep("review");
      } else {
        setAnalysisError("La IA no pudo extraer los datos claramente. Puedes ingresar los datos manualmente.");
      }
    } catch (err: any) {
      console.error("Error analyzing product photos:", err);
      setAnalysisError(err.message || "Error al conectar con la IA. Completa los datos manualmente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveToCommunity = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const calVal = Number(calories) || 0;
      const protVal = Number(protein) || 0;
      const carbVal = Number(carbs) || 0;
      const fatVal = Number(fat) || 0;

      // 1. Save to global Firestore collection `barcodes`
      await saveBarcodeCorrection(barcode, {
        barcode,
        name: name.trim(),
        brand: brand.trim() || undefined,
        calories: calVal,
        protein: protVal,
        carbs: carbVal,
        fat: fatVal,
        servingSize: servingSize.trim() || "100g",
        unitWeight: unitWeight > 0 ? unitWeight : 100,
        unitLabel: unitLabel.trim() || "porción",
        contributedBy: userName || "Comunidad Trophia"
      });

      // 2. Build FoodItem
      const newFood: FoodItem = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        calories: calVal,
        protein: protVal,
        carbs: carbVal,
        fat: fatVal,
        servingSize: servingSize.trim() || "100g",
        barcode: barcode,
        source: "local",
        raw100gCalories: calVal,
        raw100gProtein: protVal,
        raw100gCarbs: carbVal,
        raw100gFat: fatVal,
        portionGrams: unitWeight > 0 ? unitWeight : 100,
        portionValue: unitWeight > 0 ? 1 : 100,
        portionUnit: unitWeight > 0 && unitWeight !== 100 ? "unit" : "g",
        unitWeight: unitWeight > 0 ? unitWeight : 100,
        unitLabel: unitLabel.trim() || "porción"
      };

      if (navigator.vibrate) navigator.vibrate(100);
      onProductCreated(newFood);
      onClose();
    } catch (err) {
      console.error("Error saving community barcode:", err);
      setAnalysisError("Error al guardar en la base de datos comunitaria.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-[#11121d] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-white"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
              <Barcode className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-tight text-white truncate">
                Agregar a Trophia
              </h3>
              <span className="text-[10px] text-white/40 font-mono block truncate">
                Código: {barcode}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {step === "capture" ? (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Este producto aún no está en nuestra base. Sube fotos del empaque y de la tabla nutricional para que la IA extraiga los macros y quede registrado para toda la comunidad.
                </p>
              </div>

              {/* 2 Photo Slots */}
              <div className="grid grid-cols-2 gap-3">
                {/* Slot 1: Front of package */}
                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    1. Frente / Empaque
                  </span>
                  {frontPhoto ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/40 group">
                      <img src={frontPhoto} alt="Frente" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFrontPhoto(null)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-500/80 rounded-lg text-white transition cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => frontInputRef.current?.click()}
                      className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/40 hover:bg-white/[0.02] transition flex flex-col items-center justify-center gap-1.5 cursor-pointer p-2"
                    >
                      <Camera className="h-5 w-5 text-white/40" />
                      <span className="text-[10px] font-bold text-white/60">Foto del frente</span>
                      <span className="text-[8px] text-white/30">Nombre y marca</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={frontInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "front")}
                  />
                </div>

                {/* Slot 2: Nutrition table */}
                <div className="space-y-1.5 text-center">
                  <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    2. Tabla Nutricional
                  </span>
                  {nutritionPhoto ? (
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/40 group">
                      <img src={nutritionPhoto} alt="Tabla Nutricional" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNutritionPhoto(null)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-red-500/80 rounded-lg text-white transition cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => nutritionInputRef.current?.click()}
                      className="w-full aspect-square rounded-2xl border-2 border-dashed border-white/15 hover:border-emerald-500/40 hover:bg-white/[0.02] transition flex flex-col items-center justify-center gap-1.5 cursor-pointer p-2"
                    >
                      <FileText className="h-5 w-5 text-white/40" />
                      <span className="text-[10px] font-bold text-white/60">Tabla de macros</span>
                      <span className="text-[8px] text-white/30">Calorías y gramos</span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={nutritionInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, "nutrition")}
                  />
                </div>
              </div>

              {analysisError && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-400 text-[10.5px]">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleRunAiAnalysis}
                  disabled={isAnalyzing || (!frontPhoto && !nutritionPhoto)}
                  className="w-full font-bold flex items-center justify-center gap-2 py-3"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-black" />
                      <span>Analizando con IA Trophia...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-black" />
                      <span>Extraer Datos con IA</span>
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setStep("review")}
                  className="w-full text-center text-[10px] text-white/40 hover:text-white transition py-1 cursor-pointer underline"
                >
                  O ingresar los datos manualmente sin fotos
                </button>
              </div>
            </>
          ) : (
            /* Step 2: Review and manual edit */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                  Revisa y Confirma los Datos
                </span>
                <button
                  type="button"
                  onClick={() => setStep("capture")}
                  className="text-[10px] text-white/40 hover:text-white underline cursor-pointer"
                >
                  ← Volver a fotos
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                    Nombre del Alimento *
                  </label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Leche Entera"
                    className="bg-black/40 border-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                      Marca (Opcional)
                    </label>
                    <Input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ej: Colun"
                      className="bg-black/40 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase mb-1">
                      Porción sugerida
                    </label>
                    <Input
                      type="text"
                      value={servingSize}
                      onChange={(e) => setServingSize(e.target.value)}
                      placeholder="Ej: 1 vaso (200 ml)"
                      className="bg-black/40 border-white/10"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <span className="block text-[10px] font-bold text-white/40 uppercase mb-2">
                    Macronutrientes por cada 100g / 100ml
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="bg-black/40 border border-white/10 p-2 rounded-xl text-center">
                      <span className="text-[8.5px] font-bold text-orange-400 block uppercase">Calorías</span>
                      <input
                        type="number"
                        value={calories}
                        onChange={(e) => setCalories(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-full text-center bg-transparent border-0 font-black text-xs text-white focus:outline-none"
                      />
                      <span className="text-[8px] text-white/30">kcal</span>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-2 rounded-xl text-center">
                      <span className="text-[8.5px] font-bold text-emerald-400 block uppercase">Proteínas</span>
                      <input
                        type="number"
                        step="0.1"
                        value={protein}
                        onChange={(e) => setProtein(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-full text-center bg-transparent border-0 font-black text-xs text-white focus:outline-none"
                      />
                      <span className="text-[8px] text-white/30">g</span>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-2 rounded-xl text-center">
                      <span className="text-[8.5px] font-bold text-sky-400 block uppercase">Carbos</span>
                      <input
                        type="number"
                        step="0.1"
                        value={carbs}
                        onChange={(e) => setCarbs(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-full text-center bg-transparent border-0 font-black text-xs text-white focus:outline-none"
                      />
                      <span className="text-[8px] text-white/30">g</span>
                    </div>
                    <div className="bg-black/40 border border-white/10 p-2 rounded-xl text-center">
                      <span className="text-[8.5px] font-bold text-amber-400 block uppercase">Grasas</span>
                      <input
                        type="number"
                        step="0.1"
                        value={fat}
                        onChange={(e) => setFat(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="0"
                        className="w-full text-center bg-transparent border-0 font-black text-xs text-white focus:outline-none"
                      />
                      <span className="text-[8px] text-white/30">g</span>
                    </div>
                  </div>
                </div>
              </div>

              {analysisError && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-[10px]">
                  {analysisError}
                </div>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleSaveToCommunity}
                disabled={isSaving || !name.trim()}
                className="w-full font-bold flex items-center justify-center gap-2 py-3 mt-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    <span>Guardando en Trophia...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 text-black" />
                    <span>Guardar y Agregar a mi Diario</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
