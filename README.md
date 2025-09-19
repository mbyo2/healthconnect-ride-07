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

## Testing

This project uses [Vitest](https://vitest.dev/) for unit and component testing.

To run tests:

```bash
npm run test
```

Test files are located in `src/**/__tests__` and follow the `.test.ts(x)` naming convention.

## Environment Variables

Some features require environment variables. Create a `.env` file in the project root with the following keys:

```env
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
```

Refer to Vite documentation for more details on environment variables.

## PWA & Offline Support

This app supports offline mode and installable PWA features via a service worker.
- The service worker is located at `public/service-worker.js`.
- Registration logic is in `src/utils/service-worker.ts`.
- Offline page: `public/offline.html`.

To test offline mode:
1. Build and serve the app (`npm run build` then `npm run preview`).
2. Open in your browser and use DevTools to simulate offline mode.
3. Confirm navigation to critical routes and offline page.

## Workflow Statuses & Feature Completeness

Many workflows (e.g., payment, verification, delivery) use status values such as 'pending', 'approved', 'completed', etc. Ensure that:
- All workflows have logic to transition from 'pending' to final states. See workflow types in `src/types/payment.ts`, `src/types/marketplace.ts`, and related service files in `src/utils`.
- UI components reflect status changes and provide feedback to users. Review components in `src/components` and pages in `src/pages` for TODOs and incomplete flows.
- Features marked as TODO or incomplete in the code are prioritized for implementation. Search for `TODO` comments in the codebase for actionable items.
- Accessibility improvements (ARIA roles, keyboard navigation) are added where marked in the code, especially in layout and navigation components.

Refer to code comments and TODOs for areas needing attention. See `src/utils`, `src/components`, `src/pages`, and workflow service files for details. For accessibility, review `MobileLayout.tsx`, `DesktopNav.tsx`, and related UI components.

## Contributing

Contributions are welcome! Please:
- Fork the repository and create a feature branch.
- Add tests for new features.
- Document changes in the README.
- Submit a pull request with a clear description.

For troubleshooting, see the Issues section or contact the maintainers.

## UI/UX & Backend Improvement Roadmap

To make the app simple, engaging, and robust, focus on these areas:

### UI/UX Priorities
- Simplify navigation and onboarding (see `src/components/Navigation`, `src/pages/Onboarding`)
- Add instant feedback (loading spinners, toasts) in key flows (see `src/components/LoadingScreen`, `src/components/use-toast.ts`)
- Gamify health tasks (streaks, badges) and personalize dashboards
- Improve accessibility (ARIA, keyboard navigation, color contrast) in layout and navigation components
- Use micro-interactions and modern design patterns for a lively experience

### Backend Priorities
- Optimize API endpoints for speed and reliability (see `src/utils/api-service.ts`)
- Implement push notifications and reminders (see `src/utils/notification-service.ts`)
- Strengthen authentication (biometric, 2FA, session management)
- Automate workflow status transitions and add real-time updates
- Ensure security and scalability for future growth

### Getting Started
- Review TODOs and comments in `src/components`, `src/pages`, and `src/utils` for actionable improvements
- Prioritize features that make the app addictive and easy to use
- Test with real users and iterate based on feedback

Contributors should reference this roadmap when planning new features or improvements.
