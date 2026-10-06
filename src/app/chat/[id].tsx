import { Redirect } from 'expo-router';

/** Chat removed — redirect to dashboard. */
export default function ChatRoute() {
  return <Redirect href="/dashboard" />;
}
