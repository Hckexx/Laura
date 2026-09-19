export const setTrackKindEnabled = (stream: MediaStream, kind: 'audio' | 'video', enabled: boolean) => {
  const tracks = stream.getTracks().filter((track) => track.kind === kind)
  for (const track of tracks) track.enabled = enabled
  return tracks.length > 0
}

export const communicationAudioConstraints: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
}

export const shouldInitiatePeerOffer = (localParticipantId: string, remoteParticipantId: string) => localParticipantId.localeCompare(remoteParticipantId) > 0

export const stopMediaStream = (stream: MediaStream | undefined) => {
  if (!stream) return
  for (const track of stream.getTracks()) track.stop()
}

export const removeTrackKind = (stream: MediaStream, kind: 'audio' | 'video') => {
  const removedIds: string[] = []
  for (const track of stream.getTracks().filter((candidate) => candidate.kind === kind)) {
    removedIds.push(track.id)
    stream.removeTrack(track)
    track.stop()
  }
  return removedIds
}

export const mediaCaptureErrorMessage = (error: unknown, kind: 'audio' | 'video', secureContext: boolean, supported: boolean) => {
  const device = kind === 'audio' ? 'microphone' : 'camera'
  if (!secureContext) return `The ${device} requires HTTPS or localhost. The room remains receive-only.`
  if (!supported) return `This browser does not support ${device} capture. The room remains receive-only.`
  if (error instanceof DOMException && error.name === 'NotAllowedError') return `${device[0].toUpperCase()}${device.slice(1)} permission was denied. You can continue receiving room media.`
  if (error instanceof DOMException && error.name === 'NotFoundError') return `No ${device} was found. You can continue receiving room media.`
  return `The ${device} could not be enabled. You can continue receiving room media.`
}
