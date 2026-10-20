import { 
  UserProfile, FitnessGoal, ExperienceLevel, TrainingEnvironment, 
  WeeklyRoutinePlan, RoutineTemplate, RoutineDayKey 
} from "../types";

interface GeminiImage {
  mimeType: string;
  data: string; // base64 without header
}

// Utility to clean base64 image strings
function cleanBase64Image(dataURI: string): { mimeType: string; data: string } {
  if (typeof dataURI !== "string") {
    return { mimeType: "image/jpeg", data: "" };
  }
  const matches = dataURI.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,([\s\S]+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2].trim(),
    };
  }
  return {
    mimeType: "image/jpeg",
    data: dataURI.trim(),
  };
}

// Helper to clean and translate raw Gemini API error messages for the user
function cleanErrorMessage(rawMessage: string, status?: number): string {
  const msg = rawMessage.toLowerCase();
  
  if (
    status === 429 ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("limit exceeded") ||
    msg.includes("resource exhausted")
  ) {
    return "Límite de consultas de Inteligencia Artificial alcanzado. Por favor, inténtalo de nuevo más tarde (Trophia utiliza canales gratuitos para tu cuenta).";
  }
  
  if (msg.includes("api key") || msg.includes("invalid key") || msg.includes("key not found")) {
    return "Tu API Key de Gemini es inválida o no tiene permisos. Por favor, revísala en la configuración de la app.";
  }
  
  if (msg.includes("not found") || msg.includes("supported")) {
    return "El modelo de Inteligencia Artificial configurado no está disponible actualmente o es incompatible.";
  }

  if (status && status >= 500) {
    return "El servidor de IA de Google está temporalmente sobrecargado. Por favor, reintenta en unos instantes.";
  }

  return rawMessage;
}

// 3 Dedicated Model Tiers matching user configuration in modelos_app_fitness.md
export type GeminiModelTier = "flash-lite" | "flash" | "pro";

interface CallGeminiOptions {
  model?: string;
  tier?: GeminiModelTier;
}

// 1. Pro / Heavy Vision & Deep Clinical Reasoning (User: Gemini 3.8 Flash)
const PRO_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

// 2. Standard Flash / Structured Reasoning & OCR (User: Gemini 3.5 Flash)
const FLASH_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// 3. Flash-Lite / High-Speed & Low Latency (User: Gemini 3.5 Flash-Lite)
const FLASH_LITE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

// Memory & LocalStorage cache per tier for zero-lag instant dispatch
let activeWorkingProModel: string = (() => {
  try {
    const saved = localStorage.getItem("trophia_working_gemini_pro_model");
    if (saved && PRO_MODELS.includes(saved) && !saved.includes("2.5")) return saved;
    localStorage.removeItem("trophia_working_gemini_pro_model");
    return "gemini-3.8-flash";
  } catch {
    return "gemini-3.8-flash";
  }
})();

let activeWorkingFlashModel: string = (() => {
  try {
    const saved = localStorage.getItem("trophia_working_gemini_flash_model");
    if (saved && FLASH_MODELS.includes(saved) && !saved.includes("2.5")) return saved;
    localStorage.removeItem("trophia_working_gemini_flash_model");
    return "gemini-3.5-flash";
  } catch {
    return "gemini-3.5-flash";
  }
})();

let activeWorkingLiteModel: string = (() => {
  try {
    const saved = localStorage.getItem("trophia_working_gemini_lite_model");
    if (saved && FLASH_LITE_MODELS.includes(saved) && !saved.includes("2.5")) return saved;
    localStorage.removeItem("trophia_working_gemini_lite_model");
    return "gemini-3.5-flash-lite";
  } catch {
    return "gemini-3.5-flash-lite";
  }
})();

let cachedSupportedModels: { key: string; models: string[]; timestamp: number } | null = null;

async function getSupportedModelsForApiKey(apiKey: string): Promise<string[]> {
  const now = Date.now();
  if (cachedSupportedModels && cachedSupportedModels.key === apiKey && (now - cachedSupportedModels.timestamp < 1800000)) {
    return cachedSupportedModels.models;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data.models && Array.isArray(data.models)) {
        const models: string[] = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name.replace(/^models\//, ""))
          .filter((name: string) => !name.includes("embedding") && !name.includes("aqa") && !name.includes("imagen"));
        
        if (models.length > 0) {
          cachedSupportedModels = { key: apiKey, models, timestamp: now };
          return models;
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch models dynamically, using fallback list:", err);
  }

  return [...FLASH_MODELS, ...PRO_MODELS];
}

// Main helper to call Gemini API directly from browser via HTTP fetch with Tier specialization
async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  images?: GeminiImage[],
  options?: CallGeminiOptions
): Promise<any> {
  const resolvedApiKey = (
    (apiKey && apiKey.trim() !== "")
      ? apiKey.trim()
      : (typeof localStorage !== "undefined" ? localStorage.getItem("trophia_api_key") : "") ||
        import.meta.env.VITE_SYSTEM_GEMINI_API_KEY ||
        ""
  );

  if (!resolvedApiKey) {
    throw new Error("No se ha configurado ninguna API Key de Gemini. Por favor agrégala en Ajustes o al iniciar la app.");
  }

  const tier: GeminiModelTier = options?.tier || "flash";
  const requestedModel = options?.model;
  const parts: any[] = [{ text: prompt }];
  if (images && images.length > 0) {
    images.forEach((img) => {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      });
    });
  }

  // Prioritize model according to specific user assignment and tier
  let prioritizedModels: string[];
  if (requestedModel) {
    const fallbackList = tier === "pro"
      ? PRO_MODELS
      : tier === "flash-lite"
      ? FLASH_LITE_MODELS
      : FLASH_MODELS;
    prioritizedModels = Array.from(new Set([requestedModel, ...fallbackList]));
  } else if (tier === "pro") {
    prioritizedModels = Array.from(new Set([activeWorkingProModel, ...PRO_MODELS]));
  } else if (tier === "flash-lite") {
    prioritizedModels = Array.from(new Set([activeWorkingLiteModel, ...FLASH_LITE_MODELS]));
  } else {
    prioritizedModels = Array.from(new Set([activeWorkingFlashModel, ...FLASH_MODELS]));
  }

  let lastError: Error | null = null;

  for (const model of prioritizedModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolvedApiKey}`;
    const controller = new AbortController();
    const timeoutMs = images && images.length > 0 ? 14000 : tier === "flash-lite" ? 5000 : 8500;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const rawMessage = errorData?.error?.message || `Error en la comunicación con la IA (${response.status})`;

        if (rawMessage.toLowerCase().includes("api key") || rawMessage.toLowerCase().includes("invalid key")) {
          throw new Error(cleanErrorMessage(rawMessage, response.status));
        }

        console.warn(`Modelo Gemini '${model}' (${tier}) falló (${response.status}): ${rawMessage}. Probando siguiente modelo...`);
        lastError = new Error(cleanErrorMessage(rawMessage, response.status));
        continue;
      }

      const data = await response.json();
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No se recibió respuesta del modelo de IA.");
      }

      text = text.trim();
      if (text.startsWith("```json")) {
        text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (text.startsWith("```")) {
        text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      try {
        const parsed = JSON.parse(text.trim());
        if (tier === "pro") {
          if (activeWorkingProModel !== model) {
            activeWorkingProModel = model;
            try { localStorage.setItem("trophia_working_gemini_pro_model", model); } catch {}
          }
        } else if (tier === "flash-lite") {
          if (activeWorkingLiteModel !== model) {
            activeWorkingLiteModel = model;
            try { localStorage.setItem("trophia_working_gemini_lite_model", model); } catch {}
          }
        } else {
          if (activeWorkingFlashModel !== model) {
            activeWorkingFlashModel = model;
            try { localStorage.setItem("trophia_working_gemini_flash_model", model); } catch {}
          }
        }
        return parsed;
      } catch (parseError) {
        console.error(`Failed to parse JSON response from Gemini (${model}):`, text);
        throw new Error("La respuesta de la IA no tiene un formato JSON válido.");
      }
    } catch (netError: any) {
      clearTimeout(timeoutId);
      if (netError.name === "AbortError") {
        console.warn(`Modelo Gemini '${model}' excedió el tiempo de espera (${timeoutMs}ms). Pasando al siguiente modelo...`);
        lastError = new Error("El modelo de IA tardó en responder. Conectando con servidor de respaldo...");
        continue;
      }
      if (
        netError.message &&
        (netError.message.includes("No hay conexión") ||
          netError.message.includes("API Key") ||
          netError.message.includes("Límite de consultas"))
      ) {
        throw netError;
      }
      lastError = netError;
      console.warn(`Error llamando al modelo '${model}':`, netError);
    }
  }

  // Dynamic discovery fallback only if all standard models fail
  try {
    const dynamicModels = await getSupportedModelsForApiKey(resolvedApiKey);
    const remainingModels = dynamicModels.filter((m) => !prioritizedModels.includes(m));
    for (const model of remainingModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolvedApiKey}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        });
        if (response.ok) {
          const data = await response.json();
          let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            text = text.trim().replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
            const parsed = JSON.parse(text.trim());
            if (tier === "pro") {
              activeWorkingProModel = model;
              try { localStorage.setItem("trophia_working_gemini_pro_model", model); } catch {}
            } else if (tier === "flash-lite") {
              activeWorkingLiteModel = model;
              try { localStorage.setItem("trophia_working_gemini_lite_model", model); } catch {}
            } else {
              activeWorkingFlashModel = model;
              try { localStorage.setItem("trophia_working_gemini_flash_model", model); } catch {}
            }
            return parsed;
          }
        }
      } catch {}
    }
  } catch {}

  throw lastError || new Error("No fue posible comunicarse con ningún modelo de Inteligencia Artificial disponible.");
}

