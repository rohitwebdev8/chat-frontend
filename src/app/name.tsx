import { Redirect } from 'expo-router';

/** Legacy route — redirect to dashboard. */
export default function NameRoute() {
  return <Redirect href="/dashboard" />;
}
