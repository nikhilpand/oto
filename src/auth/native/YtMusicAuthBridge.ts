/**
 * YtMusicAuthBridge — TypeScript Interface to Native Android Google Auth WebView Module
 */

import { NativeModules, Platform } from 'react-native';

export interface NativeCapturedSession {
  cookie: string;
  dataSyncId?: string;
  pageId?: string;
  authUser: string;
  visitorData?: string;
  clientVersion: string;
}

interface NativeYtMusicAuthModuleInterface {
  openGoogleSignIn(): Promise<NativeCapturedSession>;
  clearGoogleCookies(): Promise<boolean>;
}

const { YtMusicAuthModule } = NativeModules as {
  YtMusicAuthModule?: NativeYtMusicAuthModuleInterface;
};

export const YtMusicAuthBridge = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && !!YtMusicAuthModule?.openGoogleSignIn;
  },

  async openGoogleSignIn(): Promise<NativeCapturedSession> {
    if (!YtMusicAuthModule?.openGoogleSignIn) {
      throw new Error('YtMusicAuthModule is not available on this platform or build.');
    }
    return await YtMusicAuthModule.openGoogleSignIn();
  },

  async clearGoogleCookies(): Promise<boolean> {
    if (!YtMusicAuthModule?.clearGoogleCookies) {
      return false;
    }
    return await YtMusicAuthModule.clearGoogleCookies();
  },
};
