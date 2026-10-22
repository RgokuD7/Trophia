import { FoodItem, UserProfile, FitnessGoal, ExperienceLevel, MealType, DietType } from "../types";

// Common healthy foods for the autocomplete predictive global search
export const GLOBAL_FOODS_DB: FoodItem[] = [
  { name: "Pechuga de Pollo (A la plancha)", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: "100g" },
  { name: "Arroz Blanco Cocido", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: "100g" },
  { name: "Arroz Integral Cocido", calories: 111, protein: 2.6, carbs: 23, fat: 0.9, servingSize: "100g" },
  { name: "Huevo Entero (Hervido)", calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: "100g" },
  { name: "Clara de Huevo", calories: 52, protein: 11, carbs: 0.7, fat: 0.2, servingSize: "100g" },
  { name: "Avena en Hojuelas", calories: 389, protein: 16.9, carbs: 66, fat: 6.9, servingSize: "100g" },
  { name: "Plátano (Banana)", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: "100g" },
  { name: "Aguacate (Palta)", calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: "100g" },
  { name: "Filete de Salmón (Al horno)", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: "100g" },
  { name: "Lata de Atún al Natural", calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: "100g" },
  { name: "Manzana Roja", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: "100g" },
  { name: "Almendras", calories: 579, protein: 21, carbs: 22, fat: 49, servingSize: "100g" },
  { name: "Brócoli al Vapor", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: "100g" },
  { name: "Batata (Camote) Asada", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: "100g" },
  { name: "Queso Fresco Light", calories: 98, protein: 12, carbs: 3.5, fat: 4, servingSize: "100g" },
  { name: "Yogur Griego Natural 0%", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: "100g" },
  { name: "Espinacas Crudas", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, servingSize: "100g" },
  { name: "Pan Integral", calories: 247, protein: 13, carbs: 41, fat: 3.4, servingSize: "100g" },
  { name: "Carne de Res Magra", calories: 137, protein: 21.4, carbs: 0, fat: 5, servingSize: "100g" },
  { name: "Leche Semidesnatada", calories: 47, protein: 3.4, carbs: 4.8, fat: 1.6, servingSize: "100ml" },
  { name: "Aceite de Oliva Extra Virgen", calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: "100ml" },
  { name: "Lentejas Cocidas", calories: 116, protein: 9, carbs: 20, fat: 0.4, servingSize: "100g" },
  { name: "Proteína de Suero (Whey Gold Standard)", calories: 390, protein: 80, carbs: 6.7, fat: 3.3, servingSize: "100g" }
];

export const SPORTS_METS: Record<string, { label: string; met: number; emoji: string }> = {
  soccer: { label: "Fútbol", met: 8.0, emoji: "⚽" },
  boxing: { label: "Boxeo / Kickboxing", met: 7.8, emoji: "🥊" },
  gym: { label: "Gimnasio / Musculación", met: 6.0, emoji: "🏋️" },
  swimming: { label: "Natación", met: 7.0, emoji: "🏊" },
  running: { label: "Running / Carrera", met: 9.0, emoji: "🏃" },
  cycling: { label: "Ciclismo / Spinning", met: 7.5, emoji: "🚴" },
  padel: { label: "Pádel", met: 7.5, emoji: "🎾" },
  tennis: { label: "Tenis", met: 7.3, emoji: "🎾" },
  basketball: { label: "Baloncesto", met: 8.0, emoji: "🏀" },
  martial_arts: { label: "Artes Marciales", met: 10.0, emoji: "🥋" },
  crossfit: { label: "Crossfit / HIIT", met: 9.0, emoji: "🥵" },
  hiking: { label: "Senderismo / Trekking", met: 6.5, emoji: "🥾" },
  yoga: { label: "Yoga / Pilates", met: 3.0, emoji: "🧘" },
  walking: { label: "Caminata Rápida", met: 4.0, emoji: "🚶" },
  other: { label: "Otro deporte / actividad", met: 6.0, emoji: "⚡" }
};

