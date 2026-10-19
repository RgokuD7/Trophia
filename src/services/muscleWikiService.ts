// MuscleWiki API Service
// Provides real demonstration videos, technique instructions, and muscle targeting

export interface MuscleWikiExercise {
  id: number;
  name: string;
  category: string;
  difficulty: "novice" | "intermediate" | "advanced";
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  videoFront?: string;
  videoSide?: string;
  steps: string[];
  tips?: string;
  source: "musclewiki_api" | "curated_guide";
}

// Built-in curated technique guides for instant offline fallback
const CURATED_EXERCISE_GUIDES: Record<string, Omit<MuscleWikiExercise, "id" | "source">> = {
  "sentadilla": {
    name: "Sentadillas (Squats)",
    category: "Peso libre / Corporal",
    difficulty: "novice",
    primaryMuscles: ["Cuádriceps", "Glúteos"],
    secondaryMuscles: ["Core / Abdomen", "Isquiotibiales"],
    steps: [
      "Coloca los pies al ancho de los hombros con las puntas ligeramente hacia afuera (15-30°).",
      "Inicia el movimiento empujando la cadera hacia atrás y flexionando las rodillas al mismo tiempo.",
      "Desciende controladamente hasta que los muslos queden al menos paralelos al suelo, manteniendo el pecho erguido y los talones firmes.",
      "Empuja el suelo con fuerza a través del mediopié para volver a la posición inicial."
    ],
    tips: "No permitas que las rodillas colapsen hacia adentro (valgo). Si tienes molestia en rodillas, limita el descenso a 90°."
  },
  "press de banca": {
    name: "Press de Banca (Bench Press)",
    category: "Barra / Mancuernas",
    difficulty: "intermediate",
    primaryMuscles: ["Pectoral mayor", "Tríceps"],
    secondaryMuscles: ["Deltoides anterior (Hombro)"],
    steps: [
      "Acuéstate en el banco retrayendo las escápulas (junta los omóplatos hacia atrás y abajo).",
      "Toma la barra o mancuernas con un agarre ligeramente más ancho que los hombros.",
      "Baja el peso con control hacia la parte media del pecho manteniendo los codos a unos 45-60° del torso (nunca a 90°).",
      "Empuja el peso hacia arriba de forma explosiva y controlada sin despegar la espalda del banco."
    ],
    tips: "Mantén las muñecas neutras y los pies firmemente plantados en el piso para generar tracción."
  },
  "peso muerto": {
    name: "Peso Muerto (Deadlift)",
    category: "Barra / Mancuernas",
    difficulty: "advanced",
    primaryMuscles: ["Isquiotibiales", "Glúteos", "Espalda baja (Erectores)"],
    secondaryMuscles: ["Dorsales", "Trapecios", "Core"],
    steps: [
      "Párate frente a la barra con los pies al ancho de cadera, la barra pegada a las espinillas.",
      "Haz una bisagra de cadera llevando los glúteos hacia atrás mientras tomas la barra por fuera de las rodillas.",
      "Mantén la columna neutra y el pecho orgulloso. Activa los dorsales imaginando que exprimes una naranja bajo las axilas.",
      "Extiende simultáneamente cadera y rodillas empujando el suelo con las piernas."
    ],
    tips: "No redondees la zona lumbar. Si sufres de dolor de espalda, prefiere el Peso Muerto Rumano o con mancuernas."
  },
  "flexiones": {
    name: "Flexiones de Pecho (Push-ups)",
    category: "Peso corporal",
    difficulty: "novice",
    primaryMuscles: ["Pectoral", "Tríceps"],
    secondaryMuscles: ["Deltoides anterior", "Abdomen"],
    steps: [
      "Coloca las manos en el piso al ancho de los hombros o ligeramente más abiertas.",
      "Forma una línea recta desde la cabeza hasta los talones contrayendo glúteos y abdomen.",
      "Baja flexionando los codos en un ángulo de flecha (45°) hasta que el pecho casi roce el suelo.",
      "Empuja el piso con fuerza hasta extender los brazos completamente."
    ],
    tips: "Si cuesta completar las repeticiones, apoya las rodillas o hazlas elevadas en una superficie."
  },
  "dominadas": {
    name: "Dominadas (Pull-ups)",
    category: "Peso corporal",
    difficulty: "intermediate",
    primaryMuscles: ["Dorsal ancho", "Bíceps"],
    secondaryMuscles: ["Trapecio medio", "Antebrazos"],
    steps: [
      "Toma la barra con agarre prono o supino al ancho de los hombros.",
      "Inicia retrayendo las escápulas hacia abajo antes de tirar con los brazos.",
      "Tracciona elevando el pecho hacia la barra hasta que la barbilla supere la línea de agarre.",
      "Desciende de forma controlada hasta la extensión casi completa sin balancear el cuerpo."
    ],
    tips: "Evita dar patadas o impulso ('kipping') para maximizar la tensión muscular."
  },
  "press militar": {
    name: "Press Militar / Hombros (Overhead Press)",
    category: "Barra / Mancuernas",
    difficulty: "intermediate",
    primaryMuscles: ["Deltoides (Hombros)"],
    secondaryMuscles: ["Tríceps", "Trapecio superior", "Core"],
    steps: [
      "De pie o sentado, sujeta el peso a la altura de las clavículas con los antebrazos verticales.",
      "Aprieta abdomen y glúteos para proteger la zona lumbar.",
      "Empuja el peso verticalmente hacia arriba pasando la cabeza cuando la barra supere la frente.",
      "Bloquea arriba con control y desciende suavemente a la posición de inicio."
    ],
    tips: "No arquees excesivamente la espalda baja. Si hay molestia en hombro, usa mancuernas con agarre neutro."
  },
  "curl de bíceps": {
    name: "Curl de Bíceps (Bicep Curl)",
    category: "Mancuernas / Barra",
    difficulty: "novice",
    primaryMuscles: ["Bíceps braquial"],
    secondaryMuscles: ["Braquiorradial", "Antebrazos"],
    steps: [
      "Párate con los codos pegados a los costados y las palmas hacia adelante.",
      "Flexiona los brazos subiendo el peso hacia los hombros sin mover los codos de su eje.",
      "Aprieta el bíceps en el punto máximo de contracción por 1 segundo.",
      "Baja el peso de forma lenta y controlada en 2-3 segundos."
    ],
    tips: "Evita balancear el torso para tomar impulso; aísla el trabajo estrictamente en los brazos."
  },
  "elevaciones laterales": {
    name: "Elevaciones Laterales (Lateral Raises)",
    category: "Mancuernas / Polea",
    difficulty: "novice",
    primaryMuscles: ["Deltoides lateral (Hombro medio)"],
    secondaryMuscles: ["Trapecio superior"],
    steps: [
      "Sujeta mancuernas livianas a los costados con ligera flexión en los codos.",
      "Eleva los brazos hacia los lados hasta que queden paralelos al piso (altura de los hombros).",
      "Imagina que estás vertiendo agua de una jarra en el punto más alto para focalizar el deltoides lateral.",
      "Desciende suavemente sin dejar caer el peso de golpe."
    ],
    tips: "Usa poco peso para no compensar con los trapecios o el cuello."
  },
  "puente de glúteo": {
    name: "Puente de Glúteo / Hip Thrust",
    category: "Peso libre / Corporal",
    difficulty: "novice",
    primaryMuscles: ["Glúteos"],
    secondaryMuscles: ["Isquiotibiales", "Core"],
    steps: [
      "Apoya la parte alta de la espalda en un banco o el suelo con las rodillas flexionadas a 90°.",
      "Coloca los pies al ancho de la cadera empujando con los talones.",
      "Extiende la cadera hacia arriba contrayendo fuerte los glúteos en el punto más alto durante 1 segundo.",
      "Baja controladamente sin arquear la zona lumbar."
    ],
    tips: "La fuerza debe nacer exclusivamente de los glúteos y talones, no de la espalda baja."
  }
};

