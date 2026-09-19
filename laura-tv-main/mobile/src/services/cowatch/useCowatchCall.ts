import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import { cowatchSocket } from './socket';
import type { CowatchResult, CowatchRoom } from './types';

type Options = {
  room: CowatchRoom;
  participantId: string;
  onError: (message: string) => void;
};

type SignalDescription = {
  fromParticipantId: string;
  description: { type: string; sdp: string };
};

type SignalCandidate = {
  fromParticipantId: string;
  candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null };
};

export const shouldInitiatePeerOffer = (
  localParticipantId: string,
  remoteParticipantId: string,
) => localParticipantId.localeCompare(remoteParticipantId) > 0;

export function useCowatchCall({ room, participantId, onError }: Options) {
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [pendingKind, setPendingKind] = useState<'audio' | 'video'>();
  const [localStream, setLocalStream] = useState<MediaStream | undefined>();
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [outputVolume, setOutputVolume] = useState(1);

  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  const localStreamRef = useRef<MediaStream | undefined>(undefined);
  const makingOfferRef = useRef(new Set<string>());
  const ignoredOffersRef = useRef(new Set<string>());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  // Automatic Android WebRTC Speakerphone Audio Routing
  useEffect(() => {
    try {
      InCallManager.start({ media: 'video', auto: true });
      InCallManager.setForceSpeakerphoneOn(true);
      if (__DEV__) {
        console.log('[CowatchAudio] InCallManager started -> Loudspeaker route forced');
      }
    } catch (e) {
      if (__DEV__) {
        console.warn('[CowatchAudio] InCallManager initialization caught error:', e);
      }
    }

    return () => {
      try {
        InCallManager.stop();
      } catch (e) {}
    };
  }, []);

  const requestAndroidPermission = async (kind: 'audio' | 'video'): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const permission =
        kind === 'audio'
          ? PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          : PermissionsAndroid.PERMISSIONS.CAMERA;

      const title = kind === 'audio' ? 'Microphone Permission' : 'Camera Permission';
      const message =
        kind === 'audio'
          ? 'LauraTV requires microphone access to speak in the Cowatch room.'
          : 'LauraTV requires camera access to share video in the Cowatch room.';

      const granted = await PermissionsAndroid.request(permission, {
        title,
        message,
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      });

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  };

  const closePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (peer) {
      peer.close();
    }
    peersRef.current.delete(peerId);
    makingOfferRef.current.delete(peerId);
    ignoredOffersRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);

    setRemoteStreams((current) => {
      if (!(peerId in current)) return current;
      const next = { ...current };
      delete next[peerId];
      return next;
    });
    setConnectionStates((current) => {
      if (!(peerId in current)) return current;
      const next = { ...current };
      delete next[peerId];
      return next;
    });
  }, []);

  const cleanup = useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) {
      closePeer(peerId);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = undefined;
    }
    setLocalStream(undefined);
    setRemoteStreams({});
    setConnectionStates({});
    setMicrophoneEnabled(false);
    setCameraEnabled(false);
    setPendingKind(undefined);
  }, [closePeer]);

  const createPeer = useCallback(
    (peerId: string) => {
      const existing = peersRef.current.get(peerId);
      if (existing) return existing;

      const peer = new RTCPeerConnection({
        iceServers: room.callConfig?.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      const stream = localStreamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) {
          peer.addTrack(track, stream);
        }
      }

      peer.onicecandidate = (event: any) => {
        if (event.candidate) {
          cowatchSocket.emit('webrtc:ice-candidate', {
            targetParticipantId: peerId,
            candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          });
        }
      };

      peer.ontrack = (event: any) => {
        if (__DEV__) {
          console.log(`[CowatchVideo] ontrack received for peer=${peerId} kind=${event.track?.kind}`);
        }
        setRemoteStreams((current) => {
          let streamForPeer = current[peerId];
          if (!streamForPeer) {
            streamForPeer = event.streams?.[0] || new MediaStream([event.track]);
          } else {
            const existingTracks = streamForPeer.getTracks();
            if (!existingTracks.some((t: any) => t.id === event.track.id)) {
              streamForPeer.addTrack(event.track);
            }
          }
          return { ...current, [peerId]: streamForPeer };
        });
      };

      peer.onconnectionstatechange = () => {
        setConnectionStates((current) => ({ ...current, [peerId]: peer.connectionState }));
        if (peer.connectionState === 'failed') {
          onError('A peer media connection failed. Playback and chat remain active.');
        }
      };

      peersRef.current.set(peerId, peer);
      return peer;
    },
    [onError, room.callConfig?.iceServers],
  );

  const makeOffer = useCallback(
    async (peerId: string) => {
      const peer = createPeer(peerId);
      try {
        makingOfferRef.current.add(peerId);
        const offer = await peer.createOffer({});
        await peer.setLocalDescription(offer);
        if (!peer.localDescription) return;

        cowatchSocket.emit(
          'webrtc:offer',
          {
            targetParticipantId: peerId,
            description: peer.localDescription,
          },
          (result: CowatchResult) => {
            if (!result.ok) onError(result.error.message);
          },
        );
      } catch (error) {
        // Offer error handled gracefully
      } finally {
        makingOfferRef.current.delete(peerId);
      }
    },
    [createPeer, onError],
  );

  useEffect(() => {
    const flushCandidates = async (peerId: string, peer: RTCPeerConnection) => {
      const pending = pendingCandidatesRef.current.get(peerId) ?? [];
      pendingCandidatesRef.current.delete(peerId);
      for (const candidate of pending) {
        await peer.addIceCandidate(candidate);
      }
    };

    const onOffer = async ({ fromParticipantId, description }: SignalDescription) => {
      try {
        const peer = createPeer(fromParticipantId);
        const collision =
          makingOfferRef.current.has(fromParticipantId) || peer.signalingState !== 'stable';
        const polite = participantId.localeCompare(fromParticipantId) > 0;

        if (collision && !polite) {
          ignoredOffersRef.current.add(fromParticipantId);
          return;
        }

        ignoredOffersRef.current.delete(fromParticipantId);
        if (collision) {
          await peer.setLocalDescription({ type: 'rollback' } as any);
        }

        await peer.setRemoteDescription(description as any);
        await flushCandidates(fromParticipantId, peer);

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);

        if (peer.localDescription) {
          cowatchSocket.emit('webrtc:answer', {
            targetParticipantId: fromParticipantId,
            description: peer.localDescription,
          });
        }
      } catch (err) {}
    };

    const onAnswer = async ({ fromParticipantId, description }: SignalDescription) => {
      const peer = peersRef.current.get(fromParticipantId);
      if (!peer || peer.signalingState !== 'have-local-offer') return;
      try {
        await peer.setRemoteDescription(description as any);
        await flushCandidates(fromParticipantId, peer);
      } catch (err) {}
    };

    const onCandidate = async ({ fromParticipantId, candidate }: SignalCandidate) => {
      if (ignoredOffersRef.current.has(fromParticipantId)) return;
      const peer = createPeer(fromParticipantId);
      try {
        const iceCandidate = new RTCIceCandidate(candidate);
        if (peer.remoteDescription) {
          await peer.addIceCandidate(iceCandidate);
        } else {
          const list = pendingCandidatesRef.current.get(fromParticipantId) ?? [];
          list.push(iceCandidate);
          pendingCandidatesRef.current.set(fromParticipantId, list);
        }
      } catch (err) {}
    };

    cowatchSocket.on('webrtc:offer', onOffer);
    cowatchSocket.on('webrtc:answer', onAnswer);
    cowatchSocket.on('webrtc:ice-candidate', onCandidate);

    return () => {
      cowatchSocket.off('webrtc:offer', onOffer);
      cowatchSocket.off('webrtc:answer', onAnswer);
      cowatchSocket.off('webrtc:ice-candidate', onCandidate);
    };
  }, [createPeer, participantId]);

  useEffect(() => {
    const presentIds = new Set(room.participants.map((p) => p.id));
    for (const peerId of peersRef.current.keys()) {
      if (!presentIds.has(peerId)) {
        closePeer(peerId);
      }
    }
  }, [closePeer, room.participants]);

  useEffect(() => {
    if (!room.participants.length) return;
    const remoteActive = room.participants.filter(
      (p) => p.id !== participantId && (p.call?.joined || p.call?.microphoneEnabled || p.call?.cameraEnabled),
    );

    for (const peer of remoteActive) {
      if (shouldInitiatePeerOffer(participantId, peer.id) && !peersRef.current.has(peer.id)) {
        makeOffer(peer.id);
      }
    }
  }, [makeOffer, participantId, room.participants]);

  const publishState = (mic: boolean, cam: boolean) => {
    cowatchSocket.emit(
      'call:state',
      { microphoneEnabled: mic, cameraEnabled: cam },
      (result: CowatchResult) => {
        if (!result.ok) onError(result.error.message);
      },
    );
  };

  const enableTrack = async (kind: 'audio' | 'video') => {
    if (pendingKind) return;
    setPendingKind(kind);

    try {
      const granted = await requestAndroidPermission(kind);
      if (!granted) {
        onError(`${kind === 'audio' ? 'Microphone' : 'Camera'} permission was denied.`);
        return;
      }

      const acquired = (await mediaDevices.getUserMedia({
        audio: kind === 'audio',
        video: kind === 'video',
      })) as MediaStream;

      let stream = localStreamRef.current;
      if (!stream) {
        stream = new MediaStream();
        localStreamRef.current = stream;
      }

      for (const track of acquired.getTracks()) {
        stream.addTrack(track);
        for (const peer of peersRef.current.values()) {
          peer.addTrack(track, stream);
        }
      }

      setLocalStream(stream);
      const nextMicrophone = kind === 'audio' ? true : microphoneEnabled;
      const nextCamera = kind === 'video' ? true : cameraEnabled;
      setMicrophoneEnabled(nextMicrophone);
      setCameraEnabled(nextCamera);
      publishState(nextMicrophone, nextCamera);

      await Promise.all([...peersRef.current.keys()].map(makeOffer));
    } catch (error: any) {
      onError(
        error?.message ||
          `Could not enable ${kind === 'audio' ? 'microphone' : 'camera'}. Room remains receive-only.`,
      );
    } finally {
      setPendingKind(undefined);
    }
  };

  const disableTrack = async (kind: 'audio' | 'video') => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const tracksToRemove = stream.getTracks().filter((t: any) => t.kind === kind);
    for (const track of tracksToRemove) {
      track.stop();
      stream.removeTrack(track);
    }

    const nextMicrophone = kind === 'audio' ? false : microphoneEnabled;
    const nextCamera = kind === 'video' ? false : cameraEnabled;
    setMicrophoneEnabled(nextMicrophone);
    setCameraEnabled(nextCamera);

    if (stream.getTracks().length === 0) {
      localStreamRef.current = undefined;
      setLocalStream(undefined);
    }

    publishState(nextMicrophone, nextCamera);
    await Promise.all([...peersRef.current.keys()].map(makeOffer));
  };

  return {
    microphoneEnabled,
    cameraEnabled,
    pendingKind,
    localStream,
    remoteStreams,
    connectionStates,
    outputVolume,
    setOutputVolume,
    toggleMicrophone: () =>
      microphoneEnabled ? disableTrack('audio') : enableTrack('audio'),
    toggleCamera: () => (cameraEnabled ? disableTrack('video') : enableTrack('video')),
  };
}