// Calculate BMI
export function calculateBMI(weight: number, height: number): number {
  if (weight <= 0 || height <= 0) return 0;
  const heightInMeters = height / 100;
  return parseFloat((weight / (heightInMeters * heightInMeters)).toFixed(1));
}

// Get BMI Range Description and Color
export function getBMICategory(bmi: number): { label: string; color: string; description: string } {
  if (bmi < 18.5) {
    return {
      label: "Bajo peso",
      color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
      description: "Por debajo de los valores normales. Considera un superávit calórico."
    };
  } else if (bmi >= 18.5 && bmi < 24.9) {
    return {
      label: "Normal",
      color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
      description: "Peso corporal ideal para tu estatura. ¡Excelente equilibrio!"
    };
  } else if (bmi >= 25 && bmi < 29.9) {
    return {
      label: "Sobrepeso",
      color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
      description: "Ligero exceso de grasa. Se sugiere un déficit calórico controlado."
    };
  } else {
    return {
      label: "Obesidad",
      color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
      description: "Rango de riesgo de salud elevado. Prioriza ejercicio y buena nutrición."
    };
  }
}

// Navy Body Fat Formula (Método Antropométrico)
export function calculateNavyBodyFat(
  sex: "male" | "female",
  waist: number,
  neck: number,
  height: number,
  hip?: number
): number {
  if (!waist || !neck || !height) return 0;
  
  try {
    if (sex === "male") {
      // US Navy Formula for males:
      // %BF = 495 / (1.0324 - 0.19077 * log10(waist_cm - neck_cm) + 0.15456 * log10(height_cm)) - 450
      const diff = waist - neck;
      if (diff <= 0) return 0;
      const density = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(height);
      const bf = 495 / density - 450;
      return parseFloat(Math.max(3, Math.min(60, bf)).toFixed(1));
    } else {
      // US Navy Formula for females (uses hips):
      // %BF = 495 / (1.29579 - 0.35004 * log10(waist_cm + hip_cm - neck_cm) + 0.22100 * log10(height_cm)) - 450
      const effectiveHip = hip || waist + 10; // estimate hip if missing
      const sum = waist + effectiveHip - neck;
      if (sum <= 0) return 0;
      const density = 1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(height);
      const bf = 495 / density - 450;
      return parseFloat(Math.max(5, Math.min(60, bf)).toFixed(1));
    }
  } catch (e) {
    return 0;
  }
}

// Jackson-Pollock 3-Site Caliper Body Fat Formula (Pliegues Cutáneos)
export function calculateCaliperBodyFat(
  sex: "male" | "female",
  age: number,
  val1: number, // Male: Chest (Pecho), Female: Triceps
  val2: number, // Male: Abdomen, Female: Suprailiac (Suprailíaco)
  val3: number  // Male & Female: Thigh (Muslo)
): number {
  if (!val1 || !val2 || !val3 || !age) return 0;
  
  try {
    const sum = val1 + val2 + val3;
    if (sex === "male") {
      const bd = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
      const bf = (495 / bd) - 450;
      return parseFloat(Math.max(3, Math.min(60, bf)).toFixed(1));
    } else {
      const bd = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
      const bf = (495 / bd) - 450;
      return parseFloat(Math.max(5, Math.min(60, bf)).toFixed(1));
    }
  } catch (e) {
    return 0;
  }
}

