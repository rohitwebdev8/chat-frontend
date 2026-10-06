import { Redirect } from 'expo-router';

/** Legacy route — redirect to dashboard. */
export default function RoomsRoute() {
  return <Redirect href="/dashboard" />;
}
