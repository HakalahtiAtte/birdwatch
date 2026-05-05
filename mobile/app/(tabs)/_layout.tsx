import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="sightings"
        options={{
          title: 'Havainnot',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🐦" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Kartta',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="🗺️" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Lisää',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="➕" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="lifelist"
        options={{
          title: 'Lajilista',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="📋" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profiili',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji="👤" color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  const { Text } = require('react-native')
  return <Text style={{ fontSize: 20, opacity: color === '#16a34a' ? 1 : 0.5 }}>{emoji}</Text>
}
