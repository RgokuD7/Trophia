import { FoodItem } from "../types";

/**
 * Catálogo enriquecido de materias primas e ingredientes básicos cotidianos.
 * Valores normalizados por cada 100g o 100ml, con información de porción sugerida real.
 * Cubre carnes y granos en formato CRUDO y COCIDO, lácteos, huevos, frutas y verduras.
 */
export const STAPLE_FOODS_DB: FoodItem[] = [
  // ==========================================
  // HUEVOS Y SUBPRODUCTOS
  // ==========================================
  {
    name: "Huevo de Gallina (Crudo / Fresco)",
    calories: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    servingSize: "1 unidad (50g)",
    source: "local"
  },
  {
    name: "Huevo Cocido (Hervido / Duro)",
    calories: 155,
    protein: 13,
    carbs: 1.1,
    fat: 11,
    servingSize: "1 unidad (50g)",
    source: "local"
  },
  {
    name: "Huevo Frito (con poco aceite)",
    calories: 196,
    protein: 13.6,
    carbs: 0.8,
    fat: 15.3,
    servingSize: "1 unidad (55g)",
    source: "local"
  },
  {
    name: "Huevo Revuelto (Simple)",
    calories: 149,
    protein: 10,
    carbs: 1.6,
    fat: 11,
    servingSize: "1 porción (100g)",
    source: "local"
  },
  {
    name: "Clara de Huevo (Cruda)",
    calories: 52,
    protein: 11,
    carbs: 0.7,
    fat: 0.2,
    servingSize: "1 unidad (33g)",
    source: "local"
  },
  {
    name: "Clara de Huevo Cocida",
    calories: 52,
    protein: 11,
    carbs: 0.7,
    fat: 0.2,
    servingSize: "1 unidad (33g)",
    source: "local"
  },
  {
    name: "Yema de Huevo",
    calories: 322,
    protein: 16,
    carbs: 3.6,
    fat: 27,
    servingSize: "1 unidad (17g)",
    source: "local"
  },

  // ==========================================
  // AVES (CRUDAS Y COCIDAS)
  // ==========================================
  {
    name: "Pechuga de Pollo Cruda (Sin piel)",
    calories: 110,
    protein: 23.1,
    carbs: 0,
    fat: 1.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Pechuga de Pollo a la Plancha (Cocida)",
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Pechuga de Pollo Hervida / Desmenuzada",
    calories: 150,
    protein: 29,
    carbs: 0,
    fat: 3.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Trutro de Pollo Crudo (Muslo sin piel)",
    calories: 121,
    protein: 19.5,
    carbs: 0,
    fat: 4.7,
    servingSize: "1 unidad (120g)",
    source: "local"
  },
  {
    name: "Trutro de Pollo Cocido (Sin piel)",
    calories: 174,
    protein: 24,
    carbs: 0,
    fat: 8,
    servingSize: "1 unidad (90g)",
    source: "local"
  },
  {
    name: "Pechuga de Pavo Cruda",
    calories: 104,
    protein: 24,
    carbs: 0,
    fat: 1,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Pechuga de Pavo Cocida / Horno",
    calories: 135,
    protein: 30,
    carbs: 0,
    fat: 1.5,
    servingSize: "100g",
    source: "local"
  },

  // ==========================================
  // CARNES VACUNO Y CERDO (CRUDAS Y COCIDAS)
  // ==========================================
  {
    name: "Carne Molida Vacuno 4% Grasa (Cruda)",
    calories: 120,
    protein: 21,
    carbs: 0,
    fat: 4,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Carne Molida Vacuno 7% Grasa (Cruda)",
    calories: 145,
    protein: 20.5,
    carbs: 0,
    fat: 7,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Carne Molida Vacuno 10% Grasa (Cruda)",
    calories: 168,
    protein: 20,
    carbs: 0,
    fat: 10,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Carne Molida Vacuno Cocida (Magra)",
    calories: 195,
    protein: 26,
    carbs: 0,
    fat: 9.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Posta Negra Cruda (Vacuno magro)",
    calories: 125,
    protein: 21.5,
    carbs: 0,
    fat: 4.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Posta Negra Cocida / A la plancha",
    calories: 175,
    protein: 28,
    carbs: 0,
    fat: 6.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Posta Rosada Cruda",
    calories: 128,
    protein: 21.2,
    carbs: 0,
    fat: 4.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Lomo Liso Vacuno (Crudo)",
    calories: 180,
    protein: 20,
    carbs: 0,
    fat: 11,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Lomo Liso Cocido / Parrilla",
    calories: 220,
    protein: 27,
    carbs: 0,
    fat: 12,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Lomo Vetado Vacuno (Crudo)",
    calories: 240,
    protein: 18,
    carbs: 0,
    fat: 18,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Filete de Vacuno (Crudo)",
    calories: 140,
    protein: 22,
    carbs: 0,
    fat: 5.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Filete de Vacuno Cocido",
    calories: 190,
    protein: 29,
    carbs: 0,
    fat: 7.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Pulpa de Cerdo Magra (Cruda)",
    calories: 140,
    protein: 21,
    carbs: 0,
    fat: 6,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Pulpa de Cerdo Cocida",
    calories: 185,
    protein: 27,
    carbs: 0,
    fat: 8,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Chuleta de Cerdo (Cruda)",
    calories: 196,
    protein: 19,
    carbs: 0,
    fat: 13,
    servingSize: "1 unidad (150g)",
    source: "local"
  },

  // ==========================================
  // PESCADOS Y MARISCOS
  // ==========================================
  {
    name: "Filete de Salmón (Crudo)",
    calories: 182,
    protein: 20,
    carbs: 0,
    fat: 11,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Filete de Salmón al Horno / Plancha",
    calories: 208,
    protein: 22,
    carbs: 0,
    fat: 13,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Merluza / Pescado Blanco (Crudo)",
    calories: 78,
    protein: 17,
    carbs: 0,
    fat: 0.9,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Merluza Cocida / Al vapor",
    calories: 90,
    protein: 19,
    carbs: 0,
    fat: 1.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Reineta Fresca (Cruda)",
    calories: 85,
    protein: 18,
    carbs: 0,
    fat: 1.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Reineta a la Plancha",
    calories: 110,
    protein: 22,
    carbs: 0,
    fat: 2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Atún en Lata al Natural",
    calories: 116,
    protein: 26,
    carbs: 0,
    fat: 1,
    servingSize: "1 lata (120g)",
    source: "local"
  },
  {
    name: "Atún en Lata en Aceite (Escurrido)",
    calories: 190,
    protein: 26,
    carbs: 0,
    fat: 9,
    servingSize: "1 lata (120g)",
    source: "local"
  },
  {
    name: "Jurel en Lata al Natural",
    calories: 135,
    protein: 19,
    carbs: 0,
    fat: 6.5,
    servingSize: "1 porción (100g)",
    source: "local"
  },
  {
    name: "Camarones / Gambas Cocidas",
    calories: 99,
    protein: 21,
    carbs: 0.2,
    fat: 1.1,
    servingSize: "100g",
    source: "local"
  },

  // ==========================================
  // LÁCTEOS Y QUESOS
  // ==========================================
  {
    name: "Leche Entera (Líquida fluida)",
    calories: 61,
    protein: 3.1,
    carbs: 4.7,
    fat: 3.2,
    servingSize: "1 vaso (200ml)",
    source: "local"
  },
  {
    name: "Leche Semidescremada",
    calories: 46,
    protein: 3.1,
    carbs: 4.8,
    fat: 1.5,
    servingSize: "1 vaso (200ml)",
    source: "local"
  },
  {
    name: "Leche Descremada (0% Grasa)",
    calories: 34,
    protein: 3.2,
    carbs: 4.9,
    fat: 0.1,
    servingSize: "1 vaso (200ml)",
    source: "local"
  },
  {
    name: "Leche Sin Lactosa Entera",
    calories: 60,
    protein: 3.1,
    carbs: 4.7,
    fat: 3.1,
    servingSize: "1 vaso (200ml)",
    source: "local"
  },
  {
    name: "Leche Sin Lactosa Descremada",
    calories: 35,
    protein: 3.2,
    carbs: 4.9,
    fat: 0.1,
    servingSize: "1 vaso (200ml)",
    source: "local"
  },
  {
    name: "Quesillo Chileno",
    calories: 96,
    protein: 12,
    carbs: 3.5,
    fat: 4,
    servingSize: "1 rebanada (30g)",
    source: "local"
  },
  {
    name: "Queso Fresco Light",
    calories: 98,
    protein: 12,
    carbs: 3.5,
    fat: 4,
    servingSize: "1 rebanada (30g)",
    source: "local"
  },
  {
    name: "Queso Gauda / Chanco Laminado",
    calories: 350,
    protein: 24,
    carbs: 1.5,
    fat: 28,
    servingSize: "1 rebanada (30g)",
    source: "local"
  },
  {
    name: "Queso Mozzarella",
    calories: 280,
    protein: 22,
    carbs: 2.2,
    fat: 21,
    servingSize: "1 rebanada (30g)",
    source: "local"
  },
  {
    name: "Queso Parmesano Rallado",
    calories: 431,
    protein: 38,
    carbs: 4,
    fat: 29,
    servingSize: "1 cucharada (10g)",
    source: "local"
  },
  {
    name: "Queso Crema / Untable Tradicional",
    calories: 342,
    protein: 6,
    carbs: 4,
    fat: 34,
    servingSize: "1 porción (30g)",
    source: "local"
  },
  {
    name: "Queso Crema Light",
    calories: 175,
    protein: 8,
    carbs: 5,
    fat: 14,
    servingSize: "1 porción (30g)",
    source: "local"
  },
  {
    name: "Yogur Natural 0% / Descremado",
    calories: 45,
    protein: 4.5,
    carbs: 6,
    fat: 0.2,
    servingSize: "1 pote (125g)",
    source: "local"
  },
  {
    name: "Yogur Griego Natural 0%",
    calories: 59,
    protein: 10,
    carbs: 3.6,
    fat: 0.4,
    servingSize: "1 pote (125g)",
    source: "local"
  },
  {
    name: "Mantequilla con Sal / sin Sal",
    calories: 717,
    protein: 0.9,
    carbs: 0.1,
    fat: 81,
    servingSize: "1 porción (10g)",
    source: "local"
  },

  // ==========================================
  // ARROZ, PASTAS, GRANOS Y PANES
  // ==========================================
  {
    name: "Arroz Blanco (Crudo)",
    calories: 360,
    protein: 7,
    carbs: 79,
    fat: 0.6,
    servingSize: "1 taza cruda (100g)",
    source: "local"
  },
  {
    name: "Arroz Blanco Cocido",
    calories: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    servingSize: "1 taza cocida (150g)",
    source: "local"
  },
  {
    name: "Arroz Integral (Crudo)",
    calories: 350,
    protein: 7.5,
    carbs: 74,
    fat: 2.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Arroz Integral Cocido",
    calories: 111,
    protein: 2.6,
    carbs: 23,
    fat: 0.9,
    servingSize: "1 taza cocida (150g)",
    source: "local"
  },
  {
    name: "Fideos / Pasta de Trigo (Cruda)",
    calories: 355,
    protein: 12,
    carbs: 72,
    fat: 1.5,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Fideos / Pasta Cocida (Al dente)",
    calories: 140,
    protein: 5,
    carbs: 28,
    fat: 0.8,
    servingSize: "1 taza cocida (140g)",
    source: "local"
  },
  {
    name: "Avena Tradicional en Hojuelas (Cruda)",
    calories: 389,
    protein: 16.9,
    carbs: 66,
    fat: 6.9,
    servingSize: "1 porción (40g)",
    source: "local"
  },
  {
    name: "Avena Instantánea",
    calories: 380,
    protein: 14,
    carbs: 68,
    fat: 6,
    servingSize: "1 porción (40g)",
    source: "local"
  },
  {
    name: "Papa / Patata Cruda",
    calories: 77,
    protein: 2,
    carbs: 17,
    fat: 0.1,
    servingSize: "1 unidad mediana (150g)",
    source: "local"
  },
  {
    name: "Papa Cocida / Hervida",
    calories: 87,
    protein: 1.9,
    carbs: 20,
    fat: 0.1,
    servingSize: "1 unidad mediana (150g)",
    source: "local"
  },
  {
    name: "Puré de Papas Casero (con leche y mant.)",
    calories: 110,
    protein: 2,
    carbs: 18,
    fat: 3.5,
    servingSize: "1 taza (200g)",
    source: "local"
  },
  {
    name: "Camote / Batata Cruda",
    calories: 86,
    protein: 1.6,
    carbs: 20,
    fat: 0.1,
    servingSize: "1 unidad (150g)",
    source: "local"
  },
  {
    name: "Camote Asado / Cocido",
    calories: 90,
    protein: 2,
    carbs: 21,
    fat: 0.2,
    servingSize: "1 unidad (150g)",
    source: "local"
  },
  {
    name: "Pan Marraqueta (1 batido / media unidad)",
    calories: 270,
    protein: 9,
    carbs: 54,
    fat: 1.5,
    servingSize: "1 batido (50g)",
    source: "local"
  },
  {
    name: "Pan Marraqueta (1 unidad completa)",
    calories: 270,
    protein: 9,
    carbs: 54,
    fat: 1.5,
    servingSize: "1 unidad (100g)",
    source: "local"
  },
  {
    name: "Pan Hallulla",
    calories: 310,
    protein: 8.5,
    carbs: 57,
    fat: 5.5,
    servingSize: "1 unidad (100g)",
    source: "local"
  },
  {
    name: "Pan de Molde Blanco",
    calories: 260,
    protein: 8.5,
    carbs: 50,
    fat: 3,
    servingSize: "1 rebanada (25g)",
    source: "local"
  },
  {
    name: "Pan de Molde Integral",
    calories: 247,
    protein: 13,
    carbs: 41,
    fat: 3.4,
    servingSize: "1 rebanada (25g)",
    source: "local"
  },
  {
    name: "Pan Pita Blanco",
    calories: 265,
    protein: 9,
    carbs: 54,
    fat: 1.2,
    servingSize: "1 unidad (50g)",
    source: "local"
  },
  {
    name: "Pan Pita Integral",
    calories: 250,
    protein: 10,
    carbs: 49,
    fat: 1.8,
    servingSize: "1 unidad (50g)",
    source: "local"
  },
  {
    name: "Tortilla de Trigo / Rapidita (Fajita)",
    calories: 310,
    protein: 8,
    carbs: 52,
    fat: 7.5,
    servingSize: "1 unidad (30g)",
    source: "local"
  },
  {
    name: "Galletas de Arroz (Crackers)",
    calories: 385,
    protein: 8,
    carbs: 82,
    fat: 2.5,
    servingSize: "2 unidades (16g)",
    source: "local"
  },

  // ==========================================
  // LEGUMBRES
  // ==========================================
  {
    name: "Lentejas (Crudas)",
    calories: 350,
    protein: 25,
    carbs: 60,
    fat: 1,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Lentejas Cocidas",
    calories: 116,
    protein: 9,
    carbs: 20,
    fat: 0.4,
    servingSize: "1 taza cocida (180g)",
    source: "local"
  },
  {
    name: "Porotos / Frijoles Tórtola (Crudos)",
    calories: 340,
    protein: 22,
    carbs: 61,
    fat: 1.2,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Porotos / Frijoles Cocidos",
    calories: 127,
    protein: 8.7,
    carbs: 22.8,
    fat: 0.5,
    servingSize: "1 taza cocida (180g)",
    source: "local"
  },
  {
    name: "Garbanzos (Crudos)",
    calories: 364,
    protein: 19,
    carbs: 61,
    fat: 6,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Garbanzos Cocidos",
    calories: 164,
    protein: 8.9,
    carbs: 27,
    fat: 2.6,
    servingSize: "1 taza cocida (180g)",
    source: "local"
  },
  {
    name: "Arvejas Cocidas",
    calories: 81,
    protein: 5.4,
    carbs: 14.5,
    fat: 0.4,
    servingSize: "1 taza (150g)",
    source: "local"
  },

  // ==========================================
  // FRUTAS Y FRUTOS SECOS
  // ==========================================
  {
    name: "Palta / Aguacate Hass (Pulpa)",
    calories: 160,
    protein: 2,
    carbs: 8.5,
    fat: 14.7,
    servingSize: "1 unidad mediana (130g)",
    source: "local"
  },
  {
    name: "Plátano / Banana",
    calories: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    servingSize: "1 unidad (120g)",
    source: "local"
  },
  {
    name: "Manzana Roja / Verde",
    calories: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
    servingSize: "1 unidad (150g)",
    source: "local"
  },
  {
    name: "Naranja",
    calories: 47,
    protein: 0.9,
    carbs: 11.8,
    fat: 0.1,
    servingSize: "1 unidad (130g)",
    source: "local"
  },
  {
    name: "Frutillas / Fresas",
    calories: 32,
    protein: 0.7,
    carbs: 7.7,
    fat: 0.3,
    servingSize: "1 taza (150g)",
    source: "local"
  },
  {
    name: "Arándanos Frescos",
    calories: 57,
    protein: 0.7,
    carbs: 14.5,
    fat: 0.3,
    servingSize: "1 taza (140g)",
    source: "local"
  },
  {
    name: "Uvas Frescas",
    calories: 69,
    protein: 0.7,
    carbs: 18,
    fat: 0.2,
    servingSize: "1 taza (150g)",
    source: "local"
  },
  {
    name: "Sandía",
    calories: 30,
    protein: 0.6,
    carbs: 7.5,
    fat: 0.2,
    servingSize: "1 rebanada (200g)",
    source: "local"
  },
  {
    name: "Melón",
    calories: 34,
    protein: 0.8,
    carbs: 8.2,
    fat: 0.2,
    servingSize: "1 taza (160g)",
    source: "local"
  },
  {
    name: "Limón (Entero / Fruta fresca)",
    calories: 29,
    protein: 1.1,
    carbs: 9.3,
    fat: 0.3,
    servingSize: "1 unidad mediana (60g)",
    source: "local"
  },
  {
    name: "Lima / Limón Sutil",
    calories: 30,
    protein: 0.7,
    carbs: 10.5,
    fat: 0.2,
    servingSize: "1 unidad (50g)",
    source: "local"
  },
  {
    name: "Limón (Jugo)",
    calories: 22,
    protein: 0.4,
    carbs: 6.9,
    fat: 0.2,
    servingSize: "1 unidad (30ml)",
    source: "local"
  },
  {
    name: "Almendras",
    calories: 579,
    protein: 21,
    carbs: 22,
    fat: 49,
    servingSize: "1 puñado (30g)",
    source: "local"
  },
  {
    name: "Nueces",
    calories: 654,
    protein: 15,
    carbs: 14,
    fat: 65,
    servingSize: "1 puñado (30g)",
    source: "local"
  },
  {
    name: "Maní / Cacahuates Tostados (Sin sal)",
    calories: 567,
    protein: 26,
    carbs: 16,
    fat: 49,
    servingSize: "1 puñado (30g)",
    source: "local"
  },
  {
    name: "Mantequilla de Maní (100% natural)",
    calories: 588,
    protein: 25,
    carbs: 20,
    fat: 50,
    servingSize: "1 cucharada (20g)",
    source: "local"
  },

  // ==========================================
  // VERDURAS Y HORTALIZAS
  // ==========================================
  {
    name: "Tomate Fresco",
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    servingSize: "1 unidad mediana (120g)",
    source: "local"
  },
  {
    name: "Cebolla",
    calories: 40,
    protein: 1.1,
    carbs: 9.3,
    fat: 0.1,
    servingSize: "1 unidad mediana (100g)",
    source: "local"
  },
  {
    name: "Lechuga (Costina / Escarola)",
    calories: 15,
    protein: 1.4,
    carbs: 2.9,
    fat: 0.2,
    servingSize: "1 plato (80g)",
    source: "local"
  },
  {
    name: "Zanahoria Cruda",
    calories: 41,
    protein: 0.9,
    carbs: 9.6,
    fat: 0.2,
    servingSize: "1 unidad (80g)",
    source: "local"
  },
  {
    name: "Zanahoria Cocida",
    calories: 35,
    protein: 0.8,
    carbs: 8.2,
    fat: 0.2,
    servingSize: "1 unidad (80g)",
    source: "local"
  },
  {
    name: "Brócoli Crudo",
    calories: 34,
    protein: 2.8,
    carbs: 7,
    fat: 0.4,
    servingSize: "1 taza (90g)",
    source: "local"
  },
  {
    name: "Brócoli al Vapor / Cocido",
    calories: 35,
    protein: 2.4,
    carbs: 7.2,
    fat: 0.4,
    servingSize: "1 taza (150g)",
    source: "local"
  },
  {
    name: "Espinaca Cruda",
    calories: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
    servingSize: "1 taza (30g)",
    source: "local"
  },
  {
    name: "Espinaca Cocida",
    calories: 23,
    protein: 3,
    carbs: 3.8,
    fat: 0.3,
    servingSize: "1 taza cocida (180g)",
    source: "local"
  },
  {
    name: "Zapallo Italiano / Calabacín (Crudo)",
    calories: 17,
    protein: 1.2,
    carbs: 3.1,
    fat: 0.3,
    servingSize: "1 unidad (200g)",
    source: "local"
  },
  {
    name: "Zapallo Camote / Calabaza",
    calories: 26,
    protein: 1,
    carbs: 6.5,
    fat: 0.1,
    servingSize: "100g",
    source: "local"
  },
  {
    name: "Champiñones / Setas Frescas",
    calories: 22,
    protein: 3.1,
    carbs: 3.3,
    fat: 0.3,
    servingSize: "1 taza (70g)",
    source: "local"
  },
  {
    name: "Pimentón Rojo / Morrón",
    calories: 31,
    protein: 1,
    carbs: 6,
    fat: 0.3,
    servingSize: "1 unidad (120g)",
    source: "local"
  },
  {
    name: "Pepino con piel",
    calories: 15,
    protein: 0.7,
    carbs: 3.6,
    fat: 0.1,
    servingSize: "1 unidad (200g)",
    source: "local"
  },
  {
    name: "Apio",
    calories: 16,
    protein: 0.7,
    carbs: 3,
    fat: 0.2,
    servingSize: "1 taza picada (100g)",
    source: "local"
  },

  // ==========================================
  // ACEITES, GRASAS Y SALSAS
  // ==========================================
  {
    name: "Aceite de Oliva Extra Virgen",
    calories: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    servingSize: "1 cucharada (13ml)",
    source: "local"
  },
  {
    name: "Aceite Vegetal / Maravilla / Canola",
    calories: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    servingSize: "1 cucharada (13ml)",
    source: "local"
  },
  {
    name: "Mayonesa Tradicional",
    calories: 680,
    protein: 1,
    carbs: 2.5,
    fat: 75,
    servingSize: "1 cucharada (15g)",
    source: "local"
  },
  {
    name: "Mayonesa Light",
    calories: 280,
    protein: 0.8,
    carbs: 8,
    fat: 28,
    servingSize: "1 cucharada (15g)",
    source: "local"
  },
  {
    name: "Kétchup Tradicional",
    calories: 112,
    protein: 1.2,
    carbs: 26,
    fat: 0.1,
    servingSize: "1 porción (16g)",
    source: "local"
  },
  {
    name: "Mostaza Tradicional",
    calories: 66,
    protein: 4.4,
    carbs: 5.3,
    fat: 3.3,
    servingSize: "1 porción (10g)",
    source: "local"
  },
  {
    name: "Salsa de Soya / Soja",
    calories: 53,
    protein: 8,
    carbs: 4.9,
    fat: 0.1,
    servingSize: "1 cucharada (15ml)",
    source: "local"
  },
  {
    name: "Miel de Abeja Pura",
    calories: 304,
    protein: 0.3,
    carbs: 82,
    fat: 0,
    servingSize: "1 cucharada (20g)",
    source: "local"
  },
  {
    name: "Azúcar Blanca",
    calories: 387,
    protein: 0,
    carbs: 100,
    fat: 0,
    servingSize: "1 cucharadita (5g)",
    source: "local"
  },
  {
    name: "Proteína de Suero (Whey Protein)",
    calories: 390,
    protein: 80,
    carbs: 6.7,
    fat: 3.3,
    servingSize: "1 scoop (30g)",
    source: "local"
  },

  // ==========================================
  // HIERBAS, ESPECIAS Y CONDIMENTOS
  // ==========================================
  {
    name: "Orégano Seco",
    calories: 265,
    protein: 9,
    carbs: 69,
    fat: 4.3,
    servingSize: "1 cucharadita (2g)",
    source: "local"
  },
  {
    name: "Orégano Fresco",
    calories: 68,
    protein: 2.2,
    carbs: 15,
    fat: 1,
    servingSize: "1 porción (5g)",
    source: "local"
  },
  {
    name: "Cilantro Fresco",
    calories: 23,
    protein: 2.1,
    carbs: 3.7,
    fat: 0.5,
    servingSize: "1 taza picada (15g)",
    source: "local"
  },
  {
    name: "Perejil Fresco",
    calories: 36,
    protein: 3,
    carbs: 6.3,
    fat: 0.8,
    servingSize: "1 puñado (15g)",
    source: "local"
  },
  {
    name: "Albahaca Fresca",
    calories: 23,
    protein: 3.2,
    carbs: 2.7,
    fat: 0.6,
    servingSize: "5 hojas (10g)",
    source: "local"
  },
  {
    name: "Albahaca Seca",
    calories: 233,
    protein: 23,
    carbs: 48,
    fat: 4,
    servingSize: "1 cucharadita (2g)",
    source: "local"
  },
  {
    name: "Ajo Fresco",
    calories: 149,
    protein: 6.4,
    carbs: 33,
    fat: 0.5,
    servingSize: "1 diente (3g)",
    source: "local"
  },
  {
    name: "Ajo en Polvo",
    calories: 331,
    protein: 17,
    carbs: 73,
    fat: 0.7,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Cebolla en Polvo",
    calories: 341,
    protein: 10,
    carbs: 79,
    fat: 1,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Cebollín / Cebolla de Verdeo",
    calories: 32,
    protein: 1.8,
    carbs: 7.3,
    fat: 0.2,
    servingSize: "1 tallo (15g)",
    source: "local"
  },
  {
    name: "Comino Molido",
    calories: 375,
    protein: 18,
    carbs: 44,
    fat: 22,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Pimienta Negra Molida",
    calories: 251,
    protein: 10,
    carbs: 64,
    fat: 3.3,
    servingSize: "1 pizca (1g)",
    source: "local"
  },
  {
    name: "Pimienta Blanca",
    calories: 296,
    protein: 10.4,
    carbs: 68.6,
    fat: 2.1,
    servingSize: "1 pizca (1g)",
    source: "local"
  },
  {
    name: "Sal de Mesa / Sal Marina",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: "1 pizca (1g)",
    source: "local"
  },
  {
    name: "Pimentón Dulce / Paprika / Ají de Color",
    calories: 282,
    protein: 14,
    carbs: 54,
    fat: 13,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Ají Verde / Chile Fresco",
    calories: 40,
    protein: 1.9,
    carbs: 8.8,
    fat: 0.4,
    servingSize: "1 unidad (45g)",
    source: "local"
  },
  {
    name: "Canela en Polvo",
    calories: 247,
    protein: 4,
    carbs: 81,
    fat: 1.2,
    servingSize: "1 cucharadita (2.5g)",
    source: "local"
  },
  {
    name: "Jengibre Fresco",
    calories: 80,
    protein: 1.8,
    carbs: 18,
    fat: 0.8,
    servingSize: "1 trozo (10g)",
    source: "local"
  },
  {
    name: "Jengibre en Polvo",
    calories: 335,
    protein: 9,
    carbs: 72,
    fat: 4.2,
    servingSize: "1 cucharadita (2g)",
    source: "local"
  },
  {
    name: "Romero Seco",
    calories: 331,
    protein: 4.9,
    carbs: 64,
    fat: 15,
    servingSize: "1 cucharadita (2g)",
    source: "local"
  },
  {
    name: "Tomillo Seco",
    calories: 276,
    protein: 9.1,
    carbs: 64,
    fat: 7.4,
    servingSize: "1 cucharadita (2g)",
    source: "local"
  },
  {
    name: "Laurel (Hojas secas)",
    calories: 313,
    protein: 7.6,
    carbs: 75,
    fat: 8.4,
    servingSize: "2 hojas (1g)",
    source: "local"
  },
  {
    name: "Cúrcuma en Polvo",
    calories: 354,
    protein: 7.8,
    carbs: 65,
    fat: 9.9,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Curry en Polvo",
    calories: 325,
    protein: 12.7,
    carbs: 58.2,
    fat: 14,
    servingSize: "1 cucharadita (3g)",
    source: "local"
  },
  {
    name: "Menta / Hierbabuena Fresca",
    calories: 44,
    protein: 3.3,
    carbs: 8.4,
    fat: 0.7,
    servingSize: "1 ramita (5g)",
    source: "local"
  },
  {
    name: "Nuez Moscada Molida",
    calories: 525,
    protein: 5.8,
    carbs: 49.3,
    fat: 36.3,
    servingSize: "1 pizca (1g)",
    source: "local"
  }
];
