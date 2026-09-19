import React from 'react';
import {
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';

import { colors } from '@/theme/colors';

import {
  cachedPolicyToRelease,
  fetchLatestRelease,
  getInstalledVersionCode,
  releaseToCache,
} from './update-service';

import {
  getCachedReleasePolicy,
  saveCachedReleasePolicy,
} from './update-storage';

import type {
  AppRelease,
  UpdateGateState,
} from './types';

import { UpdateRequiredScreen } from './UpdateRequiredScreen';

const RESUME_RECHECK_INTERVAL_MS =
  30 * 60 * 1000;

type Props = {
  children: React.ReactNode;
};

export function UpdateGate({
  children,
}: Props) {
  const [state, setState] =
    React.useState<UpdateGateState>({
      status: 'checking',
    });

  const lastSuccessfulCheckRef =
    React.useRef<number | null>(null);

  const mountedRef =
    React.useRef(true);

  const evaluateRelease =
    React.useCallback(
      (
        release: AppRelease,
        installedVersionCode: number,
      ): UpdateGateState => {
        if (
          installedVersionCode <
          release.versionCode
        ) {
          return {
            status: 'required',
            release,
          };
        }

        return {
          status: 'allowed',
        };
      },
      [],
    );

  const performCheck =
    React.useCallback(
      async (
        showCheckingScreen: boolean,
      ) => {
        if (showCheckingScreen) {
          setState({
            status: 'checking',
          });
        }

        let installedVersionCode: number;

        try {
          installedVersionCode =
            getInstalledVersionCode();
        } catch {
          if (mountedRef.current) {
            setState({
              status: 'failed-but-allowed',
            });
          }
          return;
        }

        const cached =
          await getCachedReleasePolicy();

        /*
         * If this device already knows that a newer
         * mandatory version exists, do not briefly
         * expose the application while the network
         * check runs.
         */
        if (
          cached &&
          installedVersionCode <
            cached.latestVersionCode
        ) {
          if (mountedRef.current) {
            setState({
              status: 'required',
              release:
                cachedPolicyToRelease(
                  cached,
                ),
            });
          }
        }

        try {
          const latest =
            await fetchLatestRelease();

          await saveCachedReleasePolicy(
            releaseToCache(latest),
          );

          lastSuccessfulCheckRef.current =
            Date.now();

          if (!mountedRef.current) {
            return;
          }

          setState(
            evaluateRelease(
              latest,
              installedVersionCode,
            ),
          );
        } catch {
          if (!mountedRef.current) {
            return;
          }

          /*
           * Fail closed only when this installation
           * has already learned from a successful
           * previous check that a newer mandatory
           * version exists.
           */
          if (
            cached &&
            installedVersionCode <
              cached.latestVersionCode
          ) {
            setState({
              status: 'required',
              release:
                cachedPolicyToRelease(
                  cached,
                ),
            });
            return;
          }

          /*
           * A temporary Supabase/network outage
           * must not brick an otherwise-current
           * LauraTV installation.
           */
          setState({
            status: 'failed-but-allowed',
          });
        }
      },
      [evaluateRelease],
    );

  React.useEffect(() => {
    mountedRef.current = true;

    void performCheck(true);

    return () => {
      mountedRef.current = false;
    };
  }, [performCheck]);

  React.useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        nextState => {
          if (nextState !== 'active') {
            return;
          }

          const lastCheck =
            lastSuccessfulCheckRef.current;

          if (
            lastCheck !== null &&
            Date.now() - lastCheck <
              RESUME_RECHECK_INTERVAL_MS
          ) {
            return;
          }

          void performCheck(false);
        },
      );

    return () => {
      subscription.remove();
    };
  }, [performCheck]);

  if (state.status === 'checking') {
    return <UpdateCheckingScreen />;
  }

  if (state.status === 'required') {
    return (
      <UpdateRequiredScreen
        release={state.release}
      />
    );
  }

  return <>{children}</>;
}

function UpdateCheckingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <Image
        source={require('../../../assets/icon.png')}
        style={styles.loadingLogo}
        contentFit="contain"
      />

      <Text style={styles.loadingBrand}>
        LauraTV
      </Text>

      <Text style={styles.loadingText}>
        Checking for updates…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.base,
  },

  loadingLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },

  loadingBrand: {
    marginTop: 16,
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
  },

  loadingText: {
    marginTop: 8,
    color: colors.text.faint,
    fontSize: 13,
  },
});