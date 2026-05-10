import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    socket.on('admin:join', () => {
      socket.join('admin');
    });

    socket.on('order:join', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('restaurant:join', (restaurantId: string) => {
      socket.join(`restaurant:${restaurantId}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
