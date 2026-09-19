import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { colors } from '../src/theme/colors';
import { UpdateGate } from '../src/features/update/UpdateGate';
import { AnnouncementGate } from '../src/features/announcement/AnnouncementGate';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider
        client={queryClient}
      >
        <StatusBar style="light" />

        <UpdateGate>
          <AnnouncementGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor:
                    colors.bg.base,
                },
                animation:
                  'slide_from_right',
              }}
            >
              <Stack.Screen
                name="(tabs)"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="movie/[id]"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="tv/[id]"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="tv/[id]/season/[seasonNumber]"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="watch/[mediaId]"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="watchlist"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="profile"
                options={{
                  headerShown: false,
                }}
              />

              <Stack.Screen
                name="copyright"
                options={{
                  headerShown: false,
                }}
              />
            </Stack>
          </AnnouncementGate>
        </UpdateGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}