// 1. Analyze body fat percentage by image
export async function analyzeFatByIA(
  apiKey: string,
  input: {
    frontImage?: string | null;
    sideImage?: string | null;
    backImage?: string | null;
    legsImage?: string | null;
    faceImage?: string | null;
    sex: string;
    age: number;
    weight: number;
    height: number;
    neck?: number | "";
    waist?: number | "";
    hip?: number | "";
    navyEstimatedFat?: number;
    caliperEstimatedFat?: number;
    skinfolds?: { val1: number; val2: number; val3: number };
  }
): Promise<any> {
  const {
    frontImage,
    sideImage,
    backImage,
    legsImage,
    faceImage,
    sex,
    age,
    weight,
    height,
    neck,
    waist,
    hip,
    navyEstimatedFat,
    caliperEstimatedFat,
    skinfolds,
  } = input;

  const images: GeminiImage[] = [];
  if (frontImage) images.push(cleanBase64Image(frontImage));
  if (sideImage) images.push(cleanBase64Image(sideImage));
  if (backImage) images.push(cleanBase64Image(backImage));
  if (legsImage) images.push(cleanBase64Image(legsImage));
  if (faceImage) images.push(cleanBase64Image(faceImage));

  if (images.length === 0) {
    throw new Error("No se proporcionó ninguna imagen corporal para analizar.");
  }

  let metricsInfo = `\n\n[INFORMACIÓN BIOMÉTRICA Y MÉTRICA DEL USUARIO]:\n`;
  metricsInfo += `- Sexo Biológico: ${sex === "female" ? "Femenino" : "Masculino"}\n`;
  metricsInfo += `- Edad: ${age} años\n`;
  metricsInfo += `- Peso: ${weight} kg\n`;
  metricsInfo += `- Altura: ${height} cm\n`;
  if (neck) metricsInfo += `- Medida del Cuello: ${neck} cm\n`;
  if (waist) metricsInfo += `- Medida de la Cintura: ${waist} cm\n`;
  if (hip) metricsInfo += `- Medida de la Cadera: ${hip} cm\n`;
  if (navyEstimatedFat) metricsInfo += `- Porcentaje de Grasa Calculado por Cinta (Navy): ${navyEstimatedFat}%\n`;
  if (caliperEstimatedFat) metricsInfo += `- Porcentaje de Grasa Calculado por Plicómetro: ${caliperEstimatedFat}%\n`;
  if (skinfolds) {
    metricsInfo += `- Medidas de Pliegues Cutáneos (Caliper):\n`;
    if (sex === "male") {
      metricsInfo += `  * Pecho: ${skinfolds.val1 || 0} mm\n`;
      metricsInfo += `  * Abdomen: ${skinfolds.val2 || 0} mm\n`;
      metricsInfo += `  * Muslo: ${skinfolds.val3 || 0} mm\n`;
    } else {
      metricsInfo += `  * Tríceps: ${skinfolds.val1 || 0} mm\n`;
      metricsInfo += `  * Suprailíaco: ${skinfolds.val2 || 0} mm\n`;
      metricsInfo += `  * Muslo: ${skinfolds.val3 || 0} mm\n`;
    }
  }

  const prompt = `Analiza la composición corporal de la persona a partir de las fotografías provistas y estima su porcentaje de grasa corporal. Se te han provisto fotografías desde diferentes ángulos de su fisionomía (frente, perfil/lado, y opcionalmente de piernas o cara) para que realices una valoración más exacta y tridimensional de su distribución adiposa y masa muscular.

${metricsInfo}

Por favor, cruza las imágenes visuales con estas mediciones físicas para dar una estimación de grasa corporal extremadamente precisa y coherente. El usuario te ha dado permiso y confía en tu criterio clínico-deportivo. Si alguna medida parece incoherente o difícil de calibrar, haz una síntesis lógica ponderando las imágenes visuales y los cálculos de fórmulas.

Además, basándote en su fisionomía y datos, recomiéndale el mejor objetivo de fitness para su estado actual (escoge estrictamente uno de estos 4 valores exactos para la clave JSON: "lose_weight", "gain_muscle", "aesthetics", "maintenance") y justifica tu recomendación. CRÍTICO: En el texto de justificación o análisis ("analysis" o "recommendedGoalReason"), NUNCA menciones los códigos internos en inglés (como "lose_weight", "gain_muscle", "aesthetics", "maintenance"). En su lugar, utiliza siempre sus nombres legibles en español: "Bajar de Peso / Definición", "Ganar Masa Muscular / Volumen", "Recomposición Estética" o "Mantenimiento / Salud".

CRÍTICO DE CLARIDAD: Si utilizas conceptos técnicos de somatotipos o fisiología (como por ejemplo "somatotipo endomórfico con potencial mesomórfico", "ectomorfo", "recomposición", etc.), NO los elimines ya que dan valor clínico, pero debes agregar inmediatamente después una explicación en palabras sumamente simples, cotidianas y claras para que cualquier usuario lo entienda a la primera (por ejemplo: "es decir, que aunque acumulas grasa fácilmente, tienes una excelente base genética para crear músculo y lucir atlético una vez definas").

CRÍTICO DE FORMATO: En el texto de "analysis", si incluyes viñetas o listas, usa estrictamente guiones simples "- " (ej: "- **Grasa**: Descripción"). NUNCA uses asteriscos "*" como marcadores de viñeta para evitar conflictos de parseo con los doble asteriscos de negrita "**".

Adopta un tono profesional, empático, científico y motivador. Si las imágenes no parecen ser de un cuerpo humano o no permiten realizar la estimación con suficiente certeza, indica un estimado promedio razonable según tu criterio clínico visual y la información biométrica y describe en el texto de 'analysis' cómo lograr una mejor estimación.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "bodyFat": número (porcentaje de grasa estimado, ej: 18.5, o null si es completamente imposible de estimar),
  "analysis": "Explicación detallada de la composición observada (somatotipo, masa muscular, distribución de grasa en torso y extremidades inferiores si se aprecian, y su relación con los rasgos visibles y mediciones proporcionadas) junto a recomendaciones de entrenamiento/alimentación coherentes. Utiliza formato de Markdown básico (como **negrita** para resaltar hallazgos clave o métricas importantes) dentro del texto. Recuerda usar únicamente guiones simples para listas.",
  "recommendedGoal": "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance",
  "recommendedGoalReason": "Explicación muy motivadora, breve (máximo 2-3 oraciones en español) de por qué este objetivo es ideal para su fisionomía, basándote en su grasa y composición corporal. Usa los nombres descriptivos en español."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, images, { model: "gemini-3.8-flash", tier: "pro" });
  } catch (apiError: any) {
    console.error("Gemini API error in analyzeFatByIA:", apiError);
    throw apiError;
  }
}

export async function recommendGoalByIA(
  apiKey: string,
  input: {
    sex: string;
    age: number;
    weight: number;
    height: number;
    bmi?: number;
    bodyFat?: number;
  }
): Promise<any> {
  const { sex, age, weight, height, bmi, bodyFat } = input;

  const prompt = `Actúa como un Experto Fisiólogo y Entrenador Deportivo de élite. Tu objetivo es recomendar la mejor meta de fitness para este usuario según su estado actual y justificar tu recomendación científicamente en pocas palabras.

[DATOS FÍSÍCOS]:
- Edad: ${age || 25} años
- Sexo Biológico: ${sex === "female" ? "Femenino" : "Masculino"}
- Peso: ${weight || 70} kg
- Altura: ${height || 170} cm
- IMC: ${bmi || "No provisto"}
- % Grasa Corporal Estimado: ${bodyFat !== undefined ? `${bodyFat}%` : "No provisto"}

Toma en cuenta la clasificación clínica de grasa corporal:
- Para varones: saludable/óptimo es ~10-19%, sobrepeso/grasa alta es >22-25%, muy bajo es <8%.
- Para mujeres: saludable/óptimo es ~18-27%, sobrepeso/grasa alta es >30-32%, muy bajo es <14%.

Basado en estos datos clínicos, recomiéndale uno de los siguientes 4 objetivos primordiales como principal:
1. "lose_weight" (Bajar de Peso / Definición) si tiene exceso de grasa corporal (ej: varón >22%, mujer >30%).
2. "gain_muscle" (Ganar Masa Muscular / Volumen) si tiene un porcentaje de grasa corporal saludable o bajo (ej: varón <14%, mujer <21%), y requiere construir masa muscular limpia.
3. "aesthetics" (Recomposición Estética) si está en rangos intermedios de grasa (ej: varón 14-21%, mujer 21-29%) y desea perder grasa y construir músculo simultáneamente.
4. "maintenance" (Mantenimiento / Salud) si se encuentra en su rango óptimo y prefiere consolidar hábitos sin fluctuaciones de peso.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "recommendedGoal": "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance",
  "reason": "Explicación muy motivadora, breve (máximo 2-3 oraciones en español) de por qué este objetivo es ideal para su fisionomía. Resalta los datos clave e importantes (porcentajes de grasa, etc.) encerrándolos entre doble asteriscos como **dato importante** para poder aplicar formato visual. CRÍTICO: NUNCA menciones códigos internos en inglés como 'lose_weight', 'gain_muscle', etc. en esta explicación. Utiliza siempre sus nombres amigables en español: 'Bajar de Peso / Definición', 'Ganar Masa Muscular / Volumen', 'Recomposición Estética' o 'Mantenimiento / Salud'."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.8-flash", tier: "pro" });
  } catch (apiError: any) {
    console.error("Gemini API error in recommendGoalByIA:", apiError);
    throw apiError;
  }
}