// Map Spanish exercise search terms to MuscleWiki English query
function mapToMuscleWikiTerm(name: string): { englishTerm: string; category?: string; muscle?: string } {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (lower.includes("sentadilla") || lower.includes("squat")) {
    return { englishTerm: "Squat", muscle: "quadriceps" };
  }
  if (lower.includes("press de banca") || lower.includes("bench press")) {
    return { englishTerm: "Bench Press", muscle: "chest" };
  }
  if (lower.includes("peso muerto") || lower.includes("deadlift")) {
    return { englishTerm: "Deadlift", muscle: "hamstrings" };
  }
  if (lower.includes("flexion") || lower.includes("push up") || lower.includes("push-up")) {
    return { englishTerm: "Push Up", muscle: "chest" };
  }
  if (lower.includes("dominada") || lower.includes("pull up") || lower.includes("pull-up")) {
    return { englishTerm: "Pull Up", muscle: "lats" };
  }
  if (lower.includes("militar") || lower.includes("hombro") || lower.includes("overhead press")) {
    return { englishTerm: "Overhead Press", muscle: "shoulders" };
  }
  if (lower.includes("biceps") || lower.includes("curl")) {
    return { englishTerm: "Curl", muscle: "biceps" };
  }
  if (lower.includes("triceps") || lower.includes("copa") || lower.includes("fondo")) {
    return { englishTerm: "Tricep Extension", muscle: "triceps" };
  }
  if (lower.includes("lateral") || lower.includes("vuelo")) {
    return { englishTerm: "Lateral Raise", muscle: "shoulders" };
  }
  if (lower.includes("remo") || lower.includes("row")) {
    return { englishTerm: "Row", muscle: "upper back" };
  }
  if (lower.includes("prensa") || lower.includes("leg press")) {
    return { englishTerm: "Leg Press", muscle: "quadriceps" };
  }
  if (lower.includes("gluteo") || lower.includes("hip thrust") || lower.includes("puente")) {
    return { englishTerm: "Hip Thrust", muscle: "glutes" };
  }
  if (lower.includes("zancada") || lower.includes("estocada") || lower.includes("lunge")) {
    return { englishTerm: "Lunge", muscle: "quadriceps" };
  }
  if (lower.includes("plancha") || lower.includes("plank") || lower.includes("core") || lower.includes("abdomen")) {
    return { englishTerm: "Plank", muscle: "abdominals" };
  }

  return { englishTerm: name };
}

/**
 * Searches MuscleWiki API or falls back to curated guides.
 * Supports direct MuscleWiki (X-API-Key: mw_...) or RapidAPI.
 */
export async function getExerciseGuide(
  exerciseName: string,
  options?: {
    apiKey?: string;
    gender?: "male" | "female";
  }
): Promise<MuscleWikiExercise> {
  const gender = options?.gender || "male";
  const rawKey = options?.apiKey || (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_musclewiki_api_key") : null);

  // Check cache first
  const cacheKey = `trophia_mw_${exerciseName.toLowerCase().replace(/\s+/g, "_")}_${gender}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.steps && parsed.steps.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Find match in curated database
  const lowerName = exerciseName.toLowerCase();
  let curatedKey = Object.keys(CURATED_EXERCISE_GUIDES).find(k => lowerName.includes(k));
  const fallbackCurated = curatedKey ? CURATED_EXERCISE_GUIDES[curatedKey] : null;

  // If we have an API Key, attempt to fetch live from MuscleWiki
  if (rawKey && rawKey.trim() !== "") {
    const cleanKey = rawKey.trim();
    const { englishTerm, muscle } = mapToMuscleWikiTerm(exerciseName);

    try {
      let url = "";
      let headers: Record<string, string> = {};

      if (cleanKey.startsWith("mw_") || !cleanKey.includes("-")) {
        // Direct MuscleWiki API
        const params = new URLSearchParams({ limit: "5" });
        if (muscle) params.append("muscles", muscle);
        url = `https://api.musclewiki.com/exercises?${params.toString()}`;
        headers = { "X-API-Key": cleanKey };
      } else {
        // RapidAPI MuscleWiki endpoint
        url = `https://musclewiki.p.rapidapi.com/exercises?name=${encodeURIComponent(englishTerm)}`;
        headers = {
          "X-RapidAPI-Key": cleanKey,
          "X-RapidAPI-Host": "musclewiki.p.rapidapi.com"
        };
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : data.results || [];
        
        // Find best match or take first
        const match = results.find((ex: any) => 
          ex.name?.toLowerCase().includes(englishTerm.toLowerCase())
        ) || results[0];

        if (match) {
          const videoFront = 
            match.gender_specific_videos?.[gender] || 
            match.video_urls?.front || 
            match.videos?.[0]?.url;
          const videoSide = match.video_urls?.side;

          let steps: string[] = [];
          if (Array.isArray(match.steps)) {
            steps = match.steps.map((s: any) => typeof s === "string" ? s : s.text || JSON.stringify(s));
          } else if (typeof match.steps === "string") {
            steps = match.steps.split(/\n+/).filter(Boolean);
          } else if (match.description) {
            steps = match.description.split(/\. /).filter(Boolean).map((s: string) => s.trim());
          }

          if (steps.length === 0 && fallbackCurated) {
            steps = fallbackCurated.steps;
          }

          const exerciseResult: MuscleWikiExercise = {
            id: match.id || Math.floor(Math.random() * 10000),
            name: match.name || exerciseName,
            category: match.category || match.equipment || fallbackCurated?.category || "General",
            difficulty: match.difficulty?.toLowerCase() || fallbackCurated?.difficulty || "intermediate",
            primaryMuscles: match.primary_muscles || match.muscles || fallbackCurated?.primaryMuscles || ["Músculos principales"],
            secondaryMuscles: match.secondary_muscles || fallbackCurated?.secondaryMuscles || [],
            videoFront,
            videoSide,
            steps: steps.length > 0 ? steps : ["Realiza el movimiento de forma controlada y manteniendo la postura neutra."],
            tips: fallbackCurated?.tips || "Concéntrate en la conexión mente-músculo y mantén una respiración constante.",
            source: "musclewiki_api"
          };

          try {
            localStorage.setItem(cacheKey, JSON.stringify(exerciseResult));
          } catch {}

          return exerciseResult;
        }
      }
    } catch (err) {
      console.warn("MuscleWiki API fetch failed, falling back to curated guide:", err);
    }
  }

  // Fallback: Curated guide
  const defaultResult: MuscleWikiExercise = fallbackCurated ? {
    id: 1,
    ...fallbackCurated,
    source: "curated_guide"
  } : {
    id: 99,
    name: exerciseName,
    category: "Ejercicio general",
    difficulty: "intermediate",
    primaryMuscles: ["Grupo muscular principal"],
    secondaryMuscles: ["Músculos estabilizadores"],
    steps: [
      "Adopta una postura firme y cómoda con la espalda recta y el abdomen contraído.",
      "Inicia el movimiento con un ritmo controlado de 2 segundos de bajada.",
      "Haz una breve pausa de 1 segundo en el punto de máxima contracción muscular.",
      "Regresa a la posición inicial exhalando el aire de forma fluida."
    ],
    tips: "Mantén un peso que te permita completar las repeticiones indicadas con técnica impecable.",
    source: "curated_guide"
  };

  return defaultResult;
}
