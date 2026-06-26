import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Weight, Ruler, ChevronRight, ChevronLeft, Sparkles, 
  BookOpen, Key, AlertCircle, AlertTriangle, Camera, Check, Eye, Info, RefreshCw, Bell, Calendar,
  Flame, Dumbbell, Zap, UserRound, Smartphone, Download, Share
} from "lucide-react";
import { UserProfile, BiologicalSex, FitnessGoal, ExperienceLevel, TrainingEnvironment, DietType } from "../types";
import { calculateBMI, getBMICategory, calculateNavyBodyFat, calculateCaliperBodyFat, calculateRequirements } from "../utils/fitnessUtils";
import { analyzeFatByIA, recommendGoalByIA } from "../services/geminiService";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import scientificTips from "../data/scientificTips.json";
import { savePushSubscription, deletePushSubscription } from "../services/dbService";
import neckMale from "../assets/neck_measurement_male.png";
import neckFemale from "../assets/neck_measurement_female.png";
import waistMeasurement from "../assets/waist_measurement.png";
import hipMeasurement from "../assets/hip_measurement.png";
import caliperTriceps from "../assets/caliper_triceps.png";
import caliperAbdomen from "../assets/caliper_abdomen.png";
import caliperThigh from "../assets/caliper_thigh.png";
import poseFront from "../assets/pose_front.png";
import poseSide from "../assets/pose_side.png";
import poseLegs from "../assets/pose_legs.png";
import poseFace from "../assets/pose_face.png";

const HEALTH_TIPS = [
  {
    title: "💪 ¿Consumes creatina?",
    desc: "Si no lo haces, deberías. Es el suplemento con más evidencia científica en el mundo: incrementa la fuerza muscular, mejora la recuperación y optimiza la función cerebral. 3 a 5 gramos al día son suficientes."
  },
  {
    title: "🍗 Proteína: Tu pilar de recuperación",
    desc: "Intenta consumir entre 1.6g y 2.2g de proteína por cada kilo de peso corporal al día. Te ayudará a preservar y desarrollar masa muscular limpia, además de mantenerte saciado por más tiempo."
  },
  {
    title: "📈 Clave del éxito: Sobrecarga Progresiva",
    desc: "El factor número uno para ver cambios estéticos y de fuerza reales es la sobrecarga progresiva. Anota tus entrenamientos e intenta aumentar el peso o las repeticiones semana a semana."
  },
  {
    title: "⚡ Sin miedo a los Carbohidratos",
    desc: "Los carbohidratos son el combustible preferido de tus músculos y tu cerebro. Consumirlos de fuentes complejas antes de entrenar maximizará tu energía, rendimiento y fuerza."
  }
];

const HYBRID_EQUIPMENT = [
  "Mancuernas ajustables / variables",
  "Mancuernas de peso fijo",
  "Pesas rusas (Kettlebells)",
  "Bandas de resistencia elásticas largas",
  "Mini-bands (bandas elásticas circulares de tela o látex)",
  "Colchoneta de alta densidad / Mat de yoga",
  "Cuerda para saltar (Jump rope)",
  "Sistema de entrenamiento en suspensión (tipo TRX)",
  "Chaleco lastrado (Weighted vest)",
  "Rueda de abdominales (Ab roller)",
  "Balón medicinal / Slam ball",
  "Pelota de reacción / agilidad",
  "Peso corporal / Calistenia básica"
];

const GYM_EQUIPMENT = [
  "Prensa de piernas (Leg Press)",
  "Máquina de Sentadilla Hack",
  "Jaula de sentadillas completa (Power Rack)",
  "Máquina Smith / Multipower",
  "Poleas cruzadas (Cable Crossover)",
  "Máquina de jalón al pecho",
  "Máquina de remo sentado (cable/placas)",
  "Máquina de remo en T (T-Bar Row)",
  "Sillón de extensiones de cuádriceps",
  "Camilla de curl de piernas",
  "Prensa de pecho (Chest Press Machine)",
  "Contractora de pecho / aperturas (Pec Deck)",
  "Máquina de fondos y dominadas asistidas",
  "Máquina de elevaciones laterales para hombros",
  "Prensa para pantorrillas (Calf Press)",
  "Silla romana / Banco de extensiones lumbares",
  "Banco Scott / predicador",
  "Bancos ajustables profesionales",
  "Barras olímpicas y set completo de discos",
  "Mancuernas fijas pesadas (12 kg a 50 kg)",
  "Cinta de correr / Trotadora profesional",
  "Bicicleta elíptica / Escaladora (Stairmaster)",
  "Máquina Peck Deck / Deltoides Posterior",
  "Máquina Curl Femoral Sentado",
  "Máquina de Abductores / Adductores",
  "Máquina Prensa de Hombros (Shoulder Press)",
  "Máquina de Glúteos (Glute Drive / Hip Thrust)",
  "Polea de Tríceps / Bíceps (Triceps Pushdown)",
  "Saco de boxeo suspendido",
  "Cables/Poleas ajustables duales"
];

const HOME_EQUIPMENT = [
  "Barra de dominadas de marco/pared",
  "Tabla multi-posición para flexiones",
  "Mini-paralelas (Parallettes)",
  "Banco de ejercicio plegable",
  "Bloques de yoga",
  "Bandas de oclusión vascular (BFR)",
  "Saco de boxeo doméstico",
  "Soporte para sentadillas portátil (Squat Stands)",
  "Barra de dominadas extensible sin tornillos",
  "Soporte de pared para sacos de boxeo",
  "Rodilleras de compresión de neopreno",
  "Anillas de gimnasia de madera",
  "Cojín de equilibrio / Balance pad",
  "Bandas elásticas cortas de resistencia"
];

const OUTDOOR_EQUIPMENT = [
  "Barras fijas altas de exterior",
  "Barras paralelas de exterior",
  "Espalderas públicas / escaleras suecas",
  "Monkey bars de parque",
  "Bancos abdominales de exterior",
  "Conos y escaleras de agilidad",
  "Anillas de gimnasia portátiles con correas",
  "Cinta elástica de Slackline para equilibrio",
  "Paracaídas de resistencia para velocidad",
  "Pesos para tobillos y muñecas",
  "Arnés de arrastre de trineo",
  "Soga de arrastre de alta resistencia (Battle rope)"
];
interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  userId: string;
  defaultName?: string;
}

const formatAnalysisText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index} className="font-extrabold text-emerald-400">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const getCleanedAnalysis = (text: string) => {
  return text.replace(/^\[Estimación Biométrica Inteligente\]\s*/i, "");
};

const hasBiometricHeader = (text: string) => {
  return text.toLowerCase().includes("[estimación biométrica inteligente]");
};

interface DeviceInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isMobile: boolean;
}

const getDeviceInfo = (): DeviceInfo => {
  if (typeof window === "undefined") {
    return { isIOS: false, isAndroid: false, isSafari: false, isChrome: false, isMobile: false };
  }
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/i.test(ua);
  const isChrome = /Chrome|CriOS/i.test(ua);

  return { isIOS, isAndroid, isSafari, isChrome, isMobile };
};

