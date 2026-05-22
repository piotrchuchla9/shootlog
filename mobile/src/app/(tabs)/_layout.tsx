import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IoniconName, focused: boolean) {
  return <Ionicons name={name} size={24} color={focused ? '#E87722' : '#666'} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopColor: '#222',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#E87722',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Zawody',
          tabBarIcon: ({ focused }) => icon(focused ? 'home' : 'home-outline', focused),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Kalendarz',
          tabBarIcon: ({ focused }) => icon(focused ? 'calendar' : 'calendar-outline', focused),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ focused }) => icon(focused ? 'notifications' : 'notifications-outline', focused),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => icon(focused ? 'person' : 'person-outline', focused),
        }}
      />
    </Tabs>
  );
}
