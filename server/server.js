const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const server = createServer(app);
const fs = require('fs');
const { checkWinnerServer } = require('./helpers');

const rooms = {};

app.use(cors({origin: 'http://localhost:5173'}));

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Allow this origin
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }
});

app.get('/', (req, res) => {
    res.send('Hello World!cdsklmc');
});

io.on("connection", (socket) => {

    console.log('a user connected:', socket.id);

    socket.on("send_message", (msg) => {
        console.log("message received:", msg);
        io.emit("receive_message", msg);
    });

    socket.on("create_room", (data, callback) => {
        const roomId = crypto.randomUUID();

        rooms[roomId] = {
          host: socket.id,
          players: [socket.id],
          gameType: data.gameType,
          gameStatus: "setup", // "pre_setup" | "setup" | "playing" | "finished"
          gameStarted: false,
          boards: {},
          calledNumbers: new Set(), 
          winner: null,
          currentTurn: socket.id
        };

        socket.join(roomId);
        // fs.writeFileSync('./data.json', JSON.stringify(rooms, null, 2));

        console.log("Current rooms state:", rooms);

        callback({ roomId: roomId, room: rooms[roomId] });
    });

    socket.on("join_room", (data, callback) => {
      console.log("Join room request for room ID:", data.roomId);
        const room = rooms[data.roomId];

        if (room) {
            room.players.push(socket.id);

            console.log("Updated room state:", rooms);

            socket.join(data.roomId);
            // fs.writeFileSync('./data.json', JSON.stringify(rooms, null, 2));
            callback({ success: true });
        } else {
            callback({ success: false, message: "Room not found" });
        }
    });

    //when host starts the game
    socket.on("start_game", (data) => { 
        const room = rooms[data.roomId];
        if (!room) return;

        const allSubmitted = room.players.every(pid => room.boards && room.boards[pid]);
        if (!allSubmitted) {
          console.log(`Cannot start game in room ${data.roomId}: not all players submitted boards`);
          io.to(data.roomId).emit("game_error", { message: "Not all players submitted boards" });
          return;
        }

        room.gameStatus = "playing";
        room.calledNumbers = new Set();
        room.winner = null;
        room.currentTurn = room.players[0];

        console.log(`Game started in room ${data.roomId} by host ${socket.id}`);

        io.to(data.roomId).emit("game_started", { players: room.players, currentTurn: room.currentTurn, message: "Game has started!" });
    });

    //when client submits their bingo board
    socket.on("submit_board", (data) => {

        const room = rooms[data.roomId];
        if (!room) return;

        if(room.gameStatus !== "setup") {
          io.to(socket.id).emit("game_error", { message: "Cannot submit board after game has started" });
          return;
        }

        //validation
        if (!Array.isArray(data.board) || data.board.length !== 25) {
          return callback({ ok: false, error: "Board must have 25 cells" });
        }
        const nums = data.board.map(x => parseInt(x, 10));
        if (nums.some(n => Number.isNaN(n) || n < 1 || n > 25)) {
          return callback({ ok: false, error: "Numbers must be between 1 and 25" });
        }

        const uniq = new Set(nums);
        if (uniq.size !== 25) {
          return callback({ ok: false, error: "Numbers must be unique" });
        }


        if (!room.boards) room.boards = {};
        if (!room.marked) room.marked = {};

        room.boards[socket.id] = data.board;
        room.marked[socket.id] = new Set();

        console.log(`Player ${socket.id} submitted board for room ${data.roomId}`);
    });

    //client calls this to call a number
    socket.on("call_number", (data) => {
        const room = rooms[data.roomId];
        if (!room) return;
        if (room.currentTurn !== socket.id) return;
        if (room.gameStatus !== "playing") {
          io.to(socket.id).emit("game_error", { message: "Game is not in playing state" });
          return;
        }
        const n = parseInt(data.number, 10);
        if (room.calledNumbers.has(n)) return;

        room.calledNumbers.add(n);
        var winner = null;
        for (const playerId of room.players) {
          if (!room.boards[playerId]) continue;

          if (!room.marked[playerId]) room.marked[playerId] = new Set();
          room.marked[playerId].add(n.toString());

          console.log(`checking winner=${playerId}`);
          if (checkWinnerServer(room.boards[playerId], room.marked[playerId])) {
            winner = playerId;
            room.winner = playerId;
            room.gameStatus = "finished";
            break;
          }
        }
        if (winner  !== null) {
          io.to(data.roomId).emit("game_finished", {
            winner: winner,
            calledNumbers: Array.from(room.calledNumbers)
          });
        } else {
          //define next turn
          room.currentTurn = room.players[(room.players.indexOf(room.currentTurn) + 1) % room.players.length];

          //fire number called with nextTurn
          io.to(data.roomId).emit("number_called", {
            number: n,
            calledNumbers: Array.from(room.calledNumbers),
            currentTurn: room.currentTurn
          });
        }

    });

    socket.on("disconnect", () => {
        console.log("user disconnected:", socket.id);
        
        for (const [roomId, room] of Object.entries(rooms)) {
          if(!room.players.includes(socket.id)) continue;

          room.players = room.players.filter(id => id !== socket.id);

          room.boards ?  delete room.boards[socket.id] : null;
          room.marked ?  delete room.marked[socket.id] : null;

          io.to(roomId).emit("player_left", {
            players: room.players,
            leftSocketId: socket.id
          });

          if (room.players.length === 0) {
            delete rooms[roomId];
            continue;
          }

          //on host disconection, assigning new host based on first in players array
          if (room.host === socket.id) {
            room.host = room.players[0];
            io.to(roomId).emit("host_changed", {
              newHost: room.host
            });
          }

          //if ll left only 1 is in game
          if (room.gameStatus === "playing" && room.players.length < 2) {
            room.gameStatus = "finished";
            io.to(roomId).emit("game_finished", {
              winner: room.winner, // or remaining player
              reason: "Not enough players"
            });
          }
          // fs.writeFileSync('./data.json', JSON.stringify(rooms, null, 2));
          console.log("Updated rooms after disconnection:", rooms);
        }
    });
  
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});