export default function Onboarding({ onComplete, userId, defaultName }: OnboardingProps) {
  const deviceInfo = getDeviceInfo();
  const [step, setStep] = useState(() => {
    const savedKey = localStorage.getItem("trophia_api_key");
    return (savedKey && savedKey.trim().length >= 15) ? 2 : 1;
  });


  const [name, setName] = useState(defaultName || "Richard");
  const [age, setAge] = useState(25);
  const [sex, setSex] = useState<BiologicalSex>("male");
  const [weight, setWeight] = useState<number>(75);
  const [height, setHeight] = useState<number>(175);
  const [dietType, setDietType] = useState<DietType>("standard");
  const [activityLevel, setActivityLevel] = useState<"sedentary" | "lightly_active" | "moderately_active" | "highly_active" | "heavy_labor">("sedentary");
  const [stepsRange, setStepsRange] = useState<"under_4k" | "5k_7k" | "8k_10k" | "12k_15k" | "over_18k">("under_4k");
  const [deficitPace, setDeficitPace] = useState<"conservative" | "moderate" | "aggressive">("moderate");
  const [solidMealsCount, setSolidMealsCount] = useState<number>(4);
  const [parqAnswers, setParqAnswers] = useState({
    q1: false,
    q2: false,
    q3: false,
    q4: false,
    q5: false,
    q6: false,
    q7: false
  });
  const [jointPainAreas, setJointPainAreas] = useState<("knee" | "back" | "shoulder")[]>([]);
  const requiresMedicalClearance = parqAnswers.q1 || parqAnswers.q2 || parqAnswers.q3 || parqAnswers.q7;
  
  // Step 2 variables (Navy & Caliper & IA body fat)
  const [knowsBodyFat, setKnowsBodyFat] = useState<"yes" | "no" | null>(null);
  const [manualBodyFat, setManualBodyFat] = useState<number | "">("");
  
  // Toggle states for showing the estimation sections
  const [showNavyEstimator, setShowNavyEstimator] = useState(false);
  const [showCaliperEstimator, setShowCaliperEstimator] = useState(false);
  const [showIaEstimator, setShowIaEstimator] = useState(false);

  // Navy inputs
  const [neck, setNeck] = useState<number | "">("");
  const [waist, setWaist] = useState<number | "">("");
  const [hip, setHip] = useState<number | "">("");
  const [navyEstimatedFat, setNavyEstimatedFat] = useState<number | undefined>(undefined);

  // Caliper (Plicómetro) inputs
  const [caliper1, setCaliper1] = useState<number | "">(""); // Men: Chest, Women: Triceps
  const [caliper2, setCaliper2] = useState<number | "">(""); // Men: Abdomen, Women: Suprailiac
  const [caliper3, setCaliper3] = useState<number | "">(""); // Men & Women: Thigh
  const [caliperEstimatedFat, setCaliperEstimatedFat] = useState<number | undefined>(undefined);

  // IA inputs
  const [iaEstimatedFat, setIaEstimatedFat] = useState<number | undefined>(undefined);
  const [frontPhoto, setFrontPhoto] = useState<string | null>(null);
  const [sidePhoto, setSidePhoto] = useState<string | null>(null);
  const [legsPhoto, setLegsPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  
  // General bodyFat output that gets saved
  const [bodyFat, setBodyFat] = useState<number | undefined>(undefined);
  const [selectedFatSource, setSelectedFatSource] = useState<"manual" | "navy" | "caliper" | "ia" | "average" | "none">("none");

  const [isAnalyzingFat, setIsAnalyzingFat] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<"navy" | "caliper">("navy");
  
  // Custom states for premium Step 2 Flow
  const [showStep2Results, setShowStep2Results] = useState(false);
  const [isCalculatingBF, setIsCalculatingBF] = useState(false);
  const [showCreatineScreen, setShowCreatineScreen] = useState(false);
  const [takesCreatine, setTakesCreatine] = useState<boolean | null>(null);
  const [creatineProgress, setCreatineProgress] = useState(0);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  // Scroll to top when creatine screen is activated
  useEffect(() => {
    if (showCreatineScreen) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
      const scrollContainers = document.querySelectorAll(".overflow-y-auto");
      scrollContainers.forEach((el) => {
        el.scrollTop = 0;
      });
    }
  }, [showCreatineScreen]);

  // Handle the 5-second animated progress bar inside the creatine button
  useEffect(() => {
    if (!showCreatineScreen) {
      setCreatineProgress(0);
      return;
    }
    const startTime = Date.now();
    const duration = 5000; // 5 seconds
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setCreatineProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [showCreatineScreen]);

  // States for Push Notifications PWA
  const [pushSupported, setPushSupported] = useState<boolean | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const checkPushSubscription = async () => {
    try {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      setPushSupported(isSupported);
      
      if (!isSupported) {
        setNotificationPermission("unsupported");
        return;
      }
      
      setNotificationPermission(Notification.permission);
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error("Error al comprobar suscripción push:", err);
    }
  };

  useEffect(() => {
    if (step === 9) {
      checkPushSubscription();
    }
  }, [step]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const handleToggleNotifications = async () => {
    setPushLoading(true);
    setPushError(null);
    try {
      const isSupported = "serviceWorker" in navigator && "PushManager" in window;
      if (!isSupported) {
        throw new Error("Push no soportado en este navegador.");
      }

      if (isSubscribed) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deletePushSubscription(userId, subscription.endpoint);
        }
        setIsSubscribed(false);
      } else {
        let permission = Notification.permission;
        if (permission === "default") {
          permission = await Notification.requestPermission();
          setNotificationPermission(permission);
        }

        if (permission !== "granted") {
          throw new Error("Permiso de notificaciones denegado.");
        }

        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
          throw new Error("Falta la clave pública VAPID en las variables de entorno.");
        }
        
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });

        await savePushSubscription(userId, subscription.toJSON());
        setIsSubscribed(true);

        try {
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              // Try direct constructor (great for desktop localhost/Mac Chrome)
              new window.Notification("¡Bienvenido a Trophia! 🏆", {
                body: "Tus notificaciones están activadas. Te recordaremos tus comidas, agua y entrenamientos.",
                icon: "/favicon.ico"
              });
            } catch (ctorErr) {
              console.warn("Constructor-based notification failed, falling back to Service Worker:", ctorErr);
              // Fallback to Service Worker registration (essential for iOS Safari / Mobile Chrome PWA)
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification("¡Bienvenido a Trophia! 🏆", {
                body: "Tus notificaciones están activadas. Te recordaremos tus comidas, agua y entrenamientos.",
                icon: "/favicon.ico",
                badge: "/favicon.ico",
                vibrate: [100, 50, 100]
              } as any);
            }
          }
        } catch (notifErr) {
          console.warn("Could not show welcome notification locally:", notifErr);
        }
      }
    } catch (err: any) {
      console.error("Error al configurar notificaciones:", err);
      setPushError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setPushLoading(false);
    }
  };

  // Step 3 variables (Goals)
  const [goal, setGoal] = useState<FitnessGoal>("lose_weight");

  // Step 4 variables (Workouts)
  const [level, setLevel] = useState<ExperienceLevel>("intermediate");
  const [selectedEnvironments, setSelectedEnvironments] = useState<TrainingEnvironment[]>(["home"]);
  const [weeklyTrainingDays, setWeeklyTrainingDays] = useState<number>(4);
  const [equipment, setEquipment] = useState<string[]>([
    "Peso corporal / Calistenia básica",
    "Mancuernas de peso fijo",
    "Bandas de resistencia elásticas largas",
    "Colchoneta de alta densidad / Mat de yoga"
  ]);

  const environment = selectedEnvironments.includes("gym") 
    ? "gym" 
    : (selectedEnvironments.includes("home") ? "home" : "outdoor");

  const randomNutritionTip = React.useMemo(() => {
    const nutritionTips = scientificTips.filter(tip => tip.category === "nutrición" || tip.category === "suplementos");
    if (nutritionTips.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * nutritionTips.length);
    return nutritionTips[randomIndex];
  }, []);

  // Step 5 variables (Nutrition & Education)
  const [nutritionKnowledge, setNutritionKnowledge] = useState<"low" | "medium" | "high">("medium");
  const [showEducationTutorial, setShowEducationTutorial] = useState(false);

  // Step 6 variables (API Key)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("trophia_api_key") || "");
  const [showKey, setShowKey] = useState(false);

  // Sync apiKey to localStorage when it changes
  useEffect(() => {
    if (apiKey && apiKey.trim().length >= 15) {
      localStorage.setItem("trophia_api_key", apiKey);
    }
  }, [apiKey]);

  const handlePasteApiKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKey(text.trim());
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const availableEquipmentOptions = React.useMemo(() => {
    const opts = new Set<string>();
    HYBRID_EQUIPMENT.forEach(x => opts.add(x));
    
    if (selectedEnvironments.includes("gym")) {
      GYM_EQUIPMENT.forEach(x => opts.add(x));
    }
    if (selectedEnvironments.includes("home")) {
      HOME_EQUIPMENT.forEach(x => opts.add(x));
    }
    if (selectedEnvironments.includes("outdoor")) {
      OUTDOOR_EQUIPMENT.forEach(x => opts.add(x));
    }
    
    return Array.from(opts);
  }, [selectedEnvironments]);

  // Calculate BMI and Category
  const bmi = calculateBMI(weight, height);
  const bmiCat = getBMICategory(bmi);

  // Helper variables for Step 2 Dynamic Buttons
  const hasNavyMeasurements = neck !== "" && waist !== "" && (sex === "male" || hip !== "");
  const hasCaliperMeasurements = caliper1 !== "" && caliper2 !== "" && caliper3 !== "";
  const hasUploadedPhotos = !!(frontPhoto || sidePhoto || legsPhoto || facePhoto);
  const hasEstimationData = hasNavyMeasurements || hasCaliperMeasurements || hasUploadedPhotos;

  // AI Goal Recommendation states and effects
  const [aiGoalRecommendation, setAiGoalRecommendation] = useState<{
    recommendedGoal: FitnessGoal;
    reason: string;
  } | null>(null);
  const [isRecommendingGoal, setIsRecommendingGoal] = useState(false);
  const [recommendGoalError, setRecommendGoalError] = useState<string | null>(null);

  // Reset AI recommendation if key metrics change, so it recalculates with correct data
  useEffect(() => {
    setAiGoalRecommendation(null);
    setRecommendGoalError(null);
  }, [sex, age, weight, height, bodyFat]);

  // Fetch AI Goal Recommendation on Step 4 mount/reset
  useEffect(() => {
    if (step === 4 && !aiGoalRecommendation && !isRecommendingGoal && !recommendGoalError) {
      const fetchGoalRecommendation = async () => {
        setIsRecommendingGoal(true);
        setRecommendGoalError(null);
        try {
          const data = await recommendGoalByIA(apiKey, {
            sex,
            age,
            weight,
            height,
            bmi,
            bodyFat,
          });
          if (data.recommendedGoal && data.reason) {
            setAiGoalRecommendation(data);
            setGoal(data.recommendedGoal);
          }
        } catch (err: any) {
          console.error("Error recommending goal:", err);
          setRecommendGoalError(err.message || "Error al obtener la recomendación.");
        } finally {
          setIsRecommendingGoal(false);
        }
      };

      fetchGoalRecommendation();
    }
  }, [step, sex, age, weight, height, bodyFat, bmi, apiKey, aiGoalRecommendation, isRecommendingGoal, recommendGoalError]);
 
  // Cycle fitness tips during the 5-second calculation loading phase
  useEffect(() => {
    if (!isCalculatingBF) {
      setActiveTipIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveTipIndex((prev) => (prev + 1) % HEALTH_TIPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isCalculatingBF]);

  // Calculate Navy Body Fat on dependencies change
  useEffect(() => {
    if (neck !== "" && waist !== "" && (sex === "male" || hip !== "")) {
      const calculatedBF = calculateNavyBodyFat(
        sex,
        Number(waist),
        Number(neck),
        height,
        hip !== "" ? Number(hip) : undefined
      );
      setNavyEstimatedFat(calculatedBF || undefined);
    } else {
      setNavyEstimatedFat(undefined);
    }
  }, [sex, waist, neck, height, hip]);

  // Calculate Caliper Body Fat on dependencies change
  useEffect(() => {
    if (caliper1 !== "" && caliper2 !== "" && caliper3 !== "" && age) {
      const calculatedBF = calculateCaliperBodyFat(
        sex,
        age,
        Number(caliper1),
        Number(caliper2),
        Number(caliper3)
      );
      setCaliperEstimatedFat(calculatedBF || undefined);
    } else {
      setCaliperEstimatedFat(undefined);
    }
  }, [sex, age, caliper1, caliper2, caliper3]);

  // Sync selectedFatSource or active calculations to bodyFat
  useEffect(() => {
    if (knowsBodyFat === "yes") {
      setBodyFat(manualBodyFat !== "" ? Number(manualBodyFat) : undefined);
      setSelectedFatSource("manual");
    } else if (knowsBodyFat === "no" && showStep2Results) {
      if (iaEstimatedFat !== undefined) {
        setBodyFat(iaEstimatedFat);
        setSelectedFatSource("ia");
      } else if (caliperEstimatedFat !== undefined) {
        setBodyFat(caliperEstimatedFat);
        setSelectedFatSource("caliper");
      } else if (navyEstimatedFat !== undefined) {
        setBodyFat(navyEstimatedFat);
        setSelectedFatSource("navy");
      } else {
        setBodyFat(undefined);
        setSelectedFatSource("none");
      }
    } else {
      setBodyFat(undefined);
      setSelectedFatSource("none");
    }
  }, [knowsBodyFat, manualBodyFat, navyEstimatedFat, caliperEstimatedFat, iaEstimatedFat, showStep2Results]);

  const handleToggleEquipment = (eq: string) => {
    if (equipment.includes(eq)) {
      setEquipment(equipment.filter(e => e !== eq));
    } else {
      setEquipment([...equipment, eq]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: "front" | "side" | "legs" | "face") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      if (slot === "front") setFrontPhoto(dataUrl);
      else if (slot === "side") setSidePhoto(dataUrl);
      else if (slot === "legs") setLegsPhoto(dataUrl);
      else if (slot === "face") setFacePhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzePhoto = async (): Promise<number | undefined> => {
    if (!frontPhoto && !sidePhoto && !legsPhoto && !facePhoto) return undefined;
    setIsAnalyzingFat(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
      const data = await analyzeFatByIA(apiKey, { 
        frontImage: frontPhoto || undefined,
        sideImage: sidePhoto || undefined,
        legsImage: legsPhoto || undefined,
        faceImage: facePhoto || undefined,
        sex,
        age,
        weight,
        height,
        neck: neck !== "" ? Number(neck) : undefined,
        waist: waist !== "" ? Number(waist) : undefined,
        hip: (sex === "female" && hip !== "") ? Number(hip) : undefined,
        navyEstimatedFat,
        caliperEstimatedFat,
        skinfolds: (caliper1 !== "" && caliper2 !== "" && caliper3 !== "") ? {
          val1: Number(caliper1),
          val2: Number(caliper2),
          val3: Number(caliper3)
        } : undefined
      });

      if (data.recommendedGoal && data.recommendedGoalReason) {
        setAiGoalRecommendation({
          recommendedGoal: data.recommendedGoal,
          reason: data.recommendedGoalReason
        });
        setGoal(data.recommendedGoal);
      }
      if (data.bodyFat) {
        setIaEstimatedFat(data.bodyFat);
        setSelectedFatSource("ia");
        setAnalysisResult(data.analysis);
        return data.bodyFat;
      }
      setAnalysisResult(data.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || "Fallo en la conexión de red o API.");
    } finally {
      setIsAnalyzingFat(false);
    }
    return undefined;
  };

  const handleCalculateBodyFat = async () => {
    setIsCalculatingBF(true);
    setShowCreatineScreen(true);
    const startTime = Date.now();
    
    let computedIaFat: number | undefined = undefined;
    
    if (hasUploadedPhotos) {
      // Analyze with photos (calls the API)
      computedIaFat = await handleAnalyzePhoto();
    }

    // Determine the single most accurate percentage
    let fatToUse: number | undefined = undefined;
    const resolvedIaFat = computedIaFat !== undefined ? computedIaFat : iaEstimatedFat;

    if (resolvedIaFat !== undefined) {
      fatToUse = resolvedIaFat;
      setSelectedFatSource("ia");
    } else if (caliperEstimatedFat !== undefined) {
      fatToUse = caliperEstimatedFat;
      setSelectedFatSource("caliper");
    } else if (navyEstimatedFat !== undefined) {
      fatToUse = navyEstimatedFat;
      setSelectedFatSource("navy");
    }

    if (fatToUse !== undefined) {
      setBodyFat(fatToUse);
    }

    // Trigger AI Goal recommendation in background (do not await) if not using photos
    if (!hasUploadedPhotos) {
      const finalFat = fatToUse !== undefined ? fatToUse : bodyFat;
      setIsRecommendingGoal(true);
      setRecommendGoalError(null);
      
      recommendGoalByIA(apiKey, {
        sex,
        age,
        weight,
        height,
        bmi,
        bodyFat: finalFat,
      })
        .then((data) => {
          if (data.recommendedGoal && data.reason) {
            setAiGoalRecommendation(data);
            setGoal(data.recommendedGoal);
          }
        })
        .catch((err: any) => {
          console.error("Error recommending goal:", err);
          setRecommendGoalError(err.message || "Error al obtener la recomendación.");
        })
        .finally(() => {
          setIsRecommendingGoal(false);
        });
    }

    // Enforce 5-second minimum loading duration to let tips be read
    const elapsedTime = Date.now() - startTime;
    const minDelay = 5000;
    if (elapsedTime < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
    }

    setIsCalculatingBF(false);
  };

  const handleNext = () => {
    if (step === 7 && !showEducationTutorial) {
      setShowEducationTutorial(true);
    } else {
      setShowEducationTutorial(false);
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (showEducationTutorial) {
      setShowEducationTutorial(false);
    } else {
      setStep(prev => Math.max(1, prev - 1));
    }
  };

  const handleSubmit = () => {
    const reqs = calculateRequirements({ 
      weight, 
      height, 
      age, 
      sex, 
      goal, 
      level, 
      bodyFat,
      activityLevel,
      stepsRange,
      deficitPace,
      dietType
    });
    
    const finalProfile: UserProfile = {
      name: name || "Usuario",
      age: age || 25,
      sex,
      weight,
      height,
      neck: neck !== "" ? Number(neck) : undefined,
      waist: waist !== "" ? Number(waist) : undefined,
      hip: (sex === "female" && hip !== "") ? Number(hip) : undefined,
      bodyFat,
      bmi,
      goal,
      level,
      environment,
      environments: selectedEnvironments,
      weeklyTrainingDays,
      equipment,
      nutritionKnowledge,
      dietType,
      dailyCalorieTarget: reqs.calories,
      proteinTarget: reqs.protein,
      carbsTarget: reqs.carbs,
      fatTarget: reqs.fat,
      apiKey: apiKey || undefined,
      isOnboardingCompleted: true,
      theme: "dark",
      takesCreatine: takesCreatine === true,
      activityLevel,
      stepsRange,
      deficitPace,
      solidMealsCount,
      parqAnswers,
      requiresMedicalClearance,
      jointPainAreas,
      trainingAge: level
    };

    onComplete(finalProfile);
  };

  if (showCreatineScreen) {
    return (
      <div className="flex flex-col h-full bg-[#050505] text-white overflow-y-auto relative select-none">
        {/* Background Neon Ambiance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[350px] h-[350px] bg-emerald-500 opacity-[0.03] rounded-full blur-[90px]"></div>
          <div className="absolute -bottom-[10%] -left-[10%] w-[350px] h-[350px] bg-emerald-500 opacity-[0.01] rounded-full blur-[90px]"></div>
        </div>

        {/* 1. Giant Premium Header Image Visual ("un buen espacio") */}
        <div className="relative w-full h-72 bg-[#080808] border-b border-white/5 overflow-hidden flex items-center justify-center">
          {/* High-quality dark fitness background image */}
          <img 
            src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1000" 
            alt="Elite Fitness Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none scale-105 select-none"
            referrerPolicy="no-referrer"
          />
          
          {/* Dark vignetting and custom neon grid to match the aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/80 pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08] pointer-events-none"></div>
          
          {/* Large custom SVG product shot overlay */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full h-full pt-4">
            <svg viewBox="0 0 400 180" className="w-64 h-36 drop-shadow-[0_0_35px_rgba(16,185,129,0.25)]">
              {/* Glow Behind */}
              <circle cx="200" cy="90" r="60" fill="#10b981" opacity="0.12" filter="blur(25px)" />

              {/* Shaker/Tub Body */}
              <rect x="155" y="30" width="90" height="120" rx="14" fill="#0c0c0c" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              
              {/* Gloss highlight on body */}
              <path d="M 158 45 L 158 135 Q 158 140 163 140 L 165 140 L 165 40 Z" fill="rgba(255,255,255,0.03)" />

              {/* Lid */}
              <rect x="162" y="16" width="76" height="16" rx="4" fill="#040404" stroke="#34d399" strokeWidth="1" />
              {/* Lid details */}
              <line x1="172" y1="20" x2="172" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <line x1="182" y1="20" x2="182" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <line x1="192" y1="20" x2="192" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <line x1="202" y1="20" x2="202" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <line x1="212" y1="20" x2="212" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <line x1="222" y1="20" x2="222" y2="30" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />

              {/* Jar Neck */}
              <rect x="170" y="28" width="60" height="6" fill="#121212" />

              {/* Label */}
              <rect x="159" y="55" width="82" height="74" rx="6" fill="#141414" stroke="rgba(16,185,129,0.1)" strokeWidth="1" />
              
              {/* Label texts */}
              <text x="200" y="70" fill="#34d399" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="2">ELITE LABS</text>
              <line x1="170" y1="76" x2="230" y2="76" stroke="#34d399" strokeWidth="1" opacity="0.6" />
              <text x="200" y="93" fill="#FFFFFF" fontSize="13" fontWeight="950" textAnchor="middle" letterSpacing="0.5">CREATINA</text>
              <text x="200" y="104" fill="rgba(255,255,255,0.4)" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">MONOHIDRATO PURO</text>
              
              {/* Badge */}
              <rect x="175" y="111" width="50" height="9" rx="2" fill="#10b981" />
              <text x="200" y="117.5" fill="#000000" fontSize="6" fontWeight="1000" textAnchor="middle" letterSpacing="0.2">GRADO CLÍNICO</text>

              {/* Measuring Scoop Visual */}
              <circle cx="285" cy="112" r="16" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <path d="M 285 112 L 330 120" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
              <text x="285" y="114" fill="#34d399" fontSize="9" textAnchor="middle" fontWeight="black">5g</text>
              <text x="285" y="123" fill="rgba(255,255,255,0.4)" fontSize="5.5" textAnchor="middle">DOSIS</text>
            </svg>
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 border border-emerald-500/15 py-1 px-4 rounded-full backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Recomendación de Élite</span>
            </div>
          </div>
        </div>

        {/* 2. Educational list of benefits */}
        <div className="flex-1 px-6 py-6 space-y-6 max-w-md mx-auto w-full">
          <div className="space-y-1.5 text-center">
            <h3 className="text-xl font-black text-white tracking-tight italic">
              ¿Por qué consumir Creatina?
            </h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xs mx-auto">
              Es el suplemento con <b>mayor evidencia científica del planeta</b>. Indispensable para acelerar tu desarrollo físico y mental.{" "}
              <a
                href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline inline-flex items-center gap-0.5"
              >
                Estudio ISSN ↗
              </a>
            </p>
          </div>

          <div className="space-y-3">
            <div className="bg-white/5 border border-white/5 hover:border-emerald-500/10 p-3.5 rounded-2xl flex gap-3.5 items-start transition duration-300">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-sm text-emerald-400 font-bold flex-shrink-0 mt-0.5">
                💪
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-white block">Fuerza Explosiva e Intensidad (ATP)</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Incrementa las reservas de fosfocreatina muscular, regenerando rápidamente la energía celular para levantar más peso y añadir repeticiones clave.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 hover:border-emerald-500/10 p-3.5 rounded-2xl flex gap-3.5 items-start transition duration-300">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-sm text-emerald-400 font-bold flex-shrink-0 mt-0.5">
                🔄
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-white block">Volumen e Hidratación Celular</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Atrae agua hacia el interior de las células musculares, dándoles un aspecto denso, rocoso y estimulando directamente la síntesis de nuevas proteínas.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 hover:border-emerald-500/10 p-3.5 rounded-2xl flex gap-3.5 items-start transition duration-300">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-sm text-emerald-400 font-bold flex-shrink-0 mt-0.5">
                ⚡
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-white block">Recuperación Muscular Acelerada</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Reduce sustancialmente los marcadores inflamatorios y el daño celular inducido por el ejercicio, agilizando la reconstrucción fibrilar.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/5 hover:border-emerald-500/10 p-3.5 rounded-2xl flex gap-3.5 items-start transition duration-300">
              <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-sm text-emerald-400 font-bold flex-shrink-0 mt-0.5">
                🧠
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-white block">Función y Enfoque Cerebral</span>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Alimenta energéticamente las neuronas, disminuyendo la fatiga mental y optimizando la agilidad cognitiva diaria.
                </p>
              </div>
            </div>
          </div>

          {/* Daily Dosage Bar */}
          <div className="border border-white/5 pt-3.5 pb-3.5 px-4 flex justify-between items-center bg-black/40 rounded-2xl">
            <div className="space-y-0.5 text-left">
              <span className="text-[8px] text-white/40 uppercase tracking-wider block font-bold">Dosis Diaria</span>
              <span className="text-[11px] text-emerald-400 font-black">3g a 5g al día</span>
            </div>
            <span className="text-[9px] text-white/50 max-w-[210px] text-right leading-relaxed">
              Monohidrato de Creatina Micronizado. Sin fase de carga obligatoria. Consúmela todos los días.
            </span>
          </div>

          {/* Creatina Intake Survey */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 p-4 rounded-2xl space-y-3.5 text-center mt-2">
            <div className="space-y-1">
              <span className="text-[8px] text-emerald-400 font-mono font-bold uppercase tracking-widest block">Personalización</span>
              <h4 className="text-xs font-black text-white">¿Y tú? ¿Tomas o planeas tomar creatina?</h4>
              <p className="text-[10px] text-white/40 leading-relaxed max-w-xs mx-auto">
                Si respondes que Sí, agregaremos un recordatorio diario en tu dashboard para que no olvides tu dosis.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTakesCreatine(true)}
                className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                  takesCreatine === true
                    ? "bg-emerald-500/10 border-emerald-400 text-emerald-400 shadow-md shadow-emerald-500/5"
                    : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {takesCreatine === true && <Check className="h-3.5 w-3.5" />}
                <span>Sí, consumo</span>
              </button>
              <button
                type="button"
                onClick={() => setTakesCreatine(false)}
                className={`py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border cursor-pointer ${
                  takesCreatine === false
                    ? "bg-rose-500/10 border-rose-400 text-rose-400 shadow-md shadow-rose-500/5"
                    : "bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                {takesCreatine === false && <Check className="h-3.5 w-3.5" />}
                <span>No consumo</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Navigation/Process footer */}
        <div className="px-6 pt-4 pb-6 border-t border-white/5 mt-auto bg-[#050505]/95 backdrop-blur-xl max-w-md mx-auto w-full sticky bottom-0 z-30 shadow-[0_-15px_30px_rgba(0,0,0,0.6)] space-y-3">
          {/* Continue Button with built-in 3-second progress bar (disabled until option chosen) */}
          <button
            disabled={takesCreatine === null}
            onClick={() => {
              setShowCreatineScreen(false);
              setShowStep2Results(true);
            }}
            className={`w-full py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-lg relative overflow-hidden group border ${
              takesCreatine === null
                ? "bg-[#141414]/30 text-white/20 border-white/5 cursor-not-allowed opacity-50"
                : "bg-[#141414] border-white/10 hover:border-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] shadow-emerald-500/5 text-white cursor-pointer"
            }`}
          >
            {/* Smooth glowing progress loading bar background */}
            {takesCreatine !== null && (
              <div 
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-emerald-500/90 to-emerald-400 transition-all duration-75 ease-out"
                style={{ width: `${creatineProgress}%` }}
              />
            )}
            
            {/* Button label text layered cleanly on top with perfect contrast adaptation */}
            <div className="relative z-10 flex items-center justify-center gap-1.5 select-none pointer-events-none">
              <span className={`font-black transition-colors duration-200 ${takesCreatine !== null && creatineProgress > 50 ? "text-black" : "text-white"}`}>
                {takesCreatine === null
                  ? "Selecciona una opción para continuar"
                  : "Ver mi composición corporal estimada"}
              </span>
              {takesCreatine !== null && (
                <ChevronRight className={`h-4 w-4 transition-colors duration-200 ${creatineProgress > 50 ? "text-black" : "text-emerald-400 group-hover:translate-x-0.5"}`} />
              )}
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-y-auto no-scrollbar pb-8 select-none relative">
      {/* Background Neon Ambiance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[350px] h-[350px] bg-emerald-500 opacity-[0.05] rounded-full blur-[90px]"></div>
      </div>

      {/* Step Header */}
      <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 z-10 bg-[#050505]/80 backdrop-blur-xl sticky top-0">
        <div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
            Paso {step} de 9
          </span>
          <h2 className="text-xl font-black text-white tracking-tight italic">
            {step === 1 && "Asistente Inteligente"}
            {step === 2 && "Datos Básicos"}
            {step === 3 && "Actividad & Movimiento"}
            {step === 4 && "Análisis Biométrico"}
            {step === 5 && "Tus Objetivos"}
            {step === 6 && "Entrenamiento"}
            {step === 7 && "Perfil Nutricional"}
            {step === 8 && "Evaluación de Salud"}
            {step === 9 && "Recordatorios"}
          </h2>
        </div>
        
        {/* Step Indicator dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div 
              key={i} 
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-emerald-500" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Form content */}
      <div className="flex-1 px-6 py-6 flex flex-col justify-start z-10 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5"
            >
              <p className="text-xs text-white/50 leading-relaxed">
                Empecemos por lo básico para calcular tus requerimientos calóricos exactos según la fórmula científica Mifflin-St Jeor.
              </p>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Tu Nombre</label>
                <Input
                  type="text"
                  icon={UserRound}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Escribe tu nombre..."
                  size="lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Edad</label>
                <Input
                  type="number"
                  icon={Calendar}
                  value={age || ""}
                  onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                  placeholder="25"
                  size="lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Sexo Biológico</label>
                <div className="flex bg-gray-50 dark:bg-white/5 rounded-2xl p-1 border border-gray-200 dark:border-white/10 h-[46px] items-center">
                  <button
                    type="button"
                    onClick={() => setSex("male")}
                    className={`flex-1 h-full flex items-center justify-center text-xs font-bold rounded-xl transition cursor-pointer ${
                      sex === "male" 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15" 
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    type="button"
                    onClick={() => setSex("female")}
                    className={`flex-1 h-full flex items-center justify-center text-xs font-bold rounded-xl transition cursor-pointer ${
                      sex === "female" 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15" 
                        : "text-white/40 hover:text-white"
                    }`}
                  >
                    Femenino
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Peso Actual (kg)</label>
                <div className="relative">
                  <Input
                    type="number"
                    icon={Dumbbell}
                    step="0.1"
                    value={weight || ""}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                    placeholder="75"
                    size="lg"
                    className="pr-10 font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 pointer-events-none">kg</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-1.5 uppercase tracking-wider">Estatura (cm)</label>
                <div className="relative">
                  <Input
                    type="number"
                    icon={Ruler}
                    value={height || ""}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                    placeholder="175"
                    size="lg"
                    className="pr-10 font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 pointer-events-none">cm</span>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-5 text-left animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <p className="text-xs text-white/50 leading-relaxed font-medium">
                Tu actividad física diaria no relacionada con el entrenamiento (NEAT) determina una parte fundamental de tus requerimientos calóricos diarios.
              </p>

              {/* NEAT - Actividad Diaria */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">
                  ¿Cómo describirías tu actividad diaria o laboral típica?
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: "sedentary", label: "Actividad Sedentaria", desc: "Sentado la mayor parte del tiempo (ej. estudio, clases, oficina, escritorio)." },
                    { id: "lightly_active", label: "Actividad Ligera", desc: "Estudio/escritorio con caminatas esporádicas, tareas del hogar o traslados ligeros." },
                    { id: "moderately_active", label: "Actividad Moderada", desc: "De pie la mayor parte del día, caminar frecuente o clases/trabajo dinámico." },
                    { id: "highly_active", label: "Actividad Intensa", desc: "Esfuerzo físico constante, locomoción activa o deporte intensivo diario." },
                    { id: "heavy_labor", label: "Trabajo Físico / Labor Pesada", desc: "Esfuerzo y carga física muy pesada (ej. construcción, agricultura, carga manual)." }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivityLevel(item.id as any)}
                      className={`px-4 py-3 rounded-2xl border text-left transition flex flex-col justify-center cursor-pointer ${
                        activityLevel === item.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                          : "bg-white/5 border-white/10 text-white/40"
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{item.label}</span>
                      <span className="text-[9px] opacity-60 font-normal block leading-tight mt-0.5">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* NEAT - Pasos Diarios */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">
                  Promedio de pasos diarios (estimado por tu reloj o teléfono)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "under_4k", label: "< 4,000 pasos" },
                    { id: "5k_7k", label: "5,000 - 7,000" },
                    { id: "8k_10k", label: "8,000 - 10,000" },
                    { id: "12k_15k", label: "12,000 - 15,000" },
                    { id: "over_18k", label: "> 18,000 pasos" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStepsRange(item.id as any)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col justify-center items-center cursor-pointer ${
                        stepsRange === item.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                          : "bg-white/5 border-white/10 text-white/40 text-xs"
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {!showStep2Results && !isCalculatingBF && (
                <>
                  {/* BMI Card */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Tu IMC Calculado</span>
                      <div className="text-2xl font-black font-mono text-white mt-1">{bmi}</div>
                    </div>
                    <div className={`px-3.5 py-1 rounded-full text-xs font-bold border ${bmiCat.color}`}>
                      {bmiCat.label}
                    </div>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed italic px-1">
                    {bmiCat.description}
                  </p>

              {/* Conoces tu % Question */}
              <div className="border-t border-white/5 my-2 pt-4">
                <span className="block text-[10px] font-bold text-white/40 uppercase mb-2.5 tracking-wider">
                  ¿Conoces tu % de Grasa Corporal?
                </span>

                <div className="grid grid-cols-2 gap-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setKnowsBodyFat("yes");
                    }}
                    className={`py-3 px-2 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      knowsBodyFat === "yes"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                    }`}
                  >
                    <span>Sí, lo conozco</span>
                    <span className="text-[9px] font-normal opacity-60">Ingreso manual directo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKnowsBodyFat("no");
                    }}
                    className={`py-3 px-2 text-xs font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      knowsBodyFat === "no"
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"
                    }`}
                  >
                    <span>No lo conozco</span>
                    <span className="text-[9px] font-normal opacity-60">Estimar con Cinta, Caliper o IA</span>
                  </button>
                </div>
              </div>

              {/* Manual Input Panel */}
              {knowsBodyFat === "yes" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3 text-left"
                >
                  <label className="block text-[10px] text-white/40 font-bold uppercase">Porcentaje de Grasa Corporal (%)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      value={manualBodyFat}
                      onChange={(e) => setManualBodyFat(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      placeholder="Ej: 15.5"
                      className="bg-black/40 rounded-xl font-mono pr-8"
                      size="md"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/40 pointer-events-none">%</span>
                  </div>
                  <p className="text-[9px] text-white/40 leading-relaxed">
                    💡 Ingresa el valor obtenido de tu examen de bioimpedancia, DEXA scan, pesaje hidrostático o plicometría profesional.
                  </p>
                </motion.div>
              )}

              {/* Estimation Suite */}
              {knowsBodyFat === "no" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3.5 text-left"
                >
                  <div className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                    Herramientas de Estimación (¡Puedes rellenar y combinar varias!):
                  </div>

                  {/* 1. Navy Estimator Header/Toggler */}
                  <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowNavyEstimator(!showNavyEstimator)}
                      className="w-full p-3.5 text-left flex justify-between items-center hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${navyEstimatedFat !== undefined ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}></div>
                        <div>
                          <span className="text-xs font-bold text-white block">A. Cinta Métrica (Cálculo Navy)</span>
                          <span className="text-[9px] text-white/40 block mt-0.5">Basado en circunferencias corporales</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {navyEstimatedFat !== undefined && (
                          <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {navyEstimatedFat}%
                          </span>
                        )}
                        <span className="text-[10px] text-white/30">{showNavyEstimator ? "Ocultar" : "Mostrar"}</span>
                      </div>
                    </button>

                    {showNavyEstimator && (
                      <div className="p-3.5 bg-black/20 border-t border-white/5 space-y-3 text-left">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="block text-[10px] font-bold text-amber-400 mb-1">📍 ¿Dónde medir? (Con cinta flexible)</span>
                          <p className="text-[9.5px] text-white/60 leading-relaxed space-y-1">
                            • <b>Cuello:</b> Justo por debajo de la laringe (manzana de Adán), inclina la cinta ligeramente hacia abajo por el frente.<br/>
                            • <b>Cintura:</b> En la línea del ombligo (hombres) o en la sección más estrecha (mujeres).<br/>
                            {sex === "female" && (
                              <span>• <b>Cadera:</b> En la sección de mayor circunferencia de los glúteos.</span>
                            )}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">Cuello (cm)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={neck}
                              onChange={(e) => setNeck(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 38"
                              className="bg-black/40 rounded-xl font-mono"
                              size="md"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">Cintura (cm)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={waist}
                              onChange={(e) => setWaist(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 85"
                              className="bg-black/40 rounded-xl font-mono"
                              size="md"
                            />
                          </div>
                        </div>

                        {sex === "female" && (
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">Cadera (cm)</label>
                            <Input
                              type="number"
                              step="0.1"
                              value={hip}
                              onChange={(e) => setHip(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 95"
                              className="bg-black/40 rounded-xl font-mono"
                              size="md"
                            />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setGuideTab("navy");
                            setShowGuideModal(true);
                          }}
                          className="w-full text-center py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold text-emerald-400 transition cursor-pointer"
                        >
                          📐 Ver guía visual de medición
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Caliper Estimator Header/Toggler */}
                  <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowCaliperEstimator(!showCaliperEstimator)}
                      className="w-full p-3.5 text-left flex justify-between items-center hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${caliperEstimatedFat !== undefined ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}></div>
                        <div>
                          <span className="text-xs font-bold text-white block">B. Plicómetro / Caliper (3 Pliegues)</span>
                          <span className="text-[9px] text-white/40 block mt-0.5">Fórmula científica Jackson-Pollock</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {caliperEstimatedFat !== undefined && (
                          <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {caliperEstimatedFat}%
                          </span>
                        )}
                        <span className="text-[10px] text-white/30">{showCaliperEstimator ? "Ocultar" : "Mostrar"}</span>
                      </div>
                    </button>

                    {showCaliperEstimator && (
                      <div className="p-3.5 bg-black/20 border-t border-white/5 space-y-3 text-left">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="block text-[10px] font-bold text-amber-400">📍 ¿Dónde medir? (Toma pliegues con plicómetro)</span>
                            <button
                              type="button"
                              onClick={() => {
                                setGuideTab("caliper");
                                setShowGuideModal(true);
                              }}
                              className="text-[8.5px] font-bold text-emerald-400 hover:text-emerald-350 px-2 py-0.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition cursor-pointer"
                            >
                              Ver Guía Visual
                            </button>
                          </div>
                          <p className="text-[9.5px] text-white/60 leading-relaxed space-y-1">
                            {sex === "male" ? (
                              <>
                                • <b>Pecho:</b> Pliegue diagonal a mitad de distancia entre la axila y el pezón.<br/>
                                • <b>Abdomen:</b> Pliegue vertical a 2 cm exactos al lado del ombligo.<br/>
                                • <b>Muslo:</b> Pliegue vertical a mitad de distancia de la parte frontal del muslo (entre la cadera y la rótula).
                              </>
                            ) : (
                              <>
                                • <b>Tríceps:</b> Pliegue vertical en la parte trasera del brazo, a mitad de distancia entre el hombro y el codo.<br/>
                                • <b>Suprailíaco:</b> Pliegue diagonal justo encima de la cresta ilíaca (hueso de la cadera).<br/>
                                • <b>Muslo:</b> Pliegue vertical a mitad de distancia de la parte frontal del muslo (entre la cadera y la rótula).
                              </>
                            )}
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">
                              {sex === "male" ? "Pecho" : "Tríceps"} (mm)
                            </label>
                            <Input
                              type="number"
                              step="0.5"
                              value={caliper1}
                              onChange={(e) => setCaliper1(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 12"
                              className="bg-black/40 rounded-xl font-mono px-2"
                              size="md"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">
                              {sex === "male" ? "Abdomen" : "Suprailíaco"} (mm)
                            </label>
                            <Input
                              type="number"
                              step="0.5"
                              value={caliper2}
                              onChange={(e) => setCaliper2(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 18"
                              className="bg-black/40 rounded-xl font-mono px-2"
                              size="md"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] text-white/40 mb-1 font-bold">Muslo (mm)</label>
                            <Input
                              type="number"
                              step="0.5"
                              value={caliper3}
                              onChange={(e) => setCaliper3(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="Ej: 15"
                              className="bg-black/40 rounded-xl font-mono px-2"
                              size="md"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. IA Estimator Header/Toggler */}
                  <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowIaEstimator(!showIaEstimator)}
                      className="w-full p-3.5 text-left flex justify-between items-center hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${iaEstimatedFat !== undefined ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`}></div>
                        <div>
                          <span className="text-xs font-bold text-white block">C. Análisis por Fotografía IA</span>
                          <span className="text-[9px] text-white/40 block mt-0.5">Gemini analiza tu fisionomía y cruza tus datos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {iaEstimatedFat !== undefined && (
                          <span className="text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                            {iaEstimatedFat}%
                          </span>
                        )}
                        <span className="text-[10px] text-white/30">{showIaEstimator ? "Ocultar" : "Mostrar"}</span>
                      </div>
                    </button>

                    {showIaEstimator && (
                      <div className="p-3.5 bg-black/20 border-t border-white/5 space-y-3.5 text-left">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex gap-2 items-start">
                          <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[9.5px] text-white/60 leading-relaxed">
                            Sube fotos de tu fisionomía. <b>Si ingresaste datos de Cinta Métrica o Plicómetro arriba, la IA los utilizará para triangular una exactitud clínica inigualable.</b> Para mejores resultados, sube fotos de <b>Frente</b> y <b>Perfil</b>.
                          </p>
                        </div>

                        <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex gap-2 items-start">
                          <Info className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <p className="text-[9.5px] text-emerald-400/80 leading-relaxed">
                            <b>🔒 Privacidad:</b> Tus fotografías <b>no se almacenan</b> en Trophia. Se transmiten de forma encriptada y directa a Google Gemini únicamente para estimar tu grasa corporal.
                          </p>
                        </div>

                        {/* Image slots */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Front Photo Slot */}
                          <div className="bg-black/20 border border-white/5 rounded-2xl p-2 flex flex-col space-y-1.5 items-center justify-between text-center min-h-[130px]">
                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400"></span> Frente *
                            </span>
                            {frontPhoto ? (
                              <div className="relative w-full flex-1 flex flex-col justify-center items-center">
                                <img src={frontPhoto} alt="Frente" className="h-16 w-full object-contain rounded-xl border border-white/10" referrerPolicy="no-referrer" />
                                <button type="button" onClick={() => setFrontPhoto(null)} className="mt-1 text-[8px] text-rose-400 hover:underline font-bold">Eliminar</button>
                              </div>
                            ) : (
                              <label className="group cursor-pointer flex-1 w-full flex flex-col items-center justify-between border border-dashed border-white/10 hover:border-emerald-500/20 rounded-xl transition bg-black/40 p-1.5 min-h-[90px]">
                                <img src={poseFront} alt="Pose Frente" className="h-12 w-full object-contain opacity-25 group-hover:opacity-40 transition grayscale" />
                                <div className="flex items-center gap-1 text-[8px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  <Camera className="h-3 w-3 text-white/40" />
                                  <span>Subir</span>
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "front")} className="hidden" />
                              </label>
                            )}
                          </div>

                           {/* Side Photo Slot */}
                          <div className="bg-black/20 border border-white/5 rounded-2xl p-2 flex flex-col space-y-1.5 items-center justify-between text-center min-h-[130px]">
                            <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-emerald-400"></span> Perfil *
                            </span>
                            {sidePhoto ? (
                              <div className="relative w-full flex-1 flex flex-col justify-center items-center">
                                <img src={sidePhoto} alt="Perfil" className="h-16 w-full object-contain rounded-xl border border-white/10" referrerPolicy="no-referrer" />
                                <button type="button" onClick={() => setSidePhoto(null)} className="mt-1 text-[8px] text-rose-400 hover:underline font-bold">Eliminar</button>
                              </div>
                            ) : (
                              <label className="group cursor-pointer flex-1 w-full flex flex-col items-center justify-between border border-dashed border-white/10 hover:border-emerald-500/20 rounded-xl transition bg-black/40 p-1.5 min-h-[90px]">
                                <img src={poseSide} alt="Pose Perfil" className="h-12 w-full object-contain opacity-25 group-hover:opacity-40 transition grayscale" />
                                <div className="flex items-center gap-1 text-[8px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  <Camera className="h-3 w-3 text-white/40" />
                                  <span>Subir</span>
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "side")} className="hidden" />
                              </label>
                            )}
                          </div>

                          {/* Legs Photo Slot */}
                          <div className="bg-black/20 border border-white/5 rounded-2xl p-2 flex flex-col space-y-1.5 items-center justify-between text-center min-h-[130px]">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Piernas</span>
                            {legsPhoto ? (
                              <div className="relative w-full flex-1 flex flex-col justify-center items-center">
                                <img src={legsPhoto} alt="Piernas" className="h-16 w-full object-contain rounded-xl border border-white/10" referrerPolicy="no-referrer" />
                                <button type="button" onClick={() => setLegsPhoto(null)} className="mt-1 text-[8px] text-rose-400 hover:underline font-bold">Eliminar</button>
                              </div>
                            ) : (
                              <label className="group cursor-pointer flex-1 w-full flex flex-col items-center justify-between border border-dashed border-white/5 hover:border-emerald-500/20 rounded-xl transition bg-black/30 p-1.5 min-h-[90px]">
                                <img src={poseLegs} alt="Pose Piernas" className="h-12 w-full object-contain opacity-25 group-hover:opacity-40 transition grayscale" />
                                <div className="flex items-center gap-1 text-[8px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  <Camera className="h-3 w-3 text-white/30" />
                                  <span>Opcional</span>
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "legs")} className="hidden" />
                              </label>
                            )}
                          </div>

                          {/* Face Photo Slot */}
                          <div className="bg-black/20 border border-white/5 rounded-2xl p-2 flex flex-col space-y-1.5 items-center justify-between text-center min-h-[130px]">
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Cara</span>
                            {facePhoto ? (
                              <div className="relative w-full flex-1 flex flex-col justify-center items-center">
                                <img src={facePhoto} alt="Cara" className="h-16 w-full object-contain rounded-xl border border-white/10" referrerPolicy="no-referrer" />
                                <button type="button" onClick={() => setFacePhoto(null)} className="mt-1 text-[8px] text-rose-400 hover:underline font-bold">Eliminar</button>
                              </div>
                            ) : (
                              <label className="group cursor-pointer flex-1 w-full flex flex-col items-center justify-between border border-dashed border-white/5 hover:border-emerald-500/20 rounded-xl transition bg-black/30 p-1.5 min-h-[90px]">
                                <img src={poseFace} alt="Pose Cara" className="h-12 w-full object-contain opacity-25 group-hover:opacity-40 transition grayscale" />
                                <div className="flex items-center gap-1 text-[8px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  <Camera className="h-3 w-3 text-white/30" />
                                  <span>Opcional</span>
                                </div>
                                <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, "face")} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </motion.div>
              )}
            </>
          )}



          {/* Step 2 Calculated results view */}
          {showStep2Results && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 text-left"
            >
              <div className="bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-3xl p-6 text-center space-y-4 shadow-xl">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Composición Corporal Estimada</span>
                
                <div className="space-y-1">
                  {isCalculatingBF ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-2">
                      <RefreshCw className="h-7 w-7 text-emerald-400 animate-spin" />
                      <span className="text-[11px] text-emerald-400 font-bold animate-pulse">🤖 La IA está revisando tus fotos y estimando tu % de grasa...</span>
                    </div>
                  ) : (
                    <div className="text-5xl font-black font-mono text-white tracking-tight">
                      {bodyFat !== undefined ? `${bodyFat}%` : "--"} <span className="text-xs text-white/40 font-sans font-normal italic">Grasa</span>
                    </div>
                  )}
                  
                  <p className="text-xs text-white/60 font-semibold uppercase tracking-wide pt-1">
                    Clasificación:{" "}
                    <span className="text-emerald-400 font-bold">
                      {isCalculatingBF ? (
                        "Analizando..."
                      ) : bodyFat !== undefined ? (
                        sex === "male" ? (
                          bodyFat < 8 ? "Definido / Competición" :
                          bodyFat <= 14 ? "Atlético / Excelente" :
                          bodyFat <= 21 ? "Saludable / Moderado" : "Sobrepeso / Grasa Alta"
                        ) : (
                          bodyFat < 14 ? "Definido / Competición" :
                          bodyFat <= 21 ? "Atlético / Excelente" :
                          bodyFat <= 29 ? "Saludable / Moderado" : "Sobrepeso / Grasa Alta"
                        )
                      ) : "Por calcular"}
                    </span>
                  </p>
                </div>

                <div className="border-t border-white/5 pt-3 text-[11px] text-white/50 leading-relaxed max-w-xs mx-auto">
                  {isCalculatingBF ? (
                    "Por favor espera un momento mientras nuestro algoritmo de IA procesa tus imágenes para una estimación precisa..."
                  ) : analysisError ? (
                    <div className="text-rose-400 space-y-1">
                      <span className="font-bold block">⚠️ Error al calcular con imágenes</span>
                      <p className="text-[10px] text-white/60">{analysisError}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                        No te preocupes, puedes pulsar "Continuar" abajo para seguir con tus datos físicos básicos.
                      </p>
                    </div>
                  ) : bodyFat !== undefined ? (
                    sex === "male" ? (
                      bodyFat < 8 ? "Posees un nivel extremadamente bajo de grasa. Tu prioridad debe ser el mantenimiento saludable o superávit calórico controlado." :
                      bodyFat <= 14 ? "Tu nivel de grasa es atlético y óptimo. Tienes un entorno hormonal idóneo para enfocarte en ganar masa muscular limpia." :
                      bodyFat <= 21 ? "Te encuentras en un rango saludable de fitness general. Puedes optar por recomposición estética o definición para mayor nitidez." :
                      "Tu porcentaje de grasa está por encima del óptimo sugerido. Priorizar un déficit calórico ligero a moderado te brindará mejoras dramáticas en salud y estética."
                    ) : (
                      bodyFat < 14 ? "Posees un nivel extremadamente bajo de grasa para una mujer. Tu prioridad debe ser el mantenimiento saludable o superávit calórico controlado." :
                      bodyFat <= 21 ? "Tu nivel de grasa es atlético y óptimo. Tienes un entorno hormonal excelente para enfocarte en ganar masa muscular o fuerza." :
                      bodyFat <= 29 ? "Te encuentras en un rango saludable de fitness general. Puedes optar por recomposición estética o definición moderada si buscas mayor tono." :
                      "Tu porcentaje de grasa está por encima del rango óptimo. Priorizar un déficit calórico ligero a moderado te brindará mejoras dramáticas en salud, energía y tono muscular."
                    )
                  ) : (
                    "No se pudo realizar la estimación por imagen. Pulsa Continuar para avanzar y definir tus objetivos con tus datos físicos."
                  )}
                </div>
              </div>

              {/* Gemini clinical insight if photos were uploaded */}
              {hasUploadedPhotos && analysisResult && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      <span>Diagnóstico Clínico de Imagen (Gemini):</span>
                    </div>
                    {hasBiometricHeader(analysisResult) && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                        Biometría Inteligente
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/70 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-white/5 space-y-2">
                    {getCleanedAnalysis(analysisResult).split("\n\n").map((paragraph, index) => (
                      <p key={index}>{formatAnalysisText(paragraph)}</p>
                    ))}
                  </div>
                </div>
              )}



              {/* Button to edit and recalculate */}
              <button
                type="button"
                onClick={() => {
                  setShowStep2Results(false);
                }}
                className="w-full text-center py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white/50 hover:text-white border border-white/5 hover:border-white/10 transition cursor-pointer"
              >
                ✏️ Modificar medidas o fotos
              </button>
            </motion.div>
          )}
            </motion.div>
          )}

          {step === 5 && (() => {
            const currentBF = bodyFat || (sex === "male" ? 20 : 28);
            const targetBF = sex === "male" ? 12 : 22;
            
            // LBM and weight target calculation
            const lbm = weight * (1 - (currentBF / 100));
            const targetWeight = lbm / (1 - (targetBF / 100));
            const weightToLose = Math.max(0.5, weight - targetWeight);

            // Deficit rate logic matching fitnessUtils
            const isHighAdiposity = sex === "male" ? currentBF > 25 : currentBF > 35;
            const isLean = sex === "male" ? currentBF < 15 : currentBF < 25;
            
            let weeklyRate = 0.0085;
            if (isHighAdiposity) {
              if (deficitPace === "conservative") weeklyRate = 0.010;
              else if (deficitPace === "moderate") weeklyRate = 0.0125;
              else if (deficitPace === "aggressive") weeklyRate = 0.015;
            } else if (isLean) {
              if (deficitPace === "conservative") weeklyRate = 0.003;
              else if (deficitPace === "moderate") weeklyRate = 0.005;
              else if (deficitPace === "aggressive") weeklyRate = 0.007;
            } else {
              if (deficitPace === "conservative") weeklyRate = 0.007;
              else if (deficitPace === "moderate") weeklyRate = 0.0085;
              else if (deficitPace === "aggressive") weeklyRate = 0.010;
            }

            const weeklyLossKg = weight * weeklyRate;
            const weeks = Math.ceil(weightToLose / weeklyLossKg);

            // Muscle rate
            let monthlyRate = 0.0075;
            if (level === "beginner") monthlyRate = 0.0125;
            else if (level === "advanced") monthlyRate = 0.0035;
            const monthlyGainKg = weight * monthlyRate;
            const months = Math.ceil(4 / monthlyGainKg);

            return (
              <motion.div
                key="step5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-left"
              >
                <p className="text-xs text-white/50 leading-relaxed">
                  Selecciona tu objetivo primordial. Esto adaptará tus macronutrientes recomendados (proteínas, carbohidratos y grasas) y el tipo de entrenamiento sugerido.
                </p>

                {/* AI Goal Recommendation Box */}
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 space-y-2.5 text-left">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                      <span>Recomendación de Meta por IA</span>
                    </div>
                    {isRecommendingGoal && (
                      <div className="flex items-center gap-1 text-[10px] text-white/50">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Analizando composición...</span>
                      </div>
                    )}
                  </div>

                  {isRecommendingGoal && (
                    <div className="space-y-2 py-1">
                      <div className="h-3 w-3/4 bg-white/10 rounded animate-pulse"></div>
                      <div className="h-3 w-1/2 bg-white/10 rounded animate-pulse"></div>
                    </div>
                  )}

                  {recommendGoalError && (
                    <div className="space-y-2">
                      <p className="text-[10.5px] text-rose-400 leading-relaxed">
                        ⚠️ {recommendGoalError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setRecommendGoalError(null)}
                        className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Reintentar Recomendación</span>
                      </button>
                    </div>
                  )}

                  {aiGoalRecommendation && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                        Objetivo Sugerido:{" "}
                        <span className="text-emerald-400 font-black">
                          {aiGoalRecommendation.recommendedGoal === "lose_weight" && "Bajar de Peso / Definición"}
                          {aiGoalRecommendation.recommendedGoal === "gain_muscle" && "Ganar Masa Muscular / Volumen"}
                          {aiGoalRecommendation.recommendedGoal === "aesthetics" && "Recomposición Estética"}
                          {aiGoalRecommendation.recommendedGoal === "maintenance" && "Mantenimiento / Salud"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/80 leading-relaxed">
                        {formatAnalysisText(aiGoalRecommendation.reason)}
                      </p>
                    </div>
                  )}

                  {!isRecommendingGoal && !aiGoalRecommendation && !recommendGoalError && (
                    <p className="text-[11px] text-white/50 leading-relaxed">
                      Sube tus fotos o ingresa tus medidas en el paso anterior para que Gemini analice tu composición corporal y te recomiende la meta perfecta.
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  {[
                    {
                      id: "lose_weight",
                      title: "Bajar de Peso / Definición",
                      desc: "Déficit calórico controlado. Alta ingesta de proteínas para mantener masa muscular mientras pierdes grasa.",
                      icon: "🔥"
                    },
                    {
                      id: "gain_muscle",
                      title: "Ganar Masa Muscular / Volumen",
                      desc: "Superávit calórico optimizado. Foco en fuerza progresiva y carbohidratos complejos para el desarrollo de masa muscular.",
                      icon: "💪"
                    },
                    {
                      id: "aesthetics",
                      title: "Recomposición Estética",
                      desc: "Ligero déficit o calorías de mantenimiento. Pérdida de grasa y tonificación muscular simultánea.",
                      icon: "✨"
                    },
                    {
                      id: "maintenance",
                      title: "Mantenimiento / Salud",
                      desc: "Calorías balanceadas. Mantener tu peso actual, mejorar tu energía diaria y tu rendimiento general.",
                      icon: "⚖️"
                    }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setGoal(option.id as FitnessGoal)}
                      className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                        goal === option.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                      }`}
                    >
                      <span className="text-2xl mt-0.5">{option.icon}</span>
                      <div className="flex-1">
                        <span className="block font-extrabold text-xs text-white leading-tight">{option.title}</span>
                        <span className="block text-[10px] text-white/40 leading-relaxed mt-1">{option.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Dynamic Deficit Pace Selector */}
                {goal === "lose_weight" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-white/5 pt-4 mt-2 space-y-3"
                  >
                    <label className="block text-[10px] font-bold text-white/40 mb-1 uppercase tracking-wider">
                      ¿A qué ritmo deseas alcanzar este déficit?
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "conservative", label: "Conservador", desc: "Sostenible" },
                        { id: "moderate", label: "Moderado", desc: "Clínico" },
                        { id: "aggressive", label: "Agresivo", desc: "Rápido" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDeficitPace(item.id as any)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col justify-between items-center h-[52px] cursor-pointer ${
                            deficitPace === item.id
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                              : "bg-white/5 border-white/10 text-white/40 text-xs"
                          }`}
                        >
                          <span className="block text-[11px] font-bold leading-tight">{item.label}</span>
                          <span className="text-[8px] opacity-60 font-normal block leading-tight mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-white/30 italic leading-normal">
                      * Un ritmo agresivo es idóneo con porcentajes de grasa elevados. Si eres magro, un ritmo conservador mantendrá tu tejido muscular intacto.
                    </p>
                  </motion.div>
                )}

                {/* Proyección Científica de Resultados */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 text-left font-sans mt-3">
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block">
                    📈 Proyección Científica de Resultados
                  </span>
                  {goal === "lose_weight" ? (
                    currentBF <= targetBF ? (
                      <div className="space-y-1">
                        <p className="text-[11px] text-white font-bold leading-tight">
                          ¡Tu porcentaje de grasa actual ({currentBF}%) ya es óptimo!
                        </p>
                        <p className="text-[9.5px] text-white/50 leading-normal">
                          Se recomienda un déficit muy leve y controlado para preservación muscular total y definición de detalles.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[11px] text-white font-bold leading-tight">
                          Llegarás a tu grasa óptima ({targetBF}%) en aprox. <span className="text-emerald-400 font-black">{weeks} semanas</span>.
                        </p>
                        <p className="text-[9.5px] text-white/50 leading-normal">
                          Perdiendo unos <b>{weeklyLossKg.toFixed(2)} kg/semana</b> de forma segura (reducción total de <b>{weightToLose.toFixed(1)} kg</b> de grasa preservando tu tejido muscular).
                        </p>
                      </div>
                    )
                  ) : goal === "gain_muscle" ? (
                    <div className="space-y-1">
                      <p className="text-[11px] text-white font-bold leading-tight">
                        Para construir 4 kg de masa muscular limpia: <span className="text-emerald-400 font-black">{months} meses</span>.
                      </p>
                      <p className="text-[9.5px] text-white/50 leading-normal">
                        Ganando unos <b>{monthlyGainKg.toFixed(2)} kg/mes</b> de músculo limpio de forma fisiológicamente óptima y limitando la acumulación de grasa.
                      </p>
                    </div>
                  ) : goal === "aesthetics" ? (
                    <div className="space-y-1">
                      <p className="text-[11px] text-white font-bold leading-tight">
                        Recomposición corporal recomendada: <span className="text-emerald-400 font-black">12 a 16 semanas</span>.
                      </p>
                      <p className="text-[9.5px] text-white/50 leading-normal">
                        Fase ideal para notar reducciones visibles en el porcentaje de grasa y ganancias moderadas de tono y firmeza muscular simultáneamente.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[11px] text-white font-bold leading-tight">
                        Fase de estabilización recomendada: <span className="text-emerald-400 font-black">8 a 12 semanas</span>.
                      </p>
                      <p className="text-[9.5px] text-white/50 leading-normal">
                        Ideal para consolidar tus resultados anteriores, regular hormonas del apetito y optimizar tu metabolismo antes de volver a definir o volumen.
                      </p>
                    </div>
                  )}
                  
                  <p className="text-[8px] text-white/35 italic leading-normal border-t border-white/5 pt-1.5 mt-1.5 text-center font-sans">
                    * Estimación teórica basada en un 100% de adherencia y consistencia en el déficit calórico y entrenamiento recomendados.
                  </p>
                </div>
              </motion.div>
            );
          })()}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                  1. Historial Deportivo y Nivel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "beginner", label: "Principiante", desc: "0-1 año continuo" },
                    { id: "intermediate", label: "Intermedio", desc: "1-3 años sólidos" },
                    { id: "advanced", label: "Avanzado", desc: "3+ años continuos" }
                  ].map((lvl) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLevel(lvl.id as ExperienceLevel)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        level === lvl.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                          : "bg-white/5 border-white/10 text-white/40 text-xs"
                      }`}
                    >
                      <span className="block text-xs font-bold">{lvl.label}</span>
                      <span className="text-[8px] opacity-60 font-normal">{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                  2. Entornos de Entrenamiento (Puedes elegir varios)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "home", label: "Casa", emoji: "🏠" },
                    { id: "gym", label: "Gimnasio", emoji: "🏋️" },
                    { id: "outdoor", label: "Aire Libre", emoji: "🌳" }
                  ].map((env) => {
                    const active = selectedEnvironments.includes(env.id as TrainingEnvironment);
                    return (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => {
                          const newEnv = env.id as TrainingEnvironment;
                          let updatedEnvs: TrainingEnvironment[];
                          if (active) {
                            if (selectedEnvironments.length > 1) {
                              updatedEnvs = selectedEnvironments.filter(e => e !== newEnv);
                            } else {
                              return; // keep at least one
                            }
                          } else {
                            updatedEnvs = [...selectedEnvironments, newEnv];
                          }
                          setSelectedEnvironments(updatedEnvs);
                          
                          // Dynamically append default equipment for newly checked environments
                          let newEq = [...equipment];
                          if (!active) {
                            if (newEnv === "gym") {
                              newEq = Array.from(new Set([...newEq, ...HYBRID_EQUIPMENT, ...GYM_EQUIPMENT]));
                            } else if (newEnv === "home") {
                              newEq = Array.from(new Set([
                                ...newEq,
                                "Peso corporal / Calistenia básica",
                                "Mancuernas de peso fijo",
                                "Bandas de resistencia elásticas largas",
                                "Colchoneta de alta densidad / Mat de yoga"
                              ]));
                            } else if (newEnv === "outdoor") {
                              newEq = Array.from(new Set([
                                ...newEq,
                                "Peso corporal / Calistenia básica",
                                "Barras fijas altas de exterior",
                                "Barras paralelas de exterior",
                                "Colchoneta de alta densidad / Mat de yoga"
                              ]));
                            }
                          }
                          setEquipment(newEq);
                        }}
                        className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          active
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                            : "bg-white/5 border-white/10 text-white/40 text-xs"
                        }`}
                      >
                        <span className="text-base">{env.emoji}</span>
                        <span className="text-xs font-bold">{env.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                  3. Frecuencia Semanal
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setWeeklyTrainingDays(days)}
                      className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center ${
                        weeklyTrainingDays === days
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                          : "bg-white/5 border-white/10 text-white/40"
                      }`}
                    >
                      <span className="block text-xs font-bold">{days}</span>
                      <span className="block text-[7.5px] opacity-60 font-semibold leading-none mt-0.5">
                        {days === 1 ? "día" : "días"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest flex items-center justify-between">
                  <span>4. Equipamiento Disponible</span>
                  <span className="text-[9px] text-emerald-400 font-mono font-normal">
                    {equipment.length} elegidos
                  </span>
                </label>
                
                <div className="grid grid-cols-2 gap-2 border border-white/5 p-2 rounded-2xl bg-black/30">
                  {availableEquipmentOptions.map((eq) => {
                    const selected = equipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => handleToggleEquipment(eq)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition cursor-pointer ${
                          selected
                            ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                            : "bg-white/5 border-white/10 text-white/40"
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                          selected ? "bg-emerald-500 border-emerald-500 text-white" : "border-white/20"
                        }`}>
                          {selected && <Check className="h-2.5 w-2.5 stroke-[3px]" />}
                        </div>
                        <span className="text-[10px] truncate">{eq}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {!showEducationTutorial ? (
                <>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Hemos determinado tus metas de alimentación y macronutrientes diarias automáticas basándonos en tu biometría.
                  </p>

                  <div className="bg-gradient-to-br from-emerald-500/5 to-transparent p-5 rounded-3xl border border-emerald-500/10 text-center space-y-4">
                    <div>
                      <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Requerimiento Diario</span>
                      <div className="text-4xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
                        {calculateRequirements({ weight, height, age, sex, goal, level, bodyFat, activityLevel, stepsRange, deficitPace, dietType }).calories} <span className="text-xs font-normal text-white/50 italic font-sans ml-0.5">kcal</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                      <div className="bg-white/5 py-2.5 rounded-xl border border-white/5">
                        <span className="block text-[8px] text-white/40 uppercase font-bold">Proteína</span>
                        <span className="text-xs font-extrabold text-white font-mono">
                          {calculateRequirements({ weight, height, age, sex, goal, level, bodyFat, activityLevel, stepsRange, deficitPace, dietType }).protein}g
                        </span>
                      </div>
                      <div className="bg-white/5 py-2.5 rounded-xl border border-white/5">
                        <span className="block text-[8px] text-white/40 uppercase font-bold">Carbos</span>
                        <span className="text-xs font-extrabold text-white font-mono">
                          {calculateRequirements({ weight, height, age, sex, goal, level, bodyFat, activityLevel, stepsRange, deficitPace, dietType }).carbs}g
                        </span>
                      </div>
                      <div className="bg-white/5 py-2.5 rounded-xl border border-white/5">
                        <span className="block text-[8px] text-white/40 uppercase font-bold">Grasas</span>
                        <span className="text-xs font-extrabold text-white font-mono">
                          {calculateRequirements({ weight, height, age, sex, goal, level, bodyFat, activityLevel, stepsRange, deficitPace, dietType }).fat}g
                        </span>
                      </div>
                    </div>
                  </div>



                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                      ¿Sigues algún tipo de dieta?
                    </label>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "standard", label: "Estándar", desc: "Como de todo" },
                        { id: "vegetarian", label: "Vegetariana", desc: "Sin carne ni pez" },
                        { id: "vegan", label: "Vegana", desc: "100% vegetal" },
                        { id: "keto", label: "Keto", desc: "Baja en carbos" },
                        { id: "paleo", label: "Paleo", desc: "Comida evolutiva" },
                        { id: "mediterranean", label: "Mediterránea", desc: "Grasas sanas" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDietType(item.id as DietType)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col justify-between items-center h-[52px] cursor-pointer ${
                            dietType === item.id
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                              : "bg-white/5 border-white/10 text-white/40 text-xs"
                          }`}
                        >
                          <span className="block text-[11px] font-bold leading-tight">{item.label}</span>
                          <span className="text-[8px] opacity-60 font-normal block leading-tight mt-0.5">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comidas sólidas al día */}
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    <label className="block text-[10px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                      ¿Cuántas comidas al día prefieres realizar?
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setSolidMealsCount(num)}
                          className={`p-3 rounded-xl border text-center transition flex flex-col justify-center items-center h-[46px] cursor-pointer ${
                            solidMealsCount === num
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold"
                              : "bg-white/5 border-white/10 text-white/40 text-xs"
                          }`}
                        >
                          <span className="block text-xs font-bold leading-tight">{num === 6 ? "6 o más" : `${num} comidas`}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vegan / Vegetarian supplementation notice */}
                  {(dietType === "vegan" || dietType === "vegetarian") && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/15 space-y-2.5 text-left mt-3"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Recomendación Nutricional Plant-Based</span>
                      </div>
                      <p className="text-[10px] text-white/60 leading-normal font-medium">
                        Las dietas vegetarianas y veganas son excelentes para la salud, pero requieren atención en ciertos micronutrientes. Te sugerimos complementar con:
                      </p>
                      <ul className="text-[9.5px] text-white/50 space-y-1 pl-4 list-disc leading-normal font-medium">
                        <li><b>Vitamina B12:</b> Esencial para el sistema nervioso y glóbulos rojos (suplementar con cianocobalamina).</li>
                        <li><b>Vitamina D3:</b> Favorece la salud ósea y muscular (derivada de líquenes).</li>
                        <li><b>Omega 3 (DHA/EPA):</b> Importante para la salud cardiovascular y cerebral (de origen algal).</li>
                        <li><b>Hierro y Zinc:</b> Consume vitamina C junto con tus legumbres para potenciar la absorción de hierro vegetal (no hemo).</li>
                      </ul>
                    </motion.div>
                  )}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/5 p-5 rounded-3xl border border-emerald-500/10 space-y-4"
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <BookOpen className="h-5 w-5" />
                    <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Introducción Básica a la Nutrición</h3>
                  </div>

                  <div className="space-y-3 text-[11px] text-white/60 leading-relaxed">
                    <p className="px-1 text-[11.5px]">
                      ¡Excelente! Vamos a nivelarte rápido con 3 pilares sencillos que te harán ver resultados hoy mismo:
                    </p>
                    
                    <div className="space-y-3">
                      {/* Pilar 1: Balance Calórico */}
                      <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl p-3.5 flex gap-3.5 items-start transition hover:border-emerald-500/20 shadow-md">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 shadow-sm shadow-emerald-500/5">
                          <Flame className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-[11px] tracking-wide block">1. Balance Calórico ⚖️</span>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                            Tu peso se rige por la energía. Ingerir <span className="text-emerald-400 font-bold">menos</span> calorías de las recomendadas te pondrá en <span className="text-emerald-400 font-bold">Déficit</span> para perder grasa, e ingerir <span className="text-emerald-400 font-bold">más</span> te dará un <span className="text-emerald-400 font-bold">Superávit</span> para ganar músculo.
                          </p>
                        </div>
                      </div>

                      {/* Pilar 2: Proteínas */}
                      <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl p-3.5 flex gap-3.5 items-start transition hover:border-emerald-500/20 shadow-md">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 shadow-sm shadow-emerald-500/5">
                          <Dumbbell className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-[11px] tracking-wide block">2. Proteínas (Músculo) 💪</span>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                            Son los <span className="text-emerald-400 font-bold">ladrillos</span> de tu cuerpo. Indispensables para reparar y desarrollar tejidos musculares tras entrenar, además de mantenerte saciado por más tiempo.
                          </p>
                        </div>
                      </div>

                      {/* Pilar 3: Carbos y Grasas */}
                      <div className="bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/5 rounded-2xl p-3.5 flex gap-3.5 items-start transition hover:border-emerald-500/20 shadow-md">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 shadow-sm shadow-emerald-500/5">
                          <Zap className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-extrabold text-white text-[11px] tracking-wide block">3. Carbohidratos y Grasas 🔋</span>
                          <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                            Los <span className="text-emerald-400 font-bold">Carbohidratos</span> representan tu combustible explosivo para rendir al máximo, mientras que las <span className="text-emerald-400 font-bold">Grasas</span> optimizan tu entorno celular y salud hormonal.
                          </p>
                        </div>
                      </div>
                    </div>

                    {randomNutritionTip && (
                      <div className="bg-emerald-500/5 p-3.5 rounded-2xl border border-emerald-500/10 space-y-1.5 mt-2 text-left">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <Sparkles className="h-3.5 w-3.5 shrink-0" />
                          <span>Evidencia Científica: {randomNutritionTip.title}</span>
                        </div>
                        <p className="text-[10px] text-white/70 leading-relaxed">
                          {randomNutritionTip.text}
                        </p>
                        {randomNutritionTip.url && (
                          <a
                            href={randomNutritionTip.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline inline-block pt-0.5"
                          >
                            Fuente: {randomNutritionTip.source} ↗
                          </a>
                        )}
                      </div>
                    )}
                    
                    <p className="text-[9px] text-white/30 text-center italic mt-1 leading-normal">
                      * Podrás consultar este y decenas de otros consejos y mitos científicos respaldados por estudios clínicos en la sección <b>Salud &gt; Biblioteca Científica</b> de la aplicación.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleNext}
                    rightIcon={ChevronRight}
                    className="w-full mt-3 font-bold"
                    size="md"
                  >
                    Continuar
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}


          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 text-emerald-400">
                <Key className="h-5 w-5" />
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  Configura tu clave de API de Gemini
                </p>
              </div>

              <p className="text-[11px] text-white/50 leading-relaxed">
                Nuestra aplicación utiliza IA avanzada para analizar tus fotos de comida, estimar tu porcentaje de grasa y estructurar rutinas en tiempo real. 
                <br/><br/>
                Para operar de forma personalizada e independiente de cuotas, es necesario que ingreses tu propia clave de Google AI Studio. <b>Esta clave es obligatoria para poder continuar.</b>
                <br/><br/>
                Puedes obtener tu clave completamente gratis ingresando aquí:{" "}
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5"
                >
                  Obtener API Key de Gemini
                </a>
              </p>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider">Clave de API de Gemini</label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy... (Obligatorio)"
                      className="bg-[#121212] rounded-xl font-mono"
                      size="md"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handlePasteApiKey}
                    className="shrink-0 h-[42px] px-3.5 text-[11px] font-bold rounded-xl"
                  >
                    Pegar
                  </Button>
                </div>

                <div className="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/15 rounded-xl text-[9px] text-emerald-400 leading-normal">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Puedes configurar o cambiar esta clave en cualquier momento desde la sección de Ajustes una vez dentro de la aplicación.
                  </span>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                <span className="text-white/40 text-[11px]">¿Cómo obtenerla gratis?</span>
                <a 
                  href="https://aistudio.google.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Ir a Google AI Studio
                </a>
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 text-left"
            >
              <p className="text-xs text-white/50 leading-relaxed">
                Completa este breve tamizaje oficial de aptitud física (PAR-Q+) para entrenar de forma 100% segura y libre de riesgos.
              </p>

              <div className="space-y-3.5 pr-1 border border-white/5 p-3 rounded-2xl bg-black/20">
                {[
                  { id: "q1", text: "1. ¿Alguna vez un médico te ha indicado que padeces de una afección cardíaca o presión arterial alta?" },
                  { id: "q2", text: "2. ¿Sientes dolor, opresión o pesadez en el pecho en reposo o al realizar actividad física?" },
                  { id: "q3", text: "3. ¿Experimentas pérdidas de equilibrio por mareos frecuentes o has perdido el conocimiento en los últimos 12 meses?" },
                  { id: "q4", text: "4. ¿Se te ha diagnosticado otra afección médica de carácter crónico?" },
                  { id: "q5", text: "5. ¿Tomas actualmente medicamentos recetados para alguna condición médica crónica?" },
                  { id: "q6", text: "6. ¿Tienes algún problema óseo, articular o muscular que pueda agravarse al hacer ejercicio más intenso?" },
                  { id: "q7", text: "7. ¿Alguna vez un especialista te ha indicado que solo debes hacer ejercicio bajo supervisión médica estricta?" }
                ].map((q) => {
                  const val = (parqAnswers as any)[q.id];
                  return (
                    <div key={q.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2 flex flex-col justify-between font-sans">
                      <span className="text-[10px] text-white/80 leading-normal font-medium">{q.text}</span>
                      <div className="flex gap-2 h-8">
                        <button
                          key={`${q.id}-yes`}
                          type="button"
                          onClick={() => setParqAnswers(prev => ({ ...prev, [q.id]: true }))}
                          className={`flex-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                            val === true
                              ? "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                              : "bg-white/5 border border-white/10 text-white/40"
                          }`}
                        >
                          Sí
                        </button>
                        <button
                          key={`${q.id}-no`}
                          type="button"
                          onClick={() => setParqAnswers(prev => ({ ...prev, [q.id]: false }))}
                          className={`flex-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center justify-center ${
                            val === false
                              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                              : "bg-white/5 border border-white/10 text-white/40"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Anatomical Areas affected if Q6 is true */}
              {parqAnswers.q6 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/15 space-y-3 text-left font-sans"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>¿Qué zona articular o muscular te afecta?</span>
                  </div>
                  <p className="text-[9.5px] text-white/50 leading-normal">
                    Selecciona las áreas afectadas para que nuestra IA adapte tus rutinas eliminando ejercicios contraindicados:
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "knee", label: "Rodilla" },
                      { id: "back", label: "Espalda Baja" },
                      { id: "shoulder", label: "Hombro" }
                    ].map((area) => {
                      const selected = jointPainAreas.includes(area.id as any);
                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => {
                            const newArea = area.id as any;
                            if (selected) {
                              setJointPainAreas(jointPainAreas.filter(a => a !== newArea));
                            } else {
                              setJointPainAreas([...jointPainAreas, newArea]);
                            }
                          }}
                          className={`py-2 px-1 rounded-xl border text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            selected
                              ? "bg-amber-500/15 border-amber-500/45 text-amber-400 font-bold"
                              : "bg-white/5 border border-white/10 text-white/40 text-xs"
                          }`}
                        >
                          <div className={`w-3 h-3 rounded flex items-center justify-center border transition ${
                            selected ? "bg-amber-500 border-amber-500 text-black" : "border-white/20"
                          }`}>
                            {selected && <Check className="h-2 w-2 stroke-[4px]" />}
                          </div>
                          <span className="text-[10px]">{area.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Cardiovascular / Neurological alert if Q1/Q2/Q3/Q7 is true */}
              {requiresMedicalClearance && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-left space-y-1.5 font-sans">
                  <span className="text-xs font-extrabold text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Aviso de Seguridad Médica</span>
                  </span>
                  <p className="text-[10px] text-white/60 leading-relaxed font-medium">
                    Has indicado antecedentes o síntomas cardiovasculares o neurológicos. Por tu seguridad, <b>Trophia congelará la generación de rutinas de alta intensidad</b>. Te recomendamos fuertemente obtener autorización de un médico antes de iniciar actividad física vigorosa.
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {step === 9 && (
            <motion.div
              key="step9"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 text-center py-4"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <Bell className="h-8 w-8 text-emerald-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-black text-white tracking-tight">¡No te saltes tus metas!</h3>
                <p className="text-[11px] text-white/50 leading-relaxed max-w-sm mx-auto">
                  Activa las notificaciones para recibir recordatorios diarios personalizados sobre tu agua, creatina y el registro de tus comidas.
                </p>
              </div>

              {pushError && (
                <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-[10px] text-red-400 font-semibold flex items-center gap-2 max-w-sm mx-auto">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{pushError}</span>
                </div>
              )}

              {pushSupported === false ? (
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-left space-y-1.5 max-w-sm mx-auto">
                  <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    <span>Notificaciones no disponibles</span>
                  </span>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    Las notificaciones push no son compatibles con este navegador o dispositivo.
                  </p>
                </div>
              ) : (
                <div className="max-w-sm mx-auto space-y-3">
                  {isSubscribed ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
                      <Check className="h-5 w-5" />
                      <span>¡Notificaciones Activadas!</span>
                    </div>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleToggleNotifications}
                      isLoading={pushLoading}
                      disabled={notificationPermission === "denied"}
                      className="w-full py-4 text-xs font-black shadow-lg"
                      size="md"
                    >
                      {notificationPermission === "denied" 
                        ? "Permiso Bloqueado en Navegador" 
                        : "Permitir Notificaciones"
                      }
                    </Button>
                  )}

                  {notificationPermission === "denied" && (
                    <p className="text-[10px] text-amber-400/80 leading-normal text-left">
                      * El permiso fue denegado. Puedes cambiarlo luego desde la configuración de tu navegador.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Buttons footer */}
      {!showEducationTutorial && (
        <div className="px-6 pt-4 pb-6 flex gap-3 border-t border-white/5 mt-auto bg-[#050505]/95 backdrop-blur-xl max-w-md mx-auto w-full sticky bottom-0 z-30 shadow-[0_-15px_30px_rgba(0,0,0,0.6)]">
          {step > 1 && (
            <Button
              variant="secondary"
              onClick={handlePrev}
              leftIcon={ChevronLeft}
              className="flex-1"
            >
              Atrás
            </Button>
          )}

          {step === 4 ? (
            showStep2Results ? (
              <Button
                variant="primary"
                onClick={handleNext}
                rightIcon={ChevronRight}
                className="flex-1 cursor-pointer"
              >
                Continuar
              </Button>
            ) : isCalculatingBF ? (
              <Button
                variant="primary"
                isLoading={true}
                className="flex-1"
              >
                Calculando...
              </Button>
            ) : knowsBodyFat === "yes" ? (
              manualBodyFat !== "" && manualBodyFat !== undefined ? (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  rightIcon={ChevronRight}
                  className="flex-1"
                >
                  Continuar
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleNext}
                  rightIcon={ChevronRight}
                  className="flex-1"
                >
                  Saltar
                </Button>
              )
            ) : (
              // knowsBodyFat === "no"
              (hasNavyMeasurements || hasCaliperMeasurements || hasUploadedPhotos) ? (
                <Button
                  variant="primary"
                  onClick={handleCalculateBodyFat}
                  leftIcon={Sparkles}
                  className="flex-1 font-black"
                >
                  Calcular
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={handleNext}
                  rightIcon={ChevronRight}
                  className="flex-1"
                >
                  Saltar
                </Button>
              )
            )
          ) : step === 1 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={apiKey.trim().length < 15}
              rightIcon={ChevronRight}
              className="flex-1"
            >
              Siguiente
            </Button>
          ) : step < 9 ? (
            <Button
              variant="primary"
              onClick={handleNext}
              rightIcon={ChevronRight}
              className="flex-1"
            >
              Siguiente
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit}
              rightIcon={Check}
              className="flex-1 font-black"
            >
              ¡Comenzar!
            </Button>
          )}
        </div>
      )}

      {/* Interactive measurement guide modal overlay */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f101a] border border-white/10 rounded-[32px] p-6 max-w-md w-full space-y-4 shadow-2xl relative text-xs"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                  <span>📏 Guía Visual de Medición</span>
                </h3>
                <button 
                  onClick={() => setShowGuideModal(false)}
                  className="text-emerald-400 hover:text-emerald-400/80 text-[10px] font-bold px-2.5 py-1 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition cursor-pointer"
                >
                  Cerrar
                </button>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setGuideTab("navy")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    guideTab === "navy"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Cinta Métrica
                </button>
                <button
                  type="button"
                  onClick={() => setGuideTab("caliper")}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer ${
                    guideTab === "caliper"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/15"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Plicómetro (Caliper)
                </button>
              </div>

              {/* Scrollable Diagram Cards Grid */}
              {guideTab === "navy" ? (
                <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                  {/* Neck Diagram Card */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2">
                    <div className="w-full aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={sex === "female" ? neckFemale : neckMale} 
                        alt="Guía de cuello" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono font-bold text-emerald-400 uppercase block text-[9px] tracking-wider">1. CUELLO</span>
                    <p className="text-white/70 text-[9px] leading-relaxed">
                      Mide horizontalmente <b>justo por debajo de la manzana de Adán</b> (laringe).
                    </p>
                  </div>

                  {/* Waist Card */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2">
                    <div className="w-full aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={waistMeasurement} 
                        alt="Guía de cintura" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono font-bold text-emerald-400 uppercase block text-[9px] tracking-wider">2. CINTURA</span>
                    <p className="text-white/70 text-[9px] leading-relaxed">
                      {sex === "male" 
                        ? "Mide horizontalmente al nivel del ombligo. No metas el abdomen." 
                        : "Mide en la sección más estrecha del torso (sobre el ombligo)."}
                    </p>
                  </div>

                  {/* Hip Card for women */}
                  {sex === "female" && (
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2 col-span-2">
                      <div className="w-full h-32 bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                        <img 
                          src={hipMeasurement} 
                          alt="Guía de cadera" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-mono font-bold text-emerald-400 uppercase block text-[9px] tracking-wider">3. CADERA</span>
                      <p className="text-white/70 text-[9px] leading-relaxed">
                        Mide horizontalmente en la <b>zona de mayor circunferencia de los glúteos</b>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                  {/* Caliper 1: Chest / Triceps */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2">
                    <div className="w-full aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={caliperTriceps} 
                        alt="Caliper 1" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono font-bold text-emerald-400 uppercase block text-[8.5px] tracking-wider">
                      1. {sex === "male" ? "PECHO" : "TRÍCEPS"}
                    </span>
                    <p className="text-white/70 text-[9px] leading-relaxed">
                      {sex === "male" 
                        ? "Pliegue diagonal a mitad de distancia entre axila y pezón." 
                        : "Pliegue vertical en la parte trasera del brazo, a mitad de camino."}
                    </p>
                  </div>

                  {/* Caliper 2: Abdomen / Suprailiac */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2">
                    <div className="w-full aspect-square bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={caliperAbdomen} 
                        alt="Caliper 2" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono font-bold text-emerald-400 uppercase block text-[8.5px] tracking-wider">
                      2. {sex === "male" ? "ABDOMEN" : "SUPRAILÍAC."}
                    </span>
                    <p className="text-white/70 text-[9px] leading-relaxed">
                      {sex === "male" 
                        ? "Pliegue vertical a 2 cm al lado del ombligo." 
                        : "Pliegue diagonal justo encima de la cresta ilíaca."}
                    </p>
                  </div>

                  {/* Caliper 3: Thigh */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 flex flex-col items-center text-center space-y-2 col-span-2">
                    <div className="w-full h-32 bg-black/40 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                      <img 
                        src={caliperThigh} 
                        alt="Caliper 3" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="font-mono font-bold text-emerald-400 uppercase block text-[9px] tracking-wider">3. MUSLO</span>
                    <p className="text-white/70 text-[9px] leading-relaxed">
                      Pliegue vertical en la <b>cara frontal del muslo</b>, a mitad de distancia entre cadera y rótula.
                    </p>
                  </div>
                </div>
              )}

              {/* Formula explanation footer */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 text-center">
                <p className="text-[8.5px] text-white/50 leading-normal">
                  {guideTab === "navy" 
                    ? "💡 Fórmula Navy (Marina de EE.UU.): Altísima correlación de precisión promedio (±3%) comparada con escaneos de laboratorio DEXA." 
                    : "💡 Fórmula Jackson-Pollock (3 Pliegues): Método clínico de plicometría estándar para atletas y control antropométrico."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
