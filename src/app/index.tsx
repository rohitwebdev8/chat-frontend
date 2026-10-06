import { Redirect } from 'expo-router';

/**
 * Root index: Auth is handled by _layout.tsx (AuthScreen gate).
 * Authenticated users go straight to dashboard.
 */
export default function Index() {
  return <Redirect href="/dashboard" />;
}
