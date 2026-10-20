import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, X, Send, Check, Dumbbell, ShieldAlert, 
  HelpCircle, RefreshCw, CheckCircle2, ArrowRight, Lightbulb,
  Zap, Info, Flame
} from "lucide-react";
import { WorkoutExercise, UserProfile } from "../types";
import { 
  consultAndAdjustExerciseByIA, 
  ExerciseConsultationResponse,
  ExerciseConsultationSuggestedExercise 
} from "../services/geminiService";

export interface ExerciseAiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: WorkoutExercise | null;
  routineName?: string;
  userProfile: UserProfile;
  apiKey?: string;
  onApplyReplacement: (newExercise: WorkoutExercise, explanation: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
  suggestedExercise?: ExerciseConsultationSuggestedExercise;
  alternativeOptions?: {
    name: string;
    equipmentNeeded: string;
    repsText?: string;
    justification: string;
  }[];
}

export default function ExerciseAiAdvisorModal({
  isOpen,
  onClose,
  exercise,
  routineName,
  userProfile,
  apiKey,
  onApplyReplacement
}: ExerciseAiAdvisorModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasReplaced, setHasReplaced] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize or reset when a new exercise is opened
  useEffect(() => {
    if (isOpen && exercise) {
      setHasReplaced(false);
      setInputText("");
      setIsLoading(false);

      const initialGreeting: ChatMessage = {
        id: "msg-init",
        sender: "coach",
        text: `¡Hola! Estoy analizando **"${exercise.name}"** (${exercise.sets} series de ${exercise.reps} ${exercise.trackingType === "time" ? "segundos" : "reps"}). Puedes preguntarme la razón biomecánica por la que lo seleccioné, pedirme cambiarlo por tu equipo disponible (como poleas o mancuernas), o solicitar una variante si no te gusta o te incomoda.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages([initialGreeting]);
    }
  }, [isOpen, exercise]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (!isOpen || !exercise) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const raw = (textToSend || inputText).trim();
    if (!raw || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: raw,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const equipmentList = userProfile.equipment && userProfile.equipment.length > 0
        ? userProfile.equipment
        : ["Peso corporal"];

      const res: ExerciseConsultationResponse = await consultAndAdjustExerciseByIA(
        apiKey || "",
        {
          currentExercise: {
            name: exercise.name,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            trackingType: exercise.trackingType,
            equipmentNeeded: exercise.equipmentNeeded,
            primaryMuscles: exercise.primaryMuscles,
            techniqueTips: exercise.techniqueTips
          },
          routineName: routineName || "Tu rutina de entrenamiento",
          userMessage: raw,
          equipmentList,
          level: userProfile.level || "intermediate",
          homeEquipmentNotes: userProfile.homeEquipmentNotes
        }
      );

      const coachMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: "coach",
        text: res.explanation || "He preparado esta propuesta biomecánica para ti.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        suggestedExercise: res.suggestedExercise,
        alternativeOptions: res.alternativeOptions
      };

      setMessages(prev => [...prev, coachMsg]);
    } catch (err: any) {
      console.error("Error in exercise AI advisor:", err);
      const errorMsg: ChatMessage = {
        id: `coach-${Date.now()}`,
        sender: "coach",
        text: "Hubo un pequeño retraso al consultar las opciones. Por favor, vuelve a escribir tu consulta o reintenta.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggested: ExerciseConsultationSuggestedExercise, explanationText: string) => {
    const numSets = suggested.sets || exercise.sets || 3;
    const numReps = suggested.reps || exercise.reps || 10;
    const numWeight = suggested.weight ?? exercise.weight ?? 0;

    const updatedWorkoutExercise: WorkoutExercise = {
      ...exercise,
      name: suggested.name,
      trackingType: suggested.trackingType || exercise.trackingType || "reps",
      sets: numSets,
      reps: numReps,
      weight: numWeight,
      caloriesBurnedPerSet: suggested.caloriesBurnedPerSet || exercise.caloriesBurnedPerSet || 5,
      primaryMuscles: suggested.primaryMuscles || exercise.primaryMuscles || [],
      secondaryMuscles: suggested.secondaryMuscles || exercise.secondaryMuscles,
      techniqueTips: suggested.techniqueTips || exercise.techniqueTips,
      equipmentNeeded: suggested.equipmentNeeded || exercise.equipmentNeeded,
      completedSets: Array.from({ length: numSets }).map((_, idx) => ({
        setIndex: idx,
        completed: false,
        reps: numReps,
        weight: numWeight
      }))
    };

    setHasReplaced(true);
    onApplyReplacement(updatedWorkoutExercise, explanationText);
    setTimeout(() => {
      onClose();
    }, 1100);
  };

  const QUICK_PROMPT_PILLS = [
    { label: "💡 ¿Por qué este ejercicio?", prompt: `¿Por qué me recomendaste exactamente "${exercise.name}" y qué beneficios biomecánicos tiene para mi nivel?` },
    { label: "🔗 Prefiero con polea", prompt: `Tengo polea disponible en mi equipamiento. ¿Puedes cambiar "${exercise.name}" por una variante en polea que me dé mejor tensión mecánica continua?` },
    { label: "🔄 No me gusta, cambiarlo", prompt: `No me agrada hacer "${exercise.name}". Recomiéndame un sustituto efectivo para el mismo grupo muscular.` },
    { label: "🛡️ Proteger articulación", prompt: `Siento molestia articular al hacer "${exercise.name}". Recomiéndame una variante ortopédica más segura y suave.` },
    { label: "⚡ Más rápido / sencillo", prompt: `Quiero una variante de "${exercise.name}" más simple de ejecutar y con menor tiempo de armado.` }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#0e101a] border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-left"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/70 dark:bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Asistente IA de Biomecánica
                </span>
                {routineName && (
                  <span className="text-[9px] px-2 py-0.2 bg-white/10 text-gray-500 dark:text-gray-400 rounded-full font-bold truncate max-w-[180px]">
                    {routineName}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white truncate">
                {exercise.name}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center justify-center transition cursor-pointer border border-gray-200 dark:border-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Exercise Context Pill */}
        <div className="px-4 py-2.5 bg-emerald-500/5 dark:bg-emerald-500/[0.03] border-b border-emerald-500/15 flex items-center justify-between text-[10px] gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-650 dark:text-gray-300 font-medium">
            <Dumbbell className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Configuración actual: <b>{exercise.sets} series × {exercise.reps} {exercise.trackingType === "time" ? "seg" : "reps"}</b></span>
            {exercise.weight > 0 ? <span>({exercise.weight} kg)</span> : <span>(Peso corporal)</span>}
          </div>
          {exercise.equipmentNeeded && (
            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 font-mono truncate max-w-[200px]">
              Implemento: {exercise.equipmentNeeded}
            </span>
          )}
        </div>

        {/* Success Banner when replaced */}
        <AnimatePresence>
          {hasReplaced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500 text-black px-4 py-3 flex items-center justify-center gap-2 font-black text-xs shrink-0 shadow-lg"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[3]" />
              <span>¡Ejercicio actualizado con éxito en tu rutina!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat / Conversation Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar bg-white dark:bg-[#0a0c14]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-emerald-500 text-black font-semibold rounded-br-xs shadow-md shadow-emerald-500/10"
                    : "bg-gray-100 dark:bg-[#161824] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-800 rounded-bl-xs shadow-sm"
                }`}
              >
                {/* Formatted Text */}
                <div className="space-y-1.5 whitespace-pre-wrap">
                  {msg.text}
                </div>

                {/* Suggested Exercise Card if Coach offered one */}
                {msg.suggestedExercise && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-black uppercase text-emerald-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Propuesta de Reemplazo
                      </span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold">
                        {msg.suggestedExercise.trackingType === "time" ? "Por Tiempo" : "Por Repeticiones"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-[#0e101a] border border-emerald-500/30 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-gray-900 dark:text-white">
                            {msg.suggestedExercise.name}
                          </h4>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono block mt-0.5">
                            Implemento: {msg.suggestedExercise.equipmentNeeded}
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-500 dark:text-emerald-400 shrink-0">
                          {msg.suggestedExercise.sets} × {msg.suggestedExercise.reps} {msg.suggestedExercise.trackingType === "time" ? "seg" : "reps"}
                        </span>
                      </div>

                      {msg.suggestedExercise.techniqueTips && (
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-white/[0.02] p-2 rounded-lg border border-gray-100 dark:border-white/5">
                          💡 {msg.suggestedExercise.techniqueTips}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleApply(msg.suggestedExercise!, msg.text)}
                        className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-98 cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                        <span>Aplicar este cambio a mi rutina</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Additional alternative options */}
                {msg.alternativeOptions && msg.alternativeOptions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-800/80 space-y-1.5">
                    <span className="text-[9px] font-mono text-gray-400 uppercase block font-bold">
                      Otras variantes disponibles:
                    </span>
                    <div className="space-y-1.5">
                      {msg.alternativeOptions.map((alt, aIdx) => (
                        <button
                          key={aIdx}
                          type="button"
                          onClick={() => handleSendMessage(`Me interesa la variante "${alt.name}". Por favor confíguramela para reemplazarla en la rutina.`)}
                          className="w-full text-left p-2 rounded-xl bg-white/60 dark:bg-white/[0.02] hover:bg-emerald-500/10 border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block">
                              {alt.name}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500">
                              {alt.equipmentNeeded} · {alt.justification}
                            </span>
                          </div>
                          <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <span className="text-[8px] text-gray-400 font-mono mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-gray-100 dark:bg-[#161824] border border-gray-200 dark:border-gray-800 w-fit text-xs text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span>Consultando biomecánica y preparando propuesta...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.01] shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {QUICK_PROMPT_PILLS.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSendMessage(pill.prompt)}
                className="whitespace-nowrap px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white dark:bg-white/5 hover:bg-emerald-500/15 text-gray-700 dark:text-gray-300 hover:text-emerald-400 border border-gray-200 dark:border-white/5 hover:border-emerald-500/30 transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0e101a] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe a la IA (ej: 'Tengo polea, cámbialo por polea', '¿Por qué este?')..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-xs placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-emerald-500 transition"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-black flex items-center justify-center transition cursor-pointer shrink-0 shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
