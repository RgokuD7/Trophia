import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Layers, Dumbbell, Info, CheckCircle2 } from "lucide-react";
import { MuscleGroupId } from "./MuscleRecoveryVisualizer";

interface SubPartMeta {
  id: string;
  name: string;
  role: string;
  exercise: string;
}

interface DetailedMuscleSubAnatomyProps {
  muscleId: MuscleGroupId;
  recoveryValue: number;
  glowColor: string;
  secondaryColor: string;
}

const SUB_PARTS_DATA: Record<MuscleGroupId, { title: string; subtitle: string; parts: SubPartMeta[] }> = {
  biceps: {
    title: "Anatomía del Bíceps & Braquial",
    subtitle: "2 cabezas principales + 1 músculo profundo",
    parts: [
      {
        id: "long_head",
        name: "Cabeza Larga (Pico)",
        role: "Discurre por la cara lateral exterior. Es la responsable de la altura y el 'pico' del bíceps cuando se flexiona con supinación.",
        exercise: "Curl inclinado con mancuernas, Curl con barra Z agarre estrecho",
      },
      {
        id: "short_head",
        name: "Cabeza Corta (Anchura)",
        role: "Ubicada en la cara medial interior. Proporciona grosor, masa y plenitud visual al brazo visto de frente.",
        exercise: "Curl predicador (Scott), Curl araña, Curl concentrado",
      },
      {
        id: "brachialis",
        name: "Braquial Anterior",
        role: "Músculo profundo situado por debajo del bíceps. Al hipertrofiarse empuja al bíceps hacia arriba, aumentando el perímetro del brazo.",
        exercise: "Curl martillo con mancuernas/cuerda, Curl inverso con barra",
      },
      {
        id: "tendon",
        name: "Tendón Bicipital Distal",
        role: "Inserta en la tuberosidad bicipital del radio, permitiendo la supinación del antebrazo y flexión del codo.",
        exercise: "Control excéntrico y calentamiento progresivo",
      },
    ],
  },
  triceps: {
    title: "Anatomía del Tríceps Braquial",
    subtitle: "3 cabezas extensoras (60% del volumen del brazo)",
    parts: [
      {
        id: "lateral_head",
        name: "Cabeza Lateral (Herradura)",
        role: "Forma el brazo exterior y dibuja la famosa 'herradura' del tríceps vista de perfil y posterior.",
        exercise: "Extensiones en polea alta con barra recta o cuerda, Press cerrado",
      },
      {
        id: "long_head",
        name: "Cabeza Larga (Masa Principal)",
        role: "La cabeza más voluminosa. Es la única biarticular (cruza el hombro) y aporta la mayor densidad al tríceps.",
        exercise: "Press francés tras nuca, Extensiones sobre la cabeza (Katana), Fondos",
      },
      {
        id: "medial_head",
        name: "Cabeza Medial (Estabilizadora)",
        role: "Cabeza profunda activa en todo el rango de extensión del codo, clave para la salud articular.",
        exercise: "Extensiones con agarre inverso en polea, Flexiones diamante",
      },
      {
        id: "tendon",
        name: "Tendón del Tríceps & Olécranon",
        role: "Inserción ósea común en el olécranon del cúbito para bloquear la extensión.",
        exercise: "Evitar bloqueos articulares violentos en cargas submáximas",
      },
    ],
  },
  chest: {
    title: "Anatomía del Pectoral",
    subtitle: "Haz clavicular, esternocostal y abdominal",
    parts: [
      {
        id: "clavicular",
        name: "Haz Clavicular (Pectoral Superior)",
        role: "Fibras oblicuas que van desde la clavícula al húmero. Proporciona relleno debajo de las clavículas.",
        exercise: "Press inclinado 30°-45° (barra/mancuerna), Cruces en polea baja",
      },
      {
        id: "sternal",
        name: "Haz Esternocostal (Pectoral Medio)",
        role: "El vientre muscular más grande del pecho. Responsable de la mayor fuerza de empuje horizontal.",
        exercise: "Press de banca plano, Press en máquina convergente",
      },
      {
        id: "abdominal",
        name: "Haz Abdominal (Pectoral Inferior)",
        role: "Fibras inferiores que delimitan el surco subpectoral marcando el corte bajo del pecho.",
        exercise: "Fondos en paralelas lastrados, Cruces en polea alta hacia abajo",
      },
    ],
  },
  shoulders: {
    title: "Anatomía del Deltoides",
    subtitle: "3 cabezas que forman la silueta 3D del hombro",
    parts: [
      {
        id: "anterior",
        name: "Deltoides Anterior (Frontal)",
        role: "Flexiona el brazo hacia adelante. Muy demandado en todos los presses de banca y militar.",
        exercise: "Press militar con mancuernas/barra, Elevaciones frontales",
      },
      {
        id: "lateral",
        name: "Deltoides Lateral (Medio)",
        role: "Separa el brazo del tronco. Es el responsable directo de la anchura lateral y silueta en V.",
        exercise: "Elevaciones laterales en polea a altura de cadera, Elevaciones con mancuerna",
      },
      {
        id: "posterior",
        name: "Deltoides Posterior (Pájaros)",
        role: "Extensión horizontal y rotación externa. Previene lesiones y balancea la postura escapular.",
        exercise: "Face pulls, Pájaros en máquina peck-deck inversa, Cruces posteriores en polea",
      },
    ],
  },
  quads: {
    title: "Anatomía del Cuádriceps Femoral",
    subtitle: "4 cabezas extensoras del muslo",
    parts: [
      {
        id: "rectus",
        name: "Recto Femoral (Central)",
        role: "Músculo frontal que discurre por el centro. Cruza la cadera y la rodilla.",
        exercise: "Extensiones de cuádriceps en máquina, Sissy squats",
      },
      {
        id: "lateralis",
        name: "Vasto Lateral (Barrido Exterior)",
        role: "El vientre más grande del cuádriceps. Da la curva externa del muslo (sweep).",
        exercise: "Sentadilla con pies juntos, Prensa 45° profunda, Sentadilla Hack",
      },
      {
        id: "medialis",
        name: "Vasto Medial (Lágrima / VMO)",
        role: "Forma de lágrima sobre la rodilla. Estabiliza el deslizamiento de la rótula.",
        exercise: "Sentadilla profunda, Zancadas búlgaras, Extensiones con bloqueo final",
      },
      {
        id: "tendon",
        name: "Tendón Cuadricipital & Rótula",
        role: "Punto de anclaje que transfiere la potencia del cuádriceps hacia la tibia.",
        exercise: "Calentamiento con trabajo isométrico previo",
      },
    ],
  },
  back: {
    title: "Anatomía Dorsal & Espalda Media",
    subtitle: "Dorsal ancho, romboides y redondos",
    parts: [
      {
        id: "lat_upper",
        name: "Dorsal Ancho Superior (Alas)",
        role: "Fibras altas que dan el ángulo y expansión en V a la espalda.",
        exercise: "Dominadas pronas abiertas, Jalón al pecho con agarre neutro/prono",
      },
      {
        id: "lat_lower",
        name: "Dorsal Ancho Inferior",
        role: "Fibras descendentes que se insertan hacia la cresta ilíaca, dando densidad a la cintura.",
        exercise: "Jalón unilateral con brazo pegado, Remo en polea baja con agarre estrecho",
      },
      {
        id: "rhomboids",
        name: "Romboides & Redondo Mayor",
        role: "Conectan la escápula con la columna dando relieve y relieve al centro de la espalda.",
        exercise: "Remo con barra 45°, Remo con mancuerna apoyado en banco",
      },
    ],
  },
  traps: {
    title: "Anatomía del Trapecio",
    subtitle: "3 secciones desde el cuello hasta la mitad de la columna",
    parts: [
      {
        id: "upper",
        name: "Trapecio Superior (Cuello)",
        role: "Eleva las escápulas y soporta la cabeza. Clave en porte y fuerza estática.",
        exercise: "Encogimientos de hombros con mancuernas o barra, Paseos de granjero",
      },
      {
        id: "mid",
        name: "Trapecio Medio (Escapular)",
        role: "Retrae las escápulas hacia el centro. Da espesor y fuerza en tirones pesados.",
        exercise: "Remo al pecho con agarre amplio, Face pulls altos",
      },
      {
        id: "lower",
        name: "Trapecio Inferior (Descendente)",
        role: "Deprime las escápulas, fundamental para una técnica limpia en dominadas y press militar.",
        exercise: "Y-Raises en banco inclinado, Dominadas escapulares",
      },
    ],
  },
  hamstrings: {
    title: "Anatomía de los Isquiotibiales",
    subtitle: "Bíceps femoral y flexores mediales",
    parts: [
      {
        id: "biceps_fem",
        name: "Bíceps Femoral (Cabeza Larga y Corta)",
        role: "Ubicado en la cara lateral posterior. Potente flexor de rodilla y extensor de cadera.",
        exercise: "Curl femoral tumbado, Curl femoral de pie",
      },
      {
        id: "semitendinosus",
        name: "Semitendinoso",
        role: "Músculo largo medial. Gran protagonismo en la desaceleración y fuerza excéntrica.",
        exercise: "Peso muerto rumano (RDL), Buenos días",
      },
      {
        id: "semimembranosus",
        name: "Semimembranoso",
        role: "Músculo profundo y ancho de la cara interna del muslo.",
        exercise: "Curl femoral sentado (mayor estiramiento en cadera flexionada)",
      },
    ],
  },
  glutes: {
    title: "Anatomía del Glúteo",
    subtitle: "Mayor, medio y menor (el motor de extensión de cadera)",
    parts: [
      {
        id: "maximus",
        name: "Glúteo Mayor",
        role: "El músculo más potente y voluminoso. Extiende y rota externamente la cadera.",
        exercise: "Hip thrust con barra, Sentadillas profundas, Peso muerto sumo",
      },
      {
        id: "medius",
        name: "Glúteo Medio",
        role: "Abduce y estabiliza la pelvis al caminar, correr y hacer sentadillas a una pierna.",
        exercise: "Abducciones en polea/máquina, Sentadillas búlgaras",
      },
      {
        id: "minimus",
        name: "Glúteo Menor & Piriforme",
        role: "Estabilizadores profundos de la articulación de la cadera.",
        exercise: "Paseos laterales con banda en tobillos, Monster walks",
      },
    ],
  },
  calves: {
    title: "Anatomía de la Pantorrilla",
    subtitle: "Gastrocnemio bicéfalo + Sóleo",
    parts: [
      {
        id: "gastro_med",
        name: "Gemelo Interno (Gastrocnemio Medial)",
        role: "Cabeza medial visible y abultada. Predominio de fibras rápidas tipo II.",
        exercise: "Elevación de talones de pie con piernas completamente rectas",
      },
      {
        id: "gastro_lat",
        name: "Gemelo Externo (Gastrocnemio Lateral)",
        role: "Cabeza lateral que da silueta y curvatura externa a la pantorrilla.",
        exercise: "Elevaciones en máquina donkey, Elevaciones en prensa a 1 pierna",
      },
      {
        id: "soleus",
        name: "Sóleo",
        role: "Músculo plano y resistente bajo los gemelos. Fibras lentas de alta resistencia.",
        exercise: "Elevación de talones sentado (con rodillas flexionadas a 90°)",
      },
      {
        id: "achilles",
        name: "Tendón de Aquiles",
        role: "El tendón más grueso del cuerpo. Absorbe y libera energía elástica.",
        exercise: "Rango completo con pausa de 2 segundos en el estiramiento",
      },
    ],
  },
  core: {
    title: "Anatomía del Abdomen & Core",
    subtitle: "Recto abdominal, oblicuos y transverso",
    parts: [
      {
        id: "upper_abs",
        name: "Recto Abdominal Superior",
        role: "Flexiona el tronco hacia adelante acercando la caja torácica a la pelvis.",
        exercise: "Crunches en polea alta con cuerda, Crunches en banco declinado",
      },
      {
        id: "lower_abs",
        name: "Recto Abdominal Inferior",
        role: "Tracciona de la pelvis hacia el tórax (retroversión pélvica).",
        exercise: "Elevaciones de piernas colgado en barra, Dragon flags",
      },
      {
        id: "obliques",
        name: "Oblicuos Externos & Internos",
        role: "Rotación del torso, flexión lateral y contención lateral de la cintura.",
        exercise: "Leñadores en polea, Planchas laterales, Giros rusos con peso",
      },
      {
        id: "transverse",
        name: "Transverso Abdominal (Faja Natural)",
        role: "Capa más profunda del core. Aplana el abdomen y protege la columna vertebral.",
        exercise: "Vacuum abdominal, Plancha frontal manteniendo presión intra-abdominal",
      },
    ],
  },
  lowerBack: {
    title: "Anatomía de la Zona Lumbar",
    subtitle: "Erectores espinales & fascia toracolumbar",
    parts: [
      {
        id: "spinalis",
        name: "Longísimo & Espinoso",
        role: "Columnas musculares verticales que recorren la columna para mantenerla erguida.",
        exercise: "Hiperextensiones a 45°, Buenos días con barra liviana",
      },
      {
        id: "iliocostalis",
        name: "Iliocostal Lumbar",
        role: "Columna lateral de los erectores. Estabiliza el tronco contra torsiones.",
        exercise: "Peso muerto convencional y rumano con espalda neutra",
      },
      {
        id: "fascia",
        name: "Fascia Toracolumbar",
        role: "Densa red de tejido conectivo que une glúteos, dorsales y core.",
        exercise: "Bird-Dog isométrico, Puentes de glúteo manteniendo pelvis neutra",
      },
    ],
  },
};

