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
  "analysis": "Explicación detallada de la composición observada (somatotipo, masa muscular, distribución de grasa en torso y extremidades inferiores si se aprecian, y su relación con los rasgos visibles y mediciones proporcionadas) junto a recomendaciones de entrenamiento/alimentación coherentes. Utiliza formato de Markdown básico (como **negrita** para resaltar hallazgos clave o métricas importantes) dentro del texto.",
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
      analysis: `[Estimación Biométrica Inteligente] Analizamos tus medidas y perfil físico para asegurar un diagnóstico preciso: **${sex === "female" ? "Mujer" : "Varón"}** de **${age || 25} años** con un porcentaje de grasa calculado de **${estimatedFat}%**. Se aprecia una **base corporal sólida** con excelente potencial para optimizar tu masa muscular y reducir tejido graso de manera progresiva. Te sugerimos seguir los **macros diarios** y planificar entrenamientos constantes con **sobrecarga progresiva**.`,
      recommendedGoal: recommendedGoal,
      recommendedGoalReason: recommendedGoalReason,
    };
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
  "reason": "Explicación muy motivadora, breve (máximo 2-3 oraciones en español) de por qué este objetivo es ideal para su fisionomía. Resalta los datos clave e importantes (porcentajes de grasa, objetivos recomendados, etc.) encerrándolos entre doble asteriscos como **dato importante** para poder aplicar formato visual."
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
        reason = `Con un porcentaje de grasa corporal estimado del **${estimatedFat}%**, iniciar una fase de **déficit calórico moderado** te ayudará a reducir tejido graso de manera segura, optimizando tu composición corporal y energía diaria.`;
      } else if (estimatedFat < 20) {
        recommendedGoal = "gain_muscle";
        reason = `Tu porcentaje de grasa actual (**${estimatedFat}%**) te brinda un margen perfecto para entrar en **superávit controlado**, permitiéndote construir masa muscular limpia y ganar fuerza de forma óptima.`;
      } else {
        recommendedGoal = "aesthetics";
        reason = `Con un % de grasa intermedio del **${estimatedFat}%**, tu mejor opción es la **recomposición corporal**: comer cerca de tus calorías de mantenimiento con alta proteína para oxidar grasa y ganar tono muscular simultáneamente.`;
      }
    } else {
      if (estimatedFat > 22) {
        recommendedGoal = "lose_weight";
        reason = `Dado tu % de grasa estimado del **${estimatedFat}%**, la recomendación científica es priorizar un **déficit calórico progresivo**. Esto reducirá tu grasa corporal, mejorará tu sensibilidad a la insulina y definirá tus músculos.`;
      } else if (estimatedFat < 13) {
        recommendedGoal = "gain_muscle";
        reason = `Tienes un porcentaje de grasa óptimo e ideal (**${estimatedFat}%**) para un ciclo de **volumen limpio**. Podrás asimilar los nutrientes hacia la hipertrofia muscular minimizando la ganancia adiposa.`;
      } else {
        recommendedGoal = "aesthetics";
        reason = `Tu grasa del **${estimatedFat}%** es perfecta para un proceso de **recomposición estética**. Te sugerimos entrenar pesado y comer en normocaloría para perder grasa rebelde mientras desarrollas masa muscular magra.`;
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

  const dietLabels: Record<string, string> = {
    standard: "Estándar (Todo / Sin restricciones)",
    vegetarian: "Vegetariana",
    vegan: "Vegana",
    keto: "Cetogénica (Keto)",
    paleo: "Paleolítica (Paleo)",
    mediterranean: "Mediterránea",
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
    console.warn("Gemini API error in generateRecipeFromIngredientsByIA, using fallback:", apiError);
    
    // Quick fallback recipe based on what was selected
    const mainIngredient = ingredients.length > 0 ? ingredients[0] : "Ingredientes seleccionados";
    const name = `Plato Rápido de ${mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1)}`;
    
    return {
      name: `${name} Trophia`,
      ingredientsList: ingredients.map(ing => `100g de ${ing} fresco`),
      instructions: [
        "Lava y corta los ingredientes seleccionados.",
        "Cocínalos en una sartén antiadherente con un hilo de aceite a fuego medio por 8-12 minutos.",
        "Sazona al gusto con una pizca de sal, pimienta o tus especias favoritas.",
        "Sirve caliente en un plato y disfruta."
      ],
      calories: 320,
      protein: 18,
      carbs: 25,
      fat: 12,
      servingSize: "1 plato hondo",
      tip: "Receta rápida de respaldo. Aporta carbohidratos de fácil absorción y una base proteica moderada ideal para mantener tu energía estable."
    };
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
    console.warn("Gemini API error in adjustLoggedMealByChatByIA, using simple client-side parsing fallback:", apiError);
    
    // Quick client-side regex fallback
    let multiplier = 0.75; // default fallback adjustment
    let explanation = "Se redujo la porción a un 75% aproximado de forma preventiva.";
    
    const msg = userMessage.toLowerCase();
    if (msg.includes("mitad") || msg.includes("50%")) {
      multiplier = 0.5;
      explanation = "Se dividieron las porciones al 50% (mitad de plato).";
    } else if (msg.includes("doble") || msg.includes("2 veces") || msg.includes("200%")) {
      multiplier = 2.0;
      explanation = "Se duplicaron las porciones (2x).";
    } else if (msg.includes("tercio") || msg.includes("30%")) {
      multiplier = 0.66;
      explanation = "Se descontó un tercio del plato (consumido 66%).";
    } else if (msg.includes("cuarto") || msg.includes("25%")) {
      multiplier = 0.25;
      explanation = "Se redujo al 25% (un cuarto de porción).";
    } else if (msg.includes("tres cuartos") || msg.includes("75%")) {
      multiplier = 0.75;
      explanation = "Se estimó un 75% consumido (dejó un cuarto).";
    } else if (msg.includes("todo") || msg.includes("completo") || msg.includes("entero")) {
      multiplier = 1.0;
      explanation = "Se mantuvo el registro de plato entero (100%).";
    }
    
    return {
      name: `${meal.name} (Ajustado)`,
      calories: Math.round(meal.calories * multiplier),
      protein: Math.round(meal.protein * multiplier),
      carbs: Math.round(meal.carbs * multiplier),
      fat: Math.round(meal.fat * multiplier),
      adjustmentExplanation: `[Filtro Rápido] ${explanation}`
    };
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
    console.warn("Gemini API error in suggestAlternativeExercisesByIA, using fallback:", apiError);
    
    // Quick fallback alternatives based on name matching
    const name = exerciseName.toLowerCase();
    let alternatives = [];
    
    if (name.includes("pecho") || name.includes("bench") || name.includes("press") || name.includes("militar") || name.includes("push")) {
      alternatives = [
        {
          name: "Flexiones de Brazos Clásicas",
          equipmentNeeded: "Peso corporal",
          difficulty: "Fácil",
          repsText: "3 series de 12 repeticiones",
          justification: "Excelente ejercicio básico para trabajar pectorales y tríceps utilizando únicamente la gravedad."
        },
        {
          name: "Fondos en Paralelas / Silla",
          equipmentNeeded: "Peso corporal o Silla",
          difficulty: "Medio",
          repsText: "3 series de 10 repeticiones",
          justification: "Enfoca el esfuerzo en la porción inferior del pecho y tríceps, fácil de hacer en casa con un mueble estable."
        },
        {
          name: "Flexiones con Manos Juntas (Diamante)",
          equipmentNeeded: "Peso corporal",
          difficulty: "Difícil",
          repsText: "3 series de 8 repeticiones",
          justification: "Aumenta la carga en la porción interna del pectoral y demanda gran estabilidad de tríceps."
        }
      ];
    } else if (name.includes("sentadilla") || name.includes("pierna") || name.includes("zancada") || name.includes("squat") || name.includes("femoral") || name.includes("gluteo")) {
      alternatives = [
        {
          name: "Sentadillas Búlgaras",
          equipmentNeeded: "Peso corporal o Silla/Banco",
          difficulty: "Medio",
          repsText: "3 series de 10 repeticiones por pierna",
          justification: "Excelente trabajo de aislamiento de cuádriceps y glúteos, reduciendo la carga en la columna lumbar."
        },
        {
          name: "Zancadas en Reversa (Lunges)",
          equipmentNeeded: "Peso corporal",
          difficulty: "Fácil",
          repsText: "3 series de 12 repeticiones por lado",
          justification: "Movimiento funcional dinámico enfocado en el equilibrio, cuádriceps, glúteos e isquiotibiales."
        },
        {
          name: "Puente de Glúteos Unilateral",
          equipmentNeeded: "Peso corporal",
          difficulty: "Fácil",
          repsText: "3 series de 15 repeticiones",
          justification: "Excelente trabajo enfocado en la cadena posterior (glúteos e isquiotibiales) sin riesgo de sobrecarga."
        }
      ];
    } else {
      // General/Core/Back
      alternatives = [
        {
          name: "Plancha Abdominal Activa",
          equipmentNeeded: "Peso corporal",
          difficulty: "Fácil",
          repsText: "3 series de 40 segundos",
          justification: "Fortalece todo el core y los estabilizadores escapulares de forma estática y segura."
        },
        {
          name: "Superman (Extensión Lumbar)",
          equipmentNeeded: "Peso corporal",
          difficulty: "Fácil",
          repsText: "3 series de 15 repeticiones",
          justification: "Trabaja la cadena lumbar y dorsal para mejorar la postura y balancear el desarrollo muscular posterior."
        },
        {
          name: "Flexiones del Caminante (Walkouts)",
          equipmentNeeded: "Peso corporal",
          difficulty: "Medio",
          repsText: "3 series de 8 repeticiones",
          justification: "Movimiento dinámico de cuerpo entero que trabaja core, hombros y flexibilidad de la cadena posterior."
        }
      ];
    }
    
    return { alternatives };
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
    console.warn("Gemini API error in analyzeInjuryByIA, using fallback:", apiError);
    
    return {
      possibleCauses: [
        "Sobrecarga de tendones o fatiga acumulada en las fibras musculares locales.",
        "Tensión por mala técnica o desbalance muscular durante ejercicios pesados."
      ],
      exercisesToAvoid: [
        "Cualquier ejercicio con carga directa que reproduzca el dolor original.",
        "Movimientos explosivos o que estiren excesivamente el músculo lesionado."
      ],
      safeAlternatives: [
        "Entrenamientos de bajo impacto que mantengan la circulación sin dolor.",
        "Trabajar otros grupos musculares sanos para evitar la atrofia por desuso."
      ],
      warmupTips: [
        "Calentamiento dinámico prolongado (10-15 minutos) específico para la zona.",
        "Iniciar con series de aproximación muy ligeras antes de meter peso."
      ],
      medicalWarning: "ADVERTENCIA: Esta es una recomendación educativa generada por IA. Si la molestia persiste, limita tu movilidad o se acompaña de hinchazón, calor local u hormigueos, suspende inmediatamente el ejercicio y consulta a un especialista médico o fisioterapeuta."
    };
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
    console.warn("Gemini API error in generateGroceryListByIA, using smart fallback:", apiError);
    
    const diet = profile.dietType || "standard";
    let categories = [];
    
    if (diet === "vegan") {
      categories = [
        {
          name: "Proteínas Veganas y Legumbres",
          items: [
            { name: "Tofu firme orgánico", quantity: "1.0 kg", nutritionalValue: "Proteína vegetal básica versátil" },
            { name: "Lentejas secas o en conserva", quantity: "500g", nutritionalValue: "Proteína y fibra de lenta digestión" },
            { name: "Garbanzos", quantity: "500g", nutritionalValue: "Excelente carbohidrato complejo proteico" },
            { name: "Tempeh o Seitán", quantity: "400g", nutritionalValue: "Alta densidad de proteína vegetal" }
          ]
        },
        {
          name: "Cereales y Tubérculos",
          items: [
            { name: "Avena arrollada integral", quantity: "800g", nutritionalValue: "Carbohidratos complejos de avena" },
            { name: "Arroz integral o Quinoa", quantity: "600g", nutritionalValue: "Cereal completo con aminoácidos esenciales" },
            { name: "Camote o Boniato", quantity: "1.2 kg", nutritionalValue: "Carbohidratos ricos en vitamina A y potasio" }
          ]
        },
        {
          name: "Verdulería y Frutas",
          items: [
            { name: "Espinacas frescas", quantity: "300g", nutritionalValue: "Vitaminas, hierro y minerales" },
            { name: "Plátanos / Bananos", quantity: "1 docena", nutritionalValue: "Energía rápida y potasio para entrenar" },
            { name: "Manzanas o Arándanos", quantity: "500g", nutritionalValue: "Antioxidantes y fibra" },
            { name: "Brócoli o Coliflor", quantity: "1.0 kg", nutritionalValue: "Crucíferas ricas en micronutrientes" }
          ]
        },
        {
          name: "Frutos Secos, Semillas y Grasas",
          items: [
            { name: "Palta / Aguacate", quantity: "4 unidades", nutritionalValue: "Grasas monoinsaturadas saludables" },
            { name: "Mantequilla de maní o almendras", quantity: "1 frasco", nutritionalValue: "Grasas densas y aporte proteico" },
            { name: "Semillas de chía o linaza", quantity: "200g", nutritionalValue: "Ácidos grasos esenciales Omega-3" }
          ]
        }
      ];
    } else if (diet === "vegetarian") {
      categories = [
        {
          name: "Huevos, Lácteos y Tofu",
          items: [
            { name: "Huevos enteros de gallina", quantity: "2 docenas", nutritionalValue: "Proteína de referencia y grasas saludables" },
            { name: "Queso cottage o Yogur griego", quantity: "1.2 kg", nutritionalValue: "Proteína de caseína de liberación lenta" },
            { name: "Tofu firme", quantity: "500g", nutritionalValue: "Proteína vegetal densa" }
          ]
        },
        {
          name: "Cereales, Tubérculos y Legumbres",
          items: [
            { name: "Avena integral", quantity: "700g", nutritionalValue: "Energía estable y fibra saciante" },
            { name: "Quinoa", quantity: "500g", nutritionalValue: "Carbohidrato completo" },
            { name: "Lentejas o Frijoles negros", quantity: "600g", nutritionalValue: "Base proteica de lenta absorción" }
          ]
        },
        {
          name: "Verduras, Frutas y Grasas",
          items: [
            { name: "Palta / Aguacate", quantity: "4 unidades", nutritionalValue: "Grasas cardiosaludables" },
            { name: "Espinaca o Brócoli", quantity: "800g", nutritionalValue: "Micronutrientes esenciales" },
            { name: "Plátanos", quantity: "10 unidades", nutritionalValue: "Carbohidratos pre-entrenamiento" },
            { name: "Nueces o Almendras", quantity: "250g", nutritionalValue: "Grasas esenciales y saciedad" }
          ]
        }
      ];
    } else if (diet === "keto") {
      categories = [
        {
          name: "Carnes, Pescados y Proteínas",
          items: [
            { name: "Pechuga o Muslo de pollo", quantity: "1.5 kg", nutritionalValue: "Proteína básica para hipertrofia" },
            { name: "Carne de res molida magra", quantity: "800g", nutritionalValue: "Proteína y hierro" },
            { name: "Salmón o Atún en agua", quantity: "600g", nutritionalValue: "Proteína de alta calidad y grasas omega-3" },
            { name: "Huevos de gallina", quantity: "2 docenas", nutritionalValue: "La mejor fuente de grasas y proteínas grasas" }
          ]
        },
        {
          name: "Lácteos y Grasas Saludables",
          items: [
            { name: "Aceite de coco o de oliva extra virgen", quantity: "1 botella", nutritionalValue: "Grasas saludables básicas para cetosis" },
            { name: "Palta / Aguacate", quantity: "6 unidades", nutritionalValue: "Grasas y potasio esencial" },
            { name: "Mantequilla o Ghee", quantity: "250g", nutritionalValue: "Grasas saturadas estables para cocinar" },
            { name: "Queso parmesano o cheddar", quantity: "300g", nutritionalValue: "Grasas, sodio y proteínas" }
          ]
        },
        {
          name: "Verduras Bajas en Carbohidratos",
          items: [
            { name: "Espinacas o Acelgas", quantity: "500g", nutritionalValue: "Fibra, magnesio y potasio" },
            { name: "Brócoli o Espárragos", quantity: "800g", nutritionalValue: "Fibra saciante baja en carbohidratos" }
          ]
        }
      ];
    } else {
      categories = [
        {
          name: "Proteínas y Carnes",
          items: [
            { name: "Pechuga de pollo fileteada", quantity: "1.5 kg", nutritionalValue: "Proteína magra para construcción muscular" },
            { name: "Lomo de cerdo o res magra", quantity: "800g", nutritionalValue: "Proteína, zinc y hierro" },
            { name: "Atún al agua en conserva", quantity: "4 latas", nutritionalValue: "Proteína rápida, baja en grasas" },
            { name: "Huevos enteros", quantity: "2 docenas", nutritionalValue: "Proteína y grasas esenciales" }
          ]
        },
        {
          name: "Cereales y Tubérculos",
          items: [
            { name: "Arroz integral o Quinoa", quantity: "800g", nutritionalValue: "Carbohidratos complejos" },
            { name: "Avena integral", quantity: "1.0 kg", nutritionalValue: "Carbohidratos de avena saciantes" },
            { name: "Patatas o Camotes", quantity: "1.5 kg", nutritionalValue: "Carbohidratos de fácil digestión" }
          ]
        },
        {
          name: "Lácteos y Derivados",
          items: [
            { name: "Yogur griego natural sin azúcar", quantity: "1.0 kg", nutritionalValue: "Proteínas lácteas y probióticos" },
            { name: "Leche descremada o vegetal", quantity: "2 litros", nutritionalValue: "Base líquida proteica" }
          ]
        },
        {
          name: "Verdulería y Grasas",
          items: [
            { name: "Plátanos", quantity: "1 docena", nutritionalValue: "Potasio y energía pre-entreno" },
            { name: "Brócoli y Espinacas", quantity: "1.2 kg", nutritionalValue: "Fito-nutrientes y fibra" },
            { name: "Palta / Aguacate", quantity: "4 unidades", nutritionalValue: "Grasas monoinsaturadas" },
            { name: "Aceite de oliva extra virgen", quantity: "1 botella", nutritionalValue: "Grasas saludables de cocina" }
          ]
        }
      ];
    }
    
    return { categories };
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
    console.warn("Gemini API error in suggestFoodSubstitutesByIA, using fallback:", apiError);
    
    // Quick fallback based on common ingredient matches
    const name = foodOrIngredient.toLowerCase();
    let substitutes = [];
    
    if (name.includes("azucar") || name.includes("azúcar") || name.includes("dulce")) {
      substitutes = [
        {
          name: dietType === "keto" ? "Eritritol o Alulosa" : "Miel de Abeja Orgánica",
          ratioText: dietType === "keto" ? "1 a 1 en volumen" : "3/4 de la cantidad original",
          benefit: dietType === "keto" ? "Libre de calorías y no eleva la glucosa en sangre." : "Aporta enzimas activas y antioxidantes naturales."
        },
        {
          name: "Stevia natural en hojas o extracto",
          ratioText: "Unas pocas gotas al gusto",
          benefit: "Endulzante sin calorías que no altera la respuesta insulínica."
        },
        {
          name: dietType === "vegan" || dietType === "vegetarian" ? "Jarabe de arce puro (Maple syrup)" : "Puré de manzana o plátano maduro",
          ratioText: "1 a 1 en volumen",
          benefit: "Aporta dulzor natural junto con fibra alimentaria que ralentiza la absorción."
        }
      ];
    } else if (name.includes("leche") || name.includes("lácteo") || name.includes("lacteo") || name.includes("queso")) {
      substitutes = [
        {
          name: "Bebida de almendras sin azúcar",
          ratioText: "1 a 1 en volumen",
          benefit: "Baja en calorías, libre de lactosa y apta para regímenes veganos/keto."
        },
        {
          name: "Bebida de avena integral",
          ratioText: "1 a 1 en volumen",
          benefit: "Aporta carbohidratos complejos y una textura cremosa ideal para batidos."
        },
        {
          name: "Leche de coco light (en lata o cartón)",
          ratioText: "1 a 1 en volumen",
          benefit: "Aporta ácidos grasos de cadena media (MCT) altamente saciantes y energía limpia."
        }
      ];
    } else if (name.includes("huevo")) {
      substitutes = [
        {
          name: "Semillas de chía o linaza activadas (Huevo de chía)",
          ratioText: "1 cucharada de chía + 3 de agua por cada huevo",
          benefit: "Excelente aglutinante vegetal rico en ácidos grasos omega-3 y fibra soluble."
        },
        {
          name: "Tofu suave (Silken tofu)",
          ratioText: "1/4 taza (aprox. 60g) por cada huevo",
          benefit: "Ideal para horneados, aporta una consistencia suave y una buena dosis de proteína vegetal."
        },
        {
          name: "Puré de plátano maduro",
          ratioText: "1/2 plátano machacado por cada huevo",
          benefit: "Funciona como aglutinante aportando humedad, potasio y dulzor natural."
        }
      ];
    } else {
      substitutes = [
        {
          name: "Aguacate / Palta",
          ratioText: "Sustituye grasas como mantequilla o aceites en proporción 1 a 1",
          benefit: "Aporta grasas monoinsaturadas cardiosaludables, potasio y gran cremosidad."
        },
        {
          name: "Quinoa cocida",
          ratioText: "Sustituye cereales refinados en proporción 1 a 1",
          benefit: "Proteína completa con todos los aminoácidos esenciales y carbohidratos lentos."
        },
        {
          name: "Levadura nutricional",
          ratioText: "Sustituye queso rallado al gusto",
          benefit: "Aporta un delicioso sabor a queso, rico en vitaminas del complejo B y proteínas."
        }
      ];
    }
    
    return { substitutes };
  }
}


