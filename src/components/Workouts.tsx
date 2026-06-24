import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Dumbbell, Calendar, RefreshCw, Check, Play, Square, Pause, Flame, Info, ChevronRight, Sparkles, Timer, RotateCcw, Award, Trash
} from "lucide-react";
import { WorkoutSession, WorkoutExercise, MuscleRecovery, UserProfile } from "../types";
import { generateRoutineByIA } from "../services/geminiService";

interface WorkoutsProps {
  apiKey?: string;
  userProfile: UserProfile;
  workoutHistory: WorkoutSession[];
  onAddWorkout: (workout: WorkoutSession) => void;
  onClearWorkouts: () => void;
}

export default function Workouts({ apiKey, userProfile, workoutHistory, onAddWorkout, onClearWorkouts }: WorkoutsProps) {
  const [activeTab, setActiveTab] = useState<"routine" | "recovery" | "timer">("routine");
  const [selectedDay, setSelectedDay] = useState<string>(new Date().toISOString().split("T")[0]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Muscle recovery state
  const [recovery, setRecovery] = useState<MuscleRecovery>({
    chest: 85,
    back: 90,
    legs: 60,
    shoulders: 75,
    arms: 80,
    core: 95,
    lastUpdated: new Date().toISOString()
  });

  // Timer states (Rest / HIIT)
  const [timerType, setTimerType] = useState<"rest" | "hiit">("rest");
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [hiitCycle, setHiitCycle] = useState<"work" | "rest">("work");
  const [hiitRound, setHiitRound] = useState(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load the workout for the selected day if it exists
  useEffect(() => {
    const todaySession = workoutHistory.find(w => w.date === selectedDay);
    if (todaySession) {
      setActiveSession(todaySession);
    } else {
      setActiveSession(null);
    }
  }, [selectedDay, workoutHistory]);

  // Handle active muscle recovery state estimation dynamically based on history
  useEffect(() => {
    // Basic simulation: each workout session reduces recovery for affected muscles by 40%
    // and each day passed without workouts recovers them by 25%
    let calculatedChest = 100;
    let calculatedBack = 100;
    let calculatedLegs = 100;
    let calculatedShoulders = 100;
    let calculatedArms = 100;
    let calculatedCore = 100;

    workoutHistory.forEach(session => {
      if (session.completed) {
        const nameLower = session.name.toLowerCase();
        if (nameLower.includes("pecho") || nameLower.includes("push") || nameLower.includes("empuje")) {
          calculatedChest = Math.max(10, calculatedChest - 45);
          calculatedShoulders = Math.max(15, calculatedShoulders - 25);
          calculatedArms = Math.max(20, calculatedArms - 20);
        }
        if (nameLower.includes("espalda") || nameLower.includes("pull") || nameLower.includes("jalón")) {
          calculatedBack = Math.max(10, calculatedBack - 45);
          calculatedArms = Math.max(20, calculatedArms - 30);
        }
        if (nameLower.includes("pierna") || nameLower.includes("leg") || nameLower.includes("squat")) {
          calculatedLegs = Math.max(10, calculatedLegs - 50);
        }
        if (nameLower.includes("core") || nameLower.includes("abdomen") || nameLower.includes("hiit")) {
          calculatedCore = Math.max(20, calculatedCore - 35);
        }
      }
    });

    setRecovery({
      chest: calculatedChest,
      back: calculatedBack,
      legs: calculatedLegs,
      shoulders: calculatedShoulders,
      arms: calculatedArms,
      core: calculatedCore,
      lastUpdated: new Date().toISOString()
    });
  }, [workoutHistory]);

  // Timer Tick Logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer expired
            if (timerType === "hiit") {
              // Toggle work/rest
              if (hiitCycle === "work") {
                setHiitCycle("rest");
                return 15; // 15s rest
              } else {
                setHiitCycle("work");
                setHiitRound(r => r + 1);
                return 30; // 30s work
              }
            } else {
              // Rest timer ended
              setIsTimerRunning(false);
              // Simple beep sound simulation if supported
              try {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.type = "sine";
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.35);
              } catch (e) {}
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timerType, hiitCycle]);

  const handleStartTimer = (duration: number) => {
    setTimeRemaining(duration);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    setIsTimerRunning(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeRemaining(timerType === "rest" ? 60 : 30);
    setHiitCycle("work");
    setHiitRound(1);
  };

  // Generate Routine with Gemini
  const handleGenerateRoutine = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const data = await generateRoutineByIA(apiKey || "", {
        goal: userProfile.goal,
        level: userProfile.level,
        environment: userProfile.environment,
        equipment: userProfile.equipment,
      });
      if (data) {
        // Construct the local routine session
        const newSession: WorkoutSession = {
          id: Math.random().toString(36).substr(2, 9),
          date: selectedDay,
          name: data.name || "Sesión de Entrenamiento",
          warmup: data.warmup || ["Movilidad articular general - 5 min"],
          cooldown: data.cooldown || ["Estiramiento general completo - 5 min"],
          exercises: (data.exercises || []).map((ex: any, idx: number) => ({
            id: `ex-${idx}`,
            name: ex.name,
            sets: ex.sets || 3,
            reps: ex.reps || 12,
            weight: ex.weight || 0,
            caloriesBurnedPerSet: ex.caloriesBurnedPerSet || 5,
            completedSets: Array.from({ length: ex.sets || 3 }).map((_, sIdx) => ({
              setIndex: sIdx,
              completed: false,
              reps: ex.reps || 12,
              weight: ex.weight || 0
            }))
          })),
          completed: false,
          durationMinutes: 45
        };

        onAddWorkout(newSession);
        setActiveSession(newSession);
      } else {
        setGenerationError(data.error || "No se pudo conectar con el creador de rutinas.");
      }
    } catch (err: any) {
      // Fallback local generated template if offline or server fails
      const fallbackSession: WorkoutSession = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDay,
        name: `Rutina Fullbody (${userProfile.environment === "gym" ? "Gym" : "Casa"})`,
        warmup: ["Estiramientos de movilidad general - 5 min", "Salto de cuerda o sombra suave - 3 min"],
        exercises: [
          {
            id: "ex-0",
            name: userProfile.environment === "gym" ? "Prensa de Piernas o Sentadillas" : "Sentadillas con peso corporal",
            sets: 4,
            reps: 15,
            weight: userProfile.environment === "gym" ? 40 : 0,
            caloriesBurnedPerSet: 6,
            completedSets: [
              { setIndex: 0, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 1, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 2, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 3, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 }
            ]
          },
          {
            id: "ex-1",
            name: userProfile.environment === "gym" ? "Press de Banca con Mancuernas" : "Flexiones de pecho (Push-ups)",
            sets: 3,
            reps: 12,
            weight: userProfile.environment === "gym" ? 14 : 0,
            caloriesBurnedPerSet: 5,
            completedSets: [
              { setIndex: 0, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 1, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 2, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 }
            ]
          }
        ],
        cooldown: ["Estiramientos de cuádriceps y pecho - 5 min"],
        completed: false,
        durationMinutes: 40
      };

      onAddWorkout(fallbackSession);
      setActiveSession(fallbackSession);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDefaultOffline = () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const fallbackSession: WorkoutSession = {
        id: Math.random().toString(36).substr(2, 9),
        date: selectedDay,
        name: `Rutina Fullbody (${userProfile.environment === "gym" ? "Gimnasio" : "Casa"})`,
        warmup: ["Estiramientos de movilidad general - 5 min", "Salto de cuerda o sombra suave - 3 min"],
        exercises: [
          {
            id: "ex-0",
            name: userProfile.environment === "gym" ? "Prensa de Piernas o Sentadillas" : "Sentadillas con peso corporal",
            sets: 4,
            reps: 15,
            weight: userProfile.environment === "gym" ? 40 : 0,
            caloriesBurnedPerSet: 6,
            completedSets: [
              { setIndex: 0, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 1, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 2, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 },
              { setIndex: 3, completed: false, reps: 15, weight: userProfile.environment === "gym" ? 40 : 0 }
            ]
          },
          {
            id: "ex-1",
            name: userProfile.environment === "gym" ? "Press de Banca con Mancuernas" : "Flexiones de pecho (Push-ups)",
            sets: 3,
            reps: 12,
            weight: userProfile.environment === "gym" ? 14 : 0,
            caloriesBurnedPerSet: 5,
            completedSets: [
              { setIndex: 0, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 1, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 },
              { setIndex: 2, completed: false, reps: 12, weight: userProfile.environment === "gym" ? 14 : 0 }
            ]
          }
        ],
        cooldown: ["Estiramientos de cuádriceps y pecho - 5 min"],
        completed: false,
        durationMinutes: 40
      };

      onAddWorkout(fallbackSession);
      setActiveSession(fallbackSession);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle single set completion state & handle progressive overload edit
  const handleToggleSet = (exId: string, setIndex: number) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = ex.completedSets.map(set => {
          if (set.setIndex === setIndex) {
            return { ...set, completed: !set.completed };
          }
          return set;
        });
        return { ...ex, completedSets: updatedSets };
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);

    // Auto launch a 60s rest timer if a set is newly marked completed to assist resting
    const newlyCompleted = updatedExercises
      .find(ex => ex.id === exId)
      ?.completedSets.find(set => set.setIndex === setIndex)?.completed;

    if (newlyCompleted && timerType === "rest" && !isTimerRunning) {
      handleStartTimer(60);
    }
  };

  const handleUpdateSetWeightOrReps = (exId: string, setIndex: number, weight: number, reps: number) => {
    if (!activeSession) return;

    const updatedExercises = activeSession.exercises.map(ex => {
      if (ex.id === exId) {
        const updatedSets = ex.completedSets.map(set => {
          if (set.setIndex === setIndex) {
            return { ...set, weight, reps };
          }
          return set;
        });
        return { ...ex, completedSets: updatedSets };
      }
      return ex;
    });

    const updatedSession = { ...activeSession, exercises: updatedExercises };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  const handleMarkSessionComplete = () => {
    if (!activeSession) return;

    const updatedSession = { ...activeSession, completed: true };
    onAddWorkout(updatedSession);
    setActiveSession(updatedSession);
  };

  // Build weekly calendar dates array helper
  const getWeekDates = () => {
    const dates = [];
    const today = new Date();
    // Get past 3 days and next 3 days for calendar
    for (let i = -3; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      dates.push({
        dayName: d.toLocaleDateString("es-ES", { weekday: "short" }).substring(0, 2),
        dateStr: d.toISOString().split("T")[0],
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString()
      });
    }
    return dates;
  };

  const weekDates = getWeekDates();

  return (
    <div className="flex flex-col h-full bg-[#0d0e15] text-gray-100 overflow-y-auto no-scrollbar pb-16">
      
      {/* Tab Header Selector */}
      <div className="px-6 pt-5 border-b border-gray-800/40">
        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Módulo Fitness</span>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-1.5 mt-0.5">
          <Dumbbell className="h-5 w-5 text-emerald-400" />
          <span>Plan de Entrenamiento</span>
        </h2>

        <div className="flex gap-4 mt-3 border-b border-gray-800/20">
          <button
            onClick={() => setActiveTab("routine")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "routine" ? "border-emerald-500 text-white" : "border-transparent text-gray-400"
            }`}
          >
            Sesión Diaria
          </button>
          <button
            onClick={() => setActiveTab("recovery")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === "recovery" ? "border-emerald-500 text-white" : "border-transparent text-gray-400"
            }`}
          >
            Recuperación Muscular
          </button>
          <button
            onClick={() => setActiveTab("timer")}
            className={`pb-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1 ${
              activeTab === "timer" ? "border-emerald-500 text-white" : "border-transparent text-gray-400"
            }`}
          >
            <Timer className="h-3.5 w-3.5" />
            Temporizadores
          </button>
        </div>
      </div>

      {activeTab === "routine" && (
        <div className="flex-1 flex flex-col">
          
          {/* 1. Calendario Semanal */}
          <div className="px-6 py-4 bg-[#12131d]/60 border-b border-gray-800/30">
            <div className="flex justify-between gap-1.5 overflow-x-auto no-scrollbar py-1">
              {weekDates.map((day) => {
                const isSelected = selectedDay === day.dateStr;
                const hasSession = workoutHistory.some(w => w.date === day.dateStr);
                const completedSession = workoutHistory.some(w => w.date === day.dateStr && w.completed);

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => setSelectedDay(day.dateStr)}
                    className={`flex-1 min-w-[42px] py-2 rounded-xl border flex flex-col items-center justify-between transition ${
                      isSelected 
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/10"
                        : "bg-[#161824] border-gray-800/80 text-gray-400"
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase font-bold opacity-80">{day.dayName}</span>
                    <span className="text-sm font-black mt-1">{day.dayNum}</span>
                    
                    {/* Completion indicators */}
                    <div className="flex gap-1 mt-1.5">
                      {hasSession && (
                        <div className={`w-1.5 h-1.5 rounded-full ${completedSession ? "bg-emerald-300" : "bg-amber-400"}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4 flex-1">
            
            {!activeSession ? (
              <div className="bg-[#12131d] border border-gray-800 border-dashed rounded-2xl p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-white">¿Entrenamos hoy?</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Usa nuestro motor de IA para formular una rutina de {userProfile.goal === "lose_weight" ? "quema de grasa" : "hipertrofia"} adaptada a tu equipamiento: <b>{userProfile.equipment.join(", ") || "Peso corporal"}</b>.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={handleGenerateRoutine}
                    disabled={isGenerating}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 active:scale-98"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Formulando rutina óptima...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Generar Rutina Personalizada por IA</span>
                      </>
                    )}
                  </button>
                  
                  {generationError && (() => {
                    const errorStr = String(generationError);
                    const isHighDemand = 
                      errorStr.includes("503") || 
                      errorStr.toLowerCase().includes("high demand") || 
                      errorStr.toLowerCase().includes("unavailable") || 
                      errorStr.toLowerCase().includes("spikes in demand") || 
                      errorStr.toLowerCase().includes("try again later");

                    return (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-3 mt-1 text-left w-full">
                        <div className="flex gap-2.5 items-start">
                          <Info className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="block text-xs font-bold text-rose-200">
                              {isHighDemand ? "Saturación del Servidor de Rutinas (503)" : "Error al Generar Rutina"}
                            </span>
                            <span className="block text-[10px] text-white/50 leading-relaxed">
                              {isHighDemand 
                                ? "El motor de IA está experimentando alta demanda en este momento. ¡Puedes intentar de nuevo en un momento o usar una excelente plantilla sin conexión!" 
                                : generationError}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={handleGenerateRoutine}
                            className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Reintentar con IA
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateDefaultOffline}
                            className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Dumbbell className="h-3 w-3" />
                            Rutina sin Conexión
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              /* Session active display */
              <div className="space-y-4">
                
                {/* Session title bar */}
                <div className="bg-[#161824] p-4 rounded-xl border border-gray-800 flex justify-between items-center shadow-md">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Plan del día</span>
                    <h3 className="text-sm font-extrabold text-white mt-0.5">{activeSession.name}</h3>
                  </div>
                  {activeSession.completed ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2.5 rounded-full border border-emerald-500/20">
                      <Check className="h-3.5 w-3.5" />
                      <span>Completado</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleMarkSessionComplete}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition"
                    >
                      Terminar
                    </button>
                  )}
                </div>

                {/* Warm up block */}
                <div className="bg-[#12131d] p-3 rounded-xl border border-gray-800/60 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">1. Calentamiento (Movilidad)</span>
                  <ul className="space-y-1 text-xs text-gray-300">
                    {activeSession.warmup.map((w, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Exercises Tracker Block */}
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">2. Rutina Central (Ejercicios)</span>
                  
                  {activeSession.exercises.map((ex) => {
                    const allCompleted = ex.completedSets.every(s => s.completed);

                    return (
                      <div 
                        key={ex.id}
                        className={`bg-[#161824] rounded-2xl border p-4 space-y-3 shadow-md transition ${
                          allCompleted ? "border-emerald-500/30 bg-[#161824]/40" : "border-gray-800"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xs font-black text-white">{ex.name}</h4>
                            <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 block">
                              {ex.sets} series × {ex.reps} reps
                            </span>
                          </div>
                          
                          {/* Low calorie expenditure estimate */}
                          <div className="text-right">
                            <span className="text-xs font-bold text-amber-500 flex items-center justify-end gap-1">
                              <Flame className="h-3.5 w-3.5" />
                              <span>~{ex.sets * ex.caloriesBurnedPerSet} kcal</span>
                            </span>
                            <span className="text-[9px] text-gray-500 block">(Gasto conservador)</span>
                          </div>
                        </div>

                        {/* Series table for Progressive Overload adjustments */}
                        <div className="space-y-2 border-t border-gray-800/40 pt-2.5">
                          {ex.completedSets.map((set) => (
                            <div 
                              key={set.setIndex}
                              className="flex items-center justify-between text-xs py-1"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] text-gray-500 font-bold">SET {set.setIndex + 1}</span>
                                
                                {/* Edit Reps */}
                                <div className="flex items-center gap-1 bg-[#0f101a] border border-gray-800 rounded-lg px-2 py-0.5">
                                  <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, set.weight, Math.max(1, Number(e.target.value) || set.reps))}
                                    className="w-8 text-center text-xs bg-transparent text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-500">rep</span>
                                </div>

                                {/* Edit Weight */}
                                <div className="flex items-center gap-1 bg-[#0f101a] border border-gray-800 rounded-lg px-2 py-0.5">
                                  <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => handleUpdateSetWeightOrReps(ex.id, set.setIndex, Math.max(0, Number(e.target.value) || 0), set.reps)}
                                    className="w-8 text-center text-xs bg-transparent text-white focus:outline-none"
                                  />
                                  <span className="text-[9px] text-gray-500">kg</span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleToggleSet(ex.id, set.setIndex)}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                                  set.completed
                                    ? "bg-emerald-500 border-emerald-400 text-white"
                                    : "bg-gray-900 border-gray-800 text-gray-600 hover:text-white"
                                }`}
                              >
                                {set.completed ? <Check className="h-3.5 w-3.5" /> : <Play className="h-2.5 w-2.5 fill-current" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cooldown stretching list */}
                <div className="bg-[#12131d] p-3 rounded-xl border border-gray-800/60 space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">3. Enfriamiento (Elongación)</span>
                  <ul className="space-y-1 text-xs text-gray-300">
                    {activeSession.cooldown.map((c, idx) => (
                      <li key={idx} className="flex gap-1.5 items-start">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Clear Workout Option */}
                <button
                  onClick={onClearWorkouts}
                  className="w-full bg-gray-900 hover:bg-rose-950/20 border border-gray-800 hover:border-rose-900/30 text-xs text-gray-400 hover:text-rose-400 py-3 rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Trash className="h-4 w-4" />
                  <span>Eliminar todas las sesiones</span>
                </button>

              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "recovery" && (
        <div className="px-6 py-5 space-y-5">
          <p className="text-xs text-gray-400 leading-normal">
            Porcentaje de recuperación muscular estimado basado en el historial de ejercicios completados. Deja descansar los músculos si están por debajo de 35% de recuperación.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { id: "chest", label: "Pecho / Empuje", value: recovery.chest, color: "from-blue-500 to-indigo-500" },
              { id: "back", label: "Espalda / Tracción", value: recovery.back, color: "from-emerald-500 to-teal-500" },
              { id: "legs", label: "Piernas (Glúteos/Cuádriceps)", value: recovery.legs, color: "from-orange-500 to-amber-500" },
              { id: "shoulders", label: "Hombros", value: recovery.shoulders, color: "from-cyan-500 to-blue-500" },
              { id: "arms", label: "Brazos (Bíceps/Tríceps)", value: recovery.arms, color: "from-purple-500 to-pink-500" },
              { id: "core", label: "Core / Abdomen", value: recovery.core, color: "from-pink-500 to-rose-500" }
            ].map((muscle) => (
              <div 
                key={muscle.id}
                className="bg-[#161824] p-4 rounded-xl border border-gray-800 space-y-2.5 shadow-md"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300 truncate">{muscle.label}</span>
                  <span className={`font-black ${
                    muscle.value < 40 ? "text-rose-400" : muscle.value < 75 ? "text-amber-400" : "text-emerald-400"
                  }`}>{muscle.value}%</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${muscle.value}%` }}
                    className={`h-full bg-gradient-to-r ${muscle.color}`}
                  />
                </div>
                
                <span className="text-[9px] text-gray-500 block">
                  {muscle.value < 40 ? "⚠️ Sobrecargado. Priorizar descanso hoy" : muscle.value < 75 ? "🔋 Recuperación intermedia" : "✅ Listo para entrenar pesado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "timer" && (
        <div className="px-6 py-5 space-y-6 text-center flex flex-col justify-center items-center">
          
          {/* Timer Mode Toggle */}
          <div className="flex bg-[#161824] p-1 rounded-xl border border-gray-800 w-full max-w-xs">
            <button
              onClick={() => { setTimerType("rest"); handleResetTimer(); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                timerType === "rest" ? "bg-emerald-500 text-white" : "text-gray-400"
              }`}
            >
              Descanso entre Series
            </button>
            <button
              onClick={() => { setTimerType("hiit"); handleResetTimer(); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                timerType === "hiit" ? "bg-emerald-500 text-white" : "text-gray-400"
              }`}
            >
              Intervalos HIIT
            </button>
          </div>

          {/* Large countdown visual ring */}
          <div className="relative w-56 h-56 flex items-center justify-center">
            
            {/* SVG circle stroke */}
            <svg className="absolute inset-0 w-full h-full">
              <circle
                cx="112"
                cy="112"
                r="100"
                className="stroke-gray-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="112"
                cy="112"
                r="100"
                className={timerType === "hiit" && hiitCycle === "rest" ? "stroke-blue-400" : "stroke-emerald-400"}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 100}
                strokeDashoffset={
                  2 * Math.PI * 100 * (1 - timeRemaining / (timerType === "rest" ? 60 : hiitCycle === "work" ? 30 : 15))
                }
              />
            </svg>

            {/* Counter display */}
            <div className="z-10 text-center">
              {timerType === "hiit" && (
                <span className={`block text-[11px] font-bold uppercase tracking-wider ${
                  hiitCycle === "work" ? "text-emerald-400" : "text-blue-400"
                }`}>
                  {hiitCycle === "work" ? `💪 ¡TRABAJA! (Ronda ${hiitRound})` : "🔋 Descanso activo"}
                </span>
              )}
              {timerType === "rest" && (
                <span className="block text-xs text-gray-500 font-bold uppercase">Descansando</span>
              )}

              <span className="text-5xl font-black text-white tracking-tighter mt-1 block">
                {timeRemaining}
                <span className="text-lg font-bold ml-0.5">s</span>
              </span>
            </div>

          </div>

          {/* Quick presets for resting */}
          {timerType === "rest" && (
            <div className="flex gap-2">
              {[30, 60, 90].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleStartTimer(preset)}
                  className="bg-[#161824] hover:bg-gray-800 border border-gray-800 px-4 py-1.5 rounded-lg text-xs text-white transition active:scale-95"
                >
                  {preset}s
                </button>
              ))}
            </div>
          )}

          {/* Core controls */}
          <div className="flex gap-4 w-full max-w-xs">
            {isTimerRunning ? (
              <button
                onClick={handlePauseTimer}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-amber-500/10 active:scale-95"
              >
                <Pause className="h-4 w-4" />
                <span>Pausar</span>
              </button>
            ) : (
              <button
                onClick={() => setIsTimerRunning(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/10 active:scale-95"
              >
                <Play className="h-4 w-4" />
                <span>Iniciar</span>
              </button>
            )}

            <button
              onClick={handleResetTimer}
              className="bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