// 3. Generate Dashboard recommendations
export async function generateRecommendationsByIA(
  apiKey: string,
  profile: UserProfile
): Promise<any> {
  const goalLabels: Record<string, string> = {
    lose_weight: "Bajar de peso / Definición",
    gain_muscle: "Ganar masa muscular / Volumen",
    aesthetics: "Recomposición Estética",
    maintenance: "Mantenimiento general",
  };

  const levelLabels: Record<string, string> = {
    beginner: "Principiante",
    intermediate: "Intermedio",
    advanced: "Avanzado",
  };

  const envLabels: Record<string, string> = {
    home: "Casa",
    gym: "Gimnasio",
    outdoor: "Aire libre",
  };

  const dietLabels: Record<string, string> = {
    standard: "Estándar (Todo / Sin restricciones)",
    vegetarian: "Vegetariana",
    vegan: "Vegana",
    keto: "Cetogénica (Keto)",
    paleo: "Paleolítica (Paleo)",
    mediterranean: "Mediterránea",
  };

  const prompt = `Actúas como un Asesor Deportivo de Élite, Fisiólogo y Nutricionista Senior de la aplicación Trophia. Tu objetivo es brindarle al usuario recomendaciones personalizadas de primer nivel para sus metas.

[DATOS DEL PERFIL DEL USUARIO]:
- Edad: ${profile.age} años
- Sexo Biológico: ${profile.sex === "female" ? "Femenino" : "Masculino"}
- Peso: ${profile.weight} kg
- Altura: ${profile.height} cm
- Meta de Fitness: ${goalLabels[profile.goal] || profile.goal}
- Nivel de Experiencia: ${levelLabels[profile.level] || profile.level}
- Entorno de Entrenamiento: ${envLabels[profile.environment] || profile.environment}
- Equipamiento disponible: ${Array.isArray(profile.equipment) ? profile.equipment.join(", ") : "Peso corporal"}
- Nivel de conocimiento nutricional: ${profile.nutritionKnowledge || "Medio"}
- Tipo de Dieta: ${dietLabels[profile.dietType || ""] || profile.dietType || "Estándar (Todo / Sin restricciones)"}
- Macros Diarios Calculados: Calorías: ${profile.dailyCalorieTarget || 2000} kcal, Proteínas: ${profile.proteinTarget || 140}g, Carbohidratos: ${profile.carbsTarget || 200}g, Grasas: ${profile.fatTarget || 60}g

Analiza detalladamente esta información. En especial, presta mucha atención al Porcentaje de Grasa Corporal (% de Grasa Corporal: ${profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "No provisto"}) si está presente, correlacionándolo con su IMC, su peso, su edad y su meta. Asegúrate de que las recomendaciones de alimentación y macros en "nutritionAdvice" respeten estrictamente su Tipo de Dieta (${dietLabels[profile.dietType || ""] || "Estándar"}), sugiriendo fuentes de alimentos y consejos coherentes con dicho régimen.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "summary": "Un análisis y diagnóstico deportivo general de su estado físico y composición corporal (composición de su grasa, si el objetivo es coherente con su % de grasa actual y qué priorizar). Máximo 3 o 4 oraciones en español.",
  "nutritionAdvice": "Consejos estratégicos específicos sobre cómo organizar su alimentación y macros para reducir o aumentar ese % de grasa actual de manera eficiente según su meta. Máximo 4 oraciones en español.",
  "trainingAdvice": "Recomendaciones precisas sobre el tipo de entrenamiento, intensidad, volumen y frecuencia ideal basados en su nivel de experiencia, entorno y equipamiento actual para lograr la recomposición corporal o cambio de grasa adecuado. Máximo 4 oraciones en español.",
  "healthCheck": "Una valoración rápida de salud general. Consejos clave sobre hidratación, descanso o hábitos de vida cruciales según su edad y perfil. Máximo 3 oraciones en español."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
  } catch (apiError: any) {
    console.error("Gemini API error in generateRecommendationsByIA:", apiError);
    throw apiError;
  }
}

// 4. Generate Workout Routine Plan
export async function generateRoutineByIA(
  apiKey: string,
  input: {
    goal: FitnessGoal;
    level: ExperienceLevel;
    environment?: TrainingEnvironment;
    environments?: TrainingEnvironment[];
    equipment: string[];
    jointPainAreas?: ("knee" | "back" | "shoulder")[];
    customJointPain?: string;
    requiresMedicalClearance?: boolean;
    weeklyTrainingDays?: number;
    userNotesOrPreferences?: string;
    homeEquipmentNotes?: string;
  }
): Promise<WeeklyRoutinePlan> {
  const { 
    goal, 
    level, 
    environment = "gym", 
    environments, 
    equipment, 
    jointPainAreas = [], 
    customJointPain,
    requiresMedicalClearance,
    weeklyTrainingDays = 4,
    userNotesOrPreferences,
    homeEquipmentNotes
  } = input;

  const targetDays = Math.min(6, Math.max(2, weeklyTrainingDays));

  let safetyInstructions = "";
  if (requiresMedicalClearance) {
    safetyInstructions += `\n- ¡CRÍTICO!: El usuario posee alertas cardiovasculares/neurológicas. Genera un entrenamiento de baja intensidad (no exceder el 60% de su capacidad, mantener descripciones suaves y seguras).`;
  }
  
  if (jointPainAreas.length > 0) {
    safetyInstructions += `\n- Restricciones ortopédicas detectadas (el usuario sufre de dolor en las siguientes zonas: ${jointPainAreas.join(", ")}):`;
    if (jointPainAreas.includes("knee")) {
      safetyInstructions += `\n  * Rodilla: PROHIBIR sentadillas libres profundas por debajo del paralelo (deep squats) y extensiones de piernas en máquina con peso libre. SUSTITUIR por sentadillas parciales limitadas a 60-90 grados, peso muerto rumano (donde la rodilla apenas se flexiona), stance de pies ancho (stance ancho) y puentes de glúteo. Evitar saltos/pliometría o torsiones bruscas.`;
    }
    if (jointPainAreas.includes("back")) {
      safetyInstructions += `\n  * Espalda Baja (Lumbar): PROHIBIR peso muerto (deadlift) convencional levantado del suelo y sentadillas traseras libres con barra alta. SUSTITUIR por sentadillas búlgaras divididas (split squats) con mancuernas, estocadas de paso inverso y prensa de piernas inclinada (con coxis fuertemente estabilizado).`;
    }
    if (jointPainAreas.includes("shoulder")) {
      safetyInstructions += `\n  * Hombro: PROHIBIR press militar pesado sobre la cabeza y press de hombros tras nuca. Modular press de banca plano convencional. SUSTITUIR por press plano con agarre estrecho cerrado (codos pegados a los costados) o Floor Press (press en el suelo). Incrementar tracción compensatoria (remos de jalón horizontal, face-pulls).`;
    }
  }

  if (customJointPain && customJointPain.trim()) {
    safetyInstructions += `\n- ¡MOLÉSTIAS O LESIONES ESPECÍFICAS DETALLADAS POR EL USUARIO!: "${customJointPain.trim()}". CRÍTICO: Diseña los ejercicios y rangos articulares garantizando protección absoluta para estas molestias particulares reportadas.`;
  }

  if (userNotesOrPreferences && userNotesOrPreferences.trim()) {
    safetyInstructions += `\n- ¡PREFERENCIAS, DEPORTES SEMANALES Y DIRECTIVAS ESPECÍFICAS INDICADAS POR EL USUARIO!: "${userNotesOrPreferences.trim()}".
CRÍTICO Y MÁXIMA PRIORIDAD:
* Si el usuario indica que practica otros deportes en días determinados (por ejemplo fútbol o running en fin de semana): NUNCA asignes el día de Piernas en esos días ni justo el día anterior o posterior para no causarle sobrecarga. Por ejemplo, sitúa la rutina de Piernas los lunes o martes.
* Si el usuario manifiesta preferencia por ciertos tipos de equipamiento o ejercicios, prioriza rigurosamente ejercicios con ese equipamiento solicitado.
* Si el usuario pide evitar o prescindir de algún ejercicio específico, respétalo absolutamente.
* Adapta los días sugeridos de cada rutina (suggestedDay) y la selección de ejercicios respetando estas indicaciones.`;
  }

  if (homeEquipmentNotes && homeEquipmentNotes.trim()) {
    safetyInstructions += `\n- ¡PARTICULARIDADES Y LÍMITES DE EQUIPAMIENTO EN CASA!: "${homeEquipmentNotes.trim()}".
CRÍTICO: Adapta las prescripciones y los pesos sugeridos estrictamente a estas especificaciones domésticas:
* Si el usuario tiene mancuernas con tope de peso (ej: hasta 10 kg), NO formules pesos superiores a ese tope; si requiere mayor sobrecarga, incrementa las repeticiones o pauta variantes unilaterales (ej: sentadillas búlgaras, zancadas o tempo lento).
* Si tiene polea casera o fija con accesorios puntuales (ej: cuerda en V o barra corta), formula ejercicios que exploten esos accesorios (ej: extensiones de tríceps en polea con cuerda).
* Si alguna máquina de cardio tiene resistencia moderada o estado particular, programa el esfuerzo acorde a su capacidad real.`;
  }

  // Regla biomecánica obligatoria de élite
  safetyInstructions += `\n- ¡REGLA BIOMECÁNICA DE ORO!: Si en el equipamiento disponible existen poleas o cables (por ejemplo en gimnasio o polea en casa), PRIORIZA POR DEFECTO ejercicios en polea para aislamiento de tríceps (ej: Extensiones de tríceps en polea alta con cuerda o barra), cruces de poleas para pectoral y elevaciones laterales en polea frente a mancuernas, dado que el cable garantiza tensión mecánica continua en la fase acortada donde las mancuernas pierden curva de resistencia.`;

  const envText = environments && environments.length > 0
    ? environments.map(e => e === "gym" ? "Gimnasio" : e === "home" ? "Casa" : "Aire libre / Calistenia").join(" y ")
    : (environment === "gym" ? "Gimnasio" : environment === "home" ? "Casa" : "Aire libre");

  const prompt = `Actúas como un Entrenador Deportivo de Élite, Biomecánico y Fisiólogo de la app Trophia.
Tu misión es diseñar un PLAN DE ENTRENAMIENTO SEMANAL COMPLETO compuesto por exactamente ${targetDays} RUTINAS DISTINTAS (una para cada día de entrenamiento planificado por el usuario).

[DATOS DEL USUARIO]:
- Objetivo: ${goal}
- Nivel de experiencia: ${level}
- Entorno(s) de trabajo: ${envText}
- Días planificados por semana: ${targetDays} días
- Equipamiento disponible: ${Array.isArray(equipment) ? equipment.join(", ") : "Peso corporal"}${safetyInstructions}

[ESPECIFICACIÓN DE LA DIVISIÓN SEMANAL SEGÚN ${targetDays} DÍAS]:
- Si son 2 días: Rutina 1 (Full Body A: Enfoque Empuje y Cuádriceps) y Rutina 2 (Full Body B: Enfoque Tirón y Cadena Posterior). Sugiere días "monday" y "thursday".
- Si son 3 días: Rutina 1 (Empuje / Pecho y Hombros), Rutina 2 (Tirón / Espalda y Bíceps), Rutina 3 (Piernas y Core). Sugiere días "monday", "wednesday" y "friday".
- Si son 4 días: Rutina 1 (Torso A / Fuerza), Rutina 2 (Pierna A / Cuádriceps), Rutina 3 (Torso B / Hipertrofia), Rutina 4 (Pierna B / Cadena Posterior). Sugiere días "monday", "tuesday", "thursday" y "friday".
- Si son 5 días: Rutina 1 (Pecho y Tríceps), Rutina 2 (Espalda y Bíceps), Rutina 3 (Piernas Cuádriceps), Rutina 4 (Hombros y Core), Rutina 5 (Piernas Isquios y Glúteo). Sugiere "monday", "tuesday", "wednesday", "thursday" y "friday".
- Si son 6 días: Empuje / Tirón / Pierna x 2. Sugiere "monday" a "saturday".

Para CADA UNA de las ${targetDays} rutinas:
1. "name": Título motivador y claro (ej: "Día 1: Empuje (Pecho, Hombro y Tríceps)").
2. "focus": Grupo muscular o enfoque principal (ej: "Pectoral, Hombro y Tríceps").
3. "suggestedDay": "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday".
4. "warmup": 2 o 3 ejercicios de movilidad articular o calentamiento específico.
5. "exercises": 3 a 5 ejercicios adaptados al equipamiento y restricciones.
   - trackingType: "reps" para fuerza con repeticiones, "time" para ejercicios basados en tiempo (planchas, isométricos).
   - sets: número de series de trabajo (3 o 4).
   - reps: repeticiones recomendadas por serie o segundos si es time.
   - weight: peso de inicio recomendado en kg (0 si es peso corporal). ¡IMPORTANTE!: En ejercicios con mancuernas (dumbbell), el valor DEBE ser el peso de CADA mancuerna individual (ej: 10 kg significa una mancuerna de 10 kg en cada mano, total 20 kg). NUNCA dividas el peso.
   - caloriesBurnedPerSet: gasto calórico conservador por serie (3 a 8 kcal).
   - primaryMuscles: músculos principales trabajados.
   - secondaryMuscles: músculos sinergistas o secundarios.
   - techniqueTips: indicación clara de alineación, respiración y seguridad.
   - equipmentNeeded: implemento necesario.
6. "cooldown": 2 o 3 estiramientos o relajación final.

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "planName": "Nombre creativo y profesional del plan completo",
  "description": "Explicación breve de 2 oraciones de la división semanal.",
  "weeklyDaysCount": ${targetDays},
  "routines": [
    {
      "id": "routine-1",
      "name": "Día 1: Empuje (Pecho, Hombro y Tríceps)",
      "focus": "Pecho y Hombros",
      "suggestedDay": "monday",
      "warmup": ["Movilidad articular escapular - 3 min"],
      "exercises": [
        {
          "name": "Press de Banca Plano",
          "trackingType": "reps",
          "sets": 3,
          "reps": 10,
          "weight": 14,
          "caloriesBurnedPerSet": 5,
          "primaryMuscles": ["Pectoral mayor"],
          "secondaryMuscles": ["Tríceps braquial", "Deltoides anterior"],
          "techniqueTips": "Retrae escápulas y apoya los pies con firmeza.",
          "equipmentNeeded": "Mancuernas y Banco"
        }
      ],
      "cooldown": ["Estiramiento de pecho en pared - 2 min"]
    }
  ]
}`;

  const defaultDayKeys: RoutineDayKey[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  try {
    const res = await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.8-flash", tier: "pro" });

    if (res && Array.isArray(res.routines) && res.routines.length > 0) {
      const parsedRoutines: RoutineTemplate[] = res.routines.map((r: any, rIdx: number) => {
        const fallbackDay = defaultDayKeys[rIdx % defaultDayKeys.length];
        const assigned: RoutineDayKey = r.suggestedDay && defaultDayKeys.includes(r.suggestedDay) ? r.suggestedDay : fallbackDay;

        return {
          id: r.id || `routine-${rIdx + 1}`,
          name: r.name || `Rutina ${rIdx + 1}`,
          focus: r.focus || "Acondicionamiento Físico",
          assignedDay: assigned,
          warmup: Array.isArray(r.warmup) ? r.warmup : ["Movilidad articular general - 5 min"],
          cooldown: Array.isArray(r.cooldown) ? r.cooldown : ["Estiramientos generales - 5 min"],
          exercises: (r.exercises || []).map((ex: any, idx: number) => {
            const numSets = Number(ex.sets) || 3;
            const numReps = Number(ex.reps) || 10;
            const numWeight = Number(ex.weight) || 0;
            return {
              id: `ex-${idx}`,
              name: ex.name || `Ejercicio ${idx + 1}`,
              trackingType: ex.trackingType === "time" ? "time" : ex.trackingType === "distance" ? "distance" : "reps",
              sets: numSets,
              reps: numReps,
              weight: numWeight,
              caloriesBurnedPerSet: Number(ex.caloriesBurnedPerSet) || 5,
              primaryMuscles: Array.isArray(ex.primaryMuscles) && ex.primaryMuscles.length > 0 ? ex.primaryMuscles : ["Músculo principal"],
              secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
              techniqueTips: ex.techniqueTips || "Mantén una ejecución controlada y alineada.",
              equipmentNeeded: ex.equipmentNeeded || "Peso corporal",
              completedSets: Array.from({ length: numSets }).map((_, sIdx) => ({
                setIndex: sIdx,
                completed: false,
                reps: numReps,
                weight: numWeight
              }))
            };
          })
        };
      });

      return {
        planName: res.planName || `Plan de Entrenamiento (${targetDays} Días)`,
        description: res.description || "Plan dividido científicamente según tu disponibilidad y equipamiento.",
        weeklyDaysCount: targetDays,
        routines: parsedRoutines,
        createdAt: new Date().toISOString()
      };
    }

    // Fallback if returned single routine
    if (res && res.exercises) {
      const numSets = 3;
      const numReps = 10;
      return {
        planName: res.name || "Plan de Entrenamiento",
        description: "Rutina inteligente adaptada a tu perfil",
        weeklyDaysCount: 1,
        routines: [
          {
            id: "routine-1",
            name: res.name || "Día 1: Entrenamiento Principal",
            focus: "General",
            assignedDay: "monday",
            warmup: res.warmup || ["Movilidad articular general - 5 min"],
            cooldown: res.cooldown || ["Estiramientos completos - 5 min"],
            exercises: (res.exercises || []).map((ex: any, idx: number) => ({
              id: `ex-${idx}`,
              name: ex.name,
              trackingType: ex.trackingType || "reps",
              sets: ex.sets || numSets,
              reps: ex.reps || numReps,
              weight: ex.weight || 0,
              caloriesBurnedPerSet: ex.caloriesBurnedPerSet || 5,
              primaryMuscles: ex.primaryMuscles || ["Cuerpo completo"],
              secondaryMuscles: ex.secondaryMuscles || [],
              techniqueTips: ex.techniqueTips || "Ejecuta con control biomecánico.",
              equipmentNeeded: ex.equipmentNeeded || "Peso corporal",
              completedSets: Array.from({ length: ex.sets || numSets }).map((_, sIdx) => ({
                setIndex: sIdx,
                completed: false,
                reps: ex.reps || numReps,
                weight: ex.weight || 0
              }))
            }))
          }
        ],
        createdAt: new Date().toISOString()
      };
    }

    throw new Error("Respuesta de rutina no válida de la IA");
  } catch (apiError: any) {
    console.error("Gemini API error in generateRoutineByIA:", apiError);
    // Graceful offline fallback plan
    const fallbackDays: { name: string; focus: string; day: RoutineDayKey }[] = [
      { name: "Día 1: Empuje & Core", focus: "Pecho, Hombro y Tríceps", day: "monday" },
      { name: "Día 2: Tirón & Bíceps", focus: "Espalda, Bíceps y Lumbar", day: "wednesday" },
      { name: "Día 3: Piernas & Glúteos", focus: "Cuádriceps, Isquios y Pantorrillas", day: "friday" },
      { name: "Día 4: Torso Completo", focus: "Hipertrofia de Torso", day: "saturday" }
    ];

    const routines = fallbackDays.slice(0, targetDays).map((fb, idx) => ({
      id: `fallback-routine-${idx + 1}`,
      name: fb.name,
      focus: fb.focus,
      assignedDay: fb.day,
      warmup: ["Movilidad articular general - 5 min", "Activación dinámica - 3 min"],
      cooldown: ["Estiramientos completos - 5 min"],
      exercises: [
        {
          id: `ex-${idx}-1`,
          name: idx % 2 === 0 ? "Press de Banca o Flexiones" : "Remo con Mancuerna o Jalón",
          trackingType: "reps" as const,
          sets: 3,
          reps: 12,
          weight: 12,
          caloriesBurnedPerSet: 5,
          primaryMuscles: [idx % 2 === 0 ? "Pectoral" : "Dorsal ancho"],
          secondaryMuscles: ["Tríceps", "Bíceps"],
          techniqueTips: "Controla la fase excéntrica y mantén alineada la columna.",
          equipmentNeeded: "Mancuernas o peso corporal",
          completedSets: [
            { setIndex: 0, completed: false, reps: 12, weight: 12 },
            { setIndex: 1, completed: false, reps: 12, weight: 12 },
            { setIndex: 2, completed: false, reps: 12, weight: 12 }
          ]
        },
        {
          id: `ex-${idx}-2`,
          name: idx % 2 === 0 ? "Sentadilla Copa (Goblet Squat)" : "Peso Muerto Rumano",
          trackingType: "reps" as const,
          sets: 3,
          reps: 12,
          weight: 16,
          caloriesBurnedPerSet: 6,
          primaryMuscles: [idx % 2 === 0 ? "Cuádriceps" : "Isquiosurales"],
          secondaryMuscles: ["Glúteos", "Core"],
          techniqueTips: "Mantén el pecho erguido y las rodillas estables.",
          equipmentNeeded: "Mancuerna o peso corporal",
          completedSets: [
            { setIndex: 0, completed: false, reps: 12, weight: 16 },
            { setIndex: 1, completed: false, reps: 12, weight: 16 },
            { setIndex: 2, completed: false, reps: 12, weight: 16 }
          ]
        }
      ]
    }));

    return {
      planName: `Plan de Entrenamiento (${targetDays} Días)`,
      description: "Plan formulado con pautas biomecánicas de seguridad y volumen semanal.",
      weeklyDaysCount: targetDays,
      routines,
      createdAt: new Date().toISOString()
    };
  }
}

// 5. Analyze meal photo with optional description and correction capability
export async function analyzeFoodByIA(
  apiKey: string,
  input: {
    image?: string | null; // base64 data URI (optional for corrections)
    mealType: string;
    description?: string;
    correction?: string;
    existingIngredients?: string[];
  }
): Promise<any> {
  const { image, mealType, description, correction, existingIngredients } = input;

  const images: GeminiImage[] = [];
  if (image) {
    const cleaned = cleanBase64Image(image);
    images.push({ mimeType: cleaned.mimeType, data: cleaned.data });
  }

  let prompt = "";
  
  if (correction && existingIngredients && existingIngredients.length > 0) {
    prompt = `El análisis de comida previo del tipo ${mealType || "comida"} identificó los siguientes ingredientes:
