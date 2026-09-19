import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { config as appConfig } from '../config.js';
import { Server } from 'socket.io';
import { CowatchAbuseProtection } from './abuse-protection.js';
import { cowatchConfig } from './config.js';
import { RoomStore } from './room-store.js';
import type { EventResult, Room, RoomErrorCode, RoomMedia } from './types.js';

type Ack<T = undefined> = (result: EventResult<T>) => void;

const error = (code: RoomErrorCode, message: string) => ({
  ok: false as const,
  error: { code, message },
});

const cleanName = (payload: unknown) => {
  if (!payload || typeof payload !== 'object' || !('displayName' in payload)) return undefined;
  const displayName = (payload as { displayName?: unknown }).displayName;
  if (typeof displayName !== 'string') return undefined;
  const trimmed = displayName.trim();
  if (!trimmed || trimmed.length > cowatchConfig.participant.maxNameLength) return undefined;
  return trimmed;
};

const parseMedia = (value: unknown): RoomMedia | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const media = value as {
    type?: unknown;
    id?: unknown;
    season?: unknown;
    episode?: unknown;
    providerId?: unknown;
  };

  if (
    (media.type !== 'movie' && media.type !== 'tv') ||
    !Number.isInteger(media.id) ||
    (media.id as number) <= 0
  ) {
    return undefined;
  }

  if (!cowatchConfig.providers.includes(media.providerId as RoomMedia['providerId'])) {
    return undefined;
  }

  if (media.type === 'tv') {
    const hasValidSeason =
      Number.isInteger(media.season) &&
      (media.season as number) >= 0;

    const hasValidEpisode =
      Number.isInteger(media.episode) &&
      (media.episode as number) > 0;

    if (!hasValidSeason || !hasValidEpisode) {
      return undefined;
    }
  }

  return {
    type: media.type,
    id: media.id as number,
    ...(media.type === 'tv'
      ? {
          season: media.season as number,
          episode: media.episode as number,
        }
      : {}),
    providerId: media.providerId as RoomMedia['providerId'],
  };
};

const parseCallState = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return undefined;

  const value = payload as {
    microphoneEnabled?: unknown;
    cameraEnabled?: unknown;
  };

  if (
    typeof value.microphoneEnabled !== 'boolean' ||
    typeof value.cameraEnabled !== 'boolean'
  ) {
    return undefined;
  }

  return {
    microphoneEnabled: value.microphoneEnabled,
    cameraEnabled: value.cameraEnabled,
  };
};

const parseActionId = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return undefined;

  const actionId =
    'actionId' in payload
      ? (payload as { actionId?: unknown }).actionId
      : undefined;

  if (actionId === undefined) {
    return randomUUID();
  }

  if (
    typeof actionId !== 'string' ||
    !actionId.trim() ||
    actionId.length > 128
  ) {
    return undefined;
  }

  return actionId;
};

const parseSessionDescription = (
  payload: unknown,
  expectedType: 'offer' | 'answer',
) => {
  if (!payload || typeof payload !== 'object') return undefined;

  const value = payload as {
    targetParticipantId?: unknown;
    description?: unknown;
  };

  if (
    typeof value.targetParticipantId !== 'string' ||
    value.targetParticipantId.length > 128 ||
    !value.description ||
    typeof value.description !== 'object'
  ) {
    return undefined;
  }

  const description = value.description as {
    type?: unknown;
    sdp?: unknown;
  };

  if (
    description.type !== expectedType ||
    typeof description.sdp !== 'string' ||
    !description.sdp ||
    description.sdp.length >
      cowatchConfig.video.maxSessionDescriptionLength
  ) {
    return undefined;
  }

  return {
    targetParticipantId: value.targetParticipantId,
    description: {
      type: expectedType,
      sdp: description.sdp,
    },
  };
};

