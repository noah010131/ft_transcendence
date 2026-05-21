import { createContext } from 'react';
import type { ServiceHealth } from '../services/serviceHealthStore';

export type ServiceHealthContextValue = {
  health: ServiceHealth;
  refresh: () => Promise<void>;
};

export const ServiceHealthContext = createContext<ServiceHealthContextValue | undefined>(
  undefined,
);
