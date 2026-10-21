import { FoodItem } from "../types";
import { GLOBAL_FOODS_DB, getDefaultServingInfo } from "../utils/fitnessUtils";
import { STAPLE_FOODS_DB } from "../data/stapleFoods";
import { getBarcodeCorrection } from "./dbService";

const DEFAULT_USDA_API_KEY = "DEMO_KEY";
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const OFF_BASE_URL = "https://world.openfoodfacts.org";

/**
 * Resolves the USDA API key to use.
 * Checks Vite env first, then localStorage, and falls back to DEMO_KEY.
 */
export const getUsdaApiKey = (): string => {
  const envKey = import.meta.env.VITE_USDA_API_KEY;
  if (envKey && envKey.trim() !== "") {
    return envKey;
  }
  const localKey = localStorage.getItem("trophia_usda_api_key");
  if (localKey && localKey.trim() !== "") {
    return localKey;
  }
  return DEFAULT_USDA_API_KEY;
};

/**
 * Helper to safely parse nutrient numbers handling commas (e.g. "25,4"), spaces, and strings.
 */
function parseNutrientValue(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const cleaned = val.replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Resolves the real serving size string and normalized 100g/100ml macros from an Open Food Facts product object.
 */
function parseOffProduct(p: any, barcode?: string): FoodItem {
  const nut = p.nutriments || {};

  let calories = parseNutrientValue(nut["energy-kcal_100g"] ?? nut["energy-kcal"]);
  if (calories === 0 && parseNutrientValue(nut["energy-kj_100g"]) > 0) {
    calories = Math.round(parseNutrientValue(nut["energy-kj_100g"]) / 4.184);
  }
  let protein = parseNutrientValue(nut.proteins_100g ?? nut.proteins);
  let carbs = parseNutrientValue(nut.carbohydrates_100g ?? nut.carbohydrates);
  let fat = parseNutrientValue(nut.fat_100g ?? nut.fat);

  // Extract serving size
  let servingSize = "100g";
  if (p.serving_size && typeof p.serving_size === "string" && p.serving_size.trim() !== "") {
    servingSize = p.serving_size.trim();
  } else if (p.serving_quantity && Number(p.serving_quantity) > 0) {
    const unit = (p.serving_quantity_unit || "g").trim();
    servingSize = `${p.serving_quantity} ${unit}`;
  } else if (p.quantity && typeof p.quantity === "string" && p.quantity.trim() !== "") {
    const match = p.quantity.match(/^(\d+(?:\.\d+)?)\s*(g|ml|cl|l|kg)$/i);
    if (match) {
      servingSize = p.quantity.trim();
    }
  }

  // If 100g macros were missing but serving macros exist, calculate the 100g base from the serving size
  if (calories === 0 && parseNutrientValue(nut["energy-kcal_serving"]) > 0) {
    const servingMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(?:g|ml)/i);
    const servingGrams = servingMatch ? parseFloat(servingMatch[1]) : (Number(p.serving_quantity) || 0);
    if (servingGrams > 0) {
      const factor = 100 / servingGrams;
      calories = Math.round(parseNutrientValue(nut["energy-kcal_serving"]) * factor);
      protein = Number((parseNutrientValue(nut.proteins_serving) * factor).toFixed(1));
      carbs = Number((parseNutrientValue(nut.carbohydrates_serving) * factor).toFixed(1));
      fat = Number((parseNutrientValue(nut.fat_serving) * factor).toFixed(1));
    }
  }

  // Detect if nutritional registry in Open Food Facts has suspicious/impossible values
  let hasNutritionWarning = false;
  let nutritionWarningReason = "";
  const issues: string[] = [];

  if (carbs > 100) issues.push(`Carbohidratos sospechosos (${carbs}g en 100g)`);
  if (protein > 100) issues.push(`Proteínas sospechosas (${protein}g en 100g)`);
  if (fat > 100) issues.push(`Grasas sospechosas (${fat}g en 100g)`);
  if (calories > 900) issues.push(`Calorías sospechosas (${calories} kcal en 100g)`);
  if (carbs + protein + fat > 105) issues.push(`Suma de macros excede 100g (${(carbs + protein + fat).toFixed(1)}g)`);

  if (issues.length > 0) {
    hasNutritionWarning = true;
    nutritionWarningReason = issues.join(", ");
  }

  // Heuristic safeguard: if values exceed physical 100g, do a provisional 10x division to prevent UI overflow,
  // but keep hasNutritionWarning = true so the user is informed to verify and edit.
  if (carbs > 100 && carbs <= 1000) carbs = carbs / 10;
  if (protein > 100 && protein <= 1000) protein = protein / 10;
  if (fat > 100 && fat <= 1000) fat = fat / 10;
  // In 100g of food, max calories is 900 kcal (pure fat).
  if (calories > 900 && calories <= 9000) calories = Math.round(calories / 10);

  // Parse portion metrics
  let unitWeight = 100;
  let unitLabel = "porción";
  let portionGrams = 100;
  let portionValue = 100;
  let portionUnit: "g" | "ml" | "unit" = "g";

  const servingMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
  if (servingMatch) {
    const parsedG = parseFloat(servingMatch[1]);
    if (parsedG > 0 && parsedG !== 100) {
      portionGrams = parsedG;
      unitWeight = parsedG;
      portionValue = parsedG;
      portionUnit = servingMatch[2].toLowerCase() === "ml" ? "ml" : "g";
    }
  } else {
    // Check smart defaults for sauces, condiments and common staples
    const info = getDefaultServingInfo(p.product_name || "", servingSize);
    if (info.unitWeight && info.unitWeight !== 100) {
      unitWeight = info.unitWeight;
      portionGrams = info.unitWeight;
      portionValue = info.defaultUnit === "unit" ? 1 : info.unitWeight;
      portionUnit = info.defaultUnit;
      unitLabel = info.unitLabel;
      if (!servingSize || servingSize === "100g") {
        servingSize = `${info.unitWeight}g (${info.unitLabel})`;
      }
    }
  }

  return {
    name: p.product_name,
    brand: p.brands || undefined,
    image: p.image_front_url || undefined,
    barcode: barcode || p.code || p._id || undefined,
    calories: Math.round(calories),
    protein: Number(protein.toFixed(1)),
    carbs: Number(carbs.toFixed(1)),
    fat: Number(fat.toFixed(1)),
    servingSize: servingSize,
    source: "off" as const,
    raw100gCalories: Math.round(calories),
    raw100gProtein: Number(protein.toFixed(1)),
    raw100gCarbs: Number(carbs.toFixed(1)),
    raw100gFat: Number(fat.toFixed(1)),
    portionGrams: portionGrams,
    portionValue: portionValue,
    portionUnit: portionUnit,
    unitWeight: unitWeight,
    unitLabel: unitLabel,
    hasNutritionWarning: hasNutritionWarning,
    nutritionWarningReason: nutritionWarningReason || undefined
  };
}

