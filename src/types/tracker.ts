export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplicationEntry {
  id: string;
  company: string;
  position: string;
  location: string;
  jobUrl: string;
  status: ApplicationStatus;
  appliedDate: string;
}

export interface TodoItem {
  id: string;
  title: string;
  category: 'health' | 'food' | 'study' | 'job' | 'general';
  completed: boolean;
}

export type DailyStatus = 'On Track' | 'Great' | 'Needs Focus' | 'Pending';

export interface DailyLog {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  dayNumber: number;
  
  // Physical Health & Weight Loss
  weight: number | null;
  targetWeight: number | null;
  movingAvg7d: number | null;
  movingAvg14d: number | null;
  movingAvg30d: number | null;
  workoutDone: boolean;
  gymDone: boolean;
  swimmingDone: boolean;
  steps: number;

  // Food & Drink Intake & Nutrition
  hadJunkFood: boolean;
  junkFoodDetails: string;
  teaConsumed: number;
  blackCoffeeConsumed: number;
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  water: number;
  waterTarget: number;

  // Study & Skill Development
  dsaQuestions: number;
  reactHours: number;
  backendHours: number;

  // Job Applications
  jobApplications: JobApplicationEntry[];

  // Daily Summary, Check-in & Todos
  todos: TodoItem[];
  dailyCompletionPct: number;
  dailyStatus: DailyStatus;
  notes: string;
  eveningReflection?: string;
  energyRating?: number; // 1 to 5
  moodRating?: number; // 1 to 5
  updatedAt: string;
}
