import { createContext } from 'react';
import type { InstanceConfig } from '../types/instance-config';

export interface InstanceContextType {
  config: InstanceConfig;
  isLoading: boolean;
  error: string | null;
}

export const InstanceContext = createContext<InstanceContextType | undefined>(undefined);
