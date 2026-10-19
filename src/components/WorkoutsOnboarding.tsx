import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dumbbell, Sparkles, Check, ChevronRight, ChevronLeft, ShieldAlert, 
  AlertTriangle, X, Plus, Info, RefreshCw, Flame, Calendar, Award, 
  Layers, CheckCircle2, Trash2, Lightbulb, ChevronDown
} from "lucide-react";
import { 
  UserProfile, TrainingEnvironment, ExperienceLevel 
} from "../types";
import { 
  validateAndParseCustomEquipmentByIA, RejectedEquipmentItem 
} from "../services/geminiService";

export interface WorkoutsOnboardingProps {
  apiKey?: string;
  userProfile: UserProfile;
  isOpen: boolean;
  onClose?: () => void;
  onComplete: (updatedData: {
    environment: TrainingEnvironment;
    environments: TrainingEnvironment[];
    equipment: string[];
    customEquipment: string[];
    level: ExperienceLevel;
    jointPainAreas: ("knee" | "back" | "shoulder")[];
    customJointPain: string;
    weeklyTrainingDays: number;
  }) => void;
}

const PRESET_GYM_EQUIPMENT = [
  "Prensa de piernas (Leg Press)",
  "Poleas cruzadas / Cables ajustables",
  "Jaula de sentadillas (Power Rack)",
  "Máquina Smith / Multipower",
  "Mancuernas pesadas fijas",
  "Barras olímpicas y discos",
  "Bancos ajustables (plano/inclinado)",
  "Máquina de jalón al pecho",
  "Máquina de remo sentado (polea)",
  "Sillón de extensiones de cuádriceps",
  "Camilla de curl femoral",
  "Contractora / Pec Deck",
  "Banco Scott / Predicador"
];

const PRESET_HOME_EQUIPMENT = [
  "Mancuernas ajustables / variables",
  "Bandas elásticas de resistencia",
  "Mini-bands circulares",
  "Barra de dominadas de puerta/pared",
  "Banco de pesas reclinable / plano",
  "Colchoneta de alta densidad / Mat",
  "Cuerda para saltar (Comba)",
  "Sistema de suspensión (tipo TRX)",
  "Pesas rusas (Kettlebells)",
  "Rueda de abdominales (Ab roller)"
];

const PRESET_HOME_MACHINES = [
  "Bicicleta elíptica",
  "Polea simple / Polea de pared",
  "Cinta de correr / Caminadora",
  "Bicicleta estática / Spinning",
  "Máquina multifunción / Multigimnasio de placas",
  "Remo indoor / Water rower",
  "Máquina Smith / Multipower doméstica",
  "Sillón de extensiones y curl de piernas",
  "Banco Scott / Predicador",
  "Soporte para sentadillas (Squat Stands)"
];

const PRESET_OUTDOOR_EQUIPMENT = [
  "Barras fijas de parque (altas)",
  "Barras paralelas de exterior",
  "Anillas de gimnasia con correas",
  "Escaleras suecas / Espalderas",
  "Chaleco lastrado (Weighted vest)",
  "Mini-paralelas (Parallettes)",
  "Pesas para tobillos / muñecas"
];

const PRESET_BODYWEIGHT = "Solo peso corporal / Calistenia básica";