// BMR and Macronutrient Target Calculator
export function calculateRequirements(profile: {
  weight: number;
  height: number;
  age: number;
  sex: "male" | "female";
  goal: FitnessGoal;
  level?: ExperienceLevel;
  bodyFat?: number;
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor";
  stepsRange?: "under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k";
  deficitPace?: "conservative" | "moderate" | "aggressive";
  dietType?: DietType;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const { 
    weight, 
    height, 
    age, 
    sex, 
    goal, 
    level = "beginner", 
    bodyFat, 
    activityLevel, 
    stepsRange, 
    deficitPace = "moderate", 
    dietType 
  } = profile;

  // 1. Calculate BMR
  let bmr = 0;
  if (bodyFat !== undefined && bodyFat > 0) {
    // Katch-McArdle formula based on Lean Body Mass (LBM)
    const lbm = weight * (1 - (bodyFat / 100));
    bmr = 370 + (21.6 * lbm);
  } else {
    // Mifflin-St Jeor BMR
    bmr = 10 * weight + 6.25 * height - 5 * age;
    if (sex === "male") {
      bmr += 5;
    } else {
      bmr -= 161;
    }
  }

  // 2. Activity Factor (PAL / NEAT)
  let activityFactor = 1.2; // default sedentary
  if (stepsRange) {
    if (stepsRange === "under_4k") activityFactor = 1.20;
    else if (stepsRange === "5k_7k") activityFactor = 1.375;
    else if (stepsRange === "8k_10k") activityFactor = 1.55;
    else if (stepsRange === "12k_15k") activityFactor = 1.725;
    else if (stepsRange === "over_18k") activityFactor = 2.05;
  } else if (activityLevel) {
    if (activityLevel === "sedentary") activityFactor = 1.20;
    else if (activityLevel === "lightly_active") activityFactor = 1.375;
    else if (activityLevel === "moderately_active") activityFactor = 1.55;
    else if (activityLevel === "highly_active") activityFactor = 1.725;
    else if (activityLevel === "heavy_labor") activityFactor = 2.05;
  } else {
    // Fallback to legacy level check
    if (level === "beginner") {
      activityFactor = 1.2;
    } else if (level === "intermediate") {
      activityFactor = 1.375;
    } else if (level === "advanced") {
      activityFactor = 1.55;
    }
  }

  const tdee = bmr * activityFactor;

  // 3. Goal Adjustments
  let targetCalories = Math.round(tdee);
  
  if (goal === "lose_weight") {
    // Dynamic deficit based on adiposity and selected pace
    // If body fat is not known, estimate based on average ranges
    const bf = bodyFat || (sex === "male" ? 20 : 28);
    const isHighAdiposity = sex === "male" ? bf > 25 : bf > 35;
    const isLean = sex === "male" ? bf < 15 : bf < 25;
    
    let weeklyRate = 0.0085; // default moderate (0.85% weight loss per week)
    
    if (isHighAdiposity) {
      if (deficitPace === "conservative") weeklyRate = 0.010;
      else if (deficitPace === "moderate") weeklyRate = 0.0125;
      else if (deficitPace === "aggressive") weeklyRate = 0.015;
    } else if (isLean) {
      if (deficitPace === "conservative") weeklyRate = 0.003;
      else if (deficitPace === "moderate") weeklyRate = 0.005;
      else if (deficitPace === "aggressive") weeklyRate = 0.007;
    } else {
      // Moderate adiposity
      if (deficitPace === "conservative") weeklyRate = 0.007;
      else if (deficitPace === "moderate") weeklyRate = 0.0085;
      else if (deficitPace === "aggressive") weeklyRate = 0.010;
    }
    
    // 1kg of fat ~ 7700 kcal. Daily Deficit = (weight * weeklyRate * 7700) / 7
    const dailyDeficit = (weight * weeklyRate * 7700) / 7;
    // Safe clamp on deficit (between 250 kcal and 1000 kcal)
    const clampedDeficit = Math.max(250, Math.min(1000, dailyDeficit));
    targetCalories = Math.round(tdee - clampedDeficit);
  } else if (goal === "gain_muscle") {
    // 10% to 15% surplus over TDEE (beginner gets 15%, advanced gets 10%)
    const surplusPct = level === "advanced" ? 0.10 : level === "intermediate" ? 0.12 : 0.15;
    targetCalories = Math.round(tdee * (1 + surplusPct));
  } else if (goal === "aesthetics") {
    // slight deficit / recomp (250 kcal deficit)
    targetCalories = Math.round(tdee - 250);
  } else {
    // maintenance
    targetCalories = Math.round(tdee);
  }

  // Keep calories at a safe minimum (1200 for females, 1500 for males)
  const safeMinimum = sex === "female" ? 1200 : 1500;
  targetCalories = Math.max(safeMinimum, targetCalories);

  // 4. Protein Target
  let proteinPerKg = 1.8;
  if (goal === "gain_muscle") {
    proteinPerKg = 2.0;
  } else if (goal === "lose_weight") {
    // Protein scales with deficit intensity
    if (deficitPace === "conservative") proteinPerKg = 1.9;
    else if (deficitPace === "moderate") proteinPerKg = 2.2;
    else if (deficitPace === "aggressive") proteinPerKg = 2.5;
  } else if (goal === "aesthetics") {
    proteinPerKg = 2.1;
  }

  let proteinGrams = weight * proteinPerKg;

  // Vegan/Vegetarian compensator: +25% protein requirement due to lower bioavailability
  const isPlantBased = dietType === "vegan" || dietType === "vegetarian";
  if (isPlantBased) {
    proteinGrams *= 1.25;
  }

  // Clamp protein between 1.2g/kg and 3.0g/kg (and absolute max 250g)
  const minProtein = weight * 1.2;
  const maxProtein = weight * 3.0;
  proteinGrams = Math.max(minProtein, Math.min(maxProtein, proteinGrams));
  proteinGrams = Math.round(Math.min(250, proteinGrams));
  
  const proteinCalories = proteinGrams * 4;

  // Fat: 25% of total calories (or slightly higher if plant-based diet to accommodate macro pairings)
  const fatPct = isPlantBased ? 0.28 : 0.25;
  const fatCalories = targetCalories * fatPct;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: Remaining calories
  const remainingCalories = targetCalories - proteinCalories - (fatGrams * 9);
  const carbsGrams = Math.round(Math.max(30, remainingCalories / 4));

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams
  };
}

export function getSuggestedMealTypeByTime(): { type: MealType; label: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return { type: "breakfast", label: "Desayuno" };
  } else if (hour >= 11 && hour < 16) {
    return { type: "lunch", label: "Almuerzo" };
  } else if (hour >= 16 && hour < 19) {
    return { type: "snack", label: "Colación" };
  } else if (hour >= 19 && hour < 23) {
    return { type: "dinner", label: "Cena" };
  } else {
    return { type: "snack", label: "Snack Nocturno" };
  }
}

export interface PrePostAdvice {
  title: string;
  recommendation: string;
  macrosFocus: string;
}

export function getPrePostWorkoutAdvice(diet: DietType, goal: FitnessGoal, isPost: boolean): PrePostAdvice {
  const isKeto = diet === "keto";
  const isPlant = diet === "vegan" || diet === "vegetarian";
  const isVegan = diet === "vegan";
  
  if (!isPost) {
    // Pre-workout
    let recommendation = "";
    let macrosFocus = "";
    
    if (isKeto) {
      macrosFocus = "Grasas saludables y Energía Limpia";
      if (goal === "lose_weight") {
        recommendation = "Café con 1 cucharadita de aceite de coco (MCT) o un puñado de nueces de macadamia para aportar energía rápida sin romper la cetosis.";
      } else {
        recommendation = "Aguacate maduro con un huevo duro y café cargado para máxima energía y disponibilidad de grasas.";
      }
    } else if (isVegan) {
      macrosFocus = "Carbohidratos Complejos y Digestión Ligera";
      if (goal === "lose_weight") {
        recommendation = "Una manzana mediana con 1 cucharada pequeña de mantequilla de maní, o 30g de avena cocida en agua.";
      } else {
        recommendation = "Avena con medio plátano y semillas de chía, o un batido de proteína vegana con leche de almendra y avena.";
      }
    } else if (isPlant) {
      macrosFocus = "Carbohidratos y Proteína Ligera";
      if (goal === "lose_weight") {
        recommendation = "Yogur griego descremado con un puñado de frutos rojos, o una manzana verde.";
      } else {
        recommendation = "Avena cocida en leche descremada con plátano y rodajas de fresas, o tostada integral con queso cottage.";
      }
    } else {
      // Standard / Paleo / Mediterranean
      macrosFocus = "Carbohidratos de Fácil Asimilación";
      if (goal === "lose_weight") {
        recommendation = "Un plátano maduro mediano junto con una taza de café negro (sin azúcar) para estimular el rendimiento.";
      } else {
        recommendation = "Avena con leche, plátano y una cucharadita de miel, o una tostada integral con huevo y rebanadas de aguacate.";
      }
    }
    
    return {
      title: "Pre-Entrenamiento (Aporte de Energía)",
      recommendation,
      macrosFocus
    };
  } else {
    // Post-workout
    let recommendation = "";
    let macrosFocus = "";
    
    if (isKeto) {
      macrosFocus = "Proteína de Rápida Absorción y Grasas";
      if (goal === "lose_weight") {
        recommendation = "Pescado azul (salmón o atún) con ensalada verde y aceite de oliva, o un batido de proteína Isopure (cero carbohidratos).";
      } else {
        recommendation = "Filete de res magra o salmón a la plancha con aguacate y un huevo revuelto para optimizar la síntesis proteica.";
      }
    } else if (isVegan) {
      macrosFocus = "Proteína Vegetal y Carbohidratos de Recuperación";
      if (goal === "lose_weight") {
        recommendation = "Tofu revuelto con espinacas y tomates cherry, o un batido de proteína de chícharo/cáñamo en agua.";
      } else {
        recommendation = "Garbanzos o lentejas cocidas con quinoa, medio aguacate y espinacas, o batido con plátano y proteína vegana.";
      }
    } else if (isPlant) {
      macrosFocus = "Proteína Completa y Glucógeno";
      if (goal === "lose_weight") {
        recommendation = "Yogur griego 0% con 10g de nueces o queso cottage con rodajas de pepino y pimienta.";
      } else {
        recommendation = "Batido de proteína de suero (whey) con un plátano, o huevos revueltos con tostadas integrales y aguacate.";
      }
    } else {
      // Standard / Paleo / Mediterranean
      macrosFocus = "Proteína de Alta Calidad y Carbohidratos";
      if (goal === "lose_weight") {
        recommendation = "Lata de atún al natural con 2 tostadas de arroz integral, o pechuga de pollo a la plancha con verduras al vapor.";
      } else {
        recommendation = "Pechuga de pollo con arroz blanco y rebanadas de aguacate, o filete de salmón al horno con camote (batata) asado.";
      }
    }
    
    return {
      title: "Post-Entrenamiento (Recuperación Muscular)",
      recommendation,
      macrosFocus
    };
  }
}

