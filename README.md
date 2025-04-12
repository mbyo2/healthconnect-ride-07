
# Doc' O Clock - Healthcare App

A comprehensive healthcare application built for Zambian healthcare providers and patients. Features include appointment booking, video consultations, insurance verification, and more.

## Features

- User authentication and profile management
- Healthcare provider search and filtering
- Appointment scheduling and management
- Video consultations with healthcare professionals
- Insurance verification and management
- Offline support and PWA capabilities
- Mobile-optimized interface
- TV interface support
- Power-saving modes for mobile devices

## Mobile App Build Instructions

This app can be built as a mobile application for both iOS and Android using Capacitor. Follow these steps to build the mobile version:

### Prerequisites

- Node.js 16+ and npm
- Xcode (for iOS builds)
- Android Studio (for Android builds)

### Building the Mobile App

1. First, clone this repository and install dependencies:

```bash
git clone <repository-url>
cd doc-o-clock
npm install
```

2. Install Capacitor and required dependencies:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android @capacitor/app @capacitor/splash-screen @capacitor/local-notifications
```

3. Build the web application:

```bash
npm run build
```

4. Initialize Capacitor with the existing configuration:

```bash
npx cap sync
```

### For iOS

5. Open the iOS project:

```bash
npx cap open ios
```

6. In Xcode, select your development team and configure signing
7. Press the Build and Run button to deploy to a simulator or device

### For Android

5. Open the Android project:

```bash
npx cap open android
```

6. In Android Studio, wait for Gradle to sync
7. Press the Run button to deploy to an emulator or device

### Updating the App

When making changes to the web code:

1. Rebuild the web application:

```bash
npm run build
```

2. Update the native projects:

```bash
npx cap sync
```

3. Open and deploy as described above

## Mobile-Specific Features

- **Offline Mode**: The app functions when network connectivity is limited
- **Power Saving**: Low-battery detection reduces app resource usage
- **Device Integration**: Uses native device capabilities like camera and notifications
- **Biometric Authentication**: Secure login with fingerprint or face recognition when available
- **Responsive Design**: Adapts to various screen sizes and orientations
- **TV Mode**: Special interface when run on smart TVs

## PWA Support

This app is also available as a Progressive Web App that can be installed from modern browsers.
