import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { userId },
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export interface ChatMessage {
  id: string;
  matchId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export function joinMatchRoom(socket: Socket, matchId: string) {
  socket.emit('join_room', { matchId });
}

export function leaveMatchRoom(socket: Socket, matchId: string) {
  socket.emit('leave_room', { matchId });
}

export function sendMessage(socket: Socket, matchId: string, userId: string, userName: string, text: string) {
  socket.emit('send_message', { matchId, userId, userName, text });
}

export function onMessage(socket: Socket, callback: (msg: ChatMessage) => void) {
  socket.on('message', callback);
  return () => socket.off('message', callback);
}
