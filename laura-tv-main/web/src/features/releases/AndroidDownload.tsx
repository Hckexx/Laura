import {
  useEffect,
  useState,
} from 'react';

import {
  fetchCurrentAndroidRelease,
  getAndroidReleaseDownloadUrl,
} from './release-service';

import type {
  AndroidReleaseState,
} from './types';

function AndroidDownload() {
  const [
    state,
    setState,
  ] =
    useState<AndroidReleaseState>({
      status: 'loading',
      release: null,
    });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const release =
          await fetchCurrentAndroidRelease();

        if (cancelled) {
          return;
        }

        setState({
          status: 'ready',
          release,
        });
      } catch {
        if (cancelled) {
          return;
        }

        /*
         * A release-service outage should never
         * break the LauraTV website.
         */
        setState({
          status: 'unavailable',
          release: null,
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="inline-flex min-h-[42px] items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#14181f] px-5 py-2.5 text-sm font-semibold text-gray-400">
        <span
          className="h-2 w-2 animate-pulse rounded-full bg-amber-300/70"
          aria-hidden="true"
        />

        Checking Android release…
      </div>
    );
  }

  if (state.status === 'unavailable') {
    return null;
  }

  const {
    release,
  } = state;

  const downloadUrl =
    getAndroidReleaseDownloadUrl(
      release,
    );

  return (
    <div className="flex flex-col items-start gap-2">
      <a
        href={downloadUrl}
        download={`LauraTV-v${release.versionName}.apk`}
        className="group inline-flex items-center gap-2.5 rounded-xl border border-amber-300/20 bg-[#e5b869] px-5 py-2.5 text-sm font-bold tracking-wide text-[#0d0f12] shadow-[0_2px_14px_rgba(229,184,105,0.18)] transition-all hover:bg-[#f0c77e] hover:shadow-[0_4px_22px_rgba(229,184,105,0.3)] active:scale-[0.98]"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
          />
        </svg>

        <span>
          Download LauraTV v{release.versionName}
        </span>
      </a>

      <span className="pl-1 text-[10.5px] font-mono text-gray-500">
        Android APK · Build {release.versionCode}
      </span>
    </div>
  );
}

export default AndroidDownload;