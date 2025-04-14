
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6b5c73f67aa4f8baaf628968ed3c903',
  appName: 'healthconnect-teledoc',
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
      androidSpinnerStyle: "large",
      spinnerColor: "#3880ffff",
      showSpinner: true
    }
  }
};

export default config;
