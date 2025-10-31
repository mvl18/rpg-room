// server.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir conteúdo estático da pasta public
app.use(express.static('public'));

// Escuta porta (Render usa process.env.PORT)
const PORT = process.env.PORT || 3000;

// Mapas simples para gerenciar salas e papéis
const rooms = new Map(); // roomId -> { masterId: socketId }
const socketMeta = new Map(); // socketId -> { roomId, role }

// Gerador simples de códigos de sala
function generateRoomId(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem confusão (0,O,1,I)
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('create_room', (cb) => {
    const roomId = generateRoomId();
    rooms.set(roomId, { masterId: socket.id });
    socket.join(roomId);
    socketMeta.set(socket.id, { roomId, role: 'master' });
    console.log(`room ${roomId} created by ${socket.id}`);
    if (cb) cb({ ok: true, roomId });
  });

  socket.on('join_room', ({ roomId, role }, cb) => {
    if (!rooms.has(roomId)) {
      if (cb) cb({ ok: false, error: 'Sala não existe' });
      return;
    }
    socket.join(roomId);
    socketMeta.set(socket.id, { roomId, role });

    // Se for jogador, notifica o mestre
    const meta = rooms.get(roomId);
    if (role === 'player') {
      // avisa o mestre que um jogador entrou
      const masterId = meta.masterId;
      if (masterId) {
        io.to(masterId).emit('system', { text: `Um jogador entrou: ${socket.id}` });
      }
    }

    if (cb) cb({ ok: true });
  });

  socket.on('master_message', ({ text }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta || meta.role !== 'master') return;
    const { roomId } = meta;
    // Mestre -> todos no room (inclui ele, mas clients podem filtrar se quiserem)
    io.to(roomId).emit('chat', { from: 'master', text });
  });

  socket.on('player_message', ({ text }) => {
    const meta = socketMeta.get(socket.id);
    if (!meta || meta.role !== 'player') return;
    const { roomId } = meta;
    const room = rooms.get(roomId);
    if (!room) return;
    const masterId = room.masterId;
    if (masterId) {
      io.to(masterId).emit('chat', { from: 'player', text, playerId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const { roomId, role } = meta;

    if (role === 'master') {
      // notifica jogadores que a sala acabou
      io.to(roomId).emit('system', { text: 'O mestre desconectou. Sala encerrada.' });
      rooms.delete(roomId);
    } else if (role === 'player') {
      const room = rooms.get(roomId);
      if (room && room.masterId) {
        io.to(room.masterId).emit('system', { text: `Jogador saiu: ${socket.id}` });
      }
    }

    socketMeta.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});