/**
 * Queries Open Food Facts for branded products matching the query.
 */
export const searchOpenFoodFacts = async (query: string): Promise<FoodItem[]> => {
  if (!query || query.trim().length < 2) return [];

  try {
    const response = await fetch(
      `${OFF_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=true&page_size=12`
    );
    if (!response.ok) throw new Error(`Open Food Facts HTTP error ${response.status}`);
    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) return [];

    return data.products
      .filter((p: any) => p.product_name && p.product_name.trim() !== "")
      .map((p: any) => parseOffProduct(p));
  } catch (error) {
    console.error("Error searching Open Food Facts:", error);
    return [];
  }
};

/**
 * Queries USDA FoodData Central for generic and natural foods matching the query.
 * Routes through Trophia's local backend proxy to protect the USDA API Key.
 */
export const searchUsdaFoods = async (query: string, apiKey?: string): Promise<FoodItem[]> => {
  if (!query || query.trim().length < 2) return [];

  // Pass custom apiKey if configured in settings, otherwise let backend use server key or DEMO_KEY
  const keyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : "";
  try {
    const url = `/api/usda/search?query=${encodeURIComponent(query)}${keyParam}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`USDA HTTP error ${response.status}`);
    const data = await response.json();

    if (!data.foods || !Array.isArray(data.foods)) return [];

    return data.foods.map((food: any) => {
      const getNutrient = (id: number): number => {
        const n = food.foodNutrients?.find((nut: any) => nut.nutrientId === id);
        return n ? Number(n.value) || 0 : 0;
      };

      return {
        name: food.description,
        calories: Math.round(getNutrient(1008)),
        protein: getNutrient(1003),
        carbs: getNutrient(1005),
        fat: getNutrient(1004),
        servingSize: "100g",
        source: "usda" as const
      };
    });
  } catch (error) {
    console.error("Error searching USDA foods:", error);
    return [];
  }
};

/**
 * Fetches a product from Trophia community Firestore first, then Open Food Facts.
 */
export const getProductByBarcode = async (barcode: string): Promise<FoodItem | null> => {
  if (!barcode || barcode.trim() === "") return null;
  const cleanCode = barcode.trim();

  // 1. Check Trophia Community Firestore Database first
  try {
    const communityProduct = await getBarcodeCorrection(cleanCode);
    if (communityProduct && communityProduct.name) {
      let uWeight = communityProduct.unitWeight && communityProduct.unitWeight > 0 ? communityProduct.unitWeight : 100;
      let uLabel = communityProduct.unitLabel || "porción";

      // If stored with 100g unitWeight but is a known sauce/condiment (e.g. ketchup, mayo, mostaza)
      if (uWeight === 100) {
        const info = getDefaultServingInfo(communityProduct.name, communityProduct.servingSize || "");
        if (info.unitWeight && info.unitWeight !== 100) {
          uWeight = info.unitWeight;
          uLabel = info.unitLabel;
        }
      }

      const isCustomPortion = uWeight !== 100;

      return {
        name: communityProduct.name,
        brand: communityProduct.brand || "Comunidad Trophia",
        calories: communityProduct.calories,
        protein: communityProduct.protein,
        carbs: communityProduct.carbs,
        fat: communityProduct.fat,
        servingSize: communityProduct.servingSize || (isCustomPortion ? `${uWeight}g` : "100g"),
        barcode: cleanCode,
        source: "local" as const,
        raw100gCalories: communityProduct.calories,
        raw100gProtein: communityProduct.protein,
        raw100gCarbs: communityProduct.carbs,
        raw100gFat: communityProduct.fat,
        portionGrams: uWeight,
        portionValue: isCustomPortion ? 1 : 100,
        portionUnit: isCustomPortion ? "unit" as const : "g" as const,
        unitWeight: uWeight,
        unitLabel: uLabel
      };
    }
  } catch (dbErr) {
    console.warn("Could not check community barcode cache:", dbErr);
  }

  // 2. Check Open Food Facts
  try {
    const response = await fetch(`${OFF_BASE_URL}/api/v2/product/${cleanCode}.json`);
    if (!response.ok) throw new Error(`Open Food Facts Barcode HTTP error ${response.status}`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      return parseOffProduct(data.product, cleanCode);
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return null;
  }
};

/**
 * Normalizes text removing accents, diacritics and casing for reliable searching.
 * (e.g. "limon" matches "Limón", "oregano" matches "Orégano")
 */
export function normalizeFoodName(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Performs a combined search across Local Staple DB, History, USDA, and Open Food Facts.
 * Prioritizes staple raw/cooked ingredients at the top with smart ranking.
 */
export const searchAllFoods = async (
  query: string,
  localHistory: FoodItem[] = [],
  customUsdaKey?: string
): Promise<FoodItem[]> => {
  const trimmed = query.trim();
  const normQuery = normalizeFoodName(trimmed);
  if (normQuery === "") return [];

  // 1. Search Local Staples DB (sorted by relevance: items starting with query first)
  const stapleMatches = STAPLE_FOODS_DB.filter((food) => {
    const normName = normalizeFoodName(food.name);
    return normName.includes(normQuery);
  }).sort((a, b) => {
    const aNorm = normalizeFoodName(a.name);
    const bNorm = normalizeFoodName(b.name);
    const aStarts = aNorm.startsWith(normQuery);
    const bStarts = bNorm.startsWith(normQuery);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  }).map((food) => ({
    ...food,
    source: "local" as const
  }));

  // 2. Search Global general DB
  const localDbMatches = GLOBAL_FOODS_DB.filter((food) => {
    const normName = normalizeFoodName(food.name);
    return normName.includes(normQuery) &&
      !stapleMatches.some(s => normalizeFoodName(s.name) === normName);
  }).map((food) => ({
    ...food,
    source: "local" as const
  }));

  // 3. Search Local History
  const historyMatches = localHistory.filter((food) =>
    normalizeFoodName(food.name).includes(normQuery)
  ).map((food) => ({
    ...food,
    source: "history" as const
  }));

  // Trigger API searches in parallel
  const [usdaResults, offResults] = await Promise.all([
    searchUsdaFoods(query, customUsdaKey),
    searchOpenFoodFacts(query)
  ]);

  // Combine results with clear priority: History -> Staples -> Local DB -> USDA -> OFF
  const allResults = [
    ...historyMatches,
    ...stapleMatches,
    ...localDbMatches,
    ...usdaResults,
    ...offResults
  ];

  // Remove duplicates by name and brand (case-insensitive)
  const seen = new Set<string>();
  const uniqueResults: FoodItem[] = [];

  for (const item of allResults) {
    const key = `${item.name.toLowerCase()}-${item.brand?.toLowerCase() || ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(item);
    }
  }

  return uniqueResults;
};