${existingIngredients.map(ing => `- ${ing}`).join("\n")}

El usuario indica la siguiente corrección o aclaración sobre los ingredientes, producto o porciones:
"${correction}"

${image ? "Analiza la fotografía de comida adjunta junto con esta corrección." : "Re-evalúa el plato o producto basándote en esta corrección."}
Ajusta la lista de ingredientes identificados y recalcula con precisión las calorías totales, carbohidratos (g), proteínas (g) y grasas (g) para la porción o paquete correspondiente.`;
  } else {
    prompt = `Analiza esta fotografía de comida para un registro de nutrición del tipo: ${mealType || "comida"}.`;
    if (description) {
      prompt += `\nEl usuario indica que el plato contiene o se describe como: "${description}". Utiliza esta descripción para guiar tu identificación.`;
    }
    prompt += `\nINSTRUCCIONES CLAVE DE ANÁLISIS:
1. DETECCIÓN DE PRODUCTO ENVASADO / EMPAQUE vs PLATO PREPARADO:
   - Si la foto muestra un PRODUCTO ENVASADO o con empaque comercial (por ejemplo: galleta, barra de proteína o cereal, snack, yogur, alfajor, bebida, bolsa o paquete individual):
     * REVISA CON MÁXIMO DETALLE el empaque para detectar el PESO NETO en gramos (ej: "12g", "25g", "30g", "45g", "120g") o volumen (ml).
     * CALCULA LAS CALORÍAS Y MACROS EXCLUSIVAMENTE PARA EL TAMAÑO / PESO REAL DE ESE PRODUCTO/PAQUETE COMPLETO (¡NUNCA pongas por defecto 100g si el paquete visible es de 12g, 30g o 45g!).
     * Coloca en "estimatedGrams" el peso neto real detectado en gramos (ej: 12) y en "servingSize" describe la porción (ej: "1 paquete (12g)", "1 barra (45g)").
     * En "name" incluye el nombre comercial con su gramaje (ej: "Barra de Cereal Choco (12g)").
     * Marca "isPackagedProduct": true.
   - Si la foto muestra un PLATO PREPARADO o comida casera/restaurante (ej: pechuga de pollo con arroz y ensalada):
     * Estima el peso total aproximado de la porción servida en el plato (ej: 350g) y calcula las calorías y macronutrientes para esa porción total servida.
     * En "servingSize" pon por ejemplo "1 plato (350g)" y en "estimatedGrams" el peso total estimado (ej: 350).
     * Marca "isPackagedProduct": false.

2. PRECISIÓN NUTRICIONAL:
   - Identifica con precisión los componentes y macronutrientes.
   - Las calorías, proteínas, carbohidratos y grasas deben corresponder EXACTAMENTE a la porción total calculada (estimatedGrams).`;
  }

  prompt += `

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre estimado del alimento o producto (ej: 'Galleta de Avena Quaker (12g)' o 'Pechuga de pollo con arroz')",
  "calories": número (calorías totales estimadas para la porción o paquete completo, entero),
  "protein": número (proteínas estimadas en gramos para la porción o paquete, entero o decimal con 1 dígito),
  "carbs": número (carbohidratos estimados en gramos para la porción o paquete, entero o decimal con 1 dígito),
  "fat": número (grasas estimadas en gramos para la porción o paquete, entero o decimal con 1 dígito),
  "estimatedGrams": número (peso estimado en gramos del paquete o porción del plato, ej: 12, 30, 150, 350),
  "servingSize": "Descripción clara de la porción (ej: '1 paquete (12g)', '1 unidad (35g)', '1 plato (350g)')",
  "isPackagedProduct": boolean (true si es producto envasado/empaque, false si es comida servida),
  "ingredients": ["ingrediente 1", "ingrediente 2", ...],
  "analysis": "Análisis nutricional de los ingredientes o del producto y recomendaciones."
}`;

  return await callGeminiAPI(apiKey, prompt, images, { model: "gemini-3.8-flash", tier: "pro" });
}

export async function generateRecipeFromIngredientsByIA(
  apiKey: string,
  profile: UserProfile,
  ingredients: string[]
): Promise<any> {
  const prompt = `Eres un Chef Nutricionista Experto de la aplicación Trophia.
El usuario tiene los siguientes ingredientes en su despensa: ${ingredients.join(", ")}.
Su perfil de fitness es:
- Tipo de dieta: ${profile.dietType || "standard"}
- Meta de fitness: ${profile.goal || "maintenance"}
- Peso: ${profile.weight} kg
- Estatura: ${profile.height} cm
- Edad: ${profile.age} años

Genera una receta deliciosa, fácil de preparar y saludable usando PRINCIPALMENTE los ingredientes de la despensa. Puedes asumir condimentos básicos de cocina (sal, pimienta, ajo, aceite de oliva en cantidades mínimas). La receta debe ajustarse estrictamente a su tipo de dieta y meta de fitness (por ejemplo, si es vegano no incluyas huevos/leche, si es keto mantén los carbohidratos extremadamente bajos).

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre creativo y apetitoso de la receta",
  "ingredientsList": ["Ingrediente 1 con cantidad sugerida", "Ingrediente 2 con cantidad sugerida"],
  "instructions": ["Paso 1...", "Paso 2..."],
  "calories": número (calorías estimadas por porción, entero),
  "protein": número (proteínas estimadas por porción en gramos, entero),
  "carbs": número (carbohidratos estimados por porción en gramos, entero),
  "fat": número (grasas estimadas por porción en gramos, entero),
  "servingSize": "Descripción de la porción (ej: 1 plato, 1 taza, 250g)",
  "tip": "Consejo nutricional adaptado a su meta de fitness"
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
  } catch (apiError: any) {
    console.error("Gemini API error in generateRecipeFromIngredientsByIA:", apiError);
    throw apiError;
  }
}

