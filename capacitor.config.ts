
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6b5c73f67aa4f8baaf628968ed3c903',
  appName: 'HealthConnect Teledoc',
  webDir: 'dist',
  server: {
    url: 'https://f6b5c73f-67aa-4f8b-aaf6-28968ed3c903.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
    },
    // Enable push notifications
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
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
