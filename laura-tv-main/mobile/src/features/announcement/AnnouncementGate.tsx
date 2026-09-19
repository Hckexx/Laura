import React from 'react';
import {
  AppState,
} from 'react-native';

import {
  fetchActiveAnnouncements,
} from './announcement-service';

import {
  getDismissedAnnouncementIds,
  markAnnouncementDismissed,
} from './announcement-storage';

import type {
  AnnouncementGateState,
  AppAnnouncement,
} from './types';

import {
  AnnouncementModal,
} from './AnnouncementModal';

import {
  MaintenanceScreen,
} from './MaintenanceScreen';

const RESUME_RECHECK_INTERVAL_MS =
  30 * 60 * 1000;

type Props = {
  children: React.ReactNode;
};

export function AnnouncementGate({
  children,
}: Props) {
  const [state, setState] =
    React.useState<AnnouncementGateState>({
      status: 'checking',
    });

  const [isRetrying, setIsRetrying] =
    React.useState(false);

  const lastCheckRef =
    React.useRef<number | null>(null);

  const mountedRef =
    React.useRef(true);

  const evaluateAnnouncements =
    React.useCallback(
      async (
        announcements: AppAnnouncement[],
      ): Promise<AnnouncementGateState> => {
        /*
         * Any currently-active maintenance record
         * takes priority over ordinary notices.
         *
         * Results arrive newest-first.
         */
        const maintenance =
          announcements.find(
            announcement =>
              announcement.maintenanceMode,
          );

        if (maintenance) {
          return {
            status: 'maintenance',
            announcement: maintenance,
          };
        }

        const dismissedIds =
          await getDismissedAnnouncementIds();

        const unseen =
          announcements.find(
            announcement =>
              !dismissedIds.has(
                announcement.id,
              ),
          ) ?? null;

        return {
          status: 'ready',
          announcement: unseen,
        };
      },
      [],
    );

  const performCheck =
    React.useCallback(
      async () => {
        try {
          const announcements =
            await fetchActiveAnnouncements();

          const nextState =
            await evaluateAnnouncements(
              announcements,
            );

          lastCheckRef.current =
            Date.now();

          if (mountedRef.current) {
            setState(nextState);
          }
        } catch {
          /*
           * Announcement service failure must NOT
           * brick LauraTV.
           *
           * Maintenance requires a fresh valid
           * response from Supabase.
           */
          if (mountedRef.current) {
            setState({
              status: 'ready',
              announcement: null,
            });
          }
        }
      },
      [evaluateAnnouncements],
    );

  React.useEffect(() => {
    mountedRef.current = true;

    void performCheck();

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
            lastCheckRef.current;

          if (
            lastCheck !== null &&
            Date.now() - lastCheck <
              RESUME_RECHECK_INTERVAL_MS
          ) {
            return;
          }

          void performCheck();
        },
      );

    return () => {
      subscription.remove();
    };
  }, [performCheck]);

  const handleDismiss =
    React.useCallback(async () => {
      if (
        state.status !== 'ready' ||
        !state.announcement
      ) {
        return;
      }

      const announcementId =
        state.announcement.id;

      setState({
        status: 'ready',
        announcement: null,
      });

      await markAnnouncementDismissed(
        announcementId,
      );
    }, [state]);

  const handleMaintenanceRetry =
    React.useCallback(async () => {
      if (isRetrying) {
        return;
      }

      setIsRetrying(true);

      try {
        await performCheck();
      } finally {
        if (mountedRef.current) {
          setIsRetrying(false);
        }
      }
    }, [
      isRetrying,
      performCheck,
    ]);

  /*
   * During the very first announcement check we
   * intentionally keep normal LauraTV mounted.
   *
   * The mandatory UpdateGate outside this component
   * already handles the startup security gate.
   *
   * Maintenance, if returned, immediately replaces
   * LauraTV once confirmed.
   */
  if (state.status === 'maintenance') {
    return (
      <MaintenanceScreen
        announcement={
          state.announcement
        }
        isRetrying={isRetrying}
        onRetry={
          handleMaintenanceRetry
        }
      />
    );
  }

  const normalAnnouncement =
    state.status === 'ready'
      ? state.announcement
      : null;

  return (
    <>
      {children}

      {normalAnnouncement ? (
        <AnnouncementModal
          visible
          announcement={
            normalAnnouncement
          }
          onDismiss={handleDismiss}
        />
      ) : null}
    </>
  );
}