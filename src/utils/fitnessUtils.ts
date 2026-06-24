import { FoodItem, UserProfile, FitnessGoal, ExperienceLevel } from "../types";

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
  level: ExperienceLevel;
}): { calories: number; protein: number; carbs: number; fat: number } {
  const { weight, height, age, sex, goal, level } = profile;

  // 1. Mifflin-St Jeor BMR
  let bmr = 10 * weight + 6.25 * height - 5 * age;
  if (sex === "male") {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  // 2. Activity Factor based on History Level
  let activityFactor = 1.2; // default sedentary
  if (level === "beginner") {
    activityFactor = 1.2;
  } else if (level === "intermediate") {
    activityFactor = 1.375;
  } else if (level === "advanced") {
    activityFactor = 1.55;
  }

  const tdee = bmr * activityFactor;

  // 3. Goal Adjustments
  let targetCalories = Math.round(tdee);
  if (goal === "lose_weight") {
    targetCalories = Math.round(tdee - 500); // 500 kcal deficit
  } else if (goal === "gain_muscle") {
    targetCalories = Math.round(tdee + 300); // 300 kcal surplus
  } else if (goal === "aesthetics") {
    targetCalories = Math.round(tdee - 250); // slight deficit/recomp
  } else {
    targetCalories = Math.round(tdee); // maintenance
  }

  // Keep calories at a safe minimum (1200 for females, 1500 for males)
  const safeMinimum = sex === "female" ? 1200 : 1500;
  targetCalories = Math.max(safeMinimum, targetCalories);

  // 4. Macronutrient Breakdown
  let proteinPerKg = 1.8;
  if (goal === "gain_muscle") {
    proteinPerKg = 2.2;
  } else if (goal === "lose_weight") {
    proteinPerKg = 2.0; // preserve muscle in deficit
  } else if (goal === "aesthetics") {
    proteinPerKg = 2.1;
  }

  const proteinGrams = Math.round(weight * proteinPerKg);
  const proteinCalories = proteinGrams * 4;

  // Fat: 25% of total calories
  const fatCalories = targetCalories * 0.25;
  const fatGrams = Math.round(fatCalories / 9);

  // Carbs: Remaining calories
  const remainingCalories = targetCalories - proteinCalories - fatCalories;
  const carbsGrams = Math.round(Math.max(30, remainingCalories / 4));

  return {
    calories: targetCalories,
    protein: proteinGrams,
    carbs: carbsGrams,
    fat: fatGrams
  };
}
