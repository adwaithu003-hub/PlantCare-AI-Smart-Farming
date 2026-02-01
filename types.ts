
export type AppView = 'home' | 'history' | 'account' | 'garden-care' | 'soil-analyzer' | 'seed-detector' | 'reminders';

export interface User {
  name: string;
  email: string;
  photoUrl: string;
  isLoggedIn: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  date: string; // ISO format
  type: 'fertilizer' | 'pesticide' | 'watering' | 'other';
  plantName?: string;
  completed: boolean;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
  isAnalysis?: boolean;
  analysis?: HistoryItem;
  translations?: {
    hi?: string;
    ml?: string;
  };
}

export interface PurchaseLink {
  pesticideName: string;
  url: string;
}

export type HistoryItemType = 'analysis' | 'guide' | 'soil-analysis' | 'seed-analysis';

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: HistoryItemType;
  plantName: string;
  // Fields for 'analysis' type
  diseaseName?: string;
  severity?: string;
  symptoms?: string[];
  cures?: {
    organic: string[];
    chemical: string[];
  };
  prevention?: string[];
  purchaseLinks?: PurchaseLink[];
  imageUrl?: string;
  // Field for 'guide' type
  guideContent?: string;
  // Fields for 'soil-analysis' type
  soilData?: {
    phValue: string;
    nitrogen: string;
    phosphorus: string;
    potassium: string;
    organicMatter: string;
    suitableCrops: string[];
    improvementTips: string[];
  };
  // Fields for 'seed-analysis' type
  seedData?: {
    seedName: string;
    plantName: string;
    description: string;
    cultivationPlaces: string[];
    bestSoil: string;
    growthTips: string[];
  };
}

export interface GardenPlant {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  pottingMix: {
    soil: number;
    sand: number;
    compost: number;
    others?: string;
  };
  watering: string;
  sunlight: string;
  floweringSeason: string;
}

export interface ChatState {
  messages: Message[];
  isAnalyzing: boolean;
  error: string | null;
}
