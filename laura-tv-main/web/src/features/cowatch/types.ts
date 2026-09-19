import type { ProviderId } from '../player/providers'

export type CowatchParticipant = {
  id: string
  name: string
  joinedAt: number
  connected: boolean
  call: CowatchCallState
}

export type CowatchCallState = {
  joined: boolean
  microphoneEnabled: boolean
  cameraEnabled: boolean
}

export type CowatchIceServer = {
  urls: string | string[]
  username?: string
  credential?: string
}

export type CowatchRoom = {
  code: string
  shareSlug?: string | null
  createdAt: number
  hostId: string
  participants: CowatchParticipant[]
  maxParticipants: number
  media: CowatchMedia | null
  playback: CowatchPlayback
  messages: CowatchMessage[]
  chatMaxMessageLength: number
  syncIntervalMs: number
  driftToleranceSeconds: number
  callConfig: {
    maxParticipants: number
    iceServers: CowatchIceServer[]
  }
}

export type CowatchMedia = {
  type: 'movie' | 'tv'
  id: number
  season?: number
  episode?: number
  providerId: ProviderId
}

export type { ProviderId }

export type CowatchPlayback = {
  playing: boolean
  currentTime: number
  updatedAt: number
  action?: 'play' | 'pause' | 'seek'
  actionId?: string
  sourceActionId?: string
  actorId?: string
}

export type CowatchPlaybackRequest = {
  actionId: string
  locallyApplied: boolean
}

export type CowatchPlayerEvent = {
  type: 'play' | 'pause' | 'seek' | 'timeupdate' | 'ended'
  currentTime?: number
}

export type CowatchMessage = {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
}

export type CowatchError = {
  code: string
  message: string
}

export type CowatchResult<T extends object = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: CowatchError }
