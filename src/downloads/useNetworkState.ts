/**
 * useNetworkState — Reactive Network Status Hook
 *
 * Wraps expo-network to provide live online/offline status.
 * Polls on mount and subscribes to app state changes (background → foreground
 * triggers a re-check).
 *
 * Returns:
 *   isOnline  — true if a usable network connection is detected
 *   isWifi    — true if the current connection is Wi-Fi
 *   isChecking — true during the initial check
 */

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Defensive import: gracefully fallback if native module is not yet compiled into binary
let Network: typeof import('expo-network') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Network = require('expo-network');
} catch {
  Network = null;
}

export interface NetworkState {
  isOnline: boolean;
  isWifi: boolean;
  isChecking: boolean;
}

export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>({
    isOnline: true, // optimistic default before first check
    isWifi: true,
    isChecking: true,
  });

  useEffect(() => {
    let isMounted = true;

    const performCheck = async () => {
      try {
        if (!Network || typeof Network.getNetworkStateAsync !== 'function') {
          if (isMounted) {
            setState({ isOnline: true, isWifi: true, isChecking: false });
          }
          return;
        }
        const networkState = await Network.getNetworkStateAsync();
        if (isMounted) {
          setState({
            isOnline: networkState.isConnected === true && networkState.isInternetReachable !== false,
            isWifi: networkState.type === Network.NetworkStateType.WIFI,
            isChecking: false,
          });
        }
      } catch {
        if (isMounted) {
          setState((prev) => ({ ...prev, isChecking: false }));
        }
      }
    };

    const timer = setTimeout(() => {
      void performCheck();
    }, 0);

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          void performCheck();
        }
      },
    );

    return () => {
      isMounted = false;
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return state;
}
