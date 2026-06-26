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

