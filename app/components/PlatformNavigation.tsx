'use client';
import {createContext, useContext} from 'react';
import type {PlatformRoute} from '@/lib/platform-history';

export type PlatformNavigation = {
  route: PlatformRoute;
  navigate: (route: PlatformRoute) => Promise<boolean>;
  back: () => void;
  canBack: boolean;
  canForward: boolean;
  busy: boolean;
};
export const PlatformNavigationContext = createContext<PlatformNavigation | null>(null);
export function usePlatformNavigation() {
  const navigation = useContext(PlatformNavigationContext);
  if (!navigation) throw new Error('La navegación debe estar dentro de la academia.');
  return navigation;
}
