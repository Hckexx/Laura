import { useCallback, useEffect, useRef, useState } from 'react'
import { cowatchSocket } from './socket'
import { communicationAudioConstraints, mediaCaptureErrorMessage, removeTrackKind, shouldInitiatePeerOffer, stopMediaStream } from './call-utils'
import type { CowatchResult, CowatchRoom } from './types'

type Options = {
  room: CowatchRoom
  participantId: string
  onError: (message: string) => void
}

type SignalDescription = { fromParticipantId: string; description: RTCSessionDescriptionInit }
type SignalCandidate = { fromParticipantId: string; candidate: RTCIceCandidateInit }

export function useCowatchCall({ room, participantId, onError }: Options) {
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [pendingKind, setPendingKind] = useState<'audio' | 'video'>()
  const [localStream, setLocalStream] = useState<MediaStream>()
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({})
  const [connectionStates, setConnectionStates] = useState<Record<string, RTCPeerConnectionState>>({})
  const [outputVolume, setOutputVolume] = useState(1)
  const peersRef = useRef(new Map<string, RTCPeerConnection>())
  const localStreamRef = useRef<MediaStream | undefined>(undefined)
  const makingOfferRef = useRef(new Set<string>())
  const ignoredOffersRef = useRef(new Set<string>())
  const pendingCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())

  const reportError = useCallback((value: unknown, kind?: 'audio' | 'video') => {
    onError(kind ? mediaCaptureErrorMessage(value, kind, window.isSecureContext, Boolean(navigator.mediaDevices?.getUserMedia)) : value instanceof Error ? value.message : 'The peer-to-peer connection could not complete that action.')
  }, [onError])

  const closePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.onicecandidate = null
      peer.ontrack = null
      peer.onconnectionstatechange = null
      for (const sender of peer.getSenders()) sender.replaceTrack(null).catch(() => undefined)
      peer.close()
    }
    peersRef.current.delete(peerId)
    makingOfferRef.current.delete(peerId)
    ignoredOffersRef.current.delete(peerId)
    pendingCandidatesRef.current.delete(peerId)
    setRemoteStreams((current) => {
      if (!(peerId in current)) return current
      const next = { ...current }
      delete next[peerId]
      return next
    })
    setConnectionStates((current) => {
      if (!(peerId in current)) return current
      const next = { ...current }
      delete next[peerId]
      return next
    })
  }, [])

  const cleanup = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) closePeer(peerId)
    stopMediaStream(localStreamRef.current)
    localStreamRef.current = undefined
    setLocalStream(undefined)
    setRemoteStreams({})
    setConnectionStates({})
    setMicrophoneEnabled(false)
    setCameraEnabled(false)
    setPendingKind(undefined)
  }, [closePeer])

  const createPeer = useCallback((peerId: string) => {
    const existing = peersRef.current.get(peerId)
    if (existing) return existing
    const peer = new RTCPeerConnection({ iceServers: room.callConfig.iceServers })
    const stream = localStreamRef.current
    const localKinds = new Set(stream?.getTracks().map(({ kind }) => kind) ?? [])
    for (const track of stream?.getTracks() ?? []) peer.addTrack(track, stream as MediaStream)
    if (!localKinds.has('audio')) peer.addTransceiver('audio', { direction: 'recvonly' })
    if (!localKinds.has('video')) peer.addTransceiver('video', { direction: 'recvonly' })
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) cowatchSocket.emit('webrtc:ice-candidate', { targetParticipantId: peerId, candidate: candidate.toJSON() })
    }
    peer.ontrack = (event) => {
      const streamForPeer = event.streams[0] ?? new MediaStream([event.track])
      setRemoteStreams((current) => ({ ...current, [peerId]: streamForPeer }))
    }
    peer.onconnectionstatechange = () => {
      setConnectionStates((current) => ({ ...current, [peerId]: peer.connectionState }))
      if (peer.connectionState === 'failed') onError('A peer-to-peer media connection failed. The Cowatch room, playback, and chat are still active.')
    }
    peersRef.current.set(peerId, peer)
    return peer
  }, [onError, room.callConfig.iceServers])

  const makeOffer = useCallback(async (peerId: string) => {
    const peer = createPeer(peerId)
    try {
      makingOfferRef.current.add(peerId)
      await peer.setLocalDescription(await peer.createOffer())
      if (!peer.localDescription) return
      cowatchSocket.emit('webrtc:offer', { targetParticipantId: peerId, description: peer.localDescription.toJSON() }, (result: CowatchResult<object>) => {
        if (!result.ok) onError(result.error.message)
      })
    } catch (error) {
      reportError(error)
    } finally {
      makingOfferRef.current.delete(peerId)
    }
  }, [createPeer, onError, reportError])

  useEffect(() => {
    const flushCandidates = async (peerId: string, peer: RTCPeerConnection) => {
      const pending = pendingCandidatesRef.current.get(peerId) ?? []
      pendingCandidatesRef.current.delete(peerId)
      for (const candidate of pending) await peer.addIceCandidate(candidate)
    }
    const onOffer = async ({ fromParticipantId, description }: SignalDescription) => {
      try {
        const peer = createPeer(fromParticipantId)
        const collision = makingOfferRef.current.has(fromParticipantId) || peer.signalingState !== 'stable'
        const polite = participantId.localeCompare(fromParticipantId) > 0
        if (collision && !polite) {
          ignoredOffersRef.current.add(fromParticipantId)
          return
        }
        ignoredOffersRef.current.delete(fromParticipantId)
        if (collision) await peer.setLocalDescription({ type: 'rollback' })
        await peer.setRemoteDescription(description)
        await flushCandidates(fromParticipantId, peer)
        await peer.setLocalDescription(await peer.createAnswer())
        if (peer.localDescription) cowatchSocket.emit('webrtc:answer', { targetParticipantId: fromParticipantId, description: peer.localDescription.toJSON() })
      } catch (error) {
        reportError(error)
      }
    }
    const onAnswer = async ({ fromParticipantId, description }: SignalDescription) => {
      const peer = peersRef.current.get(fromParticipantId)
      if (!peer || peer.signalingState !== 'have-local-offer') return
      try {
        await peer.setRemoteDescription(description)
        await flushCandidates(fromParticipantId, peer)
      } catch (error) {
        reportError(error)
      }
    }
    const onCandidate = async ({ fromParticipantId, candidate }: SignalCandidate) => {
      if (ignoredOffersRef.current.has(fromParticipantId)) return
      const peer = createPeer(fromParticipantId)
      try {
        if (peer.remoteDescription) await peer.addIceCandidate(candidate)
        else pendingCandidatesRef.current.set(fromParticipantId, [...(pendingCandidatesRef.current.get(fromParticipantId) ?? []), candidate])
      } catch (error) {
        reportError(error)
      }
    }
    cowatchSocket.on('webrtc:offer', onOffer)
    cowatchSocket.on('webrtc:answer', onAnswer)
    cowatchSocket.on('webrtc:ice-candidate', onCandidate)
    cowatchSocket.on('disconnect', cleanup)
    return () => {
      cowatchSocket.off('webrtc:offer', onOffer)
      cowatchSocket.off('webrtc:answer', onAnswer)
      cowatchSocket.off('webrtc:ice-candidate', onCandidate)
      cowatchSocket.off('disconnect', cleanup)
    }
  }, [cleanup, createPeer, participantId, reportError])

  useEffect(() => {
    const activePeerIds = new Set(room.participants.filter(({ call, connected, id }) => call.joined && connected && id !== participantId).map(({ id }) => id))
    for (const peerId of peersRef.current.keys()) {
      if (!activePeerIds.has(peerId)) closePeer(peerId)
    }
    for (const peerId of activePeerIds) {
      if (!peersRef.current.has(peerId) && shouldInitiatePeerOffer(participantId, peerId)) void makeOffer(peerId)
    }
  }, [closePeer, makeOffer, participantId, room.participants])

  useEffect(() => () => cleanup(), [cleanup])

  const publishState = (nextMicrophone: boolean, nextCamera: boolean) => {
    cowatchSocket.emit('call:state', { microphoneEnabled: nextMicrophone, cameraEnabled: nextCamera }, (result: CowatchResult<object>) => {
      if (!result.ok) onError(result.error.message)
    })
  }

  const enableTrack = async (kind: 'audio' | 'video') => {
    if (pendingKind) return
    setPendingKind(kind)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('MEDIA_CAPTURE_UNAVAILABLE')
      const acquired = await navigator.mediaDevices.getUserMedia(kind === 'audio' ? { audio: communicationAudioConstraints } : { video: true })
      const stream = localStreamRef.current ?? new MediaStream()
      localStreamRef.current = stream
      for (const track of acquired.getTracks()) {
        stream.addTrack(track)
        for (const peer of peersRef.current.values()) peer.addTrack(track, stream)
      }
      setLocalStream(stream)
      const nextMicrophone = kind === 'audio' ? true : microphoneEnabled
      const nextCamera = kind === 'video' ? true : cameraEnabled
      setMicrophoneEnabled(nextMicrophone)
      setCameraEnabled(nextCamera)
      publishState(nextMicrophone, nextCamera)
      await Promise.all([...peersRef.current.keys()].map(makeOffer))
    } catch (error) {
      reportError(error, kind)
    } finally {
      setPendingKind(undefined)
    }
  }

  const disableTrack = async (kind: 'audio' | 'video') => {
    const stream = localStreamRef.current
    if (!stream) return
    const removedTrackIds = new Set(removeTrackKind(stream, kind))
    for (const peer of peersRef.current.values()) {
      for (const sender of peer.getSenders()) {
        if (sender.track && removedTrackIds.has(sender.track.id)) peer.removeTrack(sender)
      }
    }
    const nextMicrophone = kind === 'audio' ? false : microphoneEnabled
    const nextCamera = kind === 'video' ? false : cameraEnabled
    setMicrophoneEnabled(nextMicrophone)
    setCameraEnabled(nextCamera)
    setLocalStream(stream.getTracks().length ? stream : undefined)
    publishState(nextMicrophone, nextCamera)
    await Promise.all([...peersRef.current.keys()].map(makeOffer))
  }

  return {
    microphoneEnabled,
    cameraEnabled,
    pendingKind,
    localStream,
    remoteStreams,
    connectionStates,
    outputVolume,
    setOutputVolume,
    toggleMicrophone: () => microphoneEnabled ? disableTrack('audio') : enableTrack('audio'),
    toggleCamera: () => cameraEnabled ? disableTrack('video') : enableTrack('video'),
  }
}
