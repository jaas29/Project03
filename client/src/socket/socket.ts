import { io, type Socket } from 'socket.io-client';
import { ACCESS_KEY } from '../api/client';

const SOCKET_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: { token: localStorage.getItem(ACCESS_KEY) ?? '' },
    });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  // Refresh token in case it changed since last connect
  (s.auth as Record<string, string>).token = localStorage.getItem(ACCESS_KEY) ?? '';
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  _socket?.disconnect();
}
