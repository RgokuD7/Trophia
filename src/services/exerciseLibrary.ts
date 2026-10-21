import { CustomExercise, WorkoutExercise, ExerciseTrackingType } from "../types";
import { addCustomExercise } from "./dbService";
import { analyzeExerciseByIA, parseExerciseBatchByIA, AnalyzedExerciseResult } from "./geminiService";

// Helper to normalize strings for accent-insensitive and case-insensitive matching
export function normalizeExerciseName(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Built-in baseline catalog of common exercises (0 latency, 0 cost)
export const DEFAULT_EXERCISES: Omit<CustomExercise, "id" | "createdAt">[] = [
  // Pecho / Empuje
  {
    name: "Press de Banca con Barra",
    normalizedName: "press de banca con barra",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 20,
    primaryMuscles: ["Pectoral mayor"],
    secondaryMuscles: ["Tríceps braquial", "Deltoides anterior"],
    techniqueTips: "Retrae escápulas firmemente en el banco, pies clavados al suelo. Desciende la barra a la mitad del esternón sin rebotar.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Barra y Banco",
  },
  {
    name: "Press con Mancuernas en Banco Plano",
    normalizedName: "press con mancuernas en banco plano",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 14,
    primaryMuscles: ["Pectoral mayor"],
    secondaryMuscles: ["Tríceps braquial", "Deltoides anterior"],
    techniqueTips: "Mantén los codos en un ángulo de unos 45° a 60° con respecto al torso. No choques las mancuernas arriba.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Mancuernas y Banco",
  },
  {
    name: "Flexiones de Brazos (Push-ups)",
    normalizedName: "flexiones de brazos push ups",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 0,
    primaryMuscles: ["Pectoral mayor"],
    secondaryMuscles: ["Tríceps braquial", "Core"],
    techniqueTips: "Mantén el cuerpo en una línea recta perfecta desde la cabeza hasta los talones. Activa glúteos y abdomen.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Peso corporal",
  },
  {
    name: "Aperturas con Mancuernas",
    normalizedName: "aperturas con mancuernas",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 8,
    primaryMuscles: ["Pectoral mayor"],
    secondaryMuscles: ["Deltoides anterior"],
    techniqueTips: "Mantén una ligera flexión en los codos durante todo el movimiento. Siente el estiramiento en el pecho.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Mancuernas y Banco",
  },
  {
    name: "Fondos en Paralelas (Dips)",
    normalizedName: "fondos en paralelas dips",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    primaryMuscles: ["Tríceps braquial", "Pectoral inferior"],
    secondaryMuscles: ["Deltoides anterior"],
    techniqueTips: "Inclina el torso ligeramente hacia adelante para incidir más en pecho o mantente erguido para tríceps.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Barras paralelas",
  },

  // Espalda / Tracción
  {
    name: "Dominadas Pronas (Pull-ups)",
    normalizedName: "dominadas pronas pull ups",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 0,
    primaryMuscles: ["Dorsal ancho"],
    secondaryMuscles: ["Bíceps braquial", "Trapecio", "Romboides"],
    techniqueTips: "Inicia el tirón deprimiendo las escápulas. Pasa la barbilla por encima de la barra sin balanceo.",
    caloriesBurnedPerSet: 7,
    equipmentNeeded: "Barra de dominadas",
  },
  {
    name: "Dominadas Supinas (Chin-ups)",
    normalizedName: "dominadas supinas chin ups",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 8,
    defaultWeight: 0,
    primaryMuscles: ["Bíceps braquial", "Dorsal ancho"],
    secondaryMuscles: ["Antebrazo", "Core"],
    techniqueTips: "Palmas mirando hacia ti. Sube con control y no desciendas de golpe para cuidar hombros.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Barra de dominadas",
  },
  {
    name: "Remo con Barra",
    normalizedName: "remo con barra",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 20,
    primaryMuscles: ["Dorsal ancho", "Romboides"],
    secondaryMuscles: ["Bíceps braquial", "Erectores espinales"],
    techniqueTips: "Torso inclinado a 45° con la espalda neutra. Lleva la barra hacia la parte baja del abdomen apretando escápulas.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Barra y Discos",
  },
  {
    name: "Remo Unilateral con Mancuerna",
    normalizedName: "remo unilateral con mancuerna",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 12,
    primaryMuscles: ["Dorsal ancho"],
    secondaryMuscles: ["Bíceps", "Romboides"],
    techniqueTips: "Apoya rodilla y mano en banco. Tracciona el codo hacia la cadera en arco, no en vertical.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Mancuerna y Banco",
  },
  {
    name: "Jalón al Pecho en Polea",
    normalizedName: "jalon al pecho en polea",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 35,
    primaryMuscles: ["Dorsal ancho"],
    secondaryMuscles: ["Bíceps", "Deltoides posterior"],
    techniqueTips: "Lleva la barra hacia la parte superior del pecho con el torso ligeramente inclinado hacia atrás.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Máquina de polea",
  },

  // Piernas
  {
    name: "Sentadilla Libre con Barra (Squat)",
    normalizedName: "sentadilla libre con barra squat",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 30,
    primaryMuscles: ["Cuádriceps", "Glúteo mayor"],
    secondaryMuscles: ["Isquiotibiales", "Core"],
    techniqueTips: "Pies a la anchura de hombros, puntas ligeramente hacia afuera. Baja hasta que los muslos queden paralelos al suelo.",
    caloriesBurnedPerSet: 8,
    equipmentNeeded: "Barra y Rack",
  },
  {
    name: "Sentadilla Copa (Goblet Squat)",
    normalizedName: "sentadilla copa goblet squat",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 12,
    primaryMuscles: ["Cuádriceps", "Glúteo mayor"],
    secondaryMuscles: ["Core"],
    techniqueTips: "Sujeta la mancuerna o kettlebell pegada al pecho. Mantén el pecho erguido al descender.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Mancuerna o Kettlebell",
  },
  {
    name: "Sentadilla Búlgara",
    normalizedName: "sentadilla bulgara",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 8,
    primaryMuscles: ["Cuádriceps", "Glúteo mayor"],
    secondaryMuscles: ["Isquiotibiales", "Core"],
    techniqueTips: "Empeine trasero apoyado en un banco. Desciende con la rodilla delantera alineada con la punta del pie.",
    caloriesBurnedPerSet: 7,
    equipmentNeeded: "Mancuernas y Banco",
  },
  {
    name: "Prensa de Piernas Inclinada",
    normalizedName: "prensa de piernas inclinada",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 12,
    defaultWeight: 60,
    primaryMuscles: ["Cuádriceps"],
    secondaryMuscles: ["Glúteos"],
    techniqueTips: "No bloquees las rodillas al extender. Mantén el sacro y la espalda baja totalmente pegados al respaldo.",
    caloriesBurnedPerSet: 7,
    equipmentNeeded: "Máquina Prensa",
  },
  {
    name: "Peso Muerto Convencional",
    normalizedName: "peso muerto convencional",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 6,
    defaultWeight: 40,
    primaryMuscles: ["Isquiotibiales", "Glúteo mayor", "Erectores espinales"],
    secondaryMuscles: ["Dorsal", "Trapecio", "Antebrazo"],
    techniqueTips: "Barra pegada a las espinillas. Empuja el suelo con los pies y extiende cadera manteniendo columna neutra.",
    caloriesBurnedPerSet: 9,
    equipmentNeeded: "Barra y Discos",
  },
  {
    name: "Peso Muerto Rumano con Mancuernas",
    normalizedName: "peso muerto rumano con mancuernas",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 14,
    primaryMuscles: ["Isquiotibiales", "Glúteo mayor"],
    secondaryMuscles: ["Erectores espinales"],
    techniqueTips: "Rodillas casi fijas con microflexión. Lleva la cadera hacia atrás sintiendo tensión en los femorales.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Mancuernas",
  },
  {
    name: "Hip Thrust con Barra",
    normalizedName: "hip thrust con barra",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 10,
    defaultWeight: 30,
    primaryMuscles: ["Glúteo mayor"],
    secondaryMuscles: ["Isquiotibiales", "Cuádriceps"],
    techniqueTips: "Escápulas apoyadas en banco, almohadilla en barra. Aprieta glúteos arriba logrando extensión total de cadera.",
    caloriesBurnedPerSet: 7,
    equipmentNeeded: "Barra y Banco",
  },
  {
    name: "Zancadas o Estocadas (Lunges)",
    normalizedName: "zancadas o estocadas lunges",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 6,
    primaryMuscles: ["Cuádriceps", "Glúteo"],
    secondaryMuscles: ["Core"],
    techniqueTips: "Paso amplio para formar un ángulo de 90° en ambas rodillas. La rodilla trasera casi roza el suelo.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Mancuernas o Peso corporal",
  },

  // Hombros
  {
    name: "Press Militar de Pie con Barra",
    normalizedName: "press militar de pie con barra",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 8,
    defaultWeight: 20,
    primaryMuscles: ["Deltoides anterior"],
    secondaryMuscles: ["Tríceps braquial", "Core"],
    techniqueTips: "Glúteos y abdomen contraídos para evitar arquear la zona lumbar. Empuja verticalmente bloqueando codos arriba.",
    caloriesBurnedPerSet: 6,
    equipmentNeeded: "Barra",
  },
  {
    name: "Press Militar con Mancuernas Sentado",
    normalizedName: "press militar con mancuernas sentado",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 10,
    primaryMuscles: ["Deltoides anterior", "Deltoides medio"],
    secondaryMuscles: ["Tríceps braquial"],
    techniqueTips: "Respaldo casi a 90°. Baja hasta que las mancuernas queden a la altura de las orejas.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Mancuernas y Banco",
  },
  {
    name: "Elevaciones Laterales con Mancuernas",
    normalizedName: "elevaciones laterales con mancuernas",
    trackingType: "reps",
    defaultSets: 4,
    defaultReps: 12,
    defaultWeight: 6,
    primaryMuscles: ["Deltoides medio"],
    secondaryMuscles: ["Trapecio superior"],
    techniqueTips: "Codos ligeramente flexionados. Eleva hasta la altura de los hombros con el meñique ligeramente más alto.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Mancuernas",
  },
  {
    name: "Face Pulls en Polea",
    normalizedName: "face pulls en polea",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 15,
    defaultWeight: 15,
    primaryMuscles: ["Deltoides posterior", "Manguito rotador"],
    secondaryMuscles: ["Trapecio", "Romboides"],
    techniqueTips: "Polea a la altura de la cara con cuerda. Tira hacia la frente separando las manos y rotando hombros externamente.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Polea con cuerda",
  },

  // Brazos (Bíceps y Tríceps)
  {
    name: "Curl de Bíceps con Barra",
    normalizedName: "curl de biceps con barra",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 15,
    primaryMuscles: ["Bíceps braquial"],
    secondaryMuscles: ["Braquial anterior", "Antebrazo"],
    techniqueTips: "Codos pegados al cuerpo, no impulses con la espalda ni balancees el peso.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Barra",
  },
  {
    name: "Curl de Bíceps Alterno con Mancuernas",
    normalizedName: "curl de biceps alterno con mancuernas",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 8,
    primaryMuscles: ["Bíceps braquial"],
    secondaryMuscles: ["Supinador largo"],
    techniqueTips: "Gira la muñeca hacia afuera (supinación) en la subida para contraer el pico del bíceps.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Mancuernas",
  },
  {
    name: "Curl Martillo con Mancuernas",
    normalizedName: "curl martillo con mancuernas",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 8,
    primaryMuscles: ["Braquiorradial", "Braquial"],
    secondaryMuscles: ["Bíceps braquial"],
    techniqueTips: "Palmas enfrentadas en posición neutra durante todo el recorrido.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Mancuernas",
  },
  {
    name: "Extensión de Tríceps en Polea Alta",
    normalizedName: "extension de triceps en polea alta",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 15,
    primaryMuscles: ["Tríceps braquial"],
    secondaryMuscles: ["Antebrazo"],
    techniqueTips: "Fija los codos a los costados y extiende completamente los brazos abajo sin mover los hombros.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Polea",
  },
  {
    name: "Press Francés con Barra",
    normalizedName: "press frances con barra",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 12,
    primaryMuscles: ["Tríceps braquial (Cabeza larga)"],
    secondaryMuscles: ["Antebrazo"],
    techniqueTips: "Tumbado en banco, flexiona los codos bajando la barra hacia la frente o justo detrás de la cabeza.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Barra Z o Mancuernas",
  },

  // Core / Isométricos / Duración por Tiempo
  {
    name: "Plancha Abdominal Frontal",
    normalizedName: "plancha abdominal frontal",
    trackingType: "time",
    defaultSets: 3,
    defaultReps: 45, // seconds
    defaultWeight: 0,
    primaryMuscles: ["Recto abdominal", "Transverso abdominal"],
    secondaryMuscles: ["Glúteos", "Deltoides"],
    techniqueTips: "Apoya antebrazos, cuerpo en línea recta. Aprieta abdomen y glúteos sin permitir que caiga la pelvis.",
    caloriesBurnedPerSet: 4,
    equipmentNeeded: "Esterilla / Peso corporal",
  },
  {
    name: "Plancha Lateral",
    normalizedName: "plancha lateral",
    trackingType: "time",
    defaultSets: 3,
    defaultReps: 30, // seconds per side
    defaultWeight: 0,
    primaryMuscles: ["Oblicuos"],
    secondaryMuscles: ["Glúteo medio", "Transverso"],
    techniqueTips: "Cuerpo recto de lado apoyado en un antebrazo. Cadera elevada y alineada con los hombros.",
    caloriesBurnedPerSet: 3,
    equipmentNeeded: "Peso corporal",
  },
  {
    name: "Sentadilla Isométrica en Pared (Wall Sit)",
    normalizedName: "sentadilla isometrica en pared wall sit",
    trackingType: "time",
    defaultSets: 3,
    defaultReps: 45, // seconds
    defaultWeight: 0,
    primaryMuscles: ["Cuádriceps"],
    secondaryMuscles: ["Glúteos", "Gemelos"],
    techniqueTips: "Espalda totalmente plana contra la pared, rodillas y caderas en ángulo de 90°.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Pared",
  },
  {
    name: "Rueda Abdominal (Ab Wheel Rollout)",
    normalizedName: "rueda abdominal ab wheel rollout",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 10,
    defaultWeight: 0,
    primaryMuscles: ["Recto abdominal", "Core profundo"],
    secondaryMuscles: ["Dorsales", "Tríceps"],
    techniqueTips: "De rodillas, rueda hacia adelante manteniendo la espalda ligeramente redondeada (retroversión pélvica).",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Rueda abdominal",
  },
  {
    name: "Elevación de Piernas Colgado",
    normalizedName: "elevacion de piernas colgado",
    trackingType: "reps",
    defaultSets: 3,
    defaultReps: 12,
    defaultWeight: 0,
    primaryMuscles: ["Recto abdominal inferior", "Flexores de cadera"],
    secondaryMuscles: ["Antebrazo / Agarre"],
    techniqueTips: "Colgado de barra, eleva las rodillas o piernas rectas hacia el pecho redondeando la pelvis sin balancearte.",
    caloriesBurnedPerSet: 5,
    equipmentNeeded: "Barra de dominadas",
  },
  {
    name: "Paseo del Granjero (Farmer's Walk)",
    normalizedName: "paseo del granjero farmers walk",
    trackingType: "time",
    defaultSets: 3,
    defaultReps: 40, // seconds
    defaultWeight: 20, // kg per hand
    primaryMuscles: ["Antebrazo / Agarre", "Trapecio"],
    secondaryMuscles: ["Core", "Glúteos"],
    techniqueTips: "Sujeta dos pesos pesados a los lados y camina erguido a pasos cortos y controlados sin inclinarte.",
    caloriesBurnedPerSet: 7,
    equipmentNeeded: "Mancuernas o Kettlebells pesadas",
  },
  {
    name: "Saltos de Comba (Jump Rope)",
    normalizedName: "saltos de comba jump rope",
    trackingType: "time",
    defaultSets: 4,
    defaultReps: 60, // seconds
    defaultWeight: 0,
    primaryMuscles: ["Gemelos", "Cardiovascular"],
    secondaryMuscles: ["Hombros", "Core"],
    techniqueTips: "Salta sobre la punta de los pies manteniendo las rodillas relajadas. Rota la cuerda con las muñecas.",
    caloriesBurnedPerSet: 8,
    equipmentNeeded: "Comba",
  },
  {
    name: "Bicicleta Elíptica",
    normalizedName: "bicicleta eliptica eliptica",
    trackingType: "time",
    defaultSets: 1,
    defaultReps: 900, // 15 minutos (900 seg)
    defaultWeight: 0,
    primaryMuscles: ["Cardiovascular", "Cuádriceps", "Glúteos"],
    secondaryMuscles: ["Isquiotibiales", "Gemelos"],
    techniqueTips: "Mantén la espalda erguida, los pies planos sobre los pedales y empuja/tira con fluidez de los manillares sin botar el cuerpo.",
    caloriesBurnedPerSet: 135,
    equipmentNeeded: "Máquina Elíptica",
  },
  {
    name: "Cinta de Correr / Caminadora",
    normalizedName: "cinta de correr caminadora treadmill",
    trackingType: "time",
    defaultSets: 1,
    defaultReps: 900, // 15 minutos (900 seg)
    defaultWeight: 0,
    primaryMuscles: ["Cardiovascular", "Gemelos", "Cuádriceps"],
    secondaryMuscles: ["Glúteos", "Core"],
    techniqueTips: "Mantén la vista al frente, pisada media sin talonar en exceso y brazos flexionados a 90° acompañando la zancada.",
    caloriesBurnedPerSet: 140,
    equipmentNeeded: "Cinta de correr",
  },
  {
    name: "Bicicleta Estática (Spinning)",
    normalizedName: "bicicleta estatica spinning ciclo indoor",
    trackingType: "time",
    defaultSets: 1,
    defaultReps: 900, // 15 minutos (900 seg)
    defaultWeight: 0,
    primaryMuscles: ["Cardiovascular", "Cuádriceps"],
    secondaryMuscles: ["Glúteos", "Isquiotibiales"],
    techniqueTips: "Ajusta la altura del sillín al hueso de la cadera. Pedalea en círculos continuos sin bloquear las rodillas en la extensión.",
    caloriesBurnedPerSet: 125,
    equipmentNeeded: "Bicicleta estática",
  },
  {
    name: "Remoergómetro (Máquina de Remo)",
    normalizedName: "remoergometro maquina de remo remo cardio",
    trackingType: "time",
    defaultSets: 1,
    defaultReps: 600, // 10 minutos (600 seg)
    defaultWeight: 0,
    primaryMuscles: ["Cardiovascular", "Dorsal ancho", "Piernas"],
    secondaryMuscles: ["Core", "Bíceps"],
    techniqueTips: "Secuencia: Piernas, torso, brazos al tirar; brazos, torso, piernas al volver. Empuja con fuerza desde los talones.",
    caloriesBurnedPerSet: 110,
    equipmentNeeded: "Remoergómetro",
  },
  {
    name: "Escaladora (Stairmaster)",
    normalizedName: "escaladora stairmaster maquina de escaleras",
    trackingType: "time",
    defaultSets: 1,
    defaultReps: 600, // 10 minutos (600 seg)
    defaultWeight: 0,
    primaryMuscles: ["Cardiovascular", "Glúteos", "Cuádriceps"],
    secondaryMuscles: ["Gemelos", "Isquiotibiales"],
    techniqueTips: "Sube los peldaños apoyando todo el pie, con postura erguida sin colgarte del pasamanos para un gasto calórico real.",
    caloriesBurnedPerSet: 120,
    equipmentNeeded: "Escaladora / Stairmaster",
  },
];

// Search an exercise in custom user DB or in default baseline catalog
export function findExerciseInCatalog(
  searchQuery: string,
  userCustomExercises: CustomExercise[] = []
): (CustomExercise | Omit<CustomExercise, "id" | "createdAt">) | null {
  const normalizedQuery = normalizeExerciseName(searchQuery);
  if (!normalizedQuery) return null;

  // 1. Search in user's custom exercises first (exact or contains)
  const userExact = userCustomExercises.find((ex) => {
    const norm = ex.normalizedName || normalizeExerciseName(ex.name);
    return norm === normalizedQuery || norm.includes(normalizedQuery) || normalizedQuery.includes(norm);
  });
  if (userExact) return userExact;

  // 2. Search in baseline default catalog
  const defaultExact = DEFAULT_EXERCISES.find((ex) => {
    const norm = ex.normalizedName || normalizeExerciseName(ex.name);
    return norm === normalizedQuery;
  });
  if (defaultExact) return defaultExact;

  // 3. Partial match in defaults (e.g., query "press banca" matches "press de banca con barra")
  const words = normalizedQuery.split(" ").filter((w) => w.length > 2);
  if (words.length > 0) {
    const defaultPartial = DEFAULT_EXERCISES.find((ex) => {
      const norm = ex.normalizedName || normalizeExerciseName(ex.name);
      return words.every((w) => norm.includes(w));
    });
    if (defaultPartial) return defaultPartial;
  }

  return null;
}

export function isContinuousCardioExercise(exerciseName: string): boolean {
  const norm = normalizeExerciseName(exerciseName);
  return (
    norm.includes("eliptica") ||
    norm.includes("caminadora") ||
    norm.includes("cinta") ||
    norm.includes("treadmill") ||
    norm.includes("bicicleta estatica") ||
    norm.includes("spinning") ||
    norm.includes("stairmaster") ||
    norm.includes("escaladora") ||
    norm.includes("remoergometro") ||
    norm.includes("maquina de remo") ||
    norm.includes("cardio continuo")
  );
}

// Convert any CustomExercise or AnalyzedExerciseResult to a WorkoutExercise
export function createWorkoutExerciseFromData(
  data: {
    name: string;
    trackingType?: ExerciseTrackingType;
    defaultSets?: number;
    defaultReps?: number;
    defaultWeight?: number;
    caloriesBurnedPerSet?: number;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    techniqueTips?: string;
    equipmentNeeded?: string;
    restSeconds?: number;
  },
  overrideSets?: number,
  overrideReps?: number,
  overrideWeight?: number
): WorkoutExercise {
  const isCardio = isContinuousCardioExercise(data.name) || (data.trackingType === "time" && (data.defaultReps || 0) >= 300);
  const setsCount = overrideSets ?? (isCardio ? 1 : (data.defaultSets ?? 3));
  const repsVal = overrideReps ?? data.defaultReps ?? (data.trackingType === "time" ? (isCardio ? 900 : 45) : 10);
  const weightVal = overrideWeight ?? data.defaultWeight ?? 0;

  const completedSets = Array.from({ length: setsCount }, (_, i) => ({
    setIndex: i,
    completed: false,
    reps: repsVal,
    weight: weightVal,
  }));

  return {
    id: `ex_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`,
    name: data.name,
    trackingType: data.trackingType || (isCardio ? "time" : "reps"),
    sets: setsCount,
    reps: repsVal,
    weight: weightVal,
    caloriesBurnedPerSet: data.caloriesBurnedPerSet || (isCardio ? 130 : 5),
    primaryMuscles: data.primaryMuscles || [],
    secondaryMuscles: data.secondaryMuscles || [],
    techniqueTips: data.techniqueTips,
    equipmentNeeded: data.equipmentNeeded,
    restSeconds: data.restSeconds || (isCardio ? 0 : 60),
    completedSets,
  };
}

// Resolve exercise: Check DB/Catalog first (0 AI cost, 0 latency).
// If not found, analyze with Gemini AI and auto-save to user's DB!
export async function resolveOrAnalyzeExercise(
  exerciseName: string,
  userCustomExercises: CustomExercise[],
  userId: string,
  apiKey: string,
  equipmentContext?: string[]
): Promise<{
  exercise: WorkoutExercise;
  savedCustomExercise?: CustomExercise;
  source: "db_cache" | "gemini_ai";
}> {
  // Step 1: Look up in DB / Catalog
  const cached = findExerciseInCatalog(exerciseName, userCustomExercises);
  if (cached) {
    const workoutEx = createWorkoutExerciseFromData(cached);
    return {
      exercise: workoutEx,
      source: "db_cache",
    };
  }

  // Step 2: Not in DB -> Analyze with Gemini AI
  const aiResult: AnalyzedExerciseResult = await analyzeExerciseByIA(
    apiKey,
    exerciseName,
    equipmentContext
  );

  const workoutEx = createWorkoutExerciseFromData(aiResult);

  // Step 3: Save newly analyzed exercise to Firestore DB so future lookups are instant!
  let savedCustom: CustomExercise | undefined;
  if (userId) {
    try {
      savedCustom = await addCustomExercise(userId, {
        name: aiResult.name || exerciseName,
        trackingType: aiResult.trackingType || "reps",
        defaultSets: aiResult.defaultSets || 3,
        defaultReps: aiResult.defaultReps || 10,
        defaultWeight: aiResult.defaultWeight || 0,
        primaryMuscles: aiResult.primaryMuscles || [],
        secondaryMuscles: aiResult.secondaryMuscles || [],
        techniqueTips: aiResult.techniqueTips,
        caloriesBurnedPerSet: aiResult.caloriesBurnedPerSet || 5,
        equipmentNeeded: aiResult.equipmentNeeded,
        createdAt: new Date().toISOString(),
      });
    } catch (saveErr) {
      console.warn("Could not save new custom exercise to Firestore:", saveErr);
    }
  }

  return {
    exercise: workoutEx,
    savedCustomExercise: savedCustom,
    source: "gemini_ai",
  };
}

/**
 * Detects if an exercise uses dumbbells (where weight represents each dumbbell, e.g. 10 kg x 2).
 */
export function isDumbbellExercise(exercise?: { name?: string; equipmentNeeded?: string } | null): boolean {
  if (!exercise) return false;
  const name = (exercise.name || "").toLowerCase();
  const eq = (exercise.equipmentNeeded || "").toLowerCase();
  return (
    name.includes("mancuerna") ||
    name.includes("dumbbell") ||
    eq.includes("mancuerna") ||
    eq.includes("dumbbell")
  );
}

/**
 * Returns whether the exercise uses a single dumbbell with both hands (e.g. Goblet squat, copa a 2 manos)
 * vs a pair of dumbbells (bilateral, 1 in each hand: e.g. Press con mancuernas, Curls, Vuelos).
 */
export function isSingleDumbbellExercise(exercise?: { name?: string; equipmentNeeded?: string } | null): boolean {
  if (!exercise) return false;
  const name = (exercise.name || "").toLowerCase();
  return (
    name.includes("goblet") ||
    name.includes("copa a dos manos") ||
    name.includes("copa con mancuerna") ||
    name.includes("pullover con mancuerna") ||
    name.includes("1 mancuerna") ||
    name.includes("una mancuerna")
  );
}

/**
 * Formats weight string clearly, e.g. "10 kg c/u (×2)" or "10 kg"
 */
export function formatExerciseWeight(
  weight: number,
  exercise?: { name?: string; equipmentNeeded?: string } | null,
  options?: { compact?: boolean }
): string {
  if (!weight || weight <= 0) return "";
  const isDumbbell = isDumbbellExercise(exercise) && !isSingleDumbbellExercise(exercise);
  if (isDumbbell) {
    if (options?.compact) {
      return `${weight}kg ×2`;
    }
    return `${weight} kg c/u (×2)`;
  }
  return options?.compact ? `${weight}kg` : `${weight} kg`;
}
