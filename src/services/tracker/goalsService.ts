import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { Goal } from '@/types/goals';

const GOALS_STORAGE_KEY = '@personal_os_goals_v1';

export const DEFAULT_GOAL_TEMPLATES: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: 'Reach Target Weight 70 kg',
    category: 'Health',
    type: 'reach_number',
    startValue: 78.0,
    targetValue: 70.0,
    unit: 'kg',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  },
  {
    title: 'Daily Calorie Limit 1,800 kcal',
    category: 'Diet',
    type: 'limit',
    startValue: 0,
    targetValue: 1800,
    unit: 'kcal',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  },
  {
    title: 'Daily 10,000 Step Goal',
    category: 'Fitness',
    type: 'total',
    startValue: 0,
    targetValue: 300000,
    unit: 'steps',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  },
  {
    title: 'Solve 100 DSA Problems',
    category: 'Study',
    type: 'total',
    startValue: 0,
    targetValue: 100,
    unit: 'questions',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  },
  {
    title: 'Submit 500 Job Applications',
    category: 'Career',
    type: 'total',
    startValue: 0,
    targetValue: 500,
    unit: 'applications',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
  },
];

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