export async function adjustLoggedMealByChatByIA(
  apiKey: string,
  meal: { name: string; calories: number; protein: number; carbs: number; fat: number },
  userMessage: string
): Promise<any> {
  const prompt = `Eres el asistente de nutrición de Trophia.
Un usuario registró la siguiente comida en su diario:
- Nombre: "${meal.name}"
- Calorías: ${meal.calories} kcal
- Proteínas: ${meal.protein}g
- Carbohidratos: ${meal.carbs}g
- Grasas: ${meal.fat}g

El usuario te envía el siguiente mensaje con respecto a lo que realmente consumió:
"${userMessage}"

Analiza el mensaje del usuario para ajustar proporcionalmente o de forma lógica el registro de macros y calorías de la comida.
Ejemplos comunes:
- "Dejé la mitad" -> multiplicar calorías y macros por 0.5.
- "Comí el doble" -> multiplicar por 2.0.
- "Dejé un tercio" -> multiplicar por 0.67.
- "Solo comí la proteína, dejé el arroz" -> estimar y restar los carbohidratos y sumar o mantener la proteína.
Usa tu juicio nutricional para hacer el ajuste lo más realista posible.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre ajustado (ej: Pechuga de pollo con arroz - Ajustado porción)",
  "calories": número (calorías ajustadas totales, entero),
  "protein": número (proteínas ajustadas totales en gramos, entero),
  "carbs": número (carbohidratos ajustados totales en gramos, entero),
  "fat": número (grasas ajustadas totales en gramos, entero),
  "adjustmentExplanation": "Breve explicación en español de qué ajuste se realizó (ej: 'Se redujo la porción un 50% según lo indicado')."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.8-flash", tier: "pro" });
  } catch (apiError: any) {
    console.error("Gemini API error in adjustLoggedMealByChatByIA:", apiError);
    throw apiError;
  }
}

export interface ExerciseConsultationSuggestedExercise {
  name: string;
  trackingType: "reps" | "time";
  sets: number;
  reps: number;
  weight: number;
  caloriesBurnedPerSet: number;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  techniqueTips: string;
  equipmentNeeded: string;
}

export interface ExerciseConsultationAlternative {
  name: string;
  equipmentNeeded: string;
  difficulty?: string;
  repsText?: string;
  justification: string;
}

export interface ExerciseConsultationResponse {
  explanation: string;
  suggestedExercise?: ExerciseConsultationSuggestedExercise;
  alternativeOptions?: ExerciseConsultationAlternative[];
}

export async function consultAndAdjustExerciseByIA(
  apiKey: string,
  input: {
    currentExercise: {
      name: string;
      sets: number;
      reps: number;
      weight?: number;
      trackingType?: "reps" | "time" | "distance";
      equipmentNeeded?: string;
      primaryMuscles?: string[];
      techniqueTips?: string;
    };
    routineName?: string;
    userMessage: string;
    equipmentList: string[];
    level: ExperienceLevel;
    homeEquipmentNotes?: string;
  }
): Promise<ExerciseConsultationResponse> {
  const { currentExercise, routineName, userMessage, equipmentList, level, homeEquipmentNotes } = input;

  const homeNotesContext = homeEquipmentNotes && homeEquipmentNotes.trim()
    ? `\n- Particularidades de equipamiento en casa del usuario: "${homeEquipmentNotes.trim()}" (Toma en cuenta límites de peso de mancuernas, accesorios de polea o estado de máquinas al sugerir cargas y ejercicios).`
    : "";

  const prompt = `Actúas como un Entrenador Deportivo de Élite, Fisiólogo y Biomecánico de la app Trophia.
El usuario está analizando un ejercicio de su plan de entrenamiento y te ha escrito una consulta o solicitud de cambio en lenguaje natural.

[CONTEXTO DEL EJERCICIO ACTUAL]:
- Nombre: "${currentExercise.name}"
- Rutina / Sesión: "${routineName || "Entrenamiento programado"}"
- Series y Repeticiones actuales: ${currentExercise.sets} series × ${currentExercise.reps} reps, peso sugerido: ${currentExercise.weight || 0} kg
- Implemento requerido actual: "${currentExercise.equipmentNeeded || "No especificado"}"
- Músculos principales: ${(currentExercise.primaryMuscles || []).join(", ") || "No especificado"}
- Pautas técnicas actuales: "${currentExercise.techniqueTips || "Ninguna"}"

[PERFIL DEL USUARIO]:
- Nivel de entrenamiento: ${level}
- Equipamiento disponible: ${equipmentList.length > 0 ? equipmentList.join(", ") : "Peso corporal (sin equipamiento)"}${homeNotesContext}

[MENSAJE O CONSULTA DEL USUARIO]:
"${userMessage}"

[TU MISIÓN]:
1. "explanation": Brinda una respuesta cercana, profesional y biomecánica (2 a 3 párrafos concisos, sin tecnicismos de IA).
   - Si pregunta por qué se eligió el ejercicio original: explícale la ventaja biomecánica, curva de fuerza, estabilidad o activación muscular.
   - Si solicita un cambio (por ejemplo, porque tiene polea en vez de mancuerna, o no le gusta el ejercicio, o le incomoda una articulación, o prefiere otra variante): valida su preferencia, explica por qué la nueva opción es excelente o cómo optimiza la tensión mecánica y el confort articular.
2. "suggestedExercise": Si el usuario pide un cambio, menciona preferencia por otro implemento (ej: polea, barra, mancuerna), o expresa desagrado con el ejercicio actual, FORMULA el ejercicio de reemplazo ideal, completamente adaptado a su equipamiento y nivel. Si solo hizo una pregunta informativa sin pedir cambio, aún así puedes sugerir la mejor variante opcional.
3. "alternativeOptions": Entrega 1 o 2 alternativas adicionales breves por si desea evaluar otras variantes.

REGLAS DE ORO:
- NUNCA menciones nombres de modelos de IA, APIs ni términos técnicos de programación.
- El equipamiento del ejercicio sugerido DEBE pertenecer al equipamiento disponible del usuario (o peso corporal).
- REGLA ESTRICTA DE PESO EN MANCUERNAS (DUMBBELLS):
  En ejercicios bilaterales con mancuernas (ej: Curl con mancuernas, Press con mancuernas, Elevaciones laterales, Remo con mancuernas, etc.), el campo "weight" DEBE representar SIEMPRE el peso INDIVIDUAL DE UNA SOLA MANCUERNA (el peso por mano), NUNCA la suma de ambas.
  ¡MUY IMPORTANTE!: Si el usuario menciona que tiene dos pesas o mancuernas de 10 kg (una en cada mano o para cada brazo), el campo "weight" DEBE SER EXACTAMENTE 10 (NUNCA 20). La app multiplicará automáticamente por 2 en la interfaz al mostrar "10kg c/u (×2)". Si anotas 20, la app mostrará 20kg ×2 (40kg) y arruinará la carga real del usuario.
- Responde estrictamente en formato JSON:
{
  "explanation": "Texto explicativo para el usuario...",
  "suggestedExercise": {
    "name": "Nombre exacto del nuevo ejercicio (ej: Extensión de tríceps en polea alta con cuerda)",
    "trackingType": "reps",
    "sets": 3,
    "reps": 12,
    "weight": 15,
    "caloriesBurnedPerSet": 5,
    "primaryMuscles": ["Tríceps braquial"],
    "secondaryMuscles": ["Ancóneo", "Core"],
    "techniqueTips": "Mantén los codos pegados a los costados y abre la cuerda al final de la extensión.",
    "equipmentNeeded": "Poleas cruzadas / Cables ajustables"
  },
  "alternativeOptions": [
    {
      "name": "Fondos en banco o paralelas",
      "equipmentNeeded": "Banco o paralelas",
      "repsText": "3 series de 10-12 reps",
      "justification": "Gran estímulo en la porción lateral del tríceps."
    }
  ]
}`;

  try {
    const res = await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
    if (res && res.explanation) {
      return res;
    }
  } catch (err) {
    console.warn("Fallback offline in consultAndAdjustExerciseByIA:", err);
  }

  // Fallback inteligente offline
  const lowerMsg = userMessage.toLowerCase();
  const lowerEx = currentExercise.name.toLowerCase();

  let fallbackSuggestedName = `Variante adaptada de ${currentExercise.name}`;
  let fallbackEquip = currentExercise.equipmentNeeded || "Mancuernas";
  let fallbackExplanation = `He analizado tu consulta sobre "${currentExercise.name}". `;

  if (lowerMsg.includes("polea") && (lowerEx.includes("trícep") || lowerEx.includes("tricep") || (currentExercise.primaryMuscles || []).some(m => m.toLowerCase().includes("trícep") || m.toLowerCase().includes("tricep")))) {
    fallbackSuggestedName = "Extensión de tríceps en polea alta con cuerda";
    fallbackEquip = "Poleas cruzadas / Cables ajustables";
    fallbackExplanation = "¡Excelente observación biomecánica! La polea alta mantiene una tensión mecánica uniforme en todo el rango de movimiento del tríceps, especialmente en el punto de máxima contracción donde las mancuernas pierden resistencia por la gravedad. He configurado la variante con cuerda para mayor libertad articular de tus muñecas.";
  } else if (lowerMsg.includes("polea")) {
    fallbackSuggestedName = `${currentExercise.name} en polea`;
    fallbackEquip = "Poleas cruzadas / Cables ajustables";
    fallbackExplanation = "Trabajar en polea te ofrece una curva de resistencia constante y mayor protección articular frente al peso libre.";
  } else if (lowerMsg.includes("por que") || lowerMsg.includes("por qué") || lowerMsg.includes("motivo") || lowerMsg.includes("razón")) {
    fallbackExplanation = `Se recomendó "${currentExercise.name}" porque es uno de los ejercicios con mayor índice de activación muscular en ${(currentExercise.primaryMuscles || ["la zona"]).join(", ")}, permitiendo una sobrecarga progresiva segura y eficiente para tu nivel.`;
  } else if (lowerMsg.includes("no me gusta") || lowerMsg.includes("odio") || lowerMsg.includes("cambi") || lowerMsg.includes("otra")) {
    fallbackExplanation = `Entendido perfectamente. Si un ejercicio no te resulta cómodo o motivador, la adherencia disminuye. He seleccionado una alternativa biomecánica equivalente que trabaja el mismo grupo muscular con excelente estímulo.`;
    fallbackSuggestedName = lowerEx.includes("press") ? "Flexiones de brazos o Press declinado" : lowerEx.includes("sentadilla") ? "Prensa de piernas o Sentadilla búlgara" : `Variante alternativa de ${currentExercise.name}`;
  } else {
    fallbackExplanation = `He adaptado el ejercicio a tus comentarios para que el estímulo sea óptimo y se ajuste con precisión a tus preferencias de entrenamiento.`;
  }

  return {
    explanation: fallbackExplanation,
    suggestedExercise: {
      name: fallbackSuggestedName,
      trackingType: currentExercise.trackingType === "time" ? "time" : "reps",
      sets: currentExercise.sets || 3,
      reps: currentExercise.reps || 10,
      weight: currentExercise.weight || 0,
      caloriesBurnedPerSet: 5,
      primaryMuscles: currentExercise.primaryMuscles || ["Músculos principales"],
      secondaryMuscles: ["Estabilizadores"],
      techniqueTips: "Ejecuta con ritmo controlado: 2 segundos de bajada excéntrica y 1 segundo de subida concéntrica.",
      equipmentNeeded: fallbackEquip
    },
    alternativeOptions: [
      {
        name: `Alternativa funcional para ${currentExercise.name}`,
        equipmentNeeded: fallbackEquip,
        repsText: "3 series de 10 a 12 reps",
        justification: "Alternativa complementaria con foco en estabilidad y control postural."
      }
    ]
  };
}

export async function suggestAlternativeExercisesByIA(
  apiKey: string,
  exerciseName: string,
  equipmentList: string[],
  level: ExperienceLevel
): Promise<any> {
  const prompt = `Eres un Entrenador Deportivo de Élite de la aplicación Trophia.
El usuario está realizando el siguiente ejercicio: "${exerciseName}".
Sin embargo, desea cambiarlo por un ejercicio alternativo.
El perfil de equipamiento y nivel del usuario es:
- Equipamiento disponible: ${equipmentList.join(", ") || "Peso corporal (sin equipamiento)"}
- Nivel de entrenamiento: ${level}

Sugiere exactamente 3 ejercicios alternativos viables que trabajen el mismo grupo muscular.
Los ejercicios propuestos deben cumplir estrictamente las siguientes reglas:
1. Usar únicamente el equipamiento que el usuario tiene disponible (o peso corporal).
2. Estar adaptados a su nivel.
3. Ser seguros y efectivos.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "alternatives": [
    {
      "name": "Nombre de la alternativa 1 (ej: Flexiones de brazos declinadas)",
      "equipmentNeeded": "Equipamiento necesario (ej: Peso corporal, banco)",
      "difficulty": "Dificultad (Fácil / Medio / Difícil)",
      "repsText": "Rango sugerido (ej: 3 series de 12 repeticiones)",
      "justification": "Explicación corta en español de por qué es un buen reemplazo y qué trabaja."
    }
  ]
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
  } catch (apiError: any) {
    console.error("Gemini API error in suggestAlternativeExercisesByIA:", apiError);
    throw apiError;
  }
}

