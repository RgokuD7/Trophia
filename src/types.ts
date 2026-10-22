export type BiologicalSex = "male" | "female";
export type FitnessGoal = "lose_weight" | "gain_muscle" | "aesthetics" | "maintenance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type TrainingEnvironment = "gym" | "home" | "outdoor";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type DietType = "standard" | "vegetarian" | "vegan" | "keto" | "paleo" | "mediterranean" | "other";

export interface UserProfile {
  name: string;
  age: number;
  birthdate?: string; // Format YYYY-MM-DD
  sex: BiologicalSex;
  weight: number; // in kg
  height: number; // in cm
  neck?: number; // in cm, for Navy formula
  waist?: number; // in cm, for Navy formula
  hip?: number; // in cm, optional for female Navy formula
  bodyFat?: number; // percentage
  bmi: number;
  goal: FitnessGoal;
  level: ExperienceLevel;
  environment: TrainingEnvironment;
  equipment: string[];
  nutritionKnowledge: "low" | "medium" | "high";
  dietType?: DietType;
  customDiet?: string;
  dailyCalorieTarget: number;
  proteinTarget: number; // in grams
  carbsTarget: number; // in grams
  fatTarget: number; // in grams
  apiKey?: string;
  usdaApiKey?: string;
  isOnboardingCompleted: boolean;
  allergies?: string[];
  customAllergies?: string;
  pantry?: PantryItem[];
  theme: "light" | "dark";
  takesCreatine?: boolean;
  lastCreatineIntake?: string; // Format YYYY-MM-DD
  creatineDailyDose?: number; // In grams (default 5g)
  creatineHistory?: string[]; // Array of YYYY-MM-DD strings when creatine was consumed
  creatineStartingMode?: "new" | "already_saturated";
  favoriteExercises?: string[];
  sleepLogs?: { date: string; hours: number; quality: number }[];
  moodLogs?: { date: string; mood: number; energy: number; notes?: string }[];
  frequentRoutes?: FrequentRoute[];
  activeRoutesToday?: { routeId: string; date: string }[];
  loggedSportsToday?: LoggedSport[];
  weeklyTrainingDays?: number;
  environments?: TrainingEnvironment[];
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor";
  stepsRange?: "under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k";
  deficitPace?: "conservative" | "moderate" | "aggressive";
  solidMealsCount?: number;
  parqAnswers?: {
    q1: boolean;
    q2: boolean;
    q3: boolean;
    q4: boolean;
    q5: boolean;
    q6: boolean;
    q7: boolean;
  };
  requiresMedicalClearance?: boolean;
  jointPainAreas?: ("knee" | "back" | "shoulder")[];
  customJointPain?: string;
  workoutPreferencesNotes?: string;
  homeEquipmentNotes?: string;
  customEquipment?: string[];
  isWorkoutsOnboardingCompleted?: boolean;
  weeklyRoutinePlan?: WeeklyRoutinePlan;
  trainingAge?: ExperienceLevel;

  aiRecommendations?: {
    summary: string;
    nutritionAdvice: string;
    trainingAdvice: string;
    healthCheck: string;
    lastUpdated: string;
  };

  calorieBankPlan?: {
    eventDate: string;
    eventDescription?: string;
    extraCaloriesTarget: number;
    dailyAdjustment: number;
    startDate: string;
    isActive: boolean;
  };

  bodyMetricLogs?: BodyMetricLog[];
  householdId?: string;
  householdName?: string;
  householdInviteCode?: string;
}

export interface BodyMetricLog {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // in kg
  bodyFat?: number; // percentage
  neck?: number;
  waist?: number;
  hip?: number;
  method?: "manual" | "ai_scan" | "navy" | "caliper";
  notes?: string;
}

export interface MealBuilderIngredient {
  id: string;
  name: string;
  amount: number;
  unit: "g" | "ml" | "unit";
  unitLabel: string; // e.g. "rebanada", "unidad", "g", "ml"
  equivalentGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  raw100gCalories: number;
  raw100gProtein: number;
  raw100gCarbs: number;
  raw100gFat: number;
  unitWeight: number;
  barcode?: string;
  hasNutritionWarning?: boolean;
  nutritionWarningReason?: string;
}

export interface LoggedMeal {
  id: string;
  name: string;
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  timestamp: string; // ISO string
  type: MealType;
  servingSize?: string;
  compositeIngredients?: MealBuilderIngredient[];
  raw100gCalories?: number;
  raw100gProtein?: number;
  raw100gCarbs?: number;
  raw100gFat?: number;
  portionGrams?: number;
  portionValue?: number;
  portionUnit?: "g" | "ml" | "unit";
  unitWeight?: number;
  unitLabel?: string;
  barcode?: string;
}

export interface WaterLog {
  id: string;
  amount: number; // in ml
  timestamp: string; // ISO string
}

export type ExerciseTrackingType = "reps" | "time" | "distance";

export interface CustomExercise {
  id: string;
  name: string;
  normalizedName?: string;
  trackingType: ExerciseTrackingType; // "reps" | "time" | "distance"
  defaultSets: number;
  defaultReps: number; // reps or seconds
  defaultWeight: number; // in kg (0 if bodyweight)
  primaryMuscles: string[]; // e.g. ["Pectoral", "Tríceps"]
  secondaryMuscles?: string[]; // e.g. ["Deltoides anterior"]
  techniqueTips?: string; // ejecución, postura y seguridad
  caloriesBurnedPerSet: number; // gasto calórico estimado conservador
  equipmentNeeded?: string; // e.g. "Mancuernas", "Barra", "Peso corporal"
  createdAt: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  trackingType?: ExerciseTrackingType;
  sets: number;
  reps: number; // reps or seconds if trackingType === "time"
  weight: number; // in kg (0 if bodyweight)
  caloriesBurnedPerSet: number; // conservative estimation
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  techniqueTips?: string;
  equipmentNeeded?: string;
  restSeconds?: number; // descanso sugerido entre series en segundos (ej: 60, 90, 120)
  completedSets: {
    setIndex: number;
    completed: boolean;
    reps: number;
    weight: number;
  }[];
}

export interface WorkoutSession {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  warmup: string[]; // warm-up mobility exercises
  exercises: WorkoutExercise[];
  cooldown: string[]; // cool-down stretches
  completed: boolean;
  durationMinutes: number;
  startTime?: string; // ISO timestamp when user clicked Iniciar
  endTime?: string;   // ISO timestamp when workout was completed
  caloriesBurned?: number; // total kcal quemadas (sumatoria base o recalculo IA)
  totalVolumeKg?: number; // tonelaje total levantado en kg
  caloriesBreakdown?: string; // explicación del gasto calórico por la IA
  recalculatedWithIA?: boolean;
}

export type RoutineDayKey = 
  | "monday" 
  | "tuesday" 
  | "wednesday" 
  | "thursday" 
  | "friday" 
  | "saturday" 
  | "sunday" 
  | "unassigned";

export interface RoutineTemplate {
  id: string;
  name: string;
  focus: string; // e.g. "Pecho, Hombro y Tríceps"
  assignedDay?: RoutineDayKey;
  warmup: string[];
  exercises: WorkoutExercise[];
  cooldown: string[];
  restBetweenExercisesSeconds?: number; // descanso sugerido antes del sig ejercicio
}

export interface WeeklyRoutinePlan {
  planName: string;
  description: string;
  weeklyDaysCount: number;
  routines: RoutineTemplate[];
  createdAt: string;
  lastUpdated?: string;
}

export interface MuscleRecovery {
  chest: number; // 0 to 100
  back: number;
  legs: number;
  shoulders: number;
  arms: number;
  core: number;
  lastUpdated: string; // ISO string
}

export interface FoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  source?: "local" | "history" | "usda" | "off" | "ai";
  brand?: string;
  image?: string;
  barcode?: string;
  ingredients?: string[];
  raw100gCalories?: number;
  raw100gProtein?: number;
  raw100gCarbs?: number;
  raw100gFat?: number;
  portionGrams?: number;
  portionValue?: number;
  portionUnit?: "g" | "ml" | "unit";
  unitWeight?: number;
  unitLabel?: string;
  portionCalories?: number;
  portionProtein?: number;
  portionCarbs?: number;
  portionFat?: number;
  hasNutritionWarning?: boolean;
  nutritionWarningReason?: string;
}

export interface FrequentRoute {
  id: string;
  name: string;
  distanceKm: number;
  activityType: "walking" | "running" | "cycling";
  caloriesBurned: number;
}

export interface LoggedSport {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  date: string; // YYYY-MM-DD
  sportKey?: string;
  intensity?: "low" | "moderate" | "high";
  notes?: string;
}

export interface CustomFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  category?: "dish" | "product" | "recipe";
  createdAt: string;
  raw100gCalories?: number;
  raw100gProtein?: number;
  raw100gCarbs?: number;
  raw100gFat?: number;
  portionGrams?: number;
  unitWeight?: number;
  unitLabel?: string;
  barcode?: string;
}

export interface BarcodeCorrection {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string;
  unitWeight?: number;
  unitLabel?: string;
  portionCalories?: number;
  portionProtein?: number;
  portionCarbs?: number;
  portionFat?: number;
  frontImageUrl?: string;
  nutritionTableImageUrl?: string;
  contributedBy?: string;
  yesVotes: number;
  noVotes: number;
  updatedAt?: any;
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category?: "protein" | "carb" | "fat" | "supplement" | "other";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface HouseholdMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface HouseholdGroup {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: HouseholdMember[];
  pantry: PantryItem[];
  updatedAt: string;
}

export interface SavedRecipe {
  id: string;
  userId: string;
  authorName?: string;
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTimeMinutes?: number;
  difficulty?: "Fácil" | "Media" | "Difícil" | string;
  ingredients: { name: string; amount: string; calories?: number }[];
  instructions: string[];
  tips?: string[];
  isPublic?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CoachChatMessage {
  id: string;
  sender: "user" | "coach";
  text: string;
  timestamp: string;
  suggestedAction?: {
    type: "meal" | "recipe";
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType?: MealType;
    ingredients?: string[];
    instructions?: string[];
  };
  actionApplied?: "logged_meal" | "saved_recipe" | "both";
}

