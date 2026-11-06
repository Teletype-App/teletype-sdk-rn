import { createContext } from 'react';
import { TeletypeClient } from '../core/TeletypeClient';

export const TeletypeContext = createContext<TeletypeClient | null>(null);
