import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // Reverse-domain of the live site. Set BEFORE any store submission:
  // changing appId later creates a brand-new store listing.
  appId: 'online.doc0clock.app',
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
    // allowMixedContent intentionally OFF: every API, image and video
    // endpoint is HTTPS. Mixed content would weaken the WebView.
    backgroundColor: "#FFFFFF"
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
