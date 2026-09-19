import type { ProviderId } from '../../types/provider';
import type { PlaybackProgressUpdate } from './types';

const expectedOrigins: Partial<Record<ProviderId, string>> = {
  embedmaster: 'embdmstrplayer.com',
  vidzee: 'player.vidzee.wtf',
  vidlink: 'vidlink.pro',
  poseidon: 'vidking.net',
  erebus: 'vidcore.org',
};

const resumeParameters: Partial<Record<ProviderId, string>> = {
  vidlink: 'startAt',
  poseidon: 'progress',
  zeus: 't',
  hades: 'startAt',
  erebus: 'startAt',
};

const finiteSeconds = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;

const parseJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const metricsFrom = (value: Record<string, unknown>) => {
  const positionSeconds = finiteSeconds(value.currentTime);
  const durationSeconds = finiteSeconds(value.duration);
  return {
    ...(positionSeconds !== undefined ? { positionSeconds } : {}),
    ...(durationSeconds !== undefined && durationSeconds > 0 ? { durationSeconds } : {}),
  };
};

export const NORMAL_PLAYER_PROGRESS_BRIDGE = `
  (function () {
    if (window.__lauraTvProgressBridgeInstalled) return true;
    window.__lauraTvProgressBridgeInstalled = true;
    window.addEventListener('message', function (event) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          kind: 'lauratv-provider-message',
          origin: event.origin || '',
          data: event.data
        }));
      } catch (_) {}
    });
    true;
  })();
`;

export function parseNormalPlaybackMessage(
  providerId: ProviderId,
  rawMessage: string,
): PlaybackProgressUpdate | null {
  const wrapper = parseJson(rawMessage);
  if (!wrapper || typeof wrapper !== 'object') return null;
  const envelope = wrapper as Record<string, unknown>;
  if (envelope.kind !== 'lauratv-provider-message') return null;

  const expectedOrigin = expectedOrigins[providerId];
  const origin = typeof envelope.origin === 'string' ? envelope.origin : '';
  if (expectedOrigin && origin && !origin.includes(expectedOrigin)) return null;

  const decoded = typeof envelope.data === 'string' ? parseJson(envelope.data) : envelope.data;
  if (providerId === 'erebus' && typeof decoded === 'string') {
    if (decoded === 'vidcore:play') return { kind: 'play' };
    if (decoded === 'vidcore:pause') return { kind: 'pause' };
    if (decoded === 'vidcore:ended') return { kind: 'ended' };
    return null;
  }
  if (!decoded || typeof decoded !== 'object') return null;

  const message = decoded as Record<string, unknown>;
  if (providerId === 'embedmaster' && message.source === 'embedmaster_player') {
    const event = message.event;
    const info = message.info && typeof message.info === 'object'
      ? (message.info as Record<string, unknown>)
      : {};
    if (event === 'play') return { kind: 'play', ...metricsFrom(info) };
    if (event === 'pause') return { kind: 'pause', ...metricsFrom(info) };
    if (event === 'ended') return { kind: 'ended', ...metricsFrom(info) };
    if (event === 'time' || event === 'seek') return { kind: 'progress', ...metricsFrom(info) };
    return null;
  }

  if (message.type !== 'PLAYER_EVENT' || !message.data || typeof message.data !== 'object') {
    return null;
  }
  const data = message.data as Record<string, unknown>;
  const event = data.event;
  if (event === 'play') return { kind: 'play', ...metricsFrom(data) };
  if (event === 'pause') return { kind: 'pause', ...metricsFrom(data) };
  if (event === 'ended') return { kind: 'ended', ...metricsFrom(data) };
  if (event === 'timeupdate' || event === 'seeked') {
    return { kind: 'progress', ...metricsFrom(data) };
  }
  return null;
}

export const buildResumableProviderUrl = (
  baseUrl: string,
  providerId: ProviderId,
  positionSeconds?: number,
) => {
  const parameter = resumeParameters[providerId];
  if (!parameter || positionSeconds === undefined || positionSeconds <= 0) return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${parameter}=${encodeURIComponent(positionSeconds.toFixed(1))}`;
};