/**
 * Returns a YYYY-MM-DD date string according to the user's LOCAL timezone.
 * Avoids UTC rollover bugs where dates change in the evening (e.g., 8-9 PM in UTC-3/4).
 */
export function getLocalDateString(dateInput?: Date | string | number): string {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDateString(): string {
  return getLocalDateString(new Date());
}

/**
 * Checks if a timestamp (ISO string, date string, or Date) belongs to the target local date (YYYY-MM-DD).
 */
export function isSameDay(timestampOrDate: string | Date | undefined | null, targetDateStr: string): boolean {
  if (!timestampOrDate || !targetDateStr) return false;
  // If exact 10-char match (e.g. YYYY-MM-DD)
  if (typeof timestampOrDate === "string" && timestampOrDate.length === 10 && timestampOrDate === targetDateStr) {
    return true;
  }
  return getLocalDateString(timestampOrDate) === targetDateStr;
}

/**
 * Creates an ISO timestamp for a specified local date string (YYYY-MM-DD),
 * matching the user's current local time of day, ensuring isSameDay returns true.
 */
export function createTimestampForDate(targetDateStr: string): string {
  if (!targetDateStr) return new Date().toISOString();
  const now = new Date();
  if (targetDateStr === getLocalDateString(now)) {
    return now.toISOString();
  }
  const parts = targetDateStr.split("-").map(Number);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const targetDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return targetDate.toISOString();
  }
  return new Date().toISOString();
}

