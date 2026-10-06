import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Goal } from '@/types/goals';

const GOALS_STORAGE_KEY = '@personal_os_goals_v1';

export const DEFAULT_GOAL_TEMPLATES: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Reach Target Weight 70 kg',
    category: 'Health',
    type: 'target',
    horizon: 'monthly',
    startValue: 78.0,
    currentValue: 75.0,
    targetValue: 70.0,
    unit: 'kg',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    linkedMetric: 'weight',
    priority: 'high',
    status: 'active',
    visionStatement: 'Achieve a lean, energetic, and healthy physical body.',
    whyItMatters: 'Improves daily energy, fitness performance, and overall long-term health.',
  },
  {
    title: 'Daily Calorie Limit 1,800 kcal',
    category: 'Diet',
    type: 'recurring',
    horizon: 'daily',
    startValue: 0,
    currentValue: 0,
    targetValue: 1800,
    unit: 'kcal',
    startDate: new Date().toISOString().split('T')[0],
    linkedMetric: 'calories',
    priority: 'high',
    status: 'active',
  },
  {
    title: 'Daily Protein Target 140g',
    category: 'Diet',
    type: 'recurring',
    horizon: 'daily',
    startValue: 0,
    currentValue: 0,
    targetValue: 140,
    unit: 'g',
    startDate: new Date().toISOString().split('T')[0],
    linkedMetric: 'protein',
    priority: 'medium',
    status: 'active',
  },
  {
    title: 'Daily 10,000 Step Goal',
    category: 'Fitness',
    type: 'recurring',
    horizon: 'daily',
    startValue: 0,
    currentValue: 0,
    targetValue: 10000,
    unit: 'steps',
    startDate: new Date().toISOString().split('T')[0],
    linkedMetric: 'steps',
    priority: 'high',
    status: 'active',
  },
  {
    title: 'Solve 100 DSA Problems',
    category: 'Study',
    type: 'cumulative',
    horizon: 'monthly',
    startValue: 0,
    currentValue: 15,
    targetValue: 100,
    unit: 'questions',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    linkedMetric: 'dsaQuestions',
    priority: 'high',
    status: 'active',
    visionStatement: 'Master Data Structures & Algorithms for senior coding interviews.',
  },
  {
    title: 'Code 50 Hours React & Node.js',
    category: 'Study',
    type: 'cumulative',
    horizon: 'monthly',
    startValue: 0,
    currentValue: 12,
    targetValue: 50,
    unit: 'hours',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    linkedMetric: 'reactHours',
    priority: 'high',
    status: 'active',
  },
  {
    title: 'Submit 50 Job Applications',
    category: 'Career',
    type: 'cumulative',
    horizon: 'monthly',
    startValue: 0,
    currentValue: 10,
    targetValue: 50,
    unit: 'applications',
    startDate: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    linkedMetric: 'jobApplications',
    priority: 'high',
    status: 'active',
    visionStatement: 'Land a high-impact Software Engineer role.',
  },
];

/**
 * Load goals from Firestore and AsyncStorage fallback.
 */
export async function loadGoals(userName: string = 'User'): Promise<Goal[]> {
  let localGoals: Goal[] = [];

  try {
    const raw = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    if (raw) {
      localGoals = JSON.parse(raw);
    }
  } catch (err) {
    console.warn('AsyncStorage goal load error:', err);
  }

  try {
    const goalsCollectionRef = collection(db, 'users', userName, 'goals');
    const snapshot = await getDocs(goalsCollectionRef);
    const remoteGoals: Goal[] = [];

    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        remoteGoals.push(docSnap.data() as Goal);
      }
    });

    if (remoteGoals.length === 0 && localGoals.length === 0) {
      // Pre-populate initial goal templates for first-time user
      const initialGoals: Goal[] = DEFAULT_GOAL_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `goal-${idx + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      await saveAllGoals(initialGoals, userName);
      return initialGoals;
    }

    const mergedMap = new Map<string, Goal>();
    localGoals.forEach((g) => mergedMap.set(g.id, g));
    remoteGoals.forEach((g) => mergedMap.set(g.id, g));

    const finalGoals = Array.from(mergedMap.values());
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(finalGoals));
    return finalGoals;
  } catch (fsErr) {
    console.warn('Firestore goals fetch fallback to local cache:', fsErr);
    if (localGoals.length === 0) {
      const initialGoals: Goal[] = DEFAULT_GOAL_TEMPLATES.map((tmpl, idx) => ({
        ...tmpl,
        id: `goal-${idx + 1}-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(initialGoals));
      return initialGoals;
    }
    return localGoals;
  }
}

/**
 * Save array of goals to Firestore and AsyncStorage.
 */
export async function saveAllGoals(goals: Goal[], userName: string = 'User'): Promise<Goal[]> {
  try {
    await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));

    for (const goal of goals) {
      try {
        const goalDocRef = doc(db, 'users', userName, 'goals', goal.id);
        await setDoc(goalDocRef, goal, { merge: true });
      } catch (e) {
        console.warn(`Firestore sync error for goal ${goal.id}:`, e);
      }
    }
    return goals;
  } catch (err) {
    console.error('Failed to save goals:', err);
    throw err;
  }
}

/**
 * Save or update single goal.
 */
export async function saveSingleGoal(goal: Goal, userName: string = 'User'): Promise<Goal[]> {
  const currentGoals = await loadGoals(userName);
  const updatedTime = new Date().toISOString();
  const goalWithTimestamp = { ...goal, updatedAt: updatedTime };

  const existingIdx = currentGoals.findIndex((g) => g.id === goal.id);
  if (existingIdx >= 0) {
    currentGoals[existingIdx] = goalWithTimestamp;
  } else {
    currentGoals.push(goalWithTimestamp);
  }

  return saveAllGoals(currentGoals, userName);
}

/**
 * Delete goal by ID.
 */
export async function deleteGoal(goalId: string, userName: string = 'User'): Promise<Goal[]> {
  const currentGoals = await loadGoals(userName);
  const filtered = currentGoals.filter((g) => g.id !== goalId);

  try {
    const goalDocRef = doc(db, 'users', userName, 'goals', goalId);
    await deleteDoc(goalDocRef);
  } catch (e) {
    console.warn(`Failed to delete goal ${goalId} from Firestore:`, e);
  }

  return saveAllGoals(filtered, userName);
}
