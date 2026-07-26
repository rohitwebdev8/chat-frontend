# 💬 PulseChat — Real-Time Chat & Voice Messaging Mobile App

<p align="center">
  <img src="./assets/images/splash-icon.png" width="140" alt="PulseChat Logo" />
</p>

A modern, high-performance real-time chat and voice messaging mobile application built with **React Native**, **Expo SDK 57**, **TypeScript**, **Redux Toolkit**, **Firebase Firestore/Storage**, **expo-audio**, and **Expo Push Notifications**.

---

## ✨ Features

- ⚡ **Native Splash Screen & Entrance**: Smooth entrance animations using `expo-splash-screen` and native async state initialization.
- 👤 **User Onboarding & Persistence**: Name input validation (minimum 3 characters, Indian name placeholders) backed by `AsyncStorage` and `Redux`.
- 💬 **Real-time Multi-Room Messaging**: Subscribes to Firebase Firestore `onSnapshot` listeners for `General`, `Random`, and `Dev` channels.
- 🎙️ **Voice Note Recording & Playback**: High-quality audio recording via `expo-audio`, Firebase Storage uploads, and custom audio player bubbles with instant replay/seek support.
- 🔔 **Push Notifications**: Integrated with Expo Push Service and deployed Express backend server for automatic cross-device push notifications with deep-link room routing.
- 🚀 **Virtualized List Performance**: Virtualized `FlatList` layout optimizations (`getItemLayout`, `keyExtractor`, memoized components) for smooth 60fps performance.
- 🛠️ **Floating Draggable Network Debugger**: Real-time network request/response inspector modal accessible via a floating draggable button on all screens.

---

## 🛠️ Technology Stack

- **Framework**: React Native (`0.86.0`), Expo SDK (`~57.0.8`)
- **Navigation**: Expo Router (`~57.0.8`)
- **State Management**: Redux Toolkit (`^2.12.0`), React Redux (`^9.3.0`)
- **Backend & Database**: Firebase Firestore (`^12.16.0`), Firebase Storage
- **Audio Engine**: `expo-audio` (`~57.0.3`)
- **Notifications**: `expo-notifications` (`~57.0.7`), `expo-device` (`~57.0.1`)
- **Styling**: Vanilla React Native StyleSheet with custom Design System Tokens (`theme.ts`)

---

## 📁 Project Structure

```text
chatFrontend/
├── assets/                  # App icon, splash screen, and graphic assets
│   ├── images/
│   │   ├── icon.png
│   │   ├── android-icon-foreground.png
│   │   └── splash-icon.png
├── src/
│   ├── app/                 # Expo Router navigation routes
│   │   ├── _layout.tsx      # Root provider wrapper & global notification setup
│   │   ├── index.tsx        # Splash entrance & auth routing check
│   │   ├── name.tsx         # User onboarding screen route
│   │   ├── rooms.tsx        # Chat channels screen route
│   │   └── chat/[id].tsx    # Active room messaging route
│   ├── components/          # Shared components (ScreenWrapper, Debugger, Skeletons)
│   │   ├── FloatingDebugButton.tsx
│   │   ├── NetworkDebuggerModal.tsx
│   │   └── ScreenWrapper.tsx
│   ├── constants/           # Design system tokens (colors, typography, spacing)
│   │   └── theme/
│   ├── screens/             # Feature screen containers & components
│   │   ├── Chat/            # Message list, voice bubbles, recorder hooks
│   │   ├── Name/            # Name form & 3-character validation logic
│   │   └── Rooms/           # Virtualized room list & header user badge
│   ├── services/            # Infrastructure services
│   │   ├── api/             # Network monitor & backend API client
│   │   ├── firebase/        # Firestore queries & Storage upload handlers
│   │   └── notifications/   # Expo push token registration & listener setup
│   ├── store/               # Redux store slices (user, chat)
│   └── utils/               # Helper utilities (sender colors, time formatters)
├── app.json                 # Expo configuration & notification plugins
├── package.json
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo Go app on your physical iOS/Android device (or Android Studio / Xcode simulator)

### 1. Installation

Clone the repository and install frontend dependencies:

```bash
cd chatFrontend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root of `chatFrontend`:

```env
EXPO_PUBLIC_API_URL=https://chat-backend-r2cp.onrender.com
```

### 3. Start Development Server

Run the Expo development server:

```bash
npx expo start
```

Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code using Expo Go on a physical device.

---

## 🔔 Push Notification Architecture

1. **Token Registration**: On app start, `registerForPushNotifications()` obtains the device's `ExponentPushToken[...]` and registers it with the Node.js backend (`POST /api/notifications/register`).
2. **Triggering**: When a user sends a message, `triggerPushNotification()` notifies the backend (`POST /api/notifications/send`).
3. **Dispatch**: The backend filters out the sender's token and sends push notifications to all room participants via Expo Push API.
4. **Deep-Link Navigation**: Tapping a notification automatically routes the user directly to `/chat/[roomId]`.

---

## 📜 Scripts

- `npm run start` - Starts the Expo Metro bundler.
- `npm run lint` - Runs ESLint validation across all TypeScript files.
- `npm run android` - Runs native Android build.
- `npm run ios` - Runs native iOS build.
