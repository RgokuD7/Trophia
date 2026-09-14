import { UserProfile, FitnessGoal, ExperienceLevel, TrainingEnvironment } from "../types";

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

// Main helper to call Gemini API directly from browser via HTTP fetch
async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  images?: GeminiImage[]
): Promise<any> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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

  let response;
  try {
    response = await fetch(url, {
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
    });
  } catch (netError: any) {
    console.error("Network error calling Gemini:", netError);
    throw new Error("No hay conexión a internet. Revisa tu red y vuelve a intentarlo.");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const rawMessage = errorData?.error?.message || `Error en la comunicación con la IA (${response.status})`;
    throw new Error(cleanErrorMessage(rawMessage, response.status));
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No se recibió respuesta del modelo de IA.");
  }
  
  try {
    return JSON.parse(text.trim());
  } catch (parseError) {
    console.error("Failed to parse JSON response from Gemini:", text);
    throw new Error("La respuesta de la IA no tiene un formato JSON válido.");
  }
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
    return await callGeminiAPI(apiKey, prompt, images);
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
    return await callGeminiAPI(apiKey, prompt);
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
    return await callGeminiAPI(apiKey, prompt);
  } catch (apiError: any) {
    console.error("Gemini API error in generateRecommendationsByIA:", apiError);
    throw apiError;
  }
}

// 4. Generate Workout Routine
export async function generateRoutineByIA(
  apiKey: string,
  input: {
    goal: FitnessGoal;
    level: ExperienceLevel;
    environment: TrainingEnvironment;
    equipment: string[];
    jointPainAreas?: ("knee" | "back" | "shoulder")[];
    requiresMedicalClearance?: boolean;
  }
): Promise<any> {
  const { goal, level, environment, equipment, jointPainAreas = [], requiresMedicalClearance } = input;

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

  const prompt = `Genera una rutina de entrenamiento única y de alta calidad basada en el perfil del usuario:
- Objetivo: ${goal} (ej: bajar de peso, ganar masa muscular, objetivos estéticos, mantenimiento)
- Nivel de experiencia (Edad de entrenamiento): ${level} (principiante, intermedio, avanzado)
- Entorno de trabajo: ${environment} (gimnasio, casa, aire libre)
- Equipamiento disponible: ${Array.isArray(equipment) ? equipment.join(", ") : "Peso corporal"}${safetyInstructions}

Lógica de Volumen y Capacidad Física a respetar:
1. Reglas de series semanales por músculo: Principiante (4-10 series/semana), Intermedio (10-16 series/semana), Avanzado (14-22 series/semana).
2. Regla de las 11 series: No concentres más de 8-10 series para el mismo grupo muscular en una única sesión para evitar volumen basura. Si es mayor, repártelo.
3. Tope por sesión: No programes más de 30 series de trabajo total en una única sesión sumando todos los ejercicios.
4. Escala decimal de compuestos: Un Press de banca cuenta como 1.0 Pecho, 0.5 Deltoides Anterior y 0.5 Tríceps en fatiga acumulada. Ajusta el aislamiento final en consecuencia para evitar sobreentrenamiento local.

La rutina debe estar dividida en tres partes obligatorias:
1. Calentamiento: 2 o 3 ejercicios de movilidad o activación con breves descripciones de 1 frase.
2. Rutina Central (Ejercicios de fuerza o resistencia): 3 a 5 ejercicios adaptados estrictamente al equipamiento disponible, nivel de experiencia y restricciones de salud. Cada ejercicio debe tener series (sets), repeticiones por serie (reps), peso inicial recomendado en kg (0 si es peso corporal) y un gasto calórico por serie estrictamente CONSERVADOR (ajustado a la baja, ej: entre 3 y 8 kcal por serie).
3. Enfriamiento: 2 o 3 estiramientos o ejercicios de vuelta a la calma de 1 frase.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Título creativo y motivacional del entrenamiento (ej: Empuje Poderoso en Casa, HIIT Quema Grasa Extremo)",
  "warmup": ["Descripción de ejercicio de calentamiento 1", "Descripción de ejercicio de calentamiento 2"],
  "exercises": [
    {
      "name": "Nombre preciso del ejercicio",
      "sets": número de series (entero, ej: 3 o 4),
      "reps": número de repeticiones (entero, ej: 10 o 15),
      "weight": peso inicial recomendado en kg (número, ej: 12),
      "caloriesBurnedPerSet": número estimado conservador de kcal por serie (número, ej: 5)
    }
  ],
  "cooldown": ["Descripción de estiramiento de enfriamiento 1", "Descripción de estiramiento de enfriamiento 2"]
}`;

  try {
    return await callGeminiAPI(apiKey, prompt);
  } catch (apiError: any) {
    console.error("Gemini API error in generateRoutineByIA:", apiError);
    throw apiError;
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

  // No custom fallback, let the error bubble up so the UI displays it properly and prompts the user to save/retry.
  return await callGeminiAPI(apiKey, prompt, images);
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
    return await callGeminiAPI(apiKey, prompt);
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
    return await callGeminiAPI(apiKey, prompt);
  } catch (apiError: any) {
    console.error("Gemini API error in adjustLoggedMealByChatByIA:", apiError);
    throw apiError;
  }
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
    return await callGeminiAPI(apiKey, prompt);
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
    return await callGeminiAPI(apiKey, prompt);
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
    return await callGeminiAPI(apiKey, prompt);
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
    return await callGeminiAPI(apiKey, prompt);
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

  return await callGeminiAPI(apiKey, prompt);
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

  return await callGeminiAPI(apiKey, prompt);
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

  return await callGeminiAPI(apiKey, prompt, [cleanImg]);
}

