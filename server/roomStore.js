// src/game/roomsStore.js
const crypto = require("crypto");

class RoomsStore {
  constructor() {
    this.rooms = {};
  }

  createRoom(hostSocketId, gameType) {
    const roomId = crypto.randomUUID();
    this.rooms[roomId] = {
      id: roomId,
      host: hostSocketId,
      players: [hostSocketId],
      gameType,
      gameStatus: "setup", // "pre_setup" | "setup" | "playing" | "finished"
      gameStarted: false,
      boards: {},          // { socketId: string[] }
      marked: {},          // { socketId: Set<string> }
      calledNumbers: new Set(),
      winner: null,
      currentTurn: hostSocketId,
    };
    return this.rooms[roomId];
  }

  getRoom(roomId) {
    return this.rooms[roomId] || null;
  }

  joinRoom(roomId, socketId) {
    const room = this.getRoom(roomId);
    if (!room) return null;
    if (!room.players.includes(socketId)) {
      room.players.push(socketId);
    }
    return room;
  }

  removePlayerFromAllRooms(socketId) {
    const affected = [];
    for (const [roomId, room] of Object.entries(this.rooms)) {
      if (!room.players.includes(socketId)) continue;

      room.players = room.players.filter((id) => id !== socketId);

      if (room.boards) delete room.boards[socketId];
      if (room.marked) delete room.marked[socketId];

      affected.push({ roomId, room });
    }
    return affected;
  }

  deleteRoom(roomId) {
    delete this.rooms[roomId];
  }
}

module.exports = {
  RoomsStore,
};
