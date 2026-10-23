import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, Flame, Sparkles, ChevronRight, Layers } from "lucide-react";
import { MuscleRecovery } from "../types";
import DetailedMuscleSubAnatomy from "./DetailedMuscleSubAnatomy";

export type MuscleGroupId =
  | "chest"
  | "back"
  | "traps"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "lowerBack"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves";

interface MuscleRecoveryVisualizerProps {
  recovery: MuscleRecovery;
  selectedMuscle?: MuscleGroupId | null;
  onSelectMuscle?: (muscleId: MuscleGroupId) => void;
}

export interface MuscleMeta {
  id: MuscleGroupId;
  label: string;
  scientificName: string;
  view: "front" | "back" | "both";
  category: "push" | "pull" | "legs" | "core";
  description: string;
}

export const MUSCLE_METAS: Record<MuscleGroupId, MuscleMeta> = {
  chest: {
    id: "chest",
    label: "Pecho / Pectorales",
    scientificName: "Pectoralis Major & Minor",
    view: "front",
    category: "push",
    description: "Músculo motor de empuje horizontal. Responde con microrroturas intensas en press plano, inclinado, aperturas y fondos.",
  },
  shoulders: {
    id: "shoulders",
    label: "Hombros / Deltoides",
    scientificName: "Deltoideus (Anterior, Lateral, Posterior)",
    view: "both",
    category: "push",
    description: "Articulación tri-cabeza. Deltoides anterior sufre con pecho, lateral con elevaciones y posterior con tirones.",
  },
  biceps: {
    id: "biceps",
    label: "Bíceps",
    scientificName: "Biceps Brachii & Brachialis",
    view: "front",
    category: "pull",
    description: "Flexores y supinadores del codo. Fatiga directa por curls y sinérgica por dominadas y jalones de espalda.",
  },
  triceps: {
    id: "triceps",
    label: "Tríceps",
    scientificName: "Triceps Brachii (3 Cabezas)",
    view: "back",
    category: "push",
    description: "60% del volumen del brazo. Extensor principal del codo en press militar, press banca, fondos y poleas.",
  },
  back: {
    id: "back",
    label: "Espalda / Dorsales",
    scientificName: "Latissimus Dorsi & Rhomboids",
    view: "back",
    category: "pull",
    description: "Gran músculo en V para la amplitud dorsal. Requiere 48-72h tras dominadas, jalones y remos con barra.",
  },
  traps: {
    id: "traps",
    label: "Trapecios",
    scientificName: "Trapezius (Superior & Medio)",
    view: "back",
    category: "pull",
    description: "Soporte de cuello y retracción escapular. Fatiga aguda en encogimientos, remos al mentón y peso muerto.",
  },
  core: {
    id: "core",
    label: "Abdominales / Core",
    scientificName: "Rectus Abdominis & Obliques",
    view: "front",
    category: "core",
    description: "Faja estabilizadora lumbo-pélvica. Fibras lentas que toleran frecuencia, pero vitales para no sobrecargar la espalda.",
  },
  lowerBack: {
    id: "lowerBack",
    label: "Zona Lumbar",
    scientificName: "Erector Spinae",
    view: "back",
    category: "pull",
    description: "Erectores de la columna. Crucial respetar su regeneración tras peso muerto, sentadillas e hiperextensiones.",
  },
  quads: {
    id: "quads",
    label: "Cuádriceps",
    scientificName: "Quadriceps Femoris (4 Cabezas)",
    view: "front",
    category: "legs",
    description: "Mayor masa extensora de la rodilla. Alta depleción de glucógeno en sentadilla libre, prensa y zancadas.",
  },
  hamstrings: {
    id: "hamstrings",
    label: "Isquiotibiales / Femorales",
    scientificName: "Biceps Femoris & Semitendinosus",
    view: "back",
    category: "legs",
    description: "Flexores de rodilla y extensores de cadera. Fatiga profunda tras peso muerto rumano y curls femorales.",
  },
  glutes: {
    id: "glutes",
    label: "Glúteos",
    scientificName: "Gluteus Maximus & Medius",
    view: "back",
    category: "legs",
    description: "El músculo más potente del cuerpo humano. Máxima activación en hip thrust, sentadilla búlgara y zancadas.",
  },
  calves: {
    id: "calves",
    label: "Pantorrillas / Gemelos",
    scientificName: "Gastrocnemius & Soleus",
    view: "both",
    category: "legs",
    description: "Músculos elásticos de alta resistencia. Responden a rango completo y suelen recuperarse en 36-48h.",
  },
};

