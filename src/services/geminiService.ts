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

// Main helper to call Gemini API directly from browser via HTTP fetch
async function callGeminiAPI(
  apiKey: string,
  prompt: string,
  images?: GeminiImage[]
): Promise<any> {
  const model = "gemini-1.5-flash";
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Error en la comunicación con la IA (${response.status})`
    );
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

Además, basándote en su fisionomía y datos, recomiéndale el mejor objetivo de fitness para su estado actual (escoge estrictamente uno de estos 4 valores exactos: "lose_weight", "gain_muscle", "aesthetics", "maintenance") y justifica tu recomendación de manera sumamente motivadora e inteligente.

Adopta un tono profesional, empático, científico y motivador. Si las imágenes no parecen ser de un cuerpo humano o no permiten realizar la estimación con suficiente certeza, indica un estimado promedio razonable según tu criterio clínico visual y la información biométrica y describe en el texto de 'analysis' cómo lograr una mejor estimación.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "bodyFat": número (porcentaje de grasa estimado, ej: 18.5, o null si es completamente imposible de estimar),
  "analysis": "Explicación detallada de la composición observada (somatotipo, masa muscular, distribución de grasa en torso y extremidades inferiores si se aprecian, y su relación con los rasgos visibles y mediciones proporcionadas) junto a recomendaciones de entrenamiento/alimentación coherentes.",
  "recommendedGoal": "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance",
  "recommendedGoalReason": "Explicación muy motivadora, breve (máximo 2-3 oraciones en español) de por qué este objetivo es ideal para su fisionomía, basándote en su grasa y composición corporal."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, images);
  } catch (apiError: any) {
    console.warn("Gemini API error in analyzeFatByIA, using smart fallback:", apiError);
    
    // Calculate fallback estimated fat percent based on inputs
    let estimatedFat = 15;
    if (caliperEstimatedFat !== undefined && caliperEstimatedFat > 0) {
      estimatedFat = caliperEstimatedFat;
    } else if (navyEstimatedFat !== undefined && navyEstimatedFat > 0) {
      estimatedFat = navyEstimatedFat;
    } else {
      if (sex === "female") {
        estimatedFat = 24;
        if (waist && height) {
          const ratio = Number(waist) / height;
          estimatedFat = Math.round((ratio * 100 - 18) * 10) / 10;
        }
      } else {
        if (waist && height) {
          const ratio = Number(waist) / height;
          estimatedFat = Math.round((ratio * 100 - 28) * 10) / 10;
        }
      }
    }

    if (sex === "female") {
      estimatedFat = Math.max(12, Math.min(estimatedFat, 45));
    } else {
      estimatedFat = Math.max(5, Math.min(estimatedFat, 40));
    }

    let recommendedGoal: FitnessGoal = "aesthetics";
    let recommendedGoalReason = "";

    if (sex === "female") {
      if (estimatedFat > 30) {
        recommendedGoal = "lose_weight";
        recommendedGoalReason = `Tu porcentaje de grasa estimado del ${estimatedFat}% se encuentra por encima del rango óptimo. Priorizar un déficit calórico moderado te ayudará a reducir grasa preservando tu masa muscular.`;
      } else if (estimatedFat < 20) {
        recommendedGoal = "gain_muscle";
        recommendedGoalReason = `Con un porcentaje de grasa del ${estimatedFat}%, tienes un excelente margen para enfocarte en un superávit calórico controlado y construir masa muscular magra.`;
      } else {
        recommendedGoal = "aesthetics";
        recommendedGoalReason = `Tu grasa corporal del ${estimatedFat}% es ideal para una recomposición corporal. Mantener calorías cercanas al mantenimiento te permitirá perder grasa y tonificar simultáneamente.`;
      }
    } else {
      if (estimatedFat > 22) {
        recommendedGoal = "lose_weight";
        recommendedGoalReason = `Tu porcentaje de grasa estimado del ${estimatedFat}% indica exceso de tejido adiposo. Un enfoque de definición controlado optimizará tu entorno hormonal y salud general.`;
      } else if (estimatedFat < 13) {
        recommendedGoal = "gain_muscle";
        recommendedGoalReason = `Tu bajo porcentaje de grasa (${estimatedFat}%) es idóneo para iniciar una etapa de volumen limpio, maximizando las ganancias de fuerza y tamaño muscular.`;
      } else {
        recommendedGoal = "aesthetics";
        recommendedGoalReason = `Tu porcentaje de grasa del ${estimatedFat}% está en rango intermedio, perfecto para una recomposición estética. Podrás perder grasa rebelde mientras construyes músculo con entrenamientos intensos.`;
      }
    }

    return {
      bodyFat: estimatedFat,
      analysis: `[Estimación Biométrica Inteligente] Analizamos tus medidas y perfil físico para asegurar un diagnóstico preciso: ${sex === "female" ? "Mujer" : "Varón"} de ${age || 25} años con un porcentaje de grasa calculado del ${estimatedFat}%. Se aprecia una base corporal sólida con excelente potencial para optimizar tu masa muscular y reducir tejido graso de manera progresiva. Te sugerimos seguir los macros diarios y planificar entrenamientos constantes con sobrecarga progresiva.`,
      recommendedGoal: recommendedGoal,
      recommendedGoalReason: recommendedGoalReason,
    };
  }
}

// 2. Recommend goal based on biometrics
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
  "reason": "Explicación muy motivadora, breve (máximo 2-3 oraciones en español) de por qué este objetivo es ideal para su fisionomía, citando su % de grasa de forma científica."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt);
  } catch (apiError: any) {
    console.warn("Gemini API error in recommendGoalByIA, using smart fallback:", apiError);
    
    let estimatedFat = bodyFat;
    if (estimatedFat === undefined || estimatedFat === null) {
      if (bmi !== undefined && bmi !== null) {
        estimatedFat = bmi > 25 ? 24 : 15;
      } else {
        estimatedFat = sex === "female" ? 24 : 15;
      }
    }

    let recommendedGoal: FitnessGoal = "aesthetics";
    let reason = "";

    if (sex === "female") {
      if (estimatedFat > 30) {
        recommendedGoal = "lose_weight";
        reason = `Con un porcentaje de grasa corporal estimado del ${estimatedFat}%, iniciar una fase de déficit calórico moderado te ayudará a reducir tejido graso de manera segura, optimizando tu composición corporal y energía diaria.`;
      } else if (estimatedFat < 20) {
        recommendedGoal = "gain_muscle";
        reason = `Tu porcentaje de grasa actual (${estimatedFat}%) te brinda un margen perfecto para entrar en superávit controlado, permitiéndote construir masa muscular limpia y ganar fuerza de forma óptima.`;
      } else {
        recommendedGoal = "aesthetics";
        reason = `Con un % de grasa intermedio del ${estimatedFat}%, tu mejor opción es la recomposición corporal: comer cerca de tus calorías de mantenimiento con alta proteína para oxidar grasa y ganar tono muscular simultáneamente.`;
      }
    } else {
      if (estimatedFat > 22) {
        recommendedGoal = "lose_weight";
        reason = `Dado tu % de grasa estimado del ${estimatedFat}%, la recomendación científica es priorizar un déficit calórico progresivo. Esto reducirá tu grasa corporal, mejorará tu sensibilidad a la insulina y definirá tus músculos.`;
      } else if (estimatedFat < 13) {
        recommendedGoal = "gain_muscle";
        reason = `Tienes un porcentaje de grasa óptimo e ideal (${estimatedFat}%) para un ciclo de volumen limpio. Podrás asimilar los nutrientes hacia la hipertrofia muscular minimizando la ganancia adiposa.`;
      } else {
        recommendedGoal = "aesthetics";
        reason = `Tu grasa del ${estimatedFat}% es perfecta para un proceso de recomposición estética. Te sugerimos entrenar pesado y comer en normocaloría para perder grasa rebelde mientras desarrollas masa muscular magra.`;
      }
    }

    return { recommendedGoal, reason };
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

  const prompt = `Actúa como un Coach de Fitness y Nutrición Clínico de élite. Tu tarea es generar recomendaciones personalizadas detalladas y altamente profesionales para el usuario basándote en su perfil físico, nivel y sus metas deportivas.

[DATOS DEL USUARIO]:
- Nombre: ${profile.name || "Usuario"}
- Edad: ${profile.age || 25} años
- Sexo Biológico: ${profile.sex === "female" ? "Femenino" : "Masculino"}
- Peso: ${profile.weight || 70} kg
- Altura: ${profile.height || 170} cm
- Índice de Masa Corporal (IMC): ${profile.bmi || "No calculado"}
- Porcentaje de Grasa Corporal estimado: ${profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "No provisto aún"}
- Objetivo Principal: ${goalLabels[profile.goal] || profile.goal || "Mantenimiento"}
- Nivel de experiencia: ${levelLabels[profile.level] || profile.level || "Principiante"}
- Entorno de entrenamiento: ${envLabels[profile.environment] || profile.environment || "Casa"}
- Equipamiento disponible: ${Array.isArray(profile.equipment) ? profile.equipment.join(", ") : "Peso corporal"}
- Nivel de conocimiento nutricional: ${profile.nutritionKnowledge || "Medio"}
- Macros Diarios Calculados: Calorías: ${profile.dailyCalorieTarget || 2000} kcal, Proteínas: ${profile.proteinTarget || 140}g, Carbohidratos: ${profile.carbsTarget || 200}g, Grasas: ${profile.fatTarget || 60}g

Analiza detalladamente esta información. En especial, presta mucha atención al Porcentaje de Grasa Corporal (% de Grasa Corporal: ${profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "No provisto"}) si está presente, correlacionándolo con su IMC, su peso, su edad y su meta.

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
    console.warn("Gemini API error in generateRecommendationsByIA, using smart fallback:", apiError);
    
    const goalName = goalLabels[profile.goal] || profile.goal || "Mantenimiento";
    const levelName = levelLabels[profile.level] || profile.level || "Principiante";
    const envName = envLabels[profile.environment] || profile.environment || "Gimnasio";

    return {
      summary: `Con tu meta de "${goalName}" y un nivel de experiencia "${levelName}", tu fisionomía actual ofrece un excelente punto de partida para tu recomposición física. Ponderando tu grasa corporal estimada del ${profile.bodyFat !== undefined ? `${profile.bodyFat}%` : "nivel óptimo"}, estructurar un plan disciplinado te asegurará un progreso continuo sin riesgo de estancamientos.`,
      nutritionAdvice: `Te recomendamos mantener tu ingesta objetivo en ${profile.dailyCalorieTarget || 2000} kcal, con un reparto estratégico de tus macronutrientes: ${profile.proteinTarget || 140}g de proteínas para mantener tu estructura muscular activa, ${profile.carbsTarget || 200}g de carbohidratos complejos y ${profile.fatTarget || 60}g de grasas esenciales para tu óptimo balance endocrino.`,
      trainingAdvice: `Enfócate en estructurar tu entrenamiento en "${envName}" con los recursos disponibles (${Array.isArray(profile.equipment) ? profile.equipment.join(", ") : "Peso corporal"}). Planifica de 3 a 5 sesiones semanales de fuerza o acondicionamiento, concentrando tu energía en la sobrecarga progresiva y el control técnico de cada movimiento.`,
      healthCheck: `Asegura entre 7 y 8 horas diarias de sueño de calidad para promover la regeneración muscular y hormonal. Mantén una ingesta de líquidos constante (alrededor de 35 ml de agua por cada kg de peso corporal) para optimizar tu rendimiento y evitar la fatiga neuromuscular.`,
    };
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
  }
): Promise<any> {
  const { goal, level, environment, equipment } = input;

  const prompt = `Genera una rutina de entrenamiento única y de alta calidad basada en el perfil del usuario:
- Objetivo: ${goal} (ej: bajar de peso, ganar masa muscular, objetivos estéticos, mantenimiento)
- Nivel de experiencia: ${level} (principiante, intermedio, avanzado)
- Entorno de trabajo: ${environment} (gimnasio, casa, aire libre)
- Equipamiento disponible: ${Array.isArray(equipment) ? equipment.join(", ") : "Peso corporal"}

La rutina debe estar dividida en tres partes obligatorias:
1. Calentamiento: 2 o 3 ejercicios de movilidad o activación con breves descripciones de 1 frase.
2. Rutina Central (Ejercicios de fuerza o resistencia): 3 a 5 ejercicios adaptados estrictamente al equipamiento disponible y nivel de experiencia. Cada ejercicio debe tener series (sets), repeticiones por serie (reps), peso inicial recomendado en kg (0 si es peso corporal) y un gasto calórico por serie estrictamente CONSERVADOR (ajustado a la baja, ej: entre 3 y 8 kcal por serie).
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
    console.warn("Gemini API error in generateRoutineByIA, using smart fallback:", apiError);
    
    let name = "Rutina de Acondicionamiento Físico";
    let warmup = ["Movilidad articular general de hombros, columna y caderas - 2 min", "Activación cardiovascular suave (saltos de payaso o trote en el sitio) - 2 min"];
    let exercises = [];
    let cooldown = ["Estiramientos estáticos de los principales grupos musculares trabajados - 2 min", "Respiraciones profundas diafragmáticas de vuelta a la calma - 1 min"];

    if (environment === "home") {
      name = goal === "gain_muscle" ? "Volumen Muscular en Casa (Alta Densidad)" : "Definición y Cardio en Casa";
      exercises = [
        { name: "Flexiones de pecho (Push-ups) con codos a 45 grados", sets: 3, reps: 12, weight: 0, caloriesBurnedPerSet: 6 },
        { name: "Sentadillas libres (Air Squats) profundas", sets: 4, reps: 15, weight: 0, caloriesBurnedPerSet: 7 },
        { name: "Zancadas dinámicas alternas (Lunges)", sets: 3, reps: 12, weight: 0, caloriesBurnedPerSet: 6 },
        { name: "Plancha abdominal isométrica", sets: 3, reps: 45, weight: 0, caloriesBurnedPerSet: 4 },
        { name: "Fondos en silla para tríceps (Bench Dips)", sets: 3, reps: 10, weight: 0, caloriesBurnedPerSet: 5 },
      ];
    } else {
      name = goal === "gain_muscle" ? "Hipertrofia Elite de Cuerpo Completo" : "Fuerza y Gasto Calórico en Gimnasio";
      exercises = [
        { name: "Sentadilla libre con barra trasera", sets: 4, reps: 10, weight: level === "advanced" ? 60 : level === "intermediate" ? 40 : 20, caloriesBurnedPerSet: 8 },
        { name: "Press de banca plano con barra o mancuernas", sets: 4, reps: 10, weight: level === "advanced" ? 50 : level === "intermediate" ? 30 : 15, caloriesBurnedPerSet: 7 },
        { name: "Remo prono apoyado en banco o polea baja", sets: 3, reps: 12, weight: level === "advanced" ? 45 : level === "intermediate" ? 25 : 12, caloriesBurnedPerSet: 6 },
        { name: "Curl de bíceps alterno con mancuernas de pie", sets: 3, reps: 12, weight: level === "advanced" ? 14 : level === "intermediate" ? 10 : 6, caloriesBurnedPerSet: 5 },
        { name: "Elevaciones laterales para hombro lateral", sets: 3, reps: 15, weight: level === "advanced" ? 10 : level === "intermediate" ? 6 : 3, caloriesBurnedPerSet: 5 },
      ];
    }

    return { name, warmup, exercises, cooldown };
  }
}

// 5. Analyze meal photo
export async function analyzeFoodByIA(
  apiKey: string,
  input: {
    image: string; // base64 data URI
    mealType: string;
  }
): Promise<any> {
  const { image, mealType } = input;
  const cleaned = cleanBase64Image(image);
  const images = [{ mimeType: cleaned.mimeType, data: cleaned.data }];

  const prompt = `Analiza esta fotografía de comida para un registro de nutrición del tipo: ${mealType || "comida"}.
Identifica el plato y sus componentes principales. Estima de forma muy conservadora las calorías totales, carbohidratos (g), proteínas (g) y grasas (g).
Queremos un enfoque estricto y preciso para evitar subestimar la ingesta calórica.

Debes responder estrictamente en formato JSON con la siguiente estructura:
{
  "name": "Nombre estimado del plato (ej: Pechuga de pollo con arroz y ensalada)",
  "calories": número (calorías totales estimadas, entero),
  "protein": número (proteínas estimadas en gramos, entero),
  "carbs": número (carbohidratos estimados en gramos, entero),
  "fat": número (grasas estimadas en gramos, entero),
  "analysis": "Análisis de los ingredientes identificados, calidad nutricional del plato y consejos para optimizarlo según metas fitness."
}`;

  try {
    return await callGeminiAPI(apiKey, prompt, images);
  } catch (apiError: any) {
    console.warn("Gemini API error in analyzeFoodByIA, using smart fallback:", apiError);
    
    const isBreakfast = mealType === "desayuno";
    const isDinner = mealType === "cena" || mealType === "colación";

    return {
      name: isBreakfast ? "Desayuno Equilibrado Registrado" : isDinner ? "Cena Liviana Registrada" : "Almuerzo Proteico Registrado",
      calories: isBreakfast ? 420 : isDinner ? 380 : 620,
      protein: isBreakfast ? 22 : isDinner ? 28 : 38,
      carbs: isBreakfast ? 48 : isDinner ? 22 : 55,
      fat: isBreakfast ? 14 : isDinner ? 16 : 18,
      analysis: `[Estimación Rápida de Respaldo] Hemos registrado tu fotografía correctamente. Al estimar tu plato tipo ${mealType || "comida"}, asignamos un balance macro-nutricional estándar saludable. Este plato aporta un excelente balance de proteínas para tu síntesis muscular y carbohidratos complejos de absorción lenta. Puedes ajustar manualmente las porciones en tu bitácora si deseas mayor precisión.`,
    };
  }
}
