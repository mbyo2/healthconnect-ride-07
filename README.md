
# Doc' O Clock Healthcare Application

## Project info

**URL**: https://lovable.dev/projects/e9305d9f-218d-422e-bf82-990acdce112e

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/e9305d9f-218d-422e-bf82-990acdce112e) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## How to build for mobile (iOS and Android)

This application is configured for easy deployment to mobile platforms using [Capacitor](https://capacitorjs.com/).

### Prerequisites

- XCode with Command Line Tools (for iOS)
- Android Studio (for Android)
- Node.js and npm installed

### Building for Mobile

1. Clone the repository and install dependencies:

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
```

2. Add Capacitor to your project:

```sh
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
```

3. Initialize Capacitor in your project:

```sh
npx cap init Doc-O-Clock io.lovable.docOClock
```

4. Update capacitor.config.ts with the following configuration:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.lovable.docOClock',
  appName: 'Doc O Clock',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://YOUR_DEPLOYED_URL', // Add your deployed URL when available
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      spinnerColor: "#4CAF50"
    }
  }
};

export default config;
```

5. Build your web application for production:

```sh
npm run build
```

6. Add the native platforms:

```sh
npx cap add android
npx cap add ios
```

7. Sync your web code to the native projects:

```sh
npx cap sync
```

### Running on Devices

#### iOS

```sh
npx cap open ios
```

This will open the project in Xcode. From there:
1. Connect your iOS device
2. Select your device as the build target
3. Click the play button to build and run

#### Android

```sh
npx cap open android
```

This will open the project in Android Studio. From there:
1. Connect your Android device or start an emulator
2. Click the "Run" button to build and deploy

### Live Reload During Development

For a better development experience, you can enable live reload:

```sh
npm run dev
npx cap run android -l --external
# or
npx cap run ios -l --external
```

### Building for Production

#### Android APK

1. In Android Studio, select Build > Build Bundle(s) / APK(s) > Build APK(s)
2. The APK will be generated in `android/app/build/outputs/apk/debug/`

#### iOS IPA

1. In Xcode, select Product > Archive
2. Follow the steps in the organizer window to distribute your app

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Authentication and Database)
- Capacitor (Mobile)

## Progressive Web App Features

This application is configured as a Progressive Web App (PWA) with the following features:

- Offline functionality
- Installable on home screen
- Push notifications
- Background sync
- Responsive design for all devices

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/e9305d9f-218d-422e-bf82-990acdce112e) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)
