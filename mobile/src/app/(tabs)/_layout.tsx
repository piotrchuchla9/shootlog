import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { D2, MONO } from '@/constants/design';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, focused }: { name: IoniconName; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 44, height: 28 }}>
      {focused && (
        <View style={{
          position: 'absolute', top: 0, left: '50%', marginLeft: -14,
          width: 28, height: 2, backgroundColor: D2.accent, borderRadius: 1,
        }} />
      )}
      <Ionicons
        name={focused ? name : (name.replace('-outline', '') + '-outline') as IoniconName}
        size={20}
        color={focused ? D2.text : D2.textMute}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: D2.bg,
          borderTopColor: D2.stroke,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 0,
        },
        tabBarActiveTintColor:   D2.text,
        tabBarInactiveTintColor: D2.textMute,
        tabBarLabelStyle: {
          fontFamily: MONO,
          fontSize: 9,
          fontWeight: '600',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 8 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Zawody',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Kalendarz',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Powiadomienia',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'notifications' : 'notifications-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
