import { FoodItem } from "../types";
import { GLOBAL_FOODS_DB } from "../utils/fitnessUtils";

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
      .map((p: any) => {
        const nut = p.nutriments || {};
        return {
          name: p.product_name,
          brand: p.brands || undefined,
          image: p.image_front_url || undefined,
          barcode: p.code || p._id || undefined,
          calories: Math.round(Number(nut["energy-kcal_100g"]) || 0),
          protein: Number(nut.proteins_100g) || 0,
          carbs: Number(nut.carbohydrates_100g) || 0,
          fat: Number(nut.fat_100g) || 0,
          servingSize: "100g",
          source: "off" as const
        };
      });
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
 * Fetches a product from Open Food Facts using its barcode.
 */
export const getProductByBarcode = async (barcode: string): Promise<FoodItem | null> => {
  if (!barcode || barcode.trim() === "") return null;

  try {
    const response = await fetch(`${OFF_BASE_URL}/api/v2/product/${barcode}.json`);
    if (!response.ok) throw new Error(`Open Food Facts Barcode HTTP error ${response.status}`);
    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const nut = p.nutriments || {};
      return {
        name: p.product_name,
        brand: p.brands || undefined,
        image: p.image_front_url || undefined,
        barcode: barcode,
        calories: Math.round(Number(nut["energy-kcal_100g"]) || 0),
        protein: Number(nut.proteins_100g) || 0,
        carbs: Number(nut.carbohydrates_100g) || 0,
        fat: Number(nut.fat_100g) || 0,
        servingSize: "100g",
        source: "off" as const
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    throw error;
  }
};

/**
 * Performs a combined search across Local DB, History, USDA, and Open Food Facts.
 * Filters duplicate names and prioritizes local history.
 */
export const searchAllFoods = async (
  query: string,
  localHistory: FoodItem[] = [],
  customUsdaKey?: string
): Promise<FoodItem[]> => {
  const trimmed = query.trim().toLowerCase();
  if (trimmed === "") return [];

  // 1. Search Local static DB
  const localDbMatches = GLOBAL_FOODS_DB.filter((food) =>
    food.name.toLowerCase().includes(trimmed)
  ).map((food) => ({
    ...food,
    source: "local" as const
  }));

  // 2. Search Local History
  const historyMatches = localHistory.filter((food) =>
    food.name.toLowerCase().includes(trimmed)
  ).map((food) => ({
    ...food,
    source: "history" as const
  }));

  // Trigger API searches in parallel
  const [usdaResults, offResults] = await Promise.all([
    searchUsdaFoods(query, customUsdaKey),
    searchOpenFoodFacts(query)
  ]);

  // Combine results: History -> Local DB -> USDA -> OFF
  const allResults = [...historyMatches, ...localDbMatches, ...usdaResults, ...offResults];

  // Remove duplicates by name (case-insensitive)
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
