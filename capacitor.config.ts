
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6b5c73f67aa4f8baaf628968ed3c903',
  appName: "Doc' O Clock",
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#3B82F6",
      androidSpinnerStyle: "large",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#ffffffff"
    }
  },
  // Enable deep linking
  ios: {
    scheme: "healthconnect"
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
