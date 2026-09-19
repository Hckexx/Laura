import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg.surface,
          borderTopColor: colors.border.medium,
          borderTopWidth: 1,
          height: 64,
          marginHorizontal: 12,
          marginBottom: bottomInset,
          paddingTop: 7,
          paddingBottom: 7,
          borderRadius: 22,
          elevation: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.34,
          shadowRadius: 14,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 3,
        },
        tabBarActiveBackgroundColor: colors.accent.muted,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.faint,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tv-shows"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="watch"
        options={{
          title: 'Watch',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'search' : 'search-outline'} size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cowatch"
        options={{
          title: 'Together',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
