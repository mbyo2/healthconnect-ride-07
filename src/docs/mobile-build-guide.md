
# Mobile App Build Guide for HealthConnect Teledoc

This guide outlines the steps to build the HealthConnect Teledoc application for iOS and Android devices using Capacitor.

## Prerequisites

Before you start, ensure you have the following installed:

- Node.js (v16 or later)
- npm (v7 or later)
- For iOS builds:
  - macOS
  - Xcode (latest version)
  - CocoaPods
- For Android builds:
  - Android Studio (latest version)
  - JDK 11 or later
  - Android SDK with build tools 30+

## Setting Up the Development Environment

1. First, clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd healthconnect-teledoc
npm install
```

## Building the Web App

Before proceeding with mobile builds, build the web application:

```bash
npm run build
```

This will create a `dist` folder containing the optimized build of the application.

## Adding Platforms

Add the platforms you wish to target:

For iOS:
```bash
npx cap add ios
```

For Android:
```bash
npx cap add android
```

## Syncing the Native Project

Whenever you make changes to the web code or modify native plugins, sync the changes to the native projects:

```bash
npx cap sync
```

## Customizing Native App Settings

### For iOS

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode:
   - Configure your signing team in the "Signing & Capabilities" tab
   - Update app icons in `App/App/Assets.xcassets/AppIcon.appiconset`
   - Adjust splash screen in `App/App/Assets.xcassets/Splash.imageset`

3. Customize `Info.plist` for permissions:
   - Camera access: Add `NSCameraUsageDescription`
   - Microphone access: Add `NSMicrophoneUsageDescription`
   - Push notifications: Add `UIBackgroundModes` with `remote-notification`

### For Android

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```

2. In Android Studio:
   - Update app icons in `app/src/main/res/`
   - Customize splash screen in `app/src/main/res/drawable/splash.xml`
   - Configure AndroidManifest.xml for permissions

3. Adjust `build.gradle` files if needed for dependencies or SDK versions

## Testing on Emulators/Simulators

### iOS Simulator
```bash
npx cap run ios
```

### Android Emulator
```bash
npx cap run android
```

## Building for Production

### iOS Production Build

1. In Xcode:
   - Select "Generic iOS Device" as the build target
   - Select Product > Archive from the menu
   - Follow the distribution prompts in the Organizer window

### Android Production Build

1. In Android Studio:
   - Select Build > Generate Signed Bundle / APK
   - Choose between App Bundle (recommended for Play Store) or APK
   - Follow the signing process
   - Select build variant (release)

## Continuous Integration

For automated builds, consider setting up:
- GitHub Actions
- Fastlane for iOS and Android deployment automation
- App distribution platforms like Firebase App Distribution

## Troubleshooting

### Common Issues

1. **Capacitor sync errors**:
   - Make sure the web app is built before running `npx cap sync`
   - Check capacitor.config.ts for any errors

2. **iOS build fails**:
   - Verify your Apple Developer account has necessary certificates
   - Run `pod install` in the iOS directory
   - Check Xcode version compatibility

3. **Android build fails**:
   - Check Android SDK versions in `build.gradle`
   - Verify Gradle version compatibility
   - Update Android Studio if needed

4. **Plugin issues**:
   - Ensure plugin versions are compatible with the installed Capacitor version
   - Check for any missing native dependencies

## App Store Submissions

### iOS App Store

1. Create an app in App Store Connect
2. Configure app metadata, screenshots, etc.
3. Submit the archive from Xcode Organizer

### Google Play Store

1. Create an app in the Google Play Console
2. Upload the signed AAB or APK
3. Complete the store listing and roll out to testing tracks before production

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://developer.apple.com/ios/submit/)
- [Android Developer Guide](https://developer.android.com/distribute/best-practices/launch)

## Support

For issues specific to the mobile builds of HealthConnect Teledoc, contact:
- Email: support@healthconnect-teledoc.com
- Developer portal: https://developers.healthconnect-teledoc.com