export async function analyzeInjuryByIA(
  apiKey: string,
  painDescription: string,
  profile: UserProfile
): Promise<any> {
  const prompt = `Eres un Médico Deportivo e IA de Triaje Fisioterapéutico de Trophia.
El usuario describe la siguiente molestia o dolor físico relacionado con el entrenamiento:
"${painDescription}"

Su perfil deportivo es:
- Nivel de experiencia: ${profile.level}
- Entorno de entrenamiento: ${profile.environment}
- Meta de fitness: ${profile.goal}

Analiza esta molestia de forma rigurosa y empática. Debes responder con recomendaciones profesionales basadas en evidencia.
Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "possibleCauses": ["Causa 1...", "Causa 2..."],
  "exercisesToAvoid": ["Ejercicio a evitar 1...", "Ejercicio a evitar 2..."],
  "safeAlternatives": ["Alternativa segura 1...", "Alternativa segura 2..."],
  "warmupTips": ["Consejo de calentamiento 1...", "Consejo de calentamiento 2..."],
  "medicalWarning": "Texto completo de la advertencia médica en español"
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.8-flash", tier: "pro" });
  } catch (apiError: any) {
    console.error("Gemini API error in analyzeInjuryByIA:", apiError);
    throw apiError;
  }
}

export async function generateGroceryListByIA(
  apiKey: string,
  profile: UserProfile
): Promise<any> {
  const prompt = `Actúas como un Nutricionista y Planificador de Compras Inteligente de Trophia.
El usuario tiene el siguiente perfil nutricional:
- Tipo de dieta: ${profile.dietType || "standard"}
- Calorías objetivo: ${profile.dailyCalorieTarget || 2000} kcal/día
- Reparto de macros objetivo: Proteínas: ${profile.proteinTarget || 140}g, Carbohidratos: ${profile.carbsTarget || 200}g, Grasas: ${profile.fatTarget || 60}g
- Meta de fitness: ${profile.goal}

Genera una lista de compras de supermercado semanal optimizada y equilibrada para cumplir con estas pautas de alimentación y macros. Agrupa los ingredientes por categorías de supermercado realistas (ej: Verdulería y Frutas, Proteínas y Carnes, Lácteos y Derivados, Despensa y Grasas).
Asigna cantidades estimadas lógicas para una persona para toda la semana.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "categories": [
    {
      "name": "Nombre de la categoría (ej: Proteínas y Carnes)",
      "items": [
        {
          "name": "Nombre del ingrediente (ej: Pechuga de pollo)",
          "quantity": "Cantidad recomendada (ej: 1.2 kg)",
          "nutritionalValue": "Aporte principal (ej: Proteína magra de alta calidad)"
        }
      ]
    }
  ]
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
  } catch (apiError: any) {
    console.error("Gemini API error in generateGroceryListByIA:", apiError);
    throw apiError;
  }
}

export async function suggestFoodSubstitutesByIA(
  apiKey: string,
  foodOrIngredient: string,
  dietType: string
): Promise<any> {
  const prompt = `Eres un Experto Nutricionista de la aplicación Trophia.
El usuario quiere reemplazar el siguiente ingrediente o alimento: "${foodOrIngredient}".
Su tipo de dieta es: ${dietType || "standard"}.

Sugiere exactamente 3 alternativas o sustitutos saludables viables que encajen estrictamente con su tipo de dieta (por ejemplo, si es vegano no sugieras miel o lácteos, si es keto mantén los carbohidratos extremadamente bajos).
Para cada alternativa provee:
1. Nombre del sustituto.
2. Proporción o ratio de reemplazo (ej: "1 a 1", "50% de la cantidad original").
3. Beneficio nutricional (por qué es un buen reemplazo y qué aporta).

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "substitutes": [
    {
      "name": "Nombre de la alternativa",
      "ratioText": "Proporción sugerida de reemplazo",
      "benefit": "Explicación corta del beneficio nutricional en español."
    }
  ]
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
  } catch (apiError: any) {
    console.error("Gemini API error in suggestFoodSubstitutesByIA:", apiError);
    throw apiError;
  }
}

// 9. Estimate macros from a text description of a meal or ingredient
export async function estimateMacrosFromDescription(
  apiKey: string,
  description: string
): Promise<any> {
  const prompt = `Analiza la siguiente descripción de un alimento o plato para estimar sus calorías, macronutrientes (proteínas, carbohidratos, grasas), ingredientes estimados y cómo se suele medir/porción estándar (ej: "1 unidad", "1 porción", "100g", "1 rebanada").
  
Descripción del usuario: "${description}"

Estima de forma muy conservadora para evitar subestimar la ingesta calórica.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre limpio del plato o alimento (ej: Huevo frito con tostada)",
  "calories": número (calorías totales estimadas, entero),
  "protein": número (proteínas estimadas en gramos, entero o decimal),
  "carbs": número (carbohidratos estimados en gramos, entero o decimal),
  "fat": número (grasas estimadas en gramos, entero o decimal),
  "servingSize": "Descripción corta de la porción sugerida (ej: 1 plato, 1 rebanada, 1 taza, 1 unidad, 100g)",
  "ingredients": ["ingrediente 1", "ingrediente 2"]
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
}

