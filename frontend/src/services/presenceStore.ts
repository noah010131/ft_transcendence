import type { PresenceStatus } from '../types/presence';

type Listener = () => void;

const statusMap = new Map<string, PresenceStatus>();
const listeners = new Set<Listener>();

export const presenceStore = {
  get(userId: string): PresenceStatus {
    return statusMap.get(userId) ?? 'OFFLINE';
  },

  set(userId: string, status: PresenceStatus) {
    statusMap.set(userId, status);
    listeners.forEach((listener) => listener());
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  clear() {
    statusMap.clear();
    listeners.forEach((listener) => listener());
  },
};
