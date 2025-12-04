// src/sockets/index.js
const { Server } = require("socket.io");
const { RoomsStore } = require("../roomStore");
const { validateBoard, checkWinnerServer } = require("../helpers");
const { EVENTS } = require("../events");

function initSocket(server, clientOrigin) {
  const io = new Server(server, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type"],
    },
  });

  const roomsStore = new RoomsStore();

  io.on(EVENTS.CONNECTION, (socket) => {
    console.log("user connected:", socket.id);

    socket.on(EVENTS.CREATE_ROOM, (data, callback) => {
      const room = roomsStore.createRoom(socket.id, data.gameType || "BINGO");
      socket.join(room.id);
      console.log("room created:", room.id);
      callback?.({ roomId: room.id, room: serializeRoom(room) });
    });

    socket.on(EVENTS.JOIN_ROOM, (data, callback) => {
      const room = roomsStore.joinRoom(data.roomId, socket.id);
      if (!room) {
        callback?.({ success: false, message: "Room not found" });
        return;
      }
      socket.join(data.roomId);
      console.log(`socket ${socket.id} joined room ${data.roomId}`);
      callback?.({ success: true, room: serializeRoom(room) });
      io.to(data.roomId).emit("room_updated", { room: serializeRoom(room) });
    });

    socket.on(EVENTS.SUBMIT_BOARD, (data, callback) => {
      const room = roomsStore.getRoom(data.roomId);
      if (!room) {
        callback?.({ ok: false, error: "Room not found" });
        return;
      }
      if (room.gameStatus !== "setup") {
        io.to(socket.id).emit(EVENTS.GAME_ERROR, {
          message: "Cannot submit board after game has started",
        });
        callback?.({ ok: false, error: "Game already started" });
        return;
      }

      const error = validateBoard(data.board);
      if (error) {
        callback?.({ ok: false, error });
        return;
      }

      if (!room.boards) room.boards = {};
      if (!room.marked) room.marked = {};

      room.boards[socket.id] = data.board.map((x) => x.toString());
      room.marked[socket.id] = new Set();

      console.log(`board submitted by ${socket.id} for room ${data.roomId}`);
      callback?.({ ok: true });
    });

    socket.on(EVENTS.START_GAME, (data) => {
      const room = roomsStore.getRoom(data.roomId);
      if (!room) return;

      if (room.host !== socket.id) {
        io.to(socket.id).emit(EVENTS.GAME_ERROR, { message: "Only host can start" });
        return;
      }

      const allSubmitted = room.players.every((pid) => room.boards && room.boards[pid]);
      if (!allSubmitted) {
        io.to(data.roomId).emit(EVENTS.GAME_ERROR, {
          message: "Not all players submitted boards",
        });
        return;
      }

      room.gameStatus = "playing";
      room.calledNumbers = new Set();
      room.winner = null;
      room.currentTurn = room.players[0];

      io.to(data.roomId).emit(EVENTS.GAME_STARTED, {
        players: room.players,
        currentTurn: room.currentTurn,
      });
    });

    socket.on(EVENTS.CALL_NUMBER, (data) => {
      const room = roomsStore.getRoom(data.roomId);
      if (!room) return;

      if (room.currentTurn !== socket.id) {
        io.to(socket.id).emit(EVENTS.GAME_ERROR, { message: "Not your turn" });
        return;
      }
      if (room.gameStatus !== "playing") {
        io.to(socket.id).emit(EVENTS.GAME_ERROR, { message: "Game not in playing state" });
        return;
      }

      const n = parseInt(data.number, 10);
      if (room.calledNumbers.has(n)) {
        return;
      }

      room.calledNumbers.add(n);

      let winner = null;

      for (const playerId of room.players) {
        if (!room.boards[playerId]) continue;

        if (!room.marked[playerId]) room.marked[playerId] = new Set();
        room.marked[playerId].add(n.toString());

        if (checkWinnerServer(room.boards[playerId], room.marked[playerId])) {
          winner = playerId;
          room.winner = playerId;
          room.gameStatus = "finished";
          break;
        }
      }

      if (winner) {
        io.to(data.roomId).emit(EVENTS.GAME_FINISHED, {
          winner,
          calledNumbers: Array.from(room.calledNumbers),
        });
      } else {
        const currentIndex = room.players.indexOf(room.currentTurn);
        room.currentTurn = room.players[(currentIndex + 1) % room.players.length];

        io.to(data.roomId).emit(EVENTS.NUMBER_CALLED, {
          number: n,
          calledNumbers: Array.from(room.calledNumbers),
          currentTurn: room.currentTurn,
        });
      }
    });

    socket.on(EVENTS.DISCONNECT, () => {
      console.log("user disconnected:", socket.id);

      const affected = roomsStore.removePlayerFromAllRooms(socket.id);

      for (const { roomId, room } of affected) {
        io.to(roomId).emit(EVENTS.PLAYER_LEFT, {
          players: room.players,
          leftSocketId: socket.id,
        });

        if (room.players.length === 0) {
          roomsStore.deleteRoom(roomId);
          continue;
        }

        if (room.host === socket.id) {
          room.host = room.players[0];
          io.to(roomId).emit(EVENTS.HOST_CHANGED, { newHost: room.host });
        }

        if (room.gameStatus === "playing" && room.players.length < 2) {
          room.gameStatus = "finished";
          io.to(roomId).emit(EVENTS.GAME_FINISHED, {
            winner: room.winner,
            reason: "Not enough players",
          });
        }
      }
    });
  });

  return io;
}

function serializeRoom(room) {
  return {
    ...room,
    calledNumbers: Array.from(room.calledNumbers || []),
  };
}

module.exports = {
  initSocket,
};