// 12. Generate smart food suggestions based on remaining macronutrients
export async function getSmartFoodSuggestionsByIA(
  apiKey: string,
  pRemaining: number,
  cRemaining: number,
  fRemaining: number,
  kcalRemaining: number,
  goal: string
): Promise<{ name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: string; reason: string }[]> {
  const prompt = `Actúas como un Nutriólogo Deportivo experto. El usuario tiene los siguientes macronutrientes y calorías restantes por consumir HOY:
- Calorías restantes: ${Math.round(kcalRemaining)} kcal
- Proteína restante: ${Math.round(pRemaining)}g
- Carbohidratos restantes: ${Math.round(cRemaining)}g
- Grasas restantes: ${Math.round(fRemaining)}g
- Meta fitness: ${goal === "lose_weight" ? "Definición / Pérdida de peso" : "Volumen / Ganancia de masa muscular"}

Sugiere exactamente 3 opciones de alimentos o snacks reales y saludables (ej: "Yogur griego con nueces", "Pechuga de pavo", etc.) que se ajusten a estas necesidades. Explica brevemente por qué es una buena opción en 1 frase.

Responde estrictamente en formato JSON con la siguiente estructura de array:
[
  {
    "name": "Nombre de la opción de comida o snack",
    "calories": calorías en kcal (número entero),
    "protein": gramos de proteína (número entero o decimal),
    "carbs": gramos de carbohidratos (número entero o decimal),
    "fat": gramos de grasa (número entero o decimal),
    "servingSize": "Cantidad sugerida (ej: 150g o 2 rebanadas)",
    "reason": "Explicación corta de por qué calza bien con sus macros"
  }
]`;

  return await callGeminiAPI(apiKey, prompt);
}

// 13. Nutritional consultation with Trophia IA Nutri-Coach
export async function askNutriCoachIA(
  apiKey: string,
  question: string,
  context?: string
): Promise<{ answer: string }> {
  const prompt = `Actúas como Trophia IA, un Coach Nutricional experto, empático e inteligente. 
Responde de forma directa, concisa y basada en ciencia. Evita introducciones largas o saludos repetitivos. Limita tu respuesta a un máximo de 3 párrafos o puntos clave legibles.
${context ? `Contexto del perfil del usuario: ${context}` : ""}

Pregunta del usuario: "${question}"

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "answer": "Tu respuesta detallada y profesional aquí en español"
}`;

  return await callGeminiAPI(apiKey, prompt);
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

  return await callGeminiAPI(apiKey, prompt);
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

  return await callGeminiAPI(apiKey, prompt);
}