// Helper to resolve muscle recovery value from legacy or granular keys
export const getMuscleValue = (recovery: MuscleRecovery, muscleId: MuscleGroupId): number => {
  switch (muscleId) {
    case "biceps":
      return recovery.biceps ?? recovery.arms ?? 100;
    case "triceps":
      return recovery.triceps ?? recovery.arms ?? 100;
    case "quads":
      return recovery.quads ?? recovery.legs ?? 100;
    case "hamstrings":
      return recovery.hamstrings ?? recovery.legs ?? 100;
    case "glutes":
      return recovery.glutes ?? recovery.legs ?? 100;
    case "calves":
      return recovery.calves ?? recovery.legs ?? 100;
    case "traps":
      return recovery.traps ?? recovery.back ?? 100;
    case "lowerBack":
      return recovery.lowerBack ?? recovery.core ?? recovery.back ?? 100;
    default:
      return (recovery as any)[muscleId] ?? 100;
  }
};

export default function MuscleRecoveryVisualizer({
  recovery,
  selectedMuscle: externalSelected,
  onSelectMuscle,
}: MuscleRecoveryVisualizerProps) {
  const [internalSelected, setInternalSelected] = useState<MuscleGroupId>("chest");
  const [view, setView] = useState<"front" | "back">("front");

  const selectedMuscleId =
    externalSelected !== undefined && externalSelected !== null
      ? externalSelected
      : internalSelected;

  const handleSelect = (id: MuscleGroupId) => {
    setInternalSelected(id);
    const meta = MUSCLE_METAS[id];
    // Automatically switch view if selected muscle is only visible on the other side
    if (meta) {
      if (meta.view === "front" && view !== "front") setView("front");
      if (meta.view === "back" && view !== "back") setView("back");
    }
    if (onSelectMuscle) onSelectMuscle(id);
  };

  const getMuscleStatus = (value: number) => {
    if (value >= 75) {
      return {
        level: "optimal" as const,
        glowColor: "#10b981",
        secondaryColor: "#06b6d4",
        badgeBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
        label: "100% Recuperado",
        shortLabel: "Óptimo",
        advice: "Fibras musculares completamente regeneradas. Listo para sobrecarga progresiva y alta intensidad.",
        restHours: "0h de descanso restante",
      };
    }
    if (value >= 40) {
      return {
        level: "recovering" as const,
        glowColor: "#f59e0b",
        secondaryColor: "#fbbf24",
        badgeBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        label: "En Regeneración",
        shortLabel: "Recuperando",
        advice: "Síntesis proteica activa. Se recomienda descanso o entrenamiento de muy bajo impacto hoy.",
        restHours: "~12 a 24h restantes",
      };
    }
    return {
      level: "fatigued" as const,
      glowColor: "#ef4444",
      secondaryColor: "#f43f5e",
      badgeBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      label: "Fatiga Aguda / Sobrecarga",
      shortLabel: "Fatigado",
      advice: "Microrroturas y congestión elevadas. Evita entrenar este grupo hoy para prevenir lesión o sobreentrenamiento.",
      restHours: "~24 a 48h de descanso",
    };
  };

  const allMuscleIds: MuscleGroupId[] = [
    "chest",
    "shoulders",
    "biceps",
    "triceps",
    "back",
    "traps",
    "core",
    "lowerBack",
    "quads",
    "hamstrings",
    "glutes",
    "calves",
  ];

  const allValues = allMuscleIds.map((id) => getMuscleValue(recovery, id));
  const overallScore = Math.round(allValues.reduce((s, v) => s + v, 0) / allValues.length);
  const overallStatus = getMuscleStatus(overallScore);

  const activeMeta = MUSCLE_METAS[selectedMuscleId] || MUSCLE_METAS.chest;
  const activeValue = getMuscleValue(recovery, selectedMuscleId);
  const activeStatus = getMuscleStatus(activeValue);

  return (
    <div className="bg-gradient-to-b from-[#10131f] via-[#0d0f18] to-[#08090f] rounded-3xl border border-gray-800/80 p-5 shadow-2xl overflow-hidden text-white relative">
      {/* Background ambient radial glow matched to active selected muscle */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeStatus.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs shadow-md transition-colors"
            style={{
              backgroundColor: `${activeStatus.glowColor}20`,
              color: activeStatus.glowColor,
              border: `1px solid ${activeStatus.glowColor}40`,
            }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-gray-400 block">
              Mapa Biomecánico de Fatiga
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white">
                Rendimiento: {overallScore}%
              </span>
              <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold border ${overallStatus.badgeBg}`}>
                {overallStatus.shortLabel}
              </span>
            </div>
          </div>
        </div>

        {/* View Switcher: Frente vs Espalda */}
        <div className="flex bg-black/50 p-1 rounded-2xl border border-white/10 gap-1 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => setView("front")}
            className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              view === "front"
                ? "bg-white/15 text-white font-black shadow-md border border-white/10"
                : "text-white/40 hover:text-white"
            }`}
          >
            <span>Frente</span>
          </button>
          <button
            type="button"
            onClick={() => setView("back")}
            className={`px-3 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              view === "back"
                ? "bg-white/15 text-white font-black shadow-md border border-white/10"
                : "text-white/40 hover:text-white"
            }`}
          >
            <span>Espalda</span>
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Body Container */}
      <div className="relative flex flex-col items-center justify-center py-2 min-h-[275px] z-10 select-none">
        <AnimatePresence mode="wait">
          {view === "front" ? (
            <motion.div
              key="front-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex items-center justify-center w-full max-w-[240px] h-[265px]"
            >
              <svg
                viewBox="0 0 200 240"
                className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] cursor-pointer"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Dynamic Shaders for Front Muscles */}
                  {(["chest", "shoulders", "biceps", "core", "quads", "calves"] as MuscleGroupId[]).map((mId) => {
                    const val = getMuscleValue(recovery, mId);
                    const st = getMuscleStatus(val);
                    const isSel = selectedMuscleId === mId;
                    return (
                      <linearGradient key={mId} id={`grad-front-${mId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={st.secondaryColor} stopOpacity={isSel ? 0.95 : 0.75} />
                        <stop offset="100%" stopColor={st.glowColor} stopOpacity={isSel ? 0.95 : 0.65} />
                      </linearGradient>
                    );
                  })}

                  <filter id="fatiguePulseFront" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Head, Neck, Clavicles */}
                <circle cx="100" cy="22" r="13" stroke="#ffffff25" strokeWidth="1.5" fill="#ffffff08" />
                <path d="M95 35 L95 44 L105 44 L105 35" stroke="#ffffff30" strokeWidth="1.5" />
                <path d="M78 45 L100 48 L122 45" stroke="#ffffff25" strokeWidth="1.2" strokeLinecap="round" />

                {/* 1. SHOULDERS (DELTOIDES ANTERIOR / LATERAL) */}
                <g onClick={() => handleSelect("shoulders")} className="cursor-pointer group">
                  <path
                    d="M75 48 C65 50 52 60 48 72 C46 80 50 88 56 88 C64 88 68 80 72 70 C74 66 76 56 75 48 Z"
                    fill="url(#grad-front-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "shoulders")).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={getMuscleValue(recovery, "shoulders") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  <path
                    d="M125 48 C135 50 148 60 152 72 C154 80 150 88 144 88 C136 88 132 80 128 70 C126 66 124 56 125 48 Z"
                    fill="url(#grad-front-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "shoulders")).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={getMuscleValue(recovery, "shoulders") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                </g>

                {/* 2. CHEST / PECTORALS */}
                <g onClick={() => handleSelect("chest")} className="cursor-pointer group">
                  <path
                    d="M74 50 C82 50 96 54 98 70 C98 80 84 84 74 82 C66 80 64 70 66 62 C68 54 71 50 74 50 Z"
                    fill="url(#grad-front-chest)"
                    stroke={selectedMuscleId === "chest" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "chest")).glowColor}
                    strokeWidth={selectedMuscleId === "chest" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "chest") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  <path
                    d="M126 50 C118 50 104 54 102 70 C102 80 116 84 126 82 C134 80 136 70 134 62 C132 54 129 50 126 50 Z"
                    fill="url(#grad-front-chest)"
                    stroke={selectedMuscleId === "chest" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "chest")).glowColor}
                    strokeWidth={selectedMuscleId === "chest" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "chest") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                </g>

                {/* 3. BÍCEPS (Separated on the anterior arm) */}
                <g onClick={() => handleSelect("biceps")} className="cursor-pointer group">
                  {/* Left Bicep */}
                  <path
                    d="M50 78 C44 86 42 98 44 108 C46 112 50 112 52 108 C56 100 58 88 56 82 Z"
                    fill="url(#grad-front-biceps)"
                    stroke={selectedMuscleId === "biceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "biceps")).glowColor}
                    strokeWidth={selectedMuscleId === "biceps" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "biceps") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Right Bicep */}
                  <path
                    d="M150 78 C156 86 158 98 156 108 C154 112 150 112 148 108 C144 100 142 88 144 82 Z"
                    fill="url(#grad-front-biceps)"
                    stroke={selectedMuscleId === "biceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "biceps")).glowColor}
                    strokeWidth={selectedMuscleId === "biceps" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "biceps") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Forearms subtle outlines */}
                  <path d="M42 110 C41 118 44 126 48 126 C50 124 52 116 51 110 Z" fill="#ffffff15" stroke="#ffffff25" strokeWidth="1" />
                  <path d="M158 110 C159 118 156 126 152 126 C150 124 148 116 149 110 Z" fill="#ffffff15" stroke="#ffffff25" strokeWidth="1" />
                </g>

                {/* 4. CORE / ABDOMINALS (6-pack & obliques) */}
                <g onClick={() => handleSelect("core")} className="cursor-pointer group">
                  <g
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "core")).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.8" : "1.2"}
                    fill="url(#grad-front-core)"
                    filter={getMuscleValue(recovery, "core") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  >
                    <rect x="88" y="85" width="10" height="9" rx="2" />
                    <rect x="102" y="85" width="10" height="9" rx="2" />
                    <rect x="88" y="97" width="10" height="9" rx="2" />
                    <rect x="102" y="97" width="10" height="9" rx="2" />
                    <rect x="89" y="109" width="9" height="9" rx="2" />
                    <rect x="102" y="109" width="9" height="9" rx="2" />
                  </g>
                  {/* Obliques */}
                  <path
                    d="M72 84 C76 98 78 112 84 118 C80 118 75 110 72 98 Z"
                    fill="url(#grad-front-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "core")).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.6" : "1"}
                  />
                  <path
                    d="M128 84 C124 98 122 112 116 118 C120 118 125 110 128 98 Z"
                    fill="url(#grad-front-core)"
                    stroke={selectedMuscleId === "core" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "core")).glowColor}
                    strokeWidth={selectedMuscleId === "core" ? "1.6" : "1"}
                  />
                </g>

                {/* 5. CUÁDRICEPS / QUADS (Separated into Vastus Lateralis, Rectus Femoris, Vastus Medialis) */}
                <g onClick={() => handleSelect("quads")} className="cursor-pointer group">
                  {/* Left Leg: Vastus Lateralis */}
                  <path
                    d="M66 130 C58 142 56 166 62 180 C68 180 72 165 70 145 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Left Leg: Rectus Femoris (Center) */}
                  <path
                    d="M72 126 C70 148 70 172 76 182 C82 172 82 148 80 126 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Left Leg: Vastus Medialis (Teardrop) */}
                  <path
                    d="M82 152 C82 168 84 182 89 182 C92 178 92 160 88 152 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />

                  {/* Right Leg: Vastus Medialis (Teardrop) */}
                  <path
                    d="M118 152 C118 168 116 182 111 182 C108 178 108 160 112 152 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Right Leg: Rectus Femoris (Center) */}
                  <path
                    d="M128 126 C130 148 130 172 124 182 C118 172 118 148 120 126 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                  {/* Right Leg: Vastus Lateralis */}
                  <path
                    d="M134 130 C142 142 144 166 138 180 C132 180 128 165 130 145 Z"
                    fill="url(#grad-front-quads)"
                    stroke={selectedMuscleId === "quads" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "quads")).glowColor}
                    strokeWidth={selectedMuscleId === "quads" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "quads") < 40 ? "url(#fatiguePulseFront)" : undefined}
                  />
                </g>

                {/* 6. PANTORRILLAS / CALVES (Front side view) */}
                <g onClick={() => handleSelect("calves")} className="cursor-pointer group">
                  <path
                    d="M72 194 C68 206 70 224 74 234 C78 236 82 232 84 220 C85 208 84 196 82 192 Z"
                    fill="url(#grad-front-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                  <path
                    d="M128 194 C132 206 130 224 126 234 C122 236 118 232 116 220 C115 208 116 196 118 192 Z"
                    fill="url(#grad-front-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                </g>
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="back-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="relative flex items-center justify-center w-full max-w-[240px] h-[265px]"
            >
              <svg
                viewBox="0 0 200 240"
                className="w-full h-full drop-shadow-[0_0_25px_rgba(0,0,0,0.8)] cursor-pointer"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Dynamic Shaders for Back Muscles */}
                  {(["traps", "back", "triceps", "shoulders", "lowerBack", "glutes", "hamstrings", "calves"] as MuscleGroupId[]).map((mId) => {
                    const val = getMuscleValue(recovery, mId);
                    const st = getMuscleStatus(val);
                    const isSel = selectedMuscleId === mId;
                    return (
                      <linearGradient key={mId} id={`grad-back-${mId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={st.secondaryColor} stopOpacity={isSel ? 0.95 : 0.75} />
                        <stop offset="100%" stopColor={st.glowColor} stopOpacity={isSel ? 0.95 : 0.65} />
                      </linearGradient>
                    );
                  })}

                  <filter id="fatiguePulseBack" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Back of Head & Cervical */}
                <circle cx="100" cy="22" r="13" stroke="#ffffff25" strokeWidth="1.5" fill="#ffffff08" />
                <path d="M96 35 L96 46 L104 46 L104 35" stroke="#ffffff30" strokeWidth="1.5" />
                <line x1="100" y1="48" x2="100" y2="124" stroke="#ffffff20" strokeWidth="1" strokeDasharray="2 3" />

                {/* 1. TRAPS / TRAPECIOS (Diamond upper/mid back) */}
                <g onClick={() => handleSelect("traps")} className="cursor-pointer group">
                  <path
                    d="M100 46 L118 56 L100 82 L82 56 Z"
                    fill="url(#grad-back-traps)"
                    stroke={selectedMuscleId === "traps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "traps")).glowColor}
                    strokeWidth={selectedMuscleId === "traps" ? "2.4" : "1.4"}
                    filter={getMuscleValue(recovery, "traps") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 2. SHOULDERS / REAR DELTS */}
                <g onClick={() => handleSelect("shoulders")} className="cursor-pointer group">
                  <path
                    d="M74 48 C64 52 50 62 48 74 C47 82 52 88 56 86 C62 82 68 72 72 62 Z"
                    fill="url(#grad-back-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "shoulders")).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={getMuscleValue(recovery, "shoulders") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  <path
                    d="M126 48 C136 52 150 62 152 74 C153 82 148 88 144 86 C138 82 132 72 128 62 Z"
                    fill="url(#grad-back-shoulders)"
                    stroke={selectedMuscleId === "shoulders" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "shoulders")).glowColor}
                    strokeWidth={selectedMuscleId === "shoulders" ? "2.2" : "1.4"}
                    filter={getMuscleValue(recovery, "shoulders") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 3. ESPALDA / DORSALES (Lats wings) */}
                <g onClick={() => handleSelect("back")} className="cursor-pointer group">
                  {/* Left Lat */}
                  <path
                    d="M80 62 C74 76 68 98 78 116 C84 116 88 106 92 88 C94 80 92 70 80 62 Z"
                    fill="url(#grad-back-back)"
                    stroke={selectedMuscleId === "back" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "back")).glowColor}
                    strokeWidth={selectedMuscleId === "back" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "back") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Right Lat */}
                  <path
                    d="M120 62 C126 76 132 98 122 116 C116 116 112 106 108 88 C106 80 108 70 120 62 Z"
                    fill="url(#grad-back-back)"
                    stroke={selectedMuscleId === "back" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "back")).glowColor}
                    strokeWidth={selectedMuscleId === "back" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "back") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 4. TRÍCEPS (Separated on posterior arm into lateral and long heads) */}
                <g onClick={() => handleSelect("triceps")} className="cursor-pointer group">
                  {/* Left Tricep - Lateral Head */}
                  <path
                    d="M44 80 C40 88 41 98 44 110 C48 108 50 96 49 84 Z"
                    fill="url(#grad-back-triceps)"
                    stroke={selectedMuscleId === "triceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "triceps")).glowColor}
                    strokeWidth={selectedMuscleId === "triceps" ? "2.2" : "1.2"}
                    filter={getMuscleValue(recovery, "triceps") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Left Tricep - Long Head */}
                  <path
                    d="M50 80 C50 94 48 108 53 118 C56 112 56 94 54 84 Z"
                    fill="url(#grad-back-triceps)"
                    stroke={selectedMuscleId === "triceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "triceps")).glowColor}
                    strokeWidth={selectedMuscleId === "triceps" ? "2.2" : "1.2"}
                    filter={getMuscleValue(recovery, "triceps") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />

                  {/* Right Tricep - Long Head */}
                  <path
                    d="M150 80 C150 94 152 108 147 118 C144 112 144 94 146 84 Z"
                    fill="url(#grad-back-triceps)"
                    stroke={selectedMuscleId === "triceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "triceps")).glowColor}
                    strokeWidth={selectedMuscleId === "triceps" ? "2.2" : "1.2"}
                    filter={getMuscleValue(recovery, "triceps") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Right Tricep - Lateral Head */}
                  <path
                    d="M156 80 C160 88 159 98 156 110 C152 108 150 96 151 84 Z"
                    fill="url(#grad-back-triceps)"
                    stroke={selectedMuscleId === "triceps" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "triceps")).glowColor}
                    strokeWidth={selectedMuscleId === "triceps" ? "2.2" : "1.2"}
                    filter={getMuscleValue(recovery, "triceps") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 5. ZONA LUMBAR (Lower Back / Erectores) */}
                <g onClick={() => handleSelect("lowerBack")} className="cursor-pointer group">
                  <path
                    d="M86 114 C90 114 96 116 97 124 C97 128 89 130 85 128 C83 124 84 118 86 114 Z"
                    fill="url(#grad-back-lowerBack)"
                    stroke={selectedMuscleId === "lowerBack" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "lowerBack")).glowColor}
                    strokeWidth={selectedMuscleId === "lowerBack" ? "2.2" : "1.2"}
                  />
                  <path
                    d="M114 114 C110 114 104 116 103 124 C103 128 111 130 115 128 C117 124 116 118 114 114 Z"
                    fill="url(#grad-back-lowerBack)"
                    stroke={selectedMuscleId === "lowerBack" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "lowerBack")).glowColor}
                    strokeWidth={selectedMuscleId === "lowerBack" ? "2.2" : "1.2"}
                  />
                </g>

                {/* 6. GLÚTEOS (Gluteus Maximus) */}
                <g onClick={() => handleSelect("glutes")} className="cursor-pointer group">
                  {/* Left Glute */}
                  <path
                    d="M78 126 C86 126 96 130 96 146 C96 156 86 160 76 156 C68 150 68 136 78 126 Z"
                    fill="url(#grad-back-glutes)"
                    stroke={selectedMuscleId === "glutes" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "glutes")).glowColor}
                    strokeWidth={selectedMuscleId === "glutes" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "glutes") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Right Glute */}
                  <path
                    d="M122 126 C114 126 104 130 104 146 C104 156 114 160 124 156 C132 150 132 136 122 126 Z"
                    fill="url(#grad-back-glutes)"
                    stroke={selectedMuscleId === "glutes" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "glutes")).glowColor}
                    strokeWidth={selectedMuscleId === "glutes" ? "2.4" : "1.5"}
                    filter={getMuscleValue(recovery, "glutes") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 7. ISQUIOTIBIALES / FEMORALES (Separated into Biceps Femoris & Semitendinosus) */}
                <g onClick={() => handleSelect("hamstrings")} className="cursor-pointer group">
                  {/* Left Hamstring: Biceps Femoris (Outer) */}
                  <path
                    d="M71 158 C78 160 80 178 78 192 C74 194 70 186 68 174 C66 166 68 160 71 158 Z"
                    fill="url(#grad-back-hamstrings)"
                    stroke={selectedMuscleId === "hamstrings" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "hamstrings")).glowColor}
                    strokeWidth={selectedMuscleId === "hamstrings" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "hamstrings") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Left Hamstring: Semitendinosus (Inner) */}
                  <path
                    d="M80 158 C86 160 87 178 85 192 C82 194 79 186 78 174 C77 166 78 160 80 158 Z"
                    fill="url(#grad-back-hamstrings)"
                    stroke={selectedMuscleId === "hamstrings" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "hamstrings")).glowColor}
                    strokeWidth={selectedMuscleId === "hamstrings" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "hamstrings") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />

                  {/* Right Hamstring: Semitendinosus (Inner) */}
                  <path
                    d="M120 158 C114 160 113 178 115 192 C118 194 121 186 122 174 C123 166 122 160 120 158 Z"
                    fill="url(#grad-back-hamstrings)"
                    stroke={selectedMuscleId === "hamstrings" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "hamstrings")).glowColor}
                    strokeWidth={selectedMuscleId === "hamstrings" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "hamstrings") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                  {/* Right Hamstring: Biceps Femoris (Outer) */}
                  <path
                    d="M129 158 C122 160 120 178 122 192 C126 194 130 186 132 174 C134 166 132 160 129 158 Z"
                    fill="url(#grad-back-hamstrings)"
                    stroke={selectedMuscleId === "hamstrings" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "hamstrings")).glowColor}
                    strokeWidth={selectedMuscleId === "hamstrings" ? "2.2" : "1.3"}
                    filter={getMuscleValue(recovery, "hamstrings") < 40 ? "url(#fatiguePulseBack)" : undefined}
                  />
                </g>

                {/* 8. PANTORRILLAS / GEMELOS (Separated into medial & lateral heads) */}
                <g onClick={() => handleSelect("calves")} className="cursor-pointer group">
                  {/* Left Calf - Lateral & Medial heads */}
                  <path
                    d="M68 196 C64 204 65 218 69 226 C72 226 74 216 73 204 Z"
                    fill="url(#grad-back-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                  <path
                    d="M74 196 C74 206 75 220 78 228 C82 228 84 218 83 204 Z"
                    fill="url(#grad-back-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                  <line x1="75" y1="228" x2="76" y2="238" stroke="#ffffff40" strokeWidth="2" strokeLinecap="round" />

                  {/* Right Calf - Medial & Lateral heads */}
                  <path
                    d="M126 196 C126 206 125 220 122 228 C118 228 116 218 117 204 Z"
                    fill="url(#grad-back-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                  <path
                    d="M132 196 C136 204 135 218 131 226 C128 226 126 216 127 204 Z"
                    fill="url(#grad-back-calves)"
                    stroke={selectedMuscleId === "calves" ? "#ffffff" : getMuscleStatus(getMuscleValue(recovery, "calves")).glowColor}
                    strokeWidth={selectedMuscleId === "calves" ? "2" : "1.2"}
                  />
                  <line x1="125" y1="228" x2="124" y2="238" stroke="#ffffff40" strokeWidth="2" strokeLinecap="round" />
                </g>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Tap Prompt */}
        <span className="text-[9.5px] text-gray-400 font-mono tracking-wider uppercase mt-1">
          Toca cualquier músculo para seleccionarlo e inspeccionar
        </span>
      </div>

      {/* Selected Muscle Deep-Dive Detail Card */}
      <motion.div
        key={selectedMuscleId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
              {activeMeta.scientificName}
            </span>
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <span>{activeMeta.label}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${activeStatus.badgeBg}`}>
                {activeStatus.label}
              </span>
            </h4>
          </div>

          <div className="text-right">
            <span
              className="text-2xl font-black font-mono leading-none block"
              style={{ color: activeStatus.glowColor }}
            >
              {activeValue}%
            </span>
            <span className="text-[9px] text-gray-400 font-mono">
              {activeStatus.restHours}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeValue}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(to right, ${activeStatus.secondaryColor}, ${activeStatus.glowColor})`,
              boxShadow: `0 0 10px ${activeStatus.glowColor}60`,
            }}
          />
        </div>

        <p className="text-[11px] text-gray-300 leading-relaxed">
          {activeStatus.advice}
        </p>

        <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[9.5px] text-gray-400">
          <span>{activeMeta.description}</span>
        </div>

        {/* Micro-Anatomy Zoom Section */}
        <div className="pt-2">
          <DetailedMuscleSubAnatomy
            muscleId={selectedMuscleId}
            recoveryValue={activeValue}
            glowColor={activeStatus.glowColor}
            secondaryColor={activeStatus.secondaryColor}
          />
        </div>
      </motion.div>

      {/* Quick Legend at bottom */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-around text-[9px] text-gray-400 font-medium">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span>75-100% Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
          <span>40-74% Regenerando</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
          <span>&lt;40% Sobrecargado</span>
        </div>
      </div>
    </div>
  );
}
