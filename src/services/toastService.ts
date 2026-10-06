/**
 * toastService.ts — Central Toast Service.
 * Supports both named `showToast(msg, type)` and object `toastService.show(msg, type)`.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastPayload {
  message: string;
  type: ToastType;
  id: number;
}

const listeners: Array<(payload: ToastPayload) => void> = [];
let counter = 0;

export function onToast(cb: (payload: ToastPayload) => void): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function showToast(message: string, type: ToastType = 'info'): void {
  const payload: ToastPayload = { message, type, id: ++counter };
  listeners.forEach((cb) => cb(payload));

  if (__DEV__) {
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[Toast] ${prefix} ${message}`);
  }
}

export const toastService = {
  show: showToast,
  showToast,
  onToast,
};

export default toastService;