// 10. Estimate common visual serving sizes for a food item
export async function getVisualServingSizesByIA(
  apiKey: string,
  foodName: string
): Promise<any> {
  const prompt = `Actúas como un experto en nutrición y medición visual de porciones. Para el alimento "${foodName}", determina las formas y medidas caseras/visuales más comunes en las que la gente suele consumirlo al ojo (ej: cucharadas, tazas, unidades, vasos, puñados) y estima el peso aproximado en gramos o mililitros para cada una.
  
Sé extremadamente conciso. Tu respuesta debe ser estrictamente en formato JSON con la siguiente estructura:
{
  "unitType": "g" | "ml",
  "suggestions": [
    { "label": "1 cucharada sopera", "value": 15 },
    { "label": "1 cucharadita", "value": 5 },
    { "label": "1 taza colmada", "value": 150 }
  ]
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
}

// 11. Extract macros and details from a physical nutrition label image using OCR
export async function analyzeNutritionLabelByIA(
  apiKey: string,
  base64Image: string
): Promise<any> {
  const cleanImg = cleanBase64Image(base64Image);
  const prompt = `Actúas como un extractor OCR de tablas de información nutricional para alimentos empaquetados. Analiza la imagen de la etiqueta nutricional proporcionada y extrae con precisión los valores de macronutrientes.
  
IMPORTANTE: Debes normalizar y calcular todos los valores (calorías, proteínas, carbohidratos, grasas) para que estén expresados por cada **100 gramos** (o 100 mililitros si es líquido). Si la tabla del empaque físico muestra los valores por porción (ej: "por porción de 30g"), calcula matemáticamente los valores correspondientes para 100g/ml para estandarizar el resultado.

Requisitos:
- Haz tu mayor esfuerzo por ser preciso basándote en los números y textos visibles.
- Si la información no es legible o no se encuentra, pon 0 en los macros correspondientes.
- Tu respuesta debe ser estrictamente en formato JSON con la siguiente estructura:
{
  "productName": "Nombre o descripción del producto detectado (opcional, en español, ej: Avena Integral, Leche Entera)",
  "calories": número (calorías por 100g en kcal, entero),
  "protein": número (proteínas por 100g en gramos, entero o decimal),
  "carbs": número (carbohidratos por 100g en gramos, entero o decimal),
  "fat": número (grasas por 100g en gramos, entero o decimal),
  "servingSize": "Descripción corta de la porción original sugerida del empaque, ej: 30g o 1 rebanada"
}`;

  return await callGeminiAPI(apiKey, prompt, [cleanImg], { model: "gemini-3.5-flash", tier: "flash" });
}

export interface AnalyzedCommunityProductResult {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  unitWeight?: number;
  unitLabel?: string;
}

// 11b. Analyze product packaging and nutrition table from multiple photos for community database
export async function analyzeCommunityProductPhotosByIA(
  apiKey: string,
  base64Images: string[],
  barcode?: string
): Promise<AnalyzedCommunityProductResult | null> {
  const cleanImages = base64Images.map(img => cleanBase64Image(img));
  const prompt = `Actúas como un experto auditor de alimentos y extractor OCR nutricional de la comunidad fitness Trophia.
Se te han proporcionado 1 o 2 fotos de un producto empaquetado (frente del empaque con marca/nombre, y/o tabla de información nutricional).
${barcode ? `El código de barras escaneado del producto es: ${barcode}` : ""}

Tu objetivo es extraer con la máxima exactitud los datos del producto para ingresarlo a la base de datos comunitaria:
1. "name": Nombre comercial del producto en español (ej: "Leche Entera", "Galletas de Avena con Chía", "Yogur Batido Frutilla").
2. "brand": Marca o fabricante si es visible (ej: "Colun", "Soprole", "Quaker", "Nestlé", "Ideal", "San Jorge"). Si no es evidente, déjalo vacío "".
3. Macronutrientes normalizados por cada **100g** (o 100ml):
   - "calories": Calorías por 100g/ml (en kcal, número entero).
   - "protein": Proteínas por 100g/ml (en gramos, número decimal o entero).
   - "carbs": Carbohidratos disponibles por 100g/ml (en gramos, número decimal o entero).
   - "fat": Grasas totales por 100g/ml (en gramos, número decimal o entero).
   *REGLA OBLIGATORIA: Si la tabla del envase SOLO muestra valores por porción (ej: porción 30g), calcula matemáticamente la regla de tres para expresarlo por 100g.*
4. "servingSize": La porción sugerida oficial del envase (ej: "1 vaso (200 ml)", "2 galletas (30g)", "1 barra (45g)", "1 cucharada (15g)").
5. "unitWeight": Peso en gramos o ml de UNA porción individual (ej: si la porción es 30g, pon 30).
6. "unitLabel": Etiqueta de la porción en singular (ej: "vaso", "galleta", "barra", "rebanada", "porción", "unidad", "pote").

Tu respuesta debe ser estrictamente un objeto JSON válido con esta estructura:
{
  "name": "Nombre descriptivo del producto",
  "brand": "Marca del producto",
  "calories": 0,
  "protein": 0.0,
  "carbs": 0.0,
  "fat": 0.0,
  "servingSize": "1 porción (30g)",
  "unitWeight": 30,
  "unitLabel": "porción"
}`;

  return await callGeminiAPI(apiKey, prompt, cleanImages, { model: "gemini-3.5-flash", tier: "flash" });
}

// 12. Generate smart food suggestions based on remaining macronutrients
export interface SmartFoodSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  reason: string;
  prepTip?: string;
  ingredients?: string[];
  category?: "desayuno" | "almuerzo" | "snack" | "cena" | "cualquiera";
  pantryIngredientsUsed?: string[];
  recommendedPurchases?: string[];
  is100PercentPantry?: boolean;
}

export interface SmartSuggestionsResult {
  pantryNotice?: string;
  pantryStatus: "empty" | "low" | "good";
  suggestions: SmartFoodSuggestion[];
}

export async function getSmartFoodSuggestionsByIA(
  apiKey: string,
  pRemaining: number,
  cRemaining: number,
  fRemaining: number,
  kcalRemaining: number,
  goal: string,
  pantryItems: string[] = [],
  strictPantryOnly = false
): Promise<SmartSuggestionsResult> {
  const pantryList = pantryItems.filter(p => p && p.trim() !== "");
  const pantryCount = pantryList.length;

  let pantryDirective = "";
  if (strictPantryOnly) {
    pantryDirective = `
REGLA CRÍTICA - MODO ESTRICTO DE DESPENSA ACTIVADO:
El usuario ha indicado: "Solo puedo acceder a lo que hay en mi despensa, no puedo comprar nada".
Ingredientes disponibles en su despensa: ${pantryCount > 0 ? pantryList.join(", ") : "Ninguno registrado actualmente"}.
Debes crear 3 opciones deliciosas utilizando ÚNICA Y EXCLUSIVAMENTE los ingredientes de su despensa (puedes asumir agua, sal y condimentos básicos de cocina).
- "is100PercentPantry": true en todas las opciones sugeridas.
- "pantryIngredientsUsed": los ingredientes de la despensa utilizados.
- "recommendedPurchases": [] (array vacío, está prohibido pedir ingredientes adicionales).
`;
  } else {
    pantryDirective = `
PRIORIDAD ABSOLUTA A LA DESPENSA DEL USUARIO:
Ingredientes en la despensa del usuario: ${pantryCount > 0 ? pantryList.join(", ") : "Ninguno registrado actualmente"}.
Instrucciones sobre la despensa:
1. SIEMPRE debes priorizar armar comidas utilizando los ingredientes que el usuario ya tiene en su despensa.
2. Si la despensa tiene muy pocos ingredientes (ej: solo 1, 2 o 3 ingredientes como pollo y huevo), o está vacía:
   - En "pantryNotice", incluye un mensaje amable, transparente y directo en español explicando que tiene pocos alimentos en su despensa (${pantryList.join(', ')}), recomendándole actualizarla o bien indicándole qué comprar para complementarla.
   - En cada sugerencia, especifica en "pantryIngredientsUsed" cuáles ingredientes toma de su despensa y en "recommendedPurchases" qué 1 o 2 ingredientes le recomiendas comprar en el supermercado/almacén para armar un plato más completo o balanceado.
   - Si una opción logra hacerse solo con lo que tiene en su despensa, marca "is100PercentPantry": true y deja "recommendedPurchases": [].
3. Si la despensa tiene suficientes ingredientes:
   - "pantryNotice": "Aprovechando los ingredientes de tu despensa (${pantryList.slice(0, 4).join(', ')}):"
   - Prioriza opciones 100% con su despensa. Si recomiendas algo extra para enriquecer el plato, indícalo en "recommendedPurchases".
`;
  }

  const prompt = `Actúas como un Nutriólogo Deportivo y Chef Experto de Trophia.
El usuario tiene los siguientes requerimientos nutricionales pendientes por consumir HOY:
- Calorías restantes: ${Math.round(kcalRemaining)} kcal
- Proteína restante: ${Math.round(pRemaining)}g
- Carbohidratos restantes: ${Math.round(cRemaining)}g
- Grasas restantes: ${Math.round(fRemaining)}g
- Meta fitness: ${goal === "lose_weight" ? "Definición / Pérdida de peso" : "Volumen / Masa muscular"}

${pantryDirective}

Genera exactamente 3 opciones de comidas o snacks reales, sabrosas y saludables.
Responde estrictamente en formato JSON con la siguiente estructura de objeto:
{
  "pantryNotice": "Mensaje sobre el estado de su despensa o sugerencia de compra/actualización",
  "pantryStatus": "${pantryCount === 0 ? "empty" : pantryCount <= 3 ? "low" : "good"}",
  "suggestions": [
    {
      "name": "Nombre apetecible y descriptivo del plato",
      "calories": 310,
      "protein": 38.0,
      "carbs": 12.0,
      "fat": 10.0,
      "servingSize": "1 plato (ej: 150g pollo + 2 huevos)",
      "reason": "Explicación breve de por qué encaja con sus macros y aprovecha su despensa",
      "prepTip": "Método de preparación rápida en 1 o 2 frases",
      "ingredients": ["150g Pechuga de pollo", "2 Huevos enteros"],
      "category": "almuerzo",
      "pantryIngredientsUsed": ["Pechuga de pollo", "Huevo"],
      "recommendedPurchases": [],
      "is100PercentPantry": true
    }
  ]
}`;

  const raw = await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });

  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.suggestions)) {
      return {
        pantryNotice: raw.pantryNotice || undefined,
        pantryStatus: raw.pantryStatus || (pantryCount === 0 ? "empty" : pantryCount <= 3 ? "low" : "good"),
        suggestions: raw.suggestions
      };
    } else if (Array.isArray(raw)) {
      // Direct array fallback
      return {
        pantryNotice: pantryCount <= 3 
          ? `Tienes ${pantryCount === 0 ? "la despensa vacía" : `pocos ingredientes (${pantryList.join(", ")})`}. Te recomendamos actualizarla o complementar con compras.` 
          : undefined,
        pantryStatus: pantryCount === 0 ? "empty" : pantryCount <= 3 ? "low" : "good",
        suggestions: raw
      };
    }
  }

  return {
    pantryStatus: "good",
    suggestions: []
  };
}

// 13. Consultation with Trophia IA Coach (Fitness, Exercises & Nutrition)
export async function askNutriCoachIA(
  apiKey: string,
  question: string,
  context?: string,
  chatHistory?: { sender: "user" | "coach"; text: string }[]
): Promise<{ answer: string }> {
  let conversationContext = "";
  if (chatHistory && chatHistory.length > 0) {
    const recent = chatHistory.slice(-6);
    conversationContext = `\nHISTORIAL PREVIO DE LA CONVERSACIÓN:\n${recent
      .map(m => `${m.sender === "user" ? "Usuario" : "Trophia Coach"}: ${m.text}`)
      .join("\n")}\n`;
  }

  const prompt = `Actúas como Trophia Coach IA, un Coach Integral de Entrenamiento y Nutrición Deportiva altamente inteligente, empático y basado en evidencia científica.
Cuentas con la información en tiempo real del usuario: su despensa con existencias físicas, su estado de entrenamiento de hoy (rutina asignada, si la empezó, en qué ejercicio va, qué series/pesos ha hecho), su ingesta de calorías y macros de hoy, y sus metas físicas.

Instrucciones de comportamiento y formato:
1. Responde de forma directa, motivadora, concisa y práctica. Evita saludos repetitivos o introducciones largas de relleno.
2. Formato Markdown impecable:
   - Usa negrita (**ejemplo**) para resaltar alimentos, macros clave, tiempos y ejercicios.
   - Usa viñetas limpias (* opción o paso) con un espacio después del asterisco. No mezcles asteriscos triples (***) ni viñetas mal cerradas.
   - Usa subtítulos claros (### Título) para separar secciones si respondes varias partes (ej: ### Tu Pre-Entreno Óptimo, ### Hidratación Clave). Nunca dejes subtítulos vacíos o con solo un número.
3. Si te pregunta sobre qué comer de pre-entreno, post-entreno o qué cocinar: Revisa SIEMPRE su despensa disponible y sus macros restantes de hoy. Prioriza lo que tiene a mano con las cantidades/stock indicadas. Si le recomiendas algo que no está en la despensa, indícalo amablemente como opción alternativa de compra.
4. Si te pregunta sobre su rutina o ejercicios: Responde basándote en su rutina de hoy y los ejercicios que tiene hechos o pendientes. Si está a mitad de su entrenamiento o pregunta por técnica, peso, sobrecarga progresiva o cómo reemplazar un ejercicio, guíalo con precisión anatómica y biomecánica considerando el equipamiento que tiene.
5. Mantén la respuesta ágil, clara y visualmente agradable para pantalla móvil.
6. Ten en cuenta las preguntas o respuestas previas del historial para mantener coherencia en la conversación (por ejemplo, si el usuario hace una pregunta de seguimiento).

${context ? `INFORMACIÓN DEL USUARIO Y ESTADO EN TIEMPO REAL:\n${context}` : ""}
${conversationContext}
Pregunta o mensaje actual del usuario: "${question}"

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "answer": "Tu respuesta detallada, precisa y personalizada en español con formato markdown legible"
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.8-flash", tier: "pro" });
}

// 14. Generate intelligent pre-workout meal or shake recommendation
export interface PreWorkoutRequest {
  timeRemainingMinutes: number;
  trainingType: "hypertrophy" | "cardio" | "recovery";
  formatPreference: "liquid" | "solid";
  nutritionalGoal: "low_cal" | "high_protein" | "high_carb";
  allergies?: string[];
  availableIngredients?: string[];
  restrictToPantryOnly?: boolean;
  extraNotes?: string;
  dietType?: string;
  remainingCalories?: number;
}

export async function generatePreWorkoutSuggestionByIA(
  apiKey: string,
  req: PreWorkoutRequest
): Promise<{
  mealName: string;
  servingSize: string;
  format: "líquido" | "sólido";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredientsUsed: string[];
  instructions: string;
  scientificReason: string;
}> {
  const prompt = `Actúas como un Nutricionista deportivo experto. Recomienda una comida o batido de pre-entrenamiento óptima en base a los siguientes parámetros:
- Tiempo restante hasta el entrenamiento: ${req.timeRemainingMinutes} minutos.
- Tipo/Exigencia del entrenamiento: ${req.trainingType === "hypertrophy" ? "Fuerza / Hipertrofia (pesas)" : req.trainingType === "cardio" ? "Cardio intenso / Resistencia" : "Recuperación activa / Movilidad"}.
- Formato preferido: ${req.formatPreference === "liquid" ? "Líquido o batido (fácil absorción)" : "Comida sólida"}.
- Enfoque nutricional buscado: ${req.nutritionalGoal === "low_cal" ? "Bajo en calorías / Definición" : req.nutritionalGoal === "high_protein" ? "Alto en proteínas" : "Alto en carbohidratos / Carga de energía"}.
- Alergias o restricciones intolerantes a evitar: ${req.allergies && req.allergies.length > 0 ? req.allergies.join(", ") : "Ninguna"}.
- Tipo de dieta: ${req.dietType || "estándar"}.
- Ingredientes disponibles en la despensa del usuario: ${req.availableIngredients && req.availableIngredients.length > 0 ? req.availableIngredients.join(", ") : "Ninguno en específico"}.
- Restricción estricta de despensa: ${req.restrictToPantryOnly ? "SÍ (Obligatorio: Crea la receta usando ÚNICAMENTE ingredientes de la despensa. No inventes ingredientes adicionales)." : "NO (Recomendado: Prioriza la despensa pero puedes añadir ingredientes comunes e indicar si falta algo por comprar)."}.
- Preferencias o detalles extra del usuario: "${req.extraNotes || "Ninguno"}".
- Calorías restantes del día sugeridas: ${req.remainingCalories ? Math.round(req.remainingCalories) : "Sin límite estricto"}.

Reglas científicas que DEBES seguir estrictamente para la recomendación:
1. Si falta menos de 30-45 minutos para entrenar: Recomienda algo muy ligero, preferiblemente líquido o carbohidratos simples rápidos (plátano, fruta, miel). Evita grasas y fibra que causen pesadez.
2. Si faltan 1-2 horas: Recomienda carbohidratos de absorción media-lenta con proteína limpia (ej. avena con proteína en polvo, pan tostado con claras).
3. Si faltan 2-3 horas o más: Recomienda una comida completa y sólida (arroz con pollo, etc.).
4. Si el tipo es Fuerza/Hipertrofia, asegura al menos 15-30g de proteína. Si es Cardio Intenso, prioriza carbohidratos de fácil digestión.
5. Evita cualquier ingrediente que contenga sus alergias (ej: sin lactosa, sin gluten).

Responde estrictamente en formato JSON con la siguiente estructura de datos (en español):
{
  "mealName": "Nombre corto y atractivo de la receta o batido",
  "servingSize": "Porción recomendada (ej: 1 bowl, 1 batido de 350ml, etc.)",
  "format": "líquido o sólido",
  "calories": calorías totales (número entero),
  "protein": gramos de proteína (número entero o decimal),
  "carbs": gramos de carbohidratos (número entero o decimal),
  "fat": gramos de grasa (número entero o decimal),
  "ingredientsUsed": ["ingrediente 1 con cantidad", "ingrediente 2..."],
  "instructions": "Instrucciones de preparación rápida en 2 o 3 frases directas",
  "scientificReason": "Explicación breve de por qué esta combinación es perfecta para el tipo de entrenamiento, tiempo restante, y notas del usuario"
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
}

// 15. Adjust calories burned based on exercise description
export async function adjustSportCaloriesByIA(
  apiKey: string,
  sportLabel: string,
  baselineMet: number,
  durationMinutes: number,
  userWeightKg: number,
  description: string
): Promise<{ adjustedMet: number; caloriesBurned: number; reason: string }> {
  const prompt = `Actúas como un fisiólogo del ejercicio experto de Trophia. El usuario registró una sesión deportiva con los siguientes datos base:
- Deporte/Actividad: ${sportLabel} (MET base de referencia: ${baselineMet}).
- Duración: ${durationMinutes} minutos.
- Peso del usuario: ${userWeightKg} kg.
- Descripción de la intensidad y detalles dada por el usuario: "${description}".

Calcula si el MET real debería ser diferente en base a los detalles de la descripción (por ejemplo, si hizo boxeo pero fue "combate/sparring intenso" el MET podría subir a 9.0 o 10.0; si fue "saco de boxeo relajado" o "técnica", el MET podría bajar a 5.0 o 6.0; si corrió pero fue "trote muy ligero", el MET baja, si fue "carrera de velocidad/sprint", el MET sube).
Calcula las calorías quemadas usando la fórmula científica: Calorías = MET * 0.0175 * Peso (kg) * Duración (minutos).

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "adjustedMet": MET ajustado final (número decimal),
  "caloriesBurned": calorías finales estimadas (número entero),
  "reason": "Explicación concisa en 1 o 2 frases del ajuste de intensidad realizado según su descripción (ej. 'Se reduce el MET de 7.8 a 5.5 porque el golpeo de saco es menos demandante que el combate competitivo')."
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
}

export interface AnalyzedExerciseResult {
  name: string;
  trackingType: "reps" | "time" | "distance";
  defaultSets: number;
  defaultReps: number;
  defaultWeight: number;
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  techniqueTips?: string;
  caloriesBurnedPerSet: number;
  equipmentNeeded?: string;
}

// 16. Analyze single exercise biomechanics, muscles, tracking type and technique tips
export async function analyzeExerciseByIA(
  apiKey: string,
  exerciseName: string,
  equipmentContext?: string[]
): Promise<AnalyzedExerciseResult> {
  const equipStr = equipmentContext && equipmentContext.length > 0 
    ? `Equipamiento disponible en su perfil: ${equipmentContext.join(", ")}` 
    : "";

  const prompt = `Actúas como un fisiólogo del ejercicio y biomecánico deportivo de Trophia.
Analiza biomecánicamente el siguiente ejercicio introducido por el usuario: "${exerciseName}".
${equipStr}

Determina de forma rigurosa y científica:
1. "name": Nombre limpio, profesional y estandarizado del ejercicio en español (ej: "Press de Banca Plano", "Sentadilla Búlgara", "Plancha Frontal Isométrica", "Dominadas Pronas").
2. "trackingType": "reps" (si se entrena contando repeticiones de fuerza como sentadillas, press, dominadas), "time" (si es isométrico o por duración como planchas, paseos del granjero, sentadilla isométrica en pared, saltos de comba), o "distance" (si es de desplazamiento o carrera).
3. "defaultSets": Número recomendado de series (típicamente 3 o 4).
4. "defaultReps": Si trackingType es "reps", repeticiones recomendadas por serie (ej: 8, 10, 12). Si trackingType es "time", segundos recomendados de duración por serie (ej: 30, 45, 60).
5. "defaultWeight": Peso inicial de referencia en kg (ej: 10, 20; o 0 si es calistenia/peso corporal). Si es con mancuernas, debe ser el peso de CADA mancuerna individual (ej: 10 kg significa 10 kg en cada mano, total 20 kg).
6. "primaryMuscles": Array de músculos principales trabajados (ej: ["Pectoral mayor", "Tríceps braquial"]).
7. "secondaryMuscles": Array de músculos sinergistas o estabilizadores (ej: ["Deltoides anterior", "Core"]).
8. "techniqueTips": 2 o 3 indicaciones directas de técnica, alineación postural, respiración y prevención de lesiones (ej: "Retrae escápulas y apoya los pies firmes. Desciende la carga controlando la fase excéntrica sin rebotar.").
9. "caloriesBurnedPerSet": Gasto calórico estimado CONSERVADOR por serie (entre 3 y 8 kcal).
10. "equipmentNeeded": Material requerido (ej: "Mancuernas", "Barra", "Peso corporal", "Polea", "Banda elástica").

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre estándar del ejercicio",
  "trackingType": "reps",
  "defaultSets": 3,
  "defaultReps": 10,
  "defaultWeight": 0,
  "primaryMuscles": ["Músculo principal 1"],
  "secondaryMuscles": ["Músculo secundario 1"],
  "techniqueTips": "Consejos clave de ejecución y seguridad biomecánica",
  "caloriesBurnedPerSet": 5,
  "equipmentNeeded": "Equipamiento"
}`;

  return await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
}

// 17. Batch parse a list or multiline text of exercises
export async function parseExerciseBatchByIA(
  apiKey: string,
  rawText: string,
  equipmentContext?: string[]
): Promise<AnalyzedExerciseResult[]> {
  const equipStr = equipmentContext && equipmentContext.length > 0 
    ? `Equipamiento disponible del usuario: ${equipmentContext.join(", ")}` 
    : "";

  const prompt = `Actúas como un entrenador y analista deportivo de Trophia.
El usuario ha escrito o pegado una lista de ejercicios para su sesión de entrenamiento:
"""
${rawText}
"""
${equipStr}

Tu tarea es descomponer y estructurar cada ejercicio individualmente:
- Si el usuario especificó series, repeticiones o peso en el texto (ej: "Press banca 4x10 con 50kg" o "Plancha 3x45s"), extrae esos valores exactos en defaultSets, defaultReps y defaultWeight.
- Si no especificó números, asigna valores predeterminados seguros y óptimos basados en biomecánica.
- Clasifica con precisión trackingType ("reps" para repeticiones, "time" para ejercicios basados en tiempo en segundos, "distance" para desplazamientos).
- Identifica músculos principales, secundarios, tips de postura y equipamiento.

Responde estrictamente en formato JSON con un arreglo dentro del campo "exercises":
{
  "exercises": [
    {
      "name": "Nombre limpio del ejercicio",
      "trackingType": "reps",
      "defaultSets": 3,
      "defaultReps": 10,
      "defaultWeight": 14,
      "primaryMuscles": ["Pectoral mayor"],
      "secondaryMuscles": ["Tríceps braquial"],
      "techniqueTips": "Instrucciones biomecánicas clave y postura segura",
      "caloriesBurnedPerSet": 5,
      "equipmentNeeded": "Mancuernas"
    }
  ]
}`;

  const res = await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash", tier: "flash" });
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.exercises)) return res.exercises;
  return [];
}