const parseIceCandidate = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') return undefined;

  const value = payload as {
    targetParticipantId?: unknown;
    candidate?: unknown;
  };

  if (
    typeof value.targetParticipantId !== 'string' ||
    value.targetParticipantId.length > 128 ||
    !value.candidate ||
    typeof value.candidate !== 'object'
  ) {
    return undefined;
  }

  const candidate = value.candidate as {
    candidate?: unknown;
    sdpMid?: unknown;
    sdpMLineIndex?: unknown;
    usernameFragment?: unknown;
  };

  if (
    typeof candidate.candidate !== 'string' ||
    !candidate.candidate ||
    candidate.candidate.length >
      cowatchConfig.video.maxIceCandidateLength
  ) {
    return undefined;
  }

  if (
    candidate.sdpMid !== undefined &&
    candidate.sdpMid !== null &&
    (
      typeof candidate.sdpMid !== 'string' ||
      candidate.sdpMid.length > 256
    )
  ) {
    return undefined;
  }

  if (
    candidate.sdpMLineIndex !== undefined &&
    candidate.sdpMLineIndex !== null &&
    (
      !Number.isInteger(candidate.sdpMLineIndex) ||
      (candidate.sdpMLineIndex as number) < 0 ||
      (candidate.sdpMLineIndex as number) > 65_535
    )
  ) {
    return undefined;
  }

  if (
    candidate.usernameFragment !== undefined &&
    candidate.usernameFragment !== null &&
    (
      typeof candidate.usernameFragment !== 'string' ||
      candidate.usernameFragment.length > 256
    )
  ) {
    return undefined;
  }

  return {
    targetParticipantId: value.targetParticipantId,
    candidate: {
      candidate: candidate.candidate,

      ...(candidate.sdpMid === null ||
      typeof candidate.sdpMid === 'string'
        ? {
            sdpMid: candidate.sdpMid,
          }
        : {}),

      ...(candidate.sdpMLineIndex === null ||
      typeof candidate.sdpMLineIndex === 'number'
        ? {
            sdpMLineIndex: candidate.sdpMLineIndex,
          }
        : {}),

      ...(candidate.usernameFragment === null ||
      typeof candidate.usernameFragment === 'string'
        ? {
            usernameFragment: candidate.usernameFragment,
          }
        : {}),
    },
  };
};