/**
 * Returns a human-friendly Spanish string for a YYYY-MM-DD date (e.g. "Hoy", "Ayer", "Lun, 18 oct").
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return "";
  const today = getLocalDateString();
  if (dateStr === today) return "Hoy";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === getLocalDateString(yesterday)) return "Ayer";

  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3) {
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return dateObj.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  }
  return dateStr;
}

/**
 * Determines default portion unit, weight in grams, and unit label based on food name and serving size string.
 * Supports Chilean / Latin American staples, common fruits, breads, and condiments/sauces.
 */
export function getDefaultServingInfo(name: string, servingSizeStr: string): {
  defaultUnit: "g" | "ml" | "unit";
  unitWeight: number;
  unitLabel: string;
} {
  const lowercaseName = (name || "").toLowerCase();
  const lowercaseServing = (servingSizeStr || "").toLowerCase();

  let unitLabel = "unidad";
  let unitWeight = 100;
  let defaultUnit: "g" | "ml" | "unit" = "g";

  if (lowercaseName.includes("leche") || lowercaseName.includes("bebida") || lowercaseName.includes("jugo") || lowercaseName.includes("agua") || lowercaseServing.includes("ml")) {
    defaultUnit = "ml";
    unitLabel = "ml";
    unitWeight = 200;
  }

  // Sauces & Condiments (Standard realistic single-serving portions)
  if (lowercaseName.includes("ketchup") || lowercaseName.includes("kétchup") || lowercaseName.includes("catsup")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 18;
  } else if (lowercaseName.includes("mostaza")) {
    defaultUnit = "g";
    unitLabel = "cucharadita";
    unitWeight = 12;
  } else if (lowercaseName.includes("mayonesa") || lowercaseName.includes("mayo")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 15;
  } else if (lowercaseName.includes("salsa de tomate") || lowercaseName.includes("pasta de tomate") || lowercaseName.includes("tuco")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 30;
  } else if (lowercaseName.includes("salsa bbq") || lowercaseName.includes("barbacoa")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 20;
  } else if (lowercaseName.includes("mermelada") || lowercaseName.includes("jalea")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 20;
  } else if (lowercaseName.includes("manjar") || lowercaseName.includes("dulce de leche")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 20;
  } else if (lowercaseName.includes("mantequilla de maní") || lowercaseName.includes("crema de maní") || lowercaseName.includes("peanut butter")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 15;
  } else if (lowercaseName.includes("mantequilla") || lowercaseName.includes("margarina")) {
    defaultUnit = "g";
    unitLabel = "porción";
    unitWeight = 10;
  } else if (lowercaseName.includes("aceite")) {
    defaultUnit = "ml";
    unitLabel = "cucharada";
    unitWeight = 10;
  } else if (lowercaseName.includes("miel")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 20;
  } else if (lowercaseName.includes("queso rallado") || lowercaseName.includes("parmesano")) {
    defaultUnit = "g";
    unitLabel = "cucharada";
    unitWeight = 10;
  } else if (lowercaseName.includes("queso laminado") || lowercaseName.includes("queso cheddar") || lowercaseName.includes("queso gouda") || lowercaseName.includes("queso chanco") || lowercaseName.includes("lámina de queso") || lowercaseName.includes("lamina de queso")) {
    defaultUnit = "unit";
    unitLabel = "lámina";
    unitWeight = 30;
  } else if (lowercaseName.includes("jamón") || lowercaseName.includes("jamon") || lowercaseName.includes("pechuga de pavo") || lowercaseName.includes("cecina")) {
    defaultUnit = "unit";
    unitLabel = "rebanada";
    unitWeight = 25;
  } else if (lowercaseName.includes("huevo")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 50;
  } else if (lowercaseName.includes("pan ") || lowercaseName.includes("pan integral") || lowercaseName.includes("tostada") || lowercaseName.includes("rebanada") || lowercaseName.includes("marraqueta") || lowercaseName.includes("hallulla")) {
    defaultUnit = "unit";
    unitLabel = "rebanada";
    unitWeight = 25;
  } else if (lowercaseName.includes("plátano") || lowercaseName.includes("banana")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 120;
  } else if (lowercaseName.includes("manzana")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 150;
  } else if (lowercaseName.includes("naranja")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 130;
  } else if (lowercaseName.includes("yogur") || lowercaseName.includes("pot")) {
    defaultUnit = "unit";
    unitLabel = "pote";
    unitWeight = 125;
  } else if (lowercaseName.includes("galleta")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 10;
  } else if (lowercaseName.includes("tortilla")) {
    defaultUnit = "unit";
    unitLabel = "unidad";
    unitWeight = 30;
  }

  // Parse explicit grams/ml in servingSize string if provided
  if (servingSizeStr) {
    const parenMatch = servingSizeStr.match(/\((\d+(?:\.\d+)?)\s*(?:g|ml)\)/i);
    const directMatch = servingSizeStr.match(/^(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    const spaceMatch = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    
    let totalWeight = 0;
    if (parenMatch) {
      totalWeight = parseFloat(parenMatch[1]);
    } else if (directMatch) {
      totalWeight = parseFloat(directMatch[1]);
    } else if (spaceMatch) {
      totalWeight = parseFloat(spaceMatch[1]);
    }

    if (totalWeight > 0) {
      const countMatch = servingSizeStr.match(/(\d+)\s*(?:slice|rebanada|cucharada|cucharadita|cookie|galleta|unit|pieza|huevo|pan|vaso|taza|botella|lata|envase|pote|porcion|porción|lámina|lamina)/i);
      const count = countMatch ? parseInt(countMatch[1]) : 1;
      unitWeight = Math.round(totalWeight / count);
      
      const lowerServing = servingSizeStr.toLowerCase();
      if (lowerServing.includes("cucharadita")) {
        unitLabel = "cucharadita";
        defaultUnit = "unit";
      } else if (lowerServing.includes("cucharada")) {
        unitLabel = "cucharada";
        defaultUnit = "unit";
      } else if (lowerServing.includes("slice") || lowerServing.includes("rebanada")) {
        unitLabel = "rebanada";
        defaultUnit = "unit";
      } else if (lowerServing.includes("cookie") || lowerServing.includes("galleta")) {
        unitLabel = "galleta";
        defaultUnit = "unit";
      } else if (lowerServing.includes("vaso")) {
        unitLabel = "vaso";
        defaultUnit = "unit";
      } else if (lowerServing.includes("cup") || lowerServing.includes("taza")) {
        unitLabel = "taza";
        defaultUnit = "unit";
      } else if (lowerServing.includes("bottle") || lowerServing.includes("botella")) {
        unitLabel = "botella";
        defaultUnit = "unit";
      } else if (lowerServing.includes("can") || lowerServing.includes("lata")) {
        unitLabel = "lata";
        defaultUnit = "unit";
      } else if (lowerServing.includes("pot") || lowerServing.includes("pote") || lowerServing.includes("envase")) {
        unitLabel = "pote";
        defaultUnit = "unit";
      } else if (lowerServing.includes("bar") || lowerServing.includes("barra")) {
        unitLabel = "barra";
        defaultUnit = "unit";
      } else if (lowerServing.includes("pack") || lowerServing.includes("paquete")) {
        unitLabel = "paquete";
        defaultUnit = "unit";
      } else if (lowerServing.includes("lámina") || lowerServing.includes("lamina")) {
        unitLabel = "lámina";
        defaultUnit = "unit";
      } else {
        unitLabel = "porción";
        if (unitWeight !== 100) {
          defaultUnit = "unit";
        }
      }
    } else {
      const lowerServing = servingSizeStr.toLowerCase();
      if (lowerServing.includes("porción") || lowerServing.includes("porcion")) {
        defaultUnit = "unit";
        unitLabel = "porción";
      } else if (lowerServing.includes("unidad")) {
        defaultUnit = "unit";
        unitLabel = "unidad";
      } else if (lowerServing.includes("plato") || lowerServing.includes("sandwich") || lowerServing.includes("sándwich")) {
        defaultUnit = "unit";
        unitLabel = "plato";
      }
    }
  }

  return { defaultUnit, unitWeight, unitLabel };
}

// ---------------------------------------------------------------------------
// CREATINE MUSCLE SATURATION CALCULATOR
// ---------------------------------------------------------------------------

export interface CreatineSaturationResult {
  saturationPercentage: number; // 60 to 100
  streakDays: number; // Consecutive days taking it
  takenToday: boolean;
  takenYesterday: boolean;
  totalDaysLogged: number;
  statusLabel: string;
  statusColor: string;
  statusDescription: string;
  dailyWashoutOrGain: number; // e.g. +1.45% or -1.0%
  daysToFullSaturation: number; // Estimated days remaining to hit 100%
  daysLoggedPast14Days: { date: string; dayName: string; dayNumber: number; taken: boolean; isToday: boolean }[];
}

export function calculateCreatineSaturation(
  history: string[] = [],
  startingMode: "new" | "already_saturated" = "new",
  customTodayStr?: string
): CreatineSaturationResult {
  const todayStr = customTodayStr || getLocalDateString();
  const historySet = new Set(history);
  const takenToday = historySet.has(todayStr);

  const [year, month, day] = todayStr.split("-").map(Number);
  const todayDate = new Date(year, month - 1, day);

  const yesterdayDate = new Date(todayDate);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterdayDate);
  const takenYesterday = historySet.has(yesterdayStr);

  // Baseline: 60% natural dietary baseline, or 100% if previously saturated
  let saturation = startingMode === "already_saturated" ? 100 : 60;

  const simulationDays = 35;
  for (let i = simulationDays; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);

    if (historySet.has(dStr)) {
      saturation = Math.min(100, saturation + 1.45);
    } else {
      saturation = Math.max(60, saturation - 1.0);
    }
  }

  const finalSaturation = Math.min(100, Math.max(60, Math.round(saturation)));

  // Consecutive streak
  let streak = 0;
  const startOffset = takenToday ? 0 : (takenYesterday ? 1 : -1);
  if (startOffset >= 0) {
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);
      if (historySet.has(dStr)) {
        streak++;
      } else {
        break;
      }
    }
  }

  // 14-day history window
  const daysLoggedPast14Days = [];
  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    const dStr = getLocalDateString(d);
    daysLoggedPast14Days.push({
      date: dStr,
      dayName: daysOfWeek[d.getDay()],
      dayNumber: d.getDate(),
      taken: historySet.has(dStr),
      isToday: dStr === todayStr,
    });
  }

  let statusLabel = "Nivel Basal";
  let statusColor = "text-gray-400";
  let statusDescription = "Tus depósitos están en su nivel natural de la dieta. Empieza a tomarla diariamente para saturar.";

  if (finalSaturation >= 95) {
    statusLabel = "Saturación Máxima (100%)";
    statusColor = "text-emerald-400";
    statusDescription = "Depósitos musculares al máximo. Capacidad óptima de regeneración de ATP y fuerza explosiva.";
  } else if (finalSaturation >= 85) {
    statusLabel = "Saturación Alta";
    statusColor = "text-emerald-400";
    statusDescription = "Excelente nivel de fosfocreatina. Muy cerca del pico fisiológico celular.";
  } else if (finalSaturation >= 75) {
    statusLabel = "En Fase de Carga";
    statusColor = "text-sky-400";
    statusDescription = "Depósitos en aumento continuo. Mantén la dosis diaria para alcanzar la plenitud.";
  } else if (finalSaturation >= 65) {
    statusLabel = "Carga Inicial / Descenso";
    statusColor = "text-amber-400";
    statusDescription = "Saturación parcial. Si dejaste de tomarla un día, aún conservas reservas; retómala hoy para recargar.";
  }

  const daysToFull = finalSaturation >= 100 ? 0 : Math.ceil((100 - finalSaturation) / 1.45);

  return {
    saturationPercentage: finalSaturation,
    streakDays: streak,
    takenToday,
    takenYesterday,
    totalDaysLogged: history.length,
    statusLabel,
    statusColor,
    statusDescription,
    dailyWashoutOrGain: takenToday ? 1.45 : -1.0,
    daysToFullSaturation: daysToFull,
    daysLoggedPast14Days,
  };
}