export interface RejectedEquipmentItem {
  input: string;
  reason: string;
  suggestion?: string | null;
}

export interface ValidatedEquipmentResult {
  validEquipment: string[];
  rejectedItems: RejectedEquipmentItem[];
}

// 18. Validate and parse custom exercise equipment or machines with AI
export async function validateAndParseCustomEquipmentByIA(
  apiKey: string,
  userInput: string,
  existingList: string[] = []
): Promise<ValidatedEquipmentResult> {
  const prompt = `Actúas como un perito deportivo e inspector de biomecánica y equipamiento de gimnasio, calistenia y entrenamiento físico para la aplicación Trophia.
El usuario ha introducido texto para agregar nuevos elementos, accesorios o máquinas a su lista de equipamiento disponible:
"""
${userInput}
"""

Equipamiento que ya está disponible o seleccionado (para evitar duplicados redundantes):
${existingList.length > 0 ? existingList.join(", ") : "Ninguno aún"}

Tu misión:
1. Divide y analiza cada elemento introducido (puede venir separado por comas, saltos de línea o texto continuo).
2. Para CADA elemento:
   - Determina con criterio estricto si es un OBJETO REAL Y LEGÍTIMO DE ENTRENAMIENTO FÍSICO (por ejemplo: máquinas de gimnasio, pesas rusas / kettlebells, mancuernas, barras olímpicas, poleas, bandas de resistencia, TRX, anillas, colchoneta, banco reclinable, comba / soga, chaleco lastrado, ab roller, parallettes, etc.).
   - Si SÍ es un elemento válido de ejercicio:
     * Normaliza y formatea su nombre con capitalización limpia y profesional en español (ej: "Kettlebell / Pesa rusa", "Sistema de Suspensión TRX", "Máquina de Prensa Hack").
     * Si es idéntico o sinónimo exacto de algo que ya figura en la lista de equipamiento disponible, descártalo para no duplicar.
     * Si es un elemento válido y no está repetido, agrégalo al arreglo "validEquipment".
   - Si NO es un elemento de ejercicio físico (por ejemplo, si el usuario escribe cosas irrelevantes como "plátano", "teclado", "computadora", "auto", "pizza", "zapato", "televisor", "perro", "mesa", "cerveza", etc.):
     * DESCÁRTALO absolutamente de "validEquipment".
     * Agrégalo al arreglo "rejectedItems".
     * En "reason", explica amablemente y con claridad por qué no es apto (ej: "'Plátano' es un alimento, no una máquina o implemento de ejercicio físico.").
     * En "suggestion", si sospechas que pudo ser un error tipográfico o fonético de un accesorio deportivo real, sugiere el implemento adecuado (ej: si escribió "banco de pres" -> "Banco plano de press", si escribió "cuerda" -> "Cuerda para saltar / Comba"). Si no tiene ninguna relación con el fitness, deja null.

Responde estrictamente en formato JSON con la siguiente estructura:
{
  "validEquipment": [
    "Nombre normalizado 1"
  ],
  "rejectedItems": [
    {
      "input": "palabra o frase introducida",
      "reason": "Explicación del rechazo",
      "suggestion": "Implemento deportivo al que pudo referirse o null"
    }
  ]
}`;

  try {
    const res = await callGeminiAPI(apiKey, prompt, undefined, { model: "gemini-3.5-flash-lite", tier: "flash-lite" });
    return {
      validEquipment: Array.isArray(res?.validEquipment) ? res.validEquipment : [],
      rejectedItems: Array.isArray(res?.rejectedItems) ? res.rejectedItems : []
    };
  } catch (error) {
    console.error("Error validating custom equipment by IA:", error);
    // Graceful fallback: basic cleanup if offline
    const rawTokens = userInput.split(/[,;\n]+/).map(s => s.trim()).filter(s => s.length >= 2);
    const valid = rawTokens.filter(t => !existingList.some(e => e.toLowerCase() === t.toLowerCase()));
    return {
      validEquipment: valid,
      rejectedItems: []
    };
  }
}

