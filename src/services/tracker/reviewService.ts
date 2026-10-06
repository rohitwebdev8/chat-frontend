import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '@/services/firebase/config';
import { ReviewDoc } from '@/types/goals';

const REVIEWS_STORAGE_KEY = '@personal_os_reviews_v1';

/**
 * Load reviews from Firestore and AsyncStorage.
 */
export async function loadReviews(userName: string = 'User'): Promise<Record<string, ReviewDoc>> {
  let localReviews: Record<string, ReviewDoc> = {};

  try {
    const raw = await AsyncStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) localReviews = JSON.parse(raw);
  } catch (err) {
    console.warn('AsyncStorage review load error:', err);
  }

  try {
    const reviewsRef = collection(db, 'users', userName, 'reviews');
    const snapshot = await getDocs(reviewsRef);
    const remoteReviews: Record<string, ReviewDoc> = {};

    snapshot.forEach((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as ReviewDoc;
        remoteReviews[data.id] = data;
      }
    });

    const merged = { ...localReviews, ...remoteReviews };
    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch (fsErr) {
    console.warn('Firestore review fetch fallback to local cache:', fsErr);
    return localReviews;
  }
}

/**
 * Save review document to Firestore and local storage.
 */
export async function saveReview(review: ReviewDoc, userName: string = 'User'): Promise<Record<string, ReviewDoc>> {
  try {
    const allReviews = await loadReviews(userName);
    const updatedReview = { ...review, updatedAt: new Date().toISOString() };
    allReviews[review.id] = updatedReview;

    await AsyncStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(allReviews));

    try {
      const docRef = doc(db, 'users', userName, 'reviews', review.id);
      await setDoc(docRef, updatedReview, { merge: true });
    } catch (e) {
      console.warn(`Firestore sync error for review ${review.id}:`, e);
    }

    return allReviews;
  } catch (err) {
    console.error('Failed to save review:', err);
    throw err;
  }
}