export default function DetailedMuscleSubAnatomy({
  muscleId,
  recoveryValue,
  glowColor,
  secondaryColor,
}: DetailedMuscleSubAnatomyProps) {
  const data = SUB_PARTS_DATA[muscleId] || SUB_PARTS_DATA.biceps;
  const [selectedSubPartId, setSelectedSubPartId] = useState<string>(data.parts[0]?.id || "");

  // Update selected sub-part if muscleId changes
  React.useEffect(() => {
    const firstPart = data.parts[0]?.id || "";
    setSelectedSubPartId(firstPart);
  }, [muscleId]);

  const activeSubPart = data.parts.find((p) => p.id === selectedSubPartId) || data.parts[0];

  // Helper to render the custom zoomed SVG diagram for each muscle
  const renderZoomedSvg = () => {
    switch (muscleId) {
      case "biceps":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Upper arm bone / humerus shadow */}
            <path d="M80 15 L80 145" stroke="#ffffff15" strokeWidth="6" strokeLinecap="round" />
            {/* Brachialis (deep outer muscle) */}
            <path
              d="M50 65 C45 80 48 105 58 115 C62 105 60 80 58 65 Z"
              fill={selectedSubPartId === "brachialis" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "brachialis" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "brachialis" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("brachialis")}
            />
            {/* Long Head (Lateral peak) */}
            <path
              d="M62 45 C56 60 58 95 68 118 C78 115 82 85 80 50 C74 42 66 42 62 45 Z"
              fill={selectedSubPartId === "long_head" ? glowColor : `${glowColor}70`}
              stroke={selectedSubPartId === "long_head" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "long_head" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("long_head")}
            />
            {/* Short Head (Medial thickness) */}
            <path
              d="M82 48 C84 82 80 114 96 116 C104 100 106 70 98 48 C92 44 86 45 82 48 Z"
              fill={selectedSubPartId === "short_head" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "short_head" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "short_head" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("short_head")}
            />
            {/* Bicipital tendon */}
            <path
              d="M74 118 L80 142 L86 142 L82 118 Z"
              fill={selectedSubPartId === "tendon" ? "#ffffff" : "#ffffff40"}
              stroke="#ffffff80"
              strokeWidth="1"
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("tendon")}
            />
            {/* Muscle fiber striation lines */}
            <line x1="70" y1="65" x2="74" y2="95" stroke="#ffffff30" strokeWidth="1" strokeDasharray="2 3" />
            <line x1="90" y1="65" x2="88" y2="95" stroke="#ffffff30" strokeWidth="1" strokeDasharray="2 3" />
          </svg>
        );

      case "triceps":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Long Head */}
            <path
              d="M82 30 C80 55 78 85 86 105 C96 95 98 60 96 35 C90 28 84 28 82 30 Z"
              fill={selectedSubPartId === "long_head" ? glowColor : `${glowColor}70`}
              stroke={selectedSubPartId === "long_head" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "long_head" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("long_head")}
            />
            {/* Lateral Head (Horseshoe) */}
            <path
              d="M58 40 C52 60 54 80 66 98 C72 90 74 65 72 45 C66 38 60 38 58 40 Z"
              fill={selectedSubPartId === "lateral_head" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "lateral_head" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "lateral_head" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lateral_head")}
            />
            {/* Medial Head (Deep lower) */}
            <path
              d="M72 88 C68 96 70 108 76 114 C82 110 82 98 78 88 Z"
              fill={selectedSubPartId === "medial_head" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "medial_head" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "medial_head" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("medial_head")}
            />
            {/* Common Tendon & Olecranon */}
            <path
              d="M68 112 L78 138 L88 138 L84 112 Z"
              fill={selectedSubPartId === "tendon" ? "#ffffff" : "#ffffff40"}
              stroke="#ffffff80"
              strokeWidth="1"
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("tendon")}
            />
          </svg>
        );

      case "chest":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Clavicular Head (Upper) */}
            <path
              d="M30 45 C55 35 110 35 130 55 C100 58 60 62 30 45 Z"
              fill={selectedSubPartId === "clavicular" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "clavicular" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "clavicular" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("clavicular")}
            />
            {/* Sternal Head (Middle) */}
            <path
              d="M30 48 C60 64 100 60 130 58 C132 85 115 105 32 85 C28 70 28 58 30 48 Z"
              fill={selectedSubPartId === "sternal" ? glowColor : `${glowColor}70`}
              stroke={selectedSubPartId === "sternal" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "sternal" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("sternal")}
            />
            {/* Abdominal Head (Lower) */}
            <path
              d="M32 87 C80 102 120 95 128 78 C122 110 85 125 45 115 C36 105 34 95 32 87 Z"
              fill={selectedSubPartId === "abdominal" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "abdominal" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "abdominal" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("abdominal")}
            />
            {/* Sternum midline reference */}
            <line x1="28" y1="35" x2="28" y2="125" stroke="#ffffff25" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
        );

      case "shoulders":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Anterior Deltoid (Front) */}
            <path
              d="M45 45 C65 40 78 55 75 88 C65 95 52 85 45 70 C40 60 42 50 45 45 Z"
              fill={selectedSubPartId === "anterior" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "anterior" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "anterior" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("anterior")}
            />
            {/* Lateral Deltoid (Middle Boulder) */}
            <path
              d="M78 40 C102 45 115 70 108 95 C98 108 82 108 78 90 C76 72 74 55 78 40 Z"
              fill={selectedSubPartId === "lateral" ? glowColor : `${glowColor}80`}
              stroke={selectedSubPartId === "lateral" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "lateral" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lateral")}
            />
            {/* Posterior Deltoid (Rear) */}
            <path
              d="M110 50 C125 60 130 82 122 100 C114 98 108 90 108 80 C108 68 108 55 110 50 Z"
              fill={selectedSubPartId === "posterior" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "posterior" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "posterior" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("posterior")}
            />
            {/* Clavicle / Acromion bone outline */}
            <path d="M38 35 C65 30 115 32 135 45" stroke="#ffffff30" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case "quads":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Vastus Lateralis (Outer sweep) */}
            <path
              d="M45 35 C35 65 38 105 52 120 C58 112 62 85 58 45 C52 38 48 35 45 35 Z"
              fill={selectedSubPartId === "lateralis" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "lateralis" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "lateralis" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lateralis")}
            />
            {/* Rectus Femoris (Center) */}
            <path
              d="M62 30 C58 60 62 105 78 122 C88 105 88 60 84 30 C76 25 68 25 62 30 Z"
              fill={selectedSubPartId === "rectus" ? glowColor : `${glowColor}70`}
              stroke={selectedSubPartId === "rectus" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "rectus" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("rectus")}
            />
            {/* Vastus Medialis (Teardrop / VMO) */}
            <path
              d="M86 55 C88 85 86 112 100 128 C115 125 118 95 102 55 C96 52 90 52 86 55 Z"
              fill={selectedSubPartId === "medialis" ? glowColor : `${glowColor}80`}
              stroke={selectedSubPartId === "medialis" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "medialis" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("medialis")}
            />
            {/* Patella / Tendon */}
            <rect
              x="68"
              y="126"
              width="20"
              height="18"
              rx="4"
              fill={selectedSubPartId === "tendon" ? "#ffffff" : "#ffffff40"}
              stroke="#ffffff80"
              strokeWidth="1.2"
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("tendon")}
            />
          </svg>
        );

      case "back":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Rhomboids & Teres */}
            <path
              d="M55 40 L105 40 L95 65 L65 65 Z"
              fill={selectedSubPartId === "rhomboids" ? glowColor : `${secondaryColor}70`}
              stroke={selectedSubPartId === "rhomboids" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "rhomboids" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("rhomboids")}
            />
            {/* Latissimus Upper Wing (Left) */}
            <path
              d="M48 45 C32 65 30 92 48 115 C55 105 60 85 62 65 Z"
              fill={selectedSubPartId === "lat_upper" ? glowColor : `${glowColor}80`}
              stroke={selectedSubPartId === "lat_upper" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "lat_upper" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lat_upper")}
            />
            {/* Latissimus Upper Wing (Right) */}
            <path
              d="M112 45 C128 65 130 92 112 115 C105 105 100 85 98 65 Z"
              fill={selectedSubPartId === "lat_upper" ? glowColor : `${glowColor}80`}
              stroke={selectedSubPartId === "lat_upper" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "lat_upper" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lat_upper")}
            />
            {/* Lower Lat insertion */}
            <path
              d="M52 105 C55 125 70 135 80 138 C90 135 105 125 108 105 C95 110 65 110 52 105 Z"
              fill={selectedSubPartId === "lat_lower" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "lat_lower" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "lat_lower" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lat_lower")}
            />
          </svg>
        );

      case "traps":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Upper Traps (Neck & Clavicular) */}
            <path
              d="M80 25 L115 48 L80 68 L45 48 Z"
              fill={selectedSubPartId === "upper" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "upper" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "upper" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("upper")}
            />
            {/* Mid Traps (Scapular Retraction) */}
            <path
              d="M45 50 L115 50 L105 92 L55 92 Z"
              fill={selectedSubPartId === "mid" ? glowColor : `${glowColor}70`}
              stroke={selectedSubPartId === "mid" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "mid" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("mid")}
            />
            {/* Lower Traps (Descending V) */}
            <path
              d="M55 94 L105 94 L80 135 Z"
              fill={selectedSubPartId === "lower" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "lower" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "lower" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("lower")}
            />
          </svg>
        );

      case "calves":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Medial Gastrocnemius (Inner ball) */}
            <path
              d="M78 30 C74 55 68 85 55 95 C45 80 48 50 65 32 Z"
              fill={selectedSubPartId === "gastro_med" ? glowColor : `${secondaryColor}80`}
              stroke={selectedSubPartId === "gastro_med" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "gastro_med" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("gastro_med")}
            />
            {/* Lateral Gastrocnemius (Outer ball) */}
            <path
              d="M82 30 C86 55 92 85 105 95 C115 80 112 50 95 32 Z"
              fill={selectedSubPartId === "gastro_lat" ? glowColor : `${glowColor}80`}
              stroke={selectedSubPartId === "gastro_lat" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "gastro_lat" ? "2.2" : "1.3"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("gastro_lat")}
            />
            {/* Soleus (Underneath lateral wings) */}
            <path
              d="M60 85 C65 102 70 115 76 118 C84 118 88 102 96 85 C88 94 72 94 60 85 Z"
              fill={selectedSubPartId === "soleus" ? glowColor : `${glowColor}50`}
              stroke={selectedSubPartId === "soleus" ? "#ffffff" : glowColor}
              strokeWidth={selectedSubPartId === "soleus" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("soleus")}
            />
            {/* Achilles Tendon */}
            <rect
              x="74"
              y="118"
              width="12"
              height="28"
              rx="2"
              fill={selectedSubPartId === "achilles" ? "#ffffff" : "#ffffff40"}
              stroke="#ffffff80"
              strokeWidth="1"
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("achilles")}
            />
          </svg>
        );

      case "core":
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            {/* Upper Abs */}
            <g onClick={() => setSelectedSubPartId("upper_abs")} className="cursor-pointer">
              <rect x="52" y="30" width="24" height="20" rx="4" fill={selectedSubPartId === "upper_abs" ? glowColor : `${glowColor}70`} stroke="#ffffff80" strokeWidth="1.2" />
              <rect x="84" y="30" width="24" height="20" rx="4" fill={selectedSubPartId === "upper_abs" ? glowColor : `${glowColor}70`} stroke="#ffffff80" strokeWidth="1.2" />
            </g>
            {/* Lower Abs */}
            <g onClick={() => setSelectedSubPartId("lower_abs")} className="cursor-pointer">
              <rect x="54" y="55" width="22" height="22" rx="4" fill={selectedSubPartId === "lower_abs" ? glowColor : `${glowColor}60`} stroke="#ffffff80" strokeWidth="1.2" />
              <rect x="84" y="55" width="22" height="22" rx="4" fill={selectedSubPartId === "lower_abs" ? glowColor : `${glowColor}60`} stroke="#ffffff80" strokeWidth="1.2" />
              <rect x="56" y="82" width="20" height="24" rx="4" fill={selectedSubPartId === "lower_abs" ? glowColor : `${glowColor}50`} stroke="#ffffff80" strokeWidth="1.2" />
              <rect x="84" y="82" width="20" height="24" rx="4" fill={selectedSubPartId === "lower_abs" ? glowColor : `${glowColor}50`} stroke="#ffffff80" strokeWidth="1.2" />
            </g>
            {/* Obliques */}
            <path
              d="M32 45 C45 60 48 95 44 112 C32 100 28 75 32 45 Z"
              fill={selectedSubPartId === "obliques" ? glowColor : `${secondaryColor}70`}
              stroke={selectedSubPartId === "obliques" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "obliques" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("obliques")}
            />
            <path
              d="M128 45 C115 60 112 95 116 112 C128 100 132 75 128 45 Z"
              fill={selectedSubPartId === "obliques" ? glowColor : `${secondaryColor}70`}
              stroke={selectedSubPartId === "obliques" ? "#ffffff" : secondaryColor}
              strokeWidth={selectedSubPartId === "obliques" ? "2" : "1.2"}
              className="cursor-pointer transition-all"
              onClick={() => setSelectedSubPartId("obliques")}
            />
            {/* Linea Alba central groove */}
            <line x1="80" y1="25" x2="80" y2="115" stroke="#ffffff30" strokeWidth="2" strokeDasharray="2 3" />
          </svg>
        );

      default:
        // Generic fallback anatomical multi-fiber view
        return (
          <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_0_15px_rgba(0,0,0,0.6)]" fill="none">
            <path
              d="M45 40 C65 30 95 30 115 40 C125 75 125 105 115 130 C95 138 65 138 45 130 C35 105 35 75 45 40 Z"
              fill={`${glowColor}50`}
              stroke={glowColor}
              strokeWidth="2"
            />
            {data.parts.map((p, idx) => {
              const yOffset = 45 + idx * 26;
              const isSel = selectedSubPartId === p.id;
              return (
                <path
                  key={p.id}
                  d={`M55 ${yOffset} C70 ${yOffset - 5} 90 ${yOffset - 5} 105 ${yOffset} C102 ${yOffset + 18} 58 ${yOffset + 18} 55 ${yOffset} Z`}
                  fill={isSel ? glowColor : `${glowColor}60`}
                  stroke={isSel ? "#ffffff" : glowColor}
                  strokeWidth={isSel ? "2" : "1.2"}
                  className="cursor-pointer transition-all"
                  onClick={() => setSelectedSubPartId(p.id)}
                />
              );
            })}
          </svg>
        );
    }
  };

  return (
    <div className="bg-black/35 rounded-2xl border border-white/10 p-4 space-y-3 relative overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Layers className="h-3 w-3" />
            Micro-Anatomía & Cabezas Musculares
          </span>
          <h5 className="text-xs font-black text-white">{data.title}</h5>
          <span className="text-[9.5px] text-gray-400">{data.subtitle}</span>
        </div>
        <span className="text-[9px] font-mono font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
          Toca cada parte
        </span>
      </div>

      {/* Main Split View: Zoomed SVG on Left, Interactive Part Cards on Right */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
        {/* Left: Zoomed Muscle Anatomy SVG */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/5 min-h-[160px] relative">
          <div className="w-[145px] h-[145px] relative">{renderZoomedSvg()}</div>
          <span className="text-[8px] font-mono uppercase text-gray-400 tracking-wider mt-1">
            Plano Miofibrilar 3D
          </span>
        </div>

        {/* Right: Sub-part chips selector */}
        <div className="sm:col-span-7 space-y-1.5">
          {data.parts.map((part) => {
            const isSelected = selectedSubPartId === part.id;
            return (
              <button
                key={part.id}
                type="button"
                onClick={() => setSelectedSubPartId(part.id)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-white/15 border-emerald-400/60 ring-1 ring-emerald-400/40 shadow-md text-white"
                    : "bg-white/[0.02] border-white/5 hover:border-white/20 text-gray-400 hover:text-gray-200"
                }`}
              >
                <div className="min-w-0 pr-1">
                  <span className={`block text-xs font-bold truncate ${isSelected ? "text-emerald-400" : ""}`}>
                    {part.name}
                  </span>
                  <span className="block text-[8.5px] text-gray-400 truncate">
                    {part.role}
                  </span>
                </div>
                <div
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    isSelected ? "bg-emerald-400 shadow-[0_0_8px_#10b981]" : "bg-white/10"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Deep-Dive Sub-Part Callout Card */}
      {activeSubPart && (
        <motion.div
          key={activeSubPart.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5 text-xs"
        >
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10.5px]">
            <Sparkles className="h-3 w-3" />
            <span>Función Biomecánica: {activeSubPart.name}</span>
          </div>
          <p className="text-[10px] text-gray-300 leading-relaxed">
            {activeSubPart.role}
          </p>
          <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[9.5px] text-gray-400">
            <Dumbbell className="h-3 w-3 text-amber-400 shrink-0" />
            <span>
              <strong>Mejor ejercicio de estímulo:</strong> {activeSubPart.exercise}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
