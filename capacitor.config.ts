
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6b5c73f67aa4f8baaf628968ed3c903',
  appName: 'HealthConnect Teledoc',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#4CAF50",
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
