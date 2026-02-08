import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6b5c73f67aa4f8baaf628968ed3c903',
  appName: "Doc' O Clock",
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#3B82F6",
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#FFFFFF"
    }
  },
  ios: {
    scheme: "dococlockzm",
    contentInset: "automatic"
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#FFFFFF"
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
