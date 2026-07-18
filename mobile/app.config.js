const config = {
  expo: {
    name: 'Siipi',
    slug: 'siipi',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'fi.siipi.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Siipi käyttää sijaintiasi havainnon tallentamiseen.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Siipi käyttää sijaintiasi havainnon tallentamiseen.',
        NSCameraUsageDescription:
          'Siipi käyttää kameraasi havaintokuvien ottamiseen.',
        NSPhotoLibraryUsageDescription:
          'Siipi käyttää kuvakirjastoasi havaintokuvien valitsemiseen.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'fi.siipi.app',
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
      ],
    },
    scheme: 'siipi',
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Siipi käyttää sijaintiasi havainnon tallentamiseen.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Siipi käyttää kuvakirjastoasi havaintokuvien valitsemiseen.',
          cameraPermission:
            'Siipi käyttää kameraasi havaintokuvien ottamiseen.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#16a34a',
        },
      ],
    ],
    extra: {
      router: {},
      eas: {
        projectId: 'bf2802af-2362-409c-bce0-4f77d55757ab',
      },
    },
    owner: 'adepade',
  },
}

module.exports = config
