import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;

  connect(userId: number) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const serverUrl = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    this.socket = io(serverUrl, {
      withCredentials: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.socket?.emit('join-user', userId);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
