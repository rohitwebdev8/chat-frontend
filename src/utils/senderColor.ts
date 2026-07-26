/**
 * Distinct, high-contrast WhatsApp-style color palette for group participant sender names.
 * Ensures consistent color assignment per participant name across all screens.
 */
const SENDER_COLORS = [
  '#0284C7', // Clinical Sky Blue
  '#059669', // Emerald Green
  '#D97706', // Amber / Warm Gold
  '#7C3AED', // Royal Purple
  '#DB2777', // Deep Pink
  '#0891B2', // Cyan / Teal
  '#E11D48', // Crimson Red
  '#4F46E5', // Indigo
  '#2563EB', // Cobalt Blue
  '#0D9488', // Medical Dark Teal
];

export function getSenderColor(name: string): string {
  if (!name || name.trim().length === 0) {
    return SENDER_COLORS[0];
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % SENDER_COLORS.length;
  return SENDER_COLORS[index];
}
