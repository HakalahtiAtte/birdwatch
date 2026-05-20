const config = {
  expo: {
    name: 'Birdwatch',
    slug: 'birdwatch',
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
      bundleIdentifier: 'fi.birdwatch.app',
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Birdwatch käyttää sijaintiasi havainnon tallentamiseen.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'Birdwatch käyttää sijaintiasi havainnon tallentamiseen.',
        NSCameraUsageDescription:
          'Birdwatch käyttää kameraasi havaintokuvien ottamiseen.',
        NSPhotoLibraryUsageDescription:
          'Birdwatch käyttää kuvakirjastoasi havaintokuvien valitsemiseen.',
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
      package: 'fi.birdwatch.app',
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
    scheme: 'birdwatch',
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
            'Birdwatch käyttää sijaintiasi havainnon tallentamiseen.',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Birdwatch käyttää kuvakirjastoasi havaintokuvien valitsemiseen.',
          cameraPermission:
            'Birdwatch käyttää kameraasi havaintokuvien ottamiseen.',
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
