import { io } from 'socket.io-client';
import { config } from '../../config/env';

export const cowatchSocket = io(config.cowatchUrl, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
});

export const COWATCH_ACK_TIMEOUT_MS = 8_000;

export function emitCowatchWithAck<T>(event: string, payload: object): Promise<T> {
  cowatchSocket.connect();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cowatchSocket.off('connect_error', onConnectError);
      callback();
    };
    const onConnectError = (error: Error) => finish(() => reject(error));
    cowatchSocket.once('connect_error', onConnectError);
    cowatchSocket
      .timeout(COWATCH_ACK_TIMEOUT_MS)
      .emit(event, payload, (timeoutError: Error | null, result: T) => {
        if (timeoutError) {
          return finish(() =>
            reject(new Error('Cowatch did not respond in time. Please try again.')),
          );
        }
        finish(() => resolve(result));
      });
  });
}