export function registerCowatchRealtime(
  app: FastifyInstance,
  rooms = new RoomStore(),
) {
  const io = new Server(app.server, {
    cors: {
      origin: appConfig.cors.origin,
    },
  });

  const abuse = new CowatchAbuseProtection();
  const kickCooldowns = new Map<string, number>();

  const socketIp = (socket: {
    handshake: {
      address: string;
      headers: Record<string, string | string[] | undefined>;
    };
  }) => {
    if (!cowatchConfig.trustProxy) {
      return socket.handshake.address;
    }

    const forwarded =
      socket.handshake.headers['x-forwarded-for'];

    const first = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0];

    return first?.trim() || socket.handshake.address;
  };

  const emitState = (room: Room) =>
    io
      .to(room.code)
      .emit(
        'room:state',
        rooms.toPublicRoom(room),
      );

  const publicPlayback = (room: Room) =>
    rooms.toPublicRoom(room).playback;

  const finalizeLeave = (
    room: Room,
    participant: {
      id: string;
      name: string;
    },
    hostChanged: boolean,
  ) => {
    io
      .to(room.code)
      .emit(
        'participant:left',
        {
          participantId: participant.id,
          name: participant.name,
        },
      );

    if (hostChanged) {
      io
        .to(room.code)
        .emit(
          'room:host-changed',
          {
            hostId: room.hostId,
          },
        );
    }

    emitState(room);
  };

  io.use((socket, next) => {
    if (
      abuse.isBlocked(
        socketIp(socket),
      )
    ) {
      return next(
        new Error(
          'Temporarily blocked from Cowatch',
        ),
      );
    }

    next();
  });

  io.on(
    'connection',
    (socket) => {
      const ip =
        socketIp(socket);

      const respond = <T>(
        ack: Ack<T> | undefined,
        result: EventResult<T>,
      ) => {
        if (
          typeof ack === 'function'
        ) {
          ack(result);
        } else if (!result.ok) {
          socket.emit(
            'room:error',
            result.error,
          );
        }
      };

      socket.use(
        ([...args], next) => {
          const limit =
            abuse.consumeEvent(
              ip,
              socket.id,
            );

          if (limit.allowed) {
            return next();
          }

          const result =
            error(
              limit.blocked
                ? 'TEMPORARILY_BLOCKED'
                : 'RATE_LIMITED',

              limit.blocked
                ? 'Temporarily blocked for excessive Cowatch event traffic.'
                : 'Too many Cowatch events. Try again shortly.',
            );

          const possibleAck =
            args.at(-1);

          if (
            typeof possibleAck ===
            'function'
          ) {
            possibleAck(result);
          } else {
            socket.emit(
              'room:error',
              result.error,
            );
          }

          if (limit.blocked) {
            setImmediate(() =>
              socket.disconnect(true),
            );
          }
        },
      );

      socket.on(
        'room:create',
        async (
          payload: unknown,
          ack?: Ack<{
            room: ReturnType<
              RoomStore['toPublicRoom']
            >;
            participantId: string;
            reconnectToken: string;
          }>,
        ) => {
          const name =
            cleanName(payload);

          const initialMediaValue =
            payload &&
            typeof payload ===
              'object' &&
            'initialMedia' in payload
              ? (
                  payload as {
                    initialMedia?: unknown;
                  }
                ).initialMedia
              : undefined;

          const customSlugValue =
            payload &&
            typeof payload ===
              'object' &&
            'customSlug' in payload
              ? (
                  payload as {
                    customSlug?: unknown;
                  }
                ).customSlug
              : undefined;

          const customSlug =
            typeof customSlugValue ===
            'string'
              ? customSlugValue
              : null;

          const initialMedia =
            initialMediaValue ===
            undefined
              ? null
              : parseMedia(
                  initialMediaValue,
                );

          if (!name) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_NAME',
                `Display name must be 1-${cowatchConfig.participant.maxNameLength} characters.`,
              ),
            );
          }

          if (
            initialMediaValue !==
              undefined &&
            !initialMedia
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_MEDIA',
                'Select a valid movie or TV episode.',
              ),
            );
          }

          if (
            rooms.findMembership(
              socket.id,
            )
          ) {
            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'Leave the current room before creating another.',
              ),
            );
          }

          const limit =
            abuse.consume(
              ip,
              'create',
            );

          if (!limit.allowed) {
            return respond(
              ack,
              error(
                limit.blocked
                  ? 'TEMPORARILY_BLOCKED'
                  : 'RATE_LIMITED',

                limit.blocked
                  ? 'Temporarily blocked for excessive Cowatch activity.'
                  : 'Too many rooms created. Try again shortly.',
              ),
            );
          }

          const created =
            await rooms.createRoom(
              name,
              socket.id,
              initialMedia,
              customSlug,
            );

          if (
            'error' in created &&
            created.error
          ) {
            if (
              created.error ===
              'SLUG_UNAVAILABLE'
            ) {
              return respond(
                ack,
                error(
                  'SLUG_UNAVAILABLE',
                  "That private room link isn't available.",
                ),
              );
            }

            return respond(
              ack,
              error(
                created.error,
                'Unable to create room. Try again shortly.',
              ),
            );
          }

          const {
            room,
            participant,
          } = created;

          socket.join(
            room.code,
          );

          respond(
            ack,
            {
              ok: true,
              room:
                rooms.toPublicRoom(
                  room,
                ),
              participantId:
                participant.id,
              reconnectToken:
                participant
                  .reconnectToken,
            },
          );

          socket.emit(
            'room:state',
            rooms.toPublicRoom(
              room,
            ),
          );
        },
      );

      socket.on(
        'room:join',
        async (
          payload: unknown,
          ack?: Ack<{
            room: ReturnType<
              RoomStore['toPublicRoom']
            >;
            participantId: string;
            reconnectToken: string;
            reconnected: boolean;
          }>,
        ) => {
          const name =
            cleanName(payload);

          const values =
            payload &&
            typeof payload ===
              'object'
              ? payload as {
                  roomCode?: unknown;
                  reconnectToken?: unknown;
                }
              : {};

          if (
            !name ||
            typeof values.roomCode !==
              'string' ||
            (
              values.reconnectToken !==
                undefined &&
              typeof values.reconnectToken !==
                'string'
            )
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'A valid room code and display name are required.',
              ),
            );
          }

          const locator =
            values.roomCode.trim();

          const canonicalCode =
            await rooms.resolveCanonicalCode(
              locator,
            );

          const existingMembership =
            rooms.findMembership(
              socket.id,
            );

          /*
           * Route navigation does not equal leaving a Cowatch room.
           *
           * If this exact socket is already a participant in the
           * requested room, treat room:join as a safe/idempotent
           * resume instead of creating a duplicate participant.
           */
          if (
            existingMembership
          ) {
            if (
              !canonicalCode ||
              existingMembership
                .room.code !==
                canonicalCode
            ) {
              return respond(
                ack,
                error(
                  'INVALID_PAYLOAD',
                  'Leave the current room before joining another.',
                ),
              );
            }

            socket.join(
              existingMembership
                .room.code,
            );

            respond(
              ack,
              {
                ok: true,

                room:
                  rooms.toPublicRoom(
                    existingMembership
                      .room,
                  ),

                participantId:
                  existingMembership
                    .participant.id,

                reconnectToken:
                  existingMembership
                    .participant
                    .reconnectToken,

                reconnected: true,
              },
            );

            socket.emit(
              'room:state',
              rooms.toPublicRoom(
                existingMembership
                  .room,
              ),
            );

            return;
          }

          const cooldownKey =
            canonicalCode
              ? `${canonicalCode}:${ip}`
              : `${locator.toUpperCase()}:${ip}`;

          const cooldownUntil =
            kickCooldowns.get(
              cooldownKey,
            ) ?? 0;

          if (
            cooldownUntil >
            Date.now()
          ) {
            return respond(
              ack,
              error(
                'KICKED',
                'The host removed you. Try again shortly.',
              ),
            );
          }

          if (cooldownUntil) {
            kickCooldowns.delete(
              cooldownKey,
            );
          }

          const limit =
            abuse.consume(
              ip,
              'join',
            );

          if (!limit.allowed) {
            return respond(
              ack,
              error(
                limit.blocked
                  ? 'TEMPORARILY_BLOCKED'
                  : 'RATE_LIMITED',

                limit.blocked
                  ? 'Temporarily blocked for excessive Cowatch activity.'
                  : 'Too many join attempts. Try again shortly.',
              ),
            );
          }

          const joined =
            await rooms.joinRoom(
              values.roomCode,
              name,
              socket.id,
              values.reconnectToken,
            );

          if (
            'error' in joined &&
            joined.error
          ) {
            return respond(
              ack,
              error(
                joined.error,

                joined.error ===
                  'ROOM_FULL'
                  ? 'This room is full.'
                  : 'Room not found or expired.',
              ),
            );
          }

          socket.join(
            joined.room.code,
          );

          respond(
            ack,
            {
              ok: true,

              room:
                rooms.toPublicRoom(
                  joined.room,
                ),

              participantId:
                joined
                  .participant.id,

              reconnectToken:
                joined
                  .participant
                  .reconnectToken,

              reconnected:
                joined.reconnected,
            },
          );

          if (
            !joined.reconnected
          ) {
            socket
              .to(
                joined.room.code,
              )
              .emit(
                'participant:joined',
                {
                  participant:
                    rooms
                      .toPublicRoom(
                        joined.room,
                      )
                      .participants
                      .find(
                        ({ id }) =>
                          id ===
                          joined
                            .participant
                            .id,
                      ),
                },
              );
          }

          if (
            joined.hostChanged
          ) {
            io
              .to(
                joined.room.code,
              )
              .emit(
                'room:host-changed',
                {
                  hostId:
                    joined
                      .room
                      .hostId,
                },
              );
          }

          emitState(
            joined.room,
          );
        },
      );

      socket.on(
        'room:leave',
        (
          _payload: unknown,
          ack?: Ack,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const result =
            rooms.leaveBySocket(
              socket.id,
              true,
              finalizeLeave,
            );

          socket.leave(
            membership.room.code,
          );

          respond(
            ack,
            {
              ok: true,
            },
          );

          return result;
        },
      );

      socket.on(
        'room:transfer-host',
        (
          payload: unknown,
          ack?: Ack<{
            hostId: string;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const newHostId =
            payload &&
            typeof payload ===
              'object' &&
            'participantId' in payload
              ? (
                  payload as {
                    participantId?: unknown;
                  }
                ).participantId
              : undefined;

          if (
            typeof newHostId !==
            'string'
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'A valid participant is required.',
              ),
            );
          }

          if (
            membership.room.hostId !==
            membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'HOST_ONLY',
                'Only the host can transfer ownership.',
              ),
            );
          }

          if (
            !rooms.transferHost(
              membership.room.code,
              membership.participant.id,
              newHostId,
            )
          ) {
            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'Select a connected viewer in this room.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'room:host-changed',
              {
                hostId:
                  membership
                    .room
                    .hostId,
              },
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              hostId:
                membership
                  .room
                  .hostId,
            },
          );
        },
      );

      socket.on(
        'chat:send',
        (
          payload: unknown,
          ack?: Ack<{
            message: NonNullable<
              ReturnType<
                RoomStore['addMessage']
              >
            >;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const textValue =
            payload &&
            typeof payload ===
              'object' &&
            'text' in payload
              ? (
                  payload as {
                    text?: unknown;
                  }
                ).text
              : undefined;

          const text =
            typeof textValue ===
            'string'
              ? textValue.trim()
              : '';

          if (
            !text ||
            text.length >
              cowatchConfig.chat
                .maxMessageLength
          ) {
            return respond(
              ack,
              error(
                'INVALID_MESSAGE',
                `Messages must be 1-${cowatchConfig.chat.maxMessageLength} characters.`,
              ),
            );
          }

          if (
            !abuse.consumeChat(
              membership
                .participant.id,
            )
          ) {
            return respond(
              ack,
              error(
                'CHAT_RATE_LIMITED',
                'You are sending messages too quickly.',
              ),
            );
          }

          const message =
            rooms.addMessage(
              membership.room.code,
              membership.participant.id,
              text,
            );

          if (!message) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in this room.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'chat:message',
              message,
            );

          respond(
            ack,
            {
              ok: true,
              message,
            },
          );
        },
      );

      socket.on(
        'participant:kick',
        (
          payload: unknown,
          ack?: Ack<{
            participantId: string;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          if (
            membership.room.hostId !==
            membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'HOST_ONLY',
                'Only the host can remove a participant.',
              ),
            );
          }

          const participantId =
            payload &&
            typeof payload ===
              'object' &&
            'participantId' in payload
              ? (
                  payload as {
                    participantId?: unknown;
                  }
                ).participantId
              : undefined;

          if (
            typeof participantId !==
            'string'
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'Select a participant in this room.',
              ),
            );
          }

          const target =
            membership
              .room
              .participants
              .get(
                participantId,
              );

          if (
            !target ||
            target.id ===
              membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'Select another participant in this room.',
              ),
            );
          }

          const targetSocket =
            target.socketId
              ? io
                  .sockets
                  .sockets
                  .get(
                    target.socketId,
                  )
              : undefined;

          const removed =
            rooms.kickParticipant(
              membership.room.code,
              membership.participant.id,
              participantId,
            );

          if (!removed) {
            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'Participant is no longer in this room.',
              ),
            );
          }

          if (
            targetSocket
          ) {
            kickCooldowns.set(
              `${membership.room.code}:${socketIp(targetSocket)}`,
              Date.now() +
                cowatchConfig.room
                  .kickRejoinCooldownMs,
            );

            targetSocket.emit(
              'participant:kicked',
              {
                reason:
                  'The host removed you from the room.',
              },
            );

            targetSocket.leave(
              membership.room.code,
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'participant:left',
              {
                participantId:
                  removed.id,
                name:
                  removed.name,
                reason:
                  'kicked',
              },
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              participantId,
            },
          );
        },
      );

      const emitCallState = (
        room: Room,
        participantId: string,
      ) => {
        const participant =
          rooms
            .toPublicRoom(
              room,
            )
            .participants
            .find(
              ({ id }) =>
                id ===
                participantId,
            );

        if (participant) {
          io
            .to(room.code)
            .emit(
              'call:participant-state',
              {
                participantId,
                call:
                  participant.call,
              },
            );
        }

        emitState(room);
      };

      socket.on(
        'call:state',
        (
          payload: unknown,
          ack?: Ack,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const state =
            parseCallState(
              payload,
            );

          if (!state) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'Microphone and camera state must be booleans.',
              ),
            );
          }

          if (
            !rooms.updateCallState(
              membership.room.code,
              membership.participant.id,
              state.microphoneEnabled,
              state.cameraEnabled,
            )
          ) {
            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'Unable to update call state.',
              ),
            );
          }

          emitCallState(
            membership.room,
            membership.participant.id,
          );

          respond(
            ack,
            {
              ok: true,
            },
          );
        },
      );

      const relayDescription =
        (
          expectedType:
            | 'offer'
            | 'answer',
        ) =>
        (
          payload: unknown,
          ack?: Ack,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const signal =
            parseSessionDescription(
              payload,
              expectedType,
            );

          if (!signal) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_SIGNAL',
                'A valid session description and recipient are required.',
              ),
            );
          }

          const target =
            rooms.getSignalingTarget(
              membership.room.code,
              membership.participant.id,
              signal.targetParticipantId,
            );

          if (
            !target ||
            !target.socketId
          ) {
            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'The call recipient is unavailable.',
              ),
            );
          }

          io
            .to(
              target.socketId,
            )
            .emit(
              expectedType ===
                'offer'
                ? 'webrtc:offer'
                : 'webrtc:answer',
              {
                fromParticipantId:
                  membership
                    .participant.id,
                description:
                  signal.description,
              },
            );

          respond(
            ack,
            {
              ok: true,
            },
          );
        };

      socket.on(
        'webrtc:offer',
        relayDescription('offer'),
      );

      socket.on(
        'webrtc:answer',
        relayDescription('answer'),
      );

      socket.on(
        'webrtc:ice-candidate',
        (
          payload: unknown,
          ack?: Ack,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const signal =
            parseIceCandidate(
              payload,
            );

          if (!signal) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_SIGNAL',
                'A valid ICE candidate and recipient are required.',
              ),
            );
          }

          const target =
            rooms.getSignalingTarget(
              membership.room.code,
              membership.participant.id,
              signal.targetParticipantId,
            );

          if (
            !target ||
            !target.socketId
          ) {
            return respond(
              ack,
              error(
                'INVALID_PARTICIPANT',
                'The call recipient is unavailable.',
              ),
            );
          }

          io
            .to(
              target.socketId,
            )
            .emit(
              'webrtc:ice-candidate',
              {
                fromParticipantId:
                  membership
                    .participant.id,
                candidate:
                  signal.candidate,
              },
            );

          respond(
            ack,
            {
              ok: true,
            },
          );
        },
      );

      socket.on(
        'media:change',
        async (
          payload: unknown,
          ack?: Ack<{
            media: RoomMedia;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const media =
            payload &&
            typeof payload ===
              'object'
              ? (
                  'media' in payload
                    ? parseMedia(
                        (
                          payload as {
                            media?: unknown;
                          }
                        ).media,
                      )
                    : parseMedia(
                        payload,
                      )
                )
              : undefined;

          if (!media) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_MEDIA',
                'Select a valid movie or TV episode.',
              ),
            );
          }

          if (
            membership.room.hostId !==
            membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'HOST_ONLY',
                'Only the room host can change media.',
              ),
            );
          }

          if (
            !await rooms.changeMedia(
              membership.room.code,
              membership.participant.id,
              media,
            )
          ) {
            return respond(
              ack,
              error(
                'PERSISTENCE_FAILED',
                'Unable to save the room media state.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'media:changed',
              {
                media,
              },
            );

          io
            .to(
              membership.room.code,
            )
            .emit(
              'playback:state',
              publicPlayback(
                membership.room,
              ),
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              media,
            },
          );
        },
      );

      socket.on(
        'provider:change',
        async (
          payload: unknown,
          ack?: Ack<{
            providerId:
              RoomMedia['providerId'];
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const providerId =
            payload &&
            typeof payload ===
              'object' &&
            'providerId' in payload
              ? (
                  payload as {
                    providerId?: unknown;
                  }
                ).providerId
              : undefined;

          if (
            !cowatchConfig.providers.includes(
              providerId as
                RoomMedia['providerId'],
            )
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PROVIDER',
                'Select an allowed stream provider.',
              ),
            );
          }

          if (
            membership.room.hostId !==
            membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'HOST_ONLY',
                'Only the room host can switch providers.',
              ),
            );
          }

          if (
            !await rooms.changeProvider(
              membership.room.code,
              membership.participant.id,
              providerId as
                RoomMedia['providerId'],
            )
          ) {
            return respond(
              ack,
              error(
                'PERSISTENCE_FAILED',
                'Unable to save the room provider.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'provider:changed',
              {
                providerId:
                  providerId as
                    RoomMedia['providerId'],
              },
            );

          io
            .to(
              membership.room.code,
            )
            .emit(
              'playback:state',
              publicPlayback(
                membership.room,
              ),
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              providerId:
                providerId as
                  RoomMedia['providerId'],
            },
          );
        },
      );

      socket.on(
        'playback:play',
        async (
          payload: unknown,
          ack?: Ack<{
            actionId: string;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const actionId =
            parseActionId(
              payload,
            );

          if (!actionId) {
            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'A valid action identifier is required.',
              ),
            );
          }

          if (
            !await rooms.setPlaying(
              membership.room.code,
              membership.participant.id,
              true,
              actionId,
            )
          ) {
            return respond(
              ack,
              error(
                'PERSISTENCE_FAILED',
                'Unable to save the room playback state.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'playback:state',
              publicPlayback(
                membership.room,
              ),
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              actionId,
            },
          );
        },
      );

      socket.on(
        'playback:pause',
        async (
          payload: unknown,
          ack?: Ack<{
            actionId: string;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const actionId =
            parseActionId(
              payload,
            );

          if (!actionId) {
            return respond(
              ack,
              error(
                'INVALID_PAYLOAD',
                'A valid action identifier is required.',
              ),
            );
          }

          if (
            !await rooms.setPlaying(
              membership.room.code,
              membership.participant.id,
              false,
              actionId,
            )
          ) {
            return respond(
              ack,
              error(
                'PERSISTENCE_FAILED',
                'Unable to save the room playback state.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'playback:state',
              publicPlayback(
                membership.room,
              ),
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              actionId,
            },
          );
        },
      );

      socket.on(
        'playback:seek',
        async (
          payload: unknown,
          ack?: Ack<{
            actionId: string;
          }>,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return respond(
              ack,
              error(
                'NOT_A_MEMBER',
                'You are not in a Cowatch room.',
              ),
            );
          }

          const currentTime =
            payload &&
            typeof payload ===
              'object' &&
            'currentTime' in payload
              ? (
                  payload as {
                    currentTime?: unknown;
                  }
                ).currentTime
              : undefined;

          const actionId =
            parseActionId(
              payload,
            );

          if (
            typeof currentTime !==
              'number' ||
            !Number.isFinite(
              currentTime,
            ) ||
            currentTime < 0 ||
            currentTime >
              cowatchConfig.sync
                .maxTimelineSeconds ||
            !actionId
          ) {
            abuse.recordMalformed(ip);

            return respond(
              ack,
              error(
                'INVALID_PLAYBACK',
                'A valid non-negative timeline position is required.',
              ),
            );
          }

          if (
            membership.room.hostId !==
            membership.participant.id
          ) {
            return respond(
              ack,
              error(
                'HOST_ONLY',
                'Only the room host can seek.',
              ),
            );
          }

          if (
            !await rooms.seek(
              membership.room.code,
              membership.participant.id,
              currentTime,
              actionId,
            )
          ) {
            return respond(
              ack,
              error(
                'PERSISTENCE_FAILED',
                'Unable to save the room playback state.',
              ),
            );
          }

          io
            .to(
              membership.room.code,
            )
            .emit(
              'playback:state',
              publicPlayback(
                membership.room,
              ),
            );

          emitState(
            membership.room,
          );

          respond(
            ack,
            {
              ok: true,
              actionId,
            },
          );
        },
      );

      socket.on(
        'playback:timeline',
        (
          payload: unknown,
        ) => {
          const membership =
            rooms.findMembership(
              socket.id,
            );

          if (!membership) {
            return;
          }

          const values =
            payload &&
            typeof payload ===
              'object'
              ? payload as {
                  currentTime?: unknown;
                  playing?: unknown;
                }
              : {};

          if (
            typeof values.currentTime !==
              'number' ||
            !Number.isFinite(
              values.currentTime,
            ) ||
            values.currentTime < 0 ||
            values.currentTime >
              cowatchConfig.sync
                .maxTimelineSeconds ||
            typeof values.playing !==
              'boolean'
          ) {
            abuse.recordMalformed(ip);
            return;
          }

          if (
            rooms.updateHostTimeline(
              membership.room.code,
              membership.participant.id,
              values.currentTime,
              values.playing,
            )
          ) {
            socket
              .to(
                membership.room.code,
              )
              .emit(
                'playback:sync',
                publicPlayback(
                  membership.room,
                ),
              );
          }
        },
      );

      socket.on(
        'disconnect',
        () => {
          rooms.leaveBySocket(
            socket.id,
            false,
            finalizeLeave,
          );
        },
      );
    },
  );

  return io;
}