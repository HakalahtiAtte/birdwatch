import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePushToken() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return
      await supabase
        .from('user_preferences')
        .upsert({ user_id: user.id, push_token: token }, { onConflict: 'user_id' })
    })
  }, [user?.id])
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Siipi',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) return null

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId })
    return token.data
  } catch {
    return null
  }
}