export default function WorkoutsOnboarding({
  apiKey,
  userProfile,
  isOpen,
  onClose,
  onComplete
}: WorkoutsOnboardingProps) {
  // Wizard steps: 0 (Bienvenida), 1 (Ubicaciones), 2 (Equipamiento), 3 (Nivel y Días), 4 (Molestias y Lesiones), 5 (Resumen y Generar)
  const [currentStep, setCurrentStep] = useState<number>(0);

  // 1. Environments (multi-select)
  const [selectedEnvironments, setSelectedEnvironments] = useState<TrainingEnvironment[]>(() => {
    if (userProfile.environments && userProfile.environments.length > 0) {
      return userProfile.environments;
    }
    if (userProfile.environment) {
      return [userProfile.environment];
    }
    return ["gym"];
  });

  // 2. Equipment selection
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => {
    if (userProfile.equipment && userProfile.equipment.length > 0) {
      return userProfile.equipment;
    }
    return ["Mancuernas ajustables / variables", "Banco de pesas reclinable / plano", PRESET_BODYWEIGHT];
  });

  // Custom user-added equipment (persisted in DB)
  const [userCustomEquipment, setUserCustomEquipment] = useState<string[]>(() => {
    return userProfile.customEquipment || [];
  });

  // Input for adding new equipment via AI
  const [customInputText, setCustomInputText] = useState("");
  const [isValidatingEquipment, setIsValidatingEquipment] = useState(false);
  const [rejectedItemsList, setRejectedItemsList] = useState<RejectedEquipmentItem[]>([]);
  const [customAddSuccessMsg, setCustomAddSuccessMsg] = useState<string | null>(null);

  // 2b. Home machines toggle & catalog states
  const [showHomeMachines, setShowHomeMachines] = useState<boolean>(() => {
    return PRESET_HOME_MACHINES.some(m => userProfile.equipment?.includes(m));
  });
  const [showFullGymCatalogForHome, setShowFullGymCatalogForHome] = useState(false);

  // 3. Training Level & Days
  const [trainingLevel, setTrainingLevel] = useState<ExperienceLevel>(userProfile.level || "intermediate");
  const [weeklyDays, setWeeklyDays] = useState<number>(userProfile.weeklyTrainingDays || 4);

  // 4. Joint pain & custom open injuries
  const [selectedJointPain, setSelectedJointPain] = useState<("knee" | "back" | "shoulder")[]>(
    userProfile.jointPainAreas || []
  );
  const [customJointPainText, setCustomJointPainText] = useState<string>(
    userProfile.customJointPain || ""
  );

  if (!isOpen) return null;

  // Toggle environment
  const handleToggleEnvironment = (env: TrainingEnvironment) => {
    if (selectedEnvironments.includes(env)) {
      if (selectedEnvironments.length === 1) return; // Keep at least one
      setSelectedEnvironments(selectedEnvironments.filter(e => e !== env));
    } else {
      setSelectedEnvironments([...selectedEnvironments, env]);
    }
  };

  // Toggle standard equipment
  const handleToggleEquipment = (item: string) => {
    if (item === PRESET_BODYWEIGHT) {
      if (selectedEquipment.includes(PRESET_BODYWEIGHT) && selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter(x => x !== PRESET_BODYWEIGHT));
      } else {
        setSelectedEquipment([PRESET_BODYWEIGHT]);
      }
      return;
    }

    const withoutBodyweight = selectedEquipment.filter(x => x !== PRESET_BODYWEIGHT);
    if (selectedEquipment.includes(item)) {
      const next = withoutBodyweight.filter(x => x !== item);
      setSelectedEquipment(next.length > 0 ? next : [PRESET_BODYWEIGHT]);
    } else {
      setSelectedEquipment([...withoutBodyweight, item]);
    }
  };

  // Remove a custom item added by user
  const handleRemoveCustomItem = (itemToRemove: string) => {
    setUserCustomEquipment(prev => prev.filter(item => item !== itemToRemove));
    setSelectedEquipment(prev => prev.filter(item => item !== itemToRemove));
  };

  // Handle AI analysis & validation of custom equipment entered by user
  const handleValidateAndAddEquipment = async () => {
    const text = customInputText.trim();
    if (!text) return;

    setIsValidatingEquipment(true);
    setRejectedItemsList([]);
    setCustomAddSuccessMsg(null);

    try {
      const allExisting = Array.from(new Set([...selectedEquipment, ...userCustomEquipment]));
      const result = await validateAndParseCustomEquipmentByIA(apiKey || "", text, allExisting);

      // Add valid items
      if (result.validEquipment && result.validEquipment.length > 0) {
        const newItems = result.validEquipment.filter(
          item => !userCustomEquipment.includes(item) && !selectedEquipment.includes(item)
        );

        if (newItems.length > 0) {
          setUserCustomEquipment(prev => [...prev, ...newItems]);
          setSelectedEquipment(prev => {
            const cleanPrev = prev.filter(x => x !== PRESET_BODYWEIGHT);
            return [...cleanPrev, ...newItems];
          });
          setCustomAddSuccessMsg(
            `¡${newItems.length} elemento${newItems.length > 1 ? "s añadidos" : " añadido"} con éxito a tu perfil!`
          );
        } else {
          setCustomAddSuccessMsg("Los elementos ingresados ya estaban en tu lista.");
        }
      }

      // Record any rejected items
      if (result.rejectedItems && result.rejectedItems.length > 0) {
        setRejectedItemsList(result.rejectedItems);
      }

      setCustomInputText("");
    } catch (err) {
      console.error("Error validating equipment with AI:", err);
      // Fallback: add raw item if it doesn't already exist
      if (!selectedEquipment.includes(text)) {
        setUserCustomEquipment(prev => [...prev, text]);
        setSelectedEquipment(prev => [...prev.filter(x => x !== PRESET_BODYWEIGHT), text]);
        setCustomAddSuccessMsg(`Añadido: "${text}"`);
      }
      setCustomInputText("");
    } finally {
      setIsValidatingEquipment(false);
    }
  };

  // Accept an AI suggestion from a rejected item
  const handleAcceptSuggestion = (suggestion: string) => {
    if (!selectedEquipment.includes(suggestion)) {
      setUserCustomEquipment(prev => [...prev, suggestion]);
      setSelectedEquipment(prev => [...prev.filter(x => x !== PRESET_BODYWEIGHT), suggestion]);
      setCustomAddSuccessMsg(`Añadida sugerencia recomendada: "${suggestion}"`);
    }
    // Remove from rejected list
    setRejectedItemsList(prev => prev.filter(r => r.suggestion !== suggestion));
  };

  // Finish onboarding
  const handleFinish = () => {
    const primaryEnv = selectedEnvironments[0] || "gym";
    const finalEquipment = selectedEquipment.length > 0 ? selectedEquipment : [PRESET_BODYWEIGHT];

    onComplete({
      environment: primaryEnv,
      environments: selectedEnvironments,
      equipment: finalEquipment,
      customEquipment: userCustomEquipment,
      level: trainingLevel,
      jointPainAreas: selectedJointPain,
      customJointPain: customJointPainText.trim(),
      weeklyTrainingDays: weeklyDays
    });
  };

  // Available equipment options based on environments selected
  const availableOptions: { id: string; category: string; items: string[]; isHome?: boolean }[] = [];
  if (selectedEnvironments.includes("gym")) {
    availableOptions.push({ id: "gym", category: "🏢 Gimnasio y Máquinas de Fuerza", items: PRESET_GYM_EQUIPMENT });
  }
  if (selectedEnvironments.includes("home")) {
    availableOptions.push({ id: "home", category: "🏠 Equipamiento de Casa / Funcional", items: PRESET_HOME_EQUIPMENT, isHome: true });
  }
  if (selectedEnvironments.includes("outdoor")) {
    availableOptions.push({ id: "outdoor", category: "🌳 Calistenia y Parque al Aire Libre", items: PRESET_OUTDOOR_EQUIPMENT });
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#07090e] text-white flex flex-col overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[420px] h-[420px] bg-emerald-600/10 rounded-full blur-[130px]" />
      </div>

      {/* Header bar */}
      <div className="px-6 py-4 border-b border-white/5 bg-[#07090e]/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Dumbbell className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest">
                Trophia Fitness
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                {currentStep === 0 ? "Bienvenida" : `Paso ${currentStep} de 5`}
              </span>
            </div>
            <h1 className="text-sm font-black text-white tracking-tight">
              {currentStep === 0 && "Configuración de tu Módulo de Ejercicios"}
              {currentStep === 1 && "¿Dónde entrenas habitualmente?"}
              {currentStep === 2 && "Equipamiento y Máquinas Disponibles"}
              {currentStep === 3 && "Nivel y Frecuencia de Entrenamiento"}
              {currentStep === 4 && "Salud Articular y Prevención de Molestias"}
              {currentStep === 5 && "Resumen y Formulación con IA"}
            </h1>
          </div>
        </div>

        {onClose && userProfile.isWorkoutsOnboardingCompleted && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition cursor-pointer border border-white/10"
            title="Cerrar y volver"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Visual Step Progress Bar */}
      <div className="w-full bg-white/5 h-1 shrink-0 z-20">
        <div 
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1 transition-all duration-300 ease-out"
          style={{ width: `${(currentStep / 5) * 100}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-2xl mx-auto w-full z-10 no-scrollbar">
        <AnimatePresence mode="wait">
          {/* STEP 0: Bienvenida al Módulo de Ejercicios */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-left"
            >
              <div className="relative p-6 rounded-3xl bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 overflow-hidden shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                      Potenciado con Gemini 3.8 Flash
                    </span>
                    <h2 className="text-xl font-black text-white tracking-tight">
                      ¡Tu Gimnasio Inteligente te da la bienvenida!
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-white/80 leading-relaxed font-medium">
                  Este módulo está diseñado para que alcances tu máximo potencial físico con base científica, cuidando siempre tus articulaciones y adaptándose a tu realidad:
                </p>

                <div className="mt-5 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">Rutinas IA 100% a Medida</h3>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                        Gemini formulará sesiones óptimas basadas en las máquinas y herramientas que realmente tienes, modulando la fatiga por grupo muscular.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">Crea o Pega tus Propias Rutinas</h3>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                        Puedes añadir tus propios ejercicios, pegar listas completas o ajustar series, repeticiones y descansos con libertad absoluta.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Award className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">Sobrecarga Progresiva & Descansos</h3>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                        Registra peso y repeticiones serie por serie, con temporizador automático de descanso y cálculo de recuperación muscular.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white">Protección Articular Estricta</h3>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                        Te preguntaremos por molestias en rodillas, lumbares, hombros o lesiones específicas para descartar ejercicios lesivos y sugerir variantes biomecánicas.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
                <Info className="h-4 w-4 text-emerald-400 shrink-0" />
                <p className="text-[11px] text-white/70">
                  Vamos a hacerte 4 preguntas rápidas para calibrar tu perfil. Podrás modificar estas preferencias en cualquier momento pulsando el botón <strong className="text-emerald-400">Preferencias</strong>.
                </p>
              </div>
            </motion.div>
          )}

          {/* STEP 1: ¿Dónde entrenas? (Multi-select) */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Paso 1 · Entornos de Entrenamiento
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  ¿Dónde entrenas habitualmente?
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Puedes seleccionar una o varias opciones si entrenas en diferentes lugares a lo largo de la semana.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: "gym" as TrainingEnvironment,
                    title: "Gimnasio Comercial",
                    emoji: "🏢",
                    desc: "Acceso a máquinas de placas, multipower, barras olímpicas, poleas y mancuernas pesadas."
                  },
                  {
                    id: "home" as TrainingEnvironment,
                    title: "En Casa",
                    emoji: "🏠",
                    desc: "Mancuernas, bandas, polea, elíptica o máquinas que tengas en casa."
                  },
                  {
                    id: "outdoor" as TrainingEnvironment,
                    title: "Aire Libre / Parque",
                    emoji: "🌳",
                    desc: "Calistenia en barras fijas, anillas, paralelas y entrenamiento funcional al aire libre."
                  }
                ].map((item) => {
                  const isSelected = selectedEnvironments.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleEnvironment(item.id)}
                      className={`p-4.5 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                          : "bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">{item.emoji}</span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <h3 className={`text-sm font-black ${isSelected ? "text-emerald-400" : "text-white"}`}>
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-white/50 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="mt-3 pt-2 border-t border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Entorno activo</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
                <Info className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] text-emerald-300 font-medium">
                  En el siguiente paso verás el catálogo de máquinas y equipamiento correspondiente a los entornos seleccionados.
                </span>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Equipamiento y Máquinas Disponibles + Validador IA */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Paso 2 · Equipamiento & Máquinas
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  ¿Qué máquinas o accesorios tienes disponibles?
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Marca lo que tienes a tu alcance. La IA usará exclusivamente lo que selecciones para diseñar tus rutinas.
                </p>
              </div>

              {/* Categorized options */}
              <div className="space-y-4">
                {availableOptions.map((cat) => (
                  <div key={cat.category} className="space-y-2">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                      {cat.category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cat.items.map((eq) => {
                        const isSelected = selectedEquipment.includes(eq);
                        return (
                          <button
                            key={eq}
                            type="button"
                            onClick={() => handleToggleEquipment(eq)}
                            className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                              isSelected
                                ? "bg-emerald-500/15 border-emerald-500 text-white font-bold shadow-sm"
                                : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                            }`}
                          >
                            <span className="text-xs truncate pr-2">{eq}</span>
                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20"
                            }`}>
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Dedicated "Elegir máquinas en casa" Button and Panel */}
                    {cat.isHome && (
                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowHomeMachines(prev => !prev)}
                          className={`w-full p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                            showHomeMachines
                              ? "bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                              : "bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/15"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                              <Dumbbell className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-white">Elegir máquinas en casa</span>
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                                  {PRESET_HOME_MACHINES.filter(m => selectedEquipment.includes(m)).length > 0
                                    ? `${PRESET_HOME_MACHINES.filter(m => selectedEquipment.includes(m)).length} seleccionadas`
                                    : "Elíptica, poleas, cardio..."}
                                </span>
                              </div>
                              <span className="text-[10px] text-white/50 block mt-0.5">
                                ¿Tienes elíptica, polea simple, cinta de correr o multigimnasio en tu casa?
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold shrink-0 ml-2">
                            <span>{showHomeMachines ? "Ocultar" : "Elegir máquinas"}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showHomeMachines ? "rotate-180" : ""}`} />
                          </div>
                        </button>

                        <AnimatePresence>
                          {showHomeMachines && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden p-3.5 rounded-2xl bg-black/40 border border-emerald-500/30 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>🏗️</span> Máquinas de Casa y Cardio
                                </span>
                                <span className="text-[9px] text-white/40">Marca las que tengas</span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {PRESET_HOME_MACHINES.map((machine) => {
                                  const isSelected = selectedEquipment.includes(machine);
                                  return (
                                    <button
                                      key={machine}
                                      type="button"
                                      onClick={() => handleToggleEquipment(machine)}
                                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                                        isSelected
                                          ? "bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-sm"
                                          : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                                      }`}
                                    >
                                      <span className="text-xs truncate pr-1">{machine}</span>
                                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                        isSelected ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20"
                                      }`}>
                                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Option to also see all commercial gym machines if they have a full home gym setup */}
                              {!selectedEnvironments.includes("gym") && (
                                <div className="pt-2 border-t border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setShowFullGymCatalogForHome(prev => !prev)}
                                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer bg-transparent border-none transition"
                                  >
                                    <span>{showFullGymCatalogForHome ? "Ocultar otras máquinas de gimnasio" : "+ ¿Tienes más máquinas de gimnasio comercial en casa?"}</span>
                                    <ChevronDown className={`h-3 w-3 transition-transform ${showFullGymCatalogForHome ? "rotate-180" : ""}`} />
                                  </button>

                                  {showFullGymCatalogForHome && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-white/5">
                                      {PRESET_GYM_EQUIPMENT.filter(g => !PRESET_HOME_MACHINES.includes(g)).map((gymEq) => {
                                        const isSelected = selectedEquipment.includes(gymEq);
                                        return (
                                          <button
                                            key={gymEq}
                                            type="button"
                                            onClick={() => handleToggleEquipment(gymEq)}
                                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer ${
                                              isSelected
                                                ? "bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-sm"
                                                : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                                            }`}
                                          >
                                            <span className="text-xs truncate pr-1">{gymEq}</span>
                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                              isSelected ? "border-emerald-400 bg-emerald-500 text-black" : "border-white/20"
                                            }`}>
                                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                ))}

                {/* Universal Bodyweight Option */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleEquipment(PRESET_BODYWEIGHT)}
                    className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                      selectedEquipment.includes(PRESET_BODYWEIGHT)
                        ? "bg-emerald-500/20 border-emerald-500 text-white font-black"
                        : "bg-white/[0.02] border-white/5 text-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🧘</span>
                      <div>
                        <span className="text-xs font-black block">{PRESET_BODYWEIGHT}</span>
                        <span className="text-[10px] text-white/50 block">Flexiones, sentadillas al aire, zancadas, fondos y planchas sin material</span>
                      </div>
                    </div>
                    {selectedEquipment.includes(PRESET_BODYWEIGHT) && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Custom User Equipment List (if any) */}
              {userCustomEquipment.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Tus máquinas y accesorios guardados en BBDD ({userCustomEquipment.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {userCustomEquipment.map((item) => (
                      <div
                        key={item}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-emerald-500/30 text-white text-xs font-bold shadow-sm"
                      >
                        <span className="text-[10px] text-emerald-400">🏷️</span>
                        <span>{item}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-medium">BBDD</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomItem(item)}
                          className="text-white/40 hover:text-rose-400 transition ml-1 cursor-pointer"
                          title="Eliminar de mi lista"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Custom Equipment Text Input Section */}
              <div className="p-4.5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>¿Tienes alguna otra máquina o implemento que no aparezca arriba?</span>
                  </label>
                  <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Analizado con IA
                  </span>
                </div>

                <p className="text-[11px] text-white/50 leading-relaxed">
                  Escribe uno o varios elementos separados por comas (ej: <em>Kettlebell 16kg, TRX, Máquina Hack, Prensa inclinada 45°</em>). La IA evaluará si son válidos, evitará duplicados y los añadirá a tu base de datos.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleValidateAndAddEquipment();
                      }
                    }}
                    placeholder="Ej: Máquina Hack, Kettlebells de 16kg, TRX..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <button
                    type="button"
                    disabled={isValidatingEquipment || !customInputText.trim()}
                    onClick={handleValidateAndAddEquipment}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-black font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer shrink-0"
                  >
                    {isValidatingEquipment ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Añadir</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Success feedback */}
                {customAddSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{customAddSuccessMsg}</span>
                  </div>
                )}

                {/* Rejected items alerts */}
                {rejectedItemsList.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {rejectedItemsList.map((rej, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-left space-y-1.5"
                      >
                        <div className="flex items-center gap-2 text-rose-400">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span className="text-xs font-black">
                            "{rej.input}" no es un elemento de ejercicio físico
                          </span>
                        </div>
                        <p className="text-[11px] text-white/70 pl-6 leading-relaxed">
                          {rej.reason}
                        </p>
                        {rej.suggestion && (
                          <div className="pl-6 pt-1 flex items-center gap-2">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <Lightbulb className="h-3 w-3" />
                              ¿Te referías a "{rej.suggestion}"?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAcceptSuggestion(rej.suggestion!)}
                              className="px-2.5 py-1 bg-emerald-500 text-black rounded-lg text-[10px] font-black hover:bg-emerald-400 transition cursor-pointer"
                            >
                              Sí, añadir este
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 3: Nivel de entrenamiento y Días */}
          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Paso 3 · Nivel & Disponibilidad
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  Tu experiencia y frecuencia semanal
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Permite calcular el volumen óptimo de series (regla de las 11 series por músculo) para evitar sobreentrenamiento o volumen basura.
                </p>
              </div>

              {/* Experience Level */}
              <div className="space-y-3">
                <label className="text-xs font-black text-white uppercase tracking-wider block">
                  1. Nivel de experiencia en fuerza
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: "beginner" as ExperienceLevel,
                      title: "Principiante",
                      badge: "0 a 1 año",
                      emoji: "🌱",
                      desc: "Dominando la técnica básica y patrones de movimiento. Volumen ideal: 4 a 10 series semanales por músculo."
                    },
                    {
                      id: "intermediate" as ExperienceLevel,
                      title: "Intermedio",
                      badge: "1 a 3 años",
                      emoji: "⚡",
                      desc: "Técnica sólida y aplicando sobrecarga progresiva regular. Volumen ideal: 10 a 16 series semanales."
                    },
                    {
                      id: "advanced" as ExperienceLevel,
                      title: "Avanzado",
                      badge: "+3 años",
                      emoji: "🔥",
                      desc: "Años de adaptación neuromuscular y capacidad de esfuerzo alta. Volumen ideal: 14 a 22 series semanales."
                    }
                  ].map((lvl) => {
                    const isSelected = trainingLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setTrainingLevel(lvl.id)}
                        className={`p-4 rounded-3xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                            : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{lvl.emoji}</span>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                              isSelected ? "bg-emerald-500 text-black" : "bg-white/10 text-white/60"
                            }`}>
                              {lvl.badge}
                            </span>
                          </div>
                          <h4 className={`text-xs font-black ${isSelected ? "text-emerald-400" : "text-white"}`}>
                            {lvl.title}
                          </h4>
                          <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                            {lvl.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Days */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white uppercase tracking-wider block">
                    2. ¿Cuántos días a la semana planeas entrenar?
                  </label>
                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {weeklyDays} días / semana
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((dayNum) => {
                    const isSelected = weeklyDays === dayNum;
                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setWeeklyDays(dayNum)}
                        className={`py-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? "bg-emerald-500 border-emerald-400 text-black font-black shadow-lg shadow-emerald-500/25 scale-[1.02]"
                            : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.05] font-bold"
                        }`}
                      >
                        <span className="text-base font-black">{dayNum}</span>
                        <span className="text-[9px] uppercase tracking-wider font-bold">días</span>
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-white/60">
                  {weeklyDays === 2 && "⚡ Frecuencia Full-body concentrada (ideal para agendas muy apretadas)."}
                  {weeklyDays === 3 && "⚡ Frecuencia Full-body clásica (la más recomendada para balance vida/fuerza)."}
                  {weeklyDays === 4 && "⚡ Frecuencia Torso / Pierna o Upper-Lower (óptima para hipertrofia y descanso)."}
                  {weeklyDays === 5 && "⚡ Frecuencia Empuje / Tirón / Pierna / Torso (alta frecuencia y volumen)."}
                  {weeklyDays === 6 && "⚡ Frecuencia Push / Pull / Legs x 2 (exclusiva para atletas con óptima recuperación)."}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Cuidado Articular y Molestias */}
          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Paso 4 · Salud Biomecánica & Articulaciones
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  ¿Tienes molestias o dolores articulares?
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Tu seguridad física es prioridad. La IA vetará ejercicios de alta presión en las zonas marcadas y prescribirá variantes ortopédicas seguras.
                </p>
              </div>

              {/* Standard Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {[
                  {
                    id: "knee" as const,
                    title: "Rodillas",
                    emoji: "🦵",
                    desc: "Vetar sentadilla profunda libre y extensiones de cuádriceps forzadas. Priorizar peso muerto rumano y zancadas suaves."
                  },
                  {
                    id: "back" as const,
                    title: "Espalda Baja (Lumbar)",
                    emoji: "🛡️",
                    desc: "Vetar peso muerto convencional levantado del suelo y sentadilla pesada con barra alta. Priorizar sentadilla búlgara y prensa con espalda pegada."
                  },
                  {
                    id: "shoulder" as const,
                    title: "Hombros",
                    emoji: "🦾",
                    desc: "Vetar press militar pesado vertical y press tras nuca. Modular banca con agarre estrecho o press en suelo (Floor Press)."
                  }
                ].map((joint) => {
                  const isSelected = selectedJointPain.includes(joint.id);
                  return (
                    <button
                      key={joint.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedJointPain(selectedJointPain.filter(x => x !== joint.id));
                        } else {
                          setSelectedJointPain([...selectedJointPain, joint.id]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? "bg-rose-500/15 border-rose-500 text-white font-bold shadow-md shadow-rose-500/10"
                          : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{joint.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-black ${isSelected ? "text-rose-400" : "text-white"}`}>
                            {joint.title}
                          </span>
                          {isSelected && <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                          {joint.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}

                {/* "Sin Molestias" toggle */}
                <button
                  type="button"
                  onClick={() => setSelectedJointPain([])}
                  className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                    selectedJointPain.length === 0
                      ? "bg-emerald-500/15 border-emerald-500 text-white font-black shadow-md shadow-emerald-500/10"
                      : "bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-2xl shrink-0 mt-0.5">✨</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black ${selectedJointPain.length === 0 ? "text-emerald-400" : "text-white"}`}>
                        Sin molestias articulares
                      </span>
                      {selectedJointPain.length === 0 && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-white/50 mt-1 leading-relaxed">
                      Articulaciones 100% sanas y preparadas para cualquier rango completo de movimiento.
                    </p>
                  </div>
                </button>
              </div>

              {/* Open Text Field for specific injuries / surgeries */}
              <div className="p-4.5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-2.5">
                <label className="text-xs font-black text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                    <span>¿Alguna otra lesión previa, cirugía o molestia específica?</span>
                  </span>
                  <span className="text-[9px] text-white/40 font-mono">Opcional</span>
                </label>

                <p className="text-[11px] text-white/50 leading-relaxed">
                  Describe con tus propias palabras cualquier cirugía, tendinitis o dolor puntual. La IA analizará este texto y adaptará la prescripción de ejercicios para no comprometer esa zona.
                </p>

                <textarea
                  value={customJointPainText}
                  onChange={(e) => setCustomJointPainText(e.target.value)}
                  rows={3}
                  placeholder="Ej: Operación de menisco en rodilla izquierda hace 2 años, molestia punzante en la muñeca derecha al hacer flexiones en el suelo, hernia discal L5-S1 diagnosticada..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition resize-none leading-relaxed"
                />

                {customJointPainText.trim() && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-medium flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>Esta información será enviada a Gemini como instrucción médica prioritaria.</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 5: Resumen y Formulación con IA */}
          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-left"
            >
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                  Paso 5 · Resumen & Generación
                </span>
                <h2 className="text-lg font-black text-white mt-1">
                  ¡Todo listo para crear tu rutina inteligente!
                </h2>
                <p className="text-xs text-white/60 mt-1">
                  Revisa tu configuración. Al confirmar, Gemini 3.8 Flash diseñará una sesión completa con calentamiento, ejercicios de fuerza con series y pesos sugeridos, y estiramientos.
                </p>
              </div>

              {/* Summary Card */}
              <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 space-y-4">
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono block">Entorno(s)</span>
                    <span className="text-xs font-black text-white block mt-0.5">
                      {selectedEnvironments.map(e => e === "gym" ? "🏢 Gimnasio" : e === "home" ? "🏠 Casa" : "🌳 Aire libre").join(" + ")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/40 uppercase font-mono block">Nivel & Frecuencia</span>
                    <span className="text-xs font-black text-emerald-400 block mt-0.5">
                      {trainingLevel === "beginner" ? "Principiante" : trainingLevel === "intermediate" ? "Intermedio" : "Avanzado"} · {weeklyDays} días/sem
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-white/40 uppercase font-mono block mb-1.5">
                    Equipamiento y Máquinas Activas ({selectedEquipment.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                    {selectedEquipment.map((eq) => {
                      const isCustom = userCustomEquipment.includes(eq);
                      return (
                        <span
                          key={eq}
                          className={`text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 ${
                            isCustom
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-white/5 text-white/80 border border-white/5"
                          }`}
                        >
                          {isCustom && <span className="text-[9px]">🏷️</span>}
                          {eq}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {(selectedJointPain.length > 0 || customJointPainText.trim()) && (
                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[10px] text-rose-400 uppercase font-mono font-bold block mb-1">
                      Zonas con Protección Articular Activa
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedJointPain.map(j => (
                        <span key={j} className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                          {j === "knee" ? "Rodillas" : j === "back" ? "Espalda baja" : "Hombros"}
                        </span>
                      ))}
                    </div>
                    {customJointPainText.trim() && (
                      <p className="text-[11px] text-white/70 italic mt-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                        "{customJointPainText.trim()}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Ready confirmation box */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-transparent border border-emerald-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Sesión personalizada lista para formular</h4>
                  <p className="text-[10px] text-white/60 mt-0.5">
                    Al presionar el botón inferior, guardaremos tus preferencias y Gemini creará tu primera rutina en tiempo real.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Bottom Navigation Footer */}
      <div className="px-6 py-4 border-t border-white/5 bg-[#07090e]/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20 max-w-2xl mx-auto w-full">
        {currentStep > 0 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer border border-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Atrás</span>
          </button>
        ) : (
          <div />
        )}

        {currentStep === 0 && (
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-98 cursor-pointer"
          >
            <span>Comenzar Configuración</span>
            <ChevronRight className="h-4 w-4 stroke-[3]" />
          </button>
        )}

        {currentStep > 0 && currentStep < 5 && (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer ml-auto"
          >
            <span>Siguiente</span>
            <ChevronRight className="h-4 w-4 stroke-[3]" />
          </button>
        )}

        {currentStep === 5 && (
          <button
            type="button"
            onClick={handleFinish}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs rounded-2xl transition flex items-center gap-2 shadow-xl shadow-emerald-500/30 active:scale-98 cursor-pointer ml-auto"
          >
            <Sparkles className="h-4 w-4" />
            <span>Guardar y Generar Mi Rutina IA</span>
          </button>
        )}
      </div>
    </div>
  );
}
