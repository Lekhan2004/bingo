import { useState, useEffect } from "react";
import { useSocket } from "@/context/socketContext";
import { toast } from "@/hooks/use-toast";

export function useBingoGame() {
  const { socket, socketId } = useSocket();
  const [room, setRoom] = useState({
    id: null,
    host: null,
    players: [],
    gameStatus: "pre_setup",
    currentTurn: null,
    winner: null,
  });

  const [cells, setCells] = useState(Array(25).fill(null));
  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [errors, setErrors] = useState(Array(25).fill(false));
  const [errorMessage, setErrorMessage] = useState("");
  const isHost = room.host === socketId;

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
      setRoom((prev) => {
        if (prev.gameStatus !== "playing" || prev.currentTurn !== data.currentTurn) {
          return {
            ...prev,
            gameStatus: "playing",
            currentTurn: data.currentTurn,
          };
        }
        return prev;
      });
      setMarkedNumbers(new Set());
      setErrorMessage("");
      toast({
        title: "Game started",
        description: "Click a number on your grid to call it",
      });
    };

    const handleGameError = (data) => {
      setErrorMessage(data.message);
      toast({
        title: "Game error",
        description: data.message,
        variant: "destructive",
      });
    };

    const handleNumberCalled = (data) => {
      setMarkedNumbers(new Set(data.calledNumbers.map(String)));
      setRoom((prev) => {
        if (prev.currentTurn !== data.currentTurn) {
          return { ...prev, currentTurn: data.currentTurn };
        }
        return prev;
      });
    };

    const handleGameFinished = (data) => {
      setRoom((prev) => {
        if (prev.gameStatus !== "finished" || prev.winner !== data.winner) {
          return { ...prev, gameStatus: "finished", winner: data.winner };
        }
        return prev;
      });
      toast({
        title: data.winner === socketId ? "You win" : "Game over",
        description: data.winner === socketId ? "Nice job" : `${data.winner} won this round`,
      });
    };

    const handleRoomUpdated = (data) => {
      setRoom((prev) => {
        if (prev.id !== data.room.id) {
          return {
            ...prev,
            id: data.room.id,
            host: data.room.host,
            players: data.room.players,
            gameStatus: data.room.gameStatus,
            currentTurn: data.room.currentTurn,
            winner: data.room.winner,
          };
        }
        return prev;
      });
    };

    socket.on("game_started", handleGameStarted);
    socket.on("game_error", handleGameError);
    socket.on("number_called", handleNumberCalled);
    socket.on("game_finished", handleGameFinished);
    socket.on("room_updated", handleRoomUpdated);

    return () => {
      socket.off("game_started", handleGameStarted);
      socket.off("game_error", handleGameError);
      socket.off("number_called", handleNumberCalled);
      socket.off("game_finished", handleGameFinished);
      socket.off("room_updated", handleRoomUpdated);
    };
  }, [socket, socketId]);

  const createRoom = () => {
    if (!socket) return;
    socket.emit("create_room", { gameType: "BINGO" }, (resp) => {
      if (resp.roomId !== room.id) {  // Prevent unnecessary state updates
        setRoom({
          id: resp.roomId,
          host: resp.room.host,
          players: resp.room.players,
          gameStatus: resp.room.gameStatus,
          currentTurn: resp.room.currentTurn,
          winner: resp.room.winner,
        });
      }
    });
  };

  const joinRoom = (roomId) => {
    if (!socket) return;
    socket.emit("join_room", { roomId }, (resp) => {
      if (resp.success) {
        const r = resp.room;
        if (r.id !== room.id) { // Prevent unnecessary state updates
          setRoom({
            id: r.id,
            host: r.host,
            players: r.players,
            gameStatus: r.gameStatus,
            currentTurn: r.currentTurn,
            winner: r.winner,
          });
        }
      } else {
        setErrorMessage(resp.message || "Failed to join room");
      }
    });
  };

  const submitBoard = (roomId) => {
    if (!socket || !roomId) return;
    socket.emit("submit_board", { roomId, board: cells }, (resp) => {
      if (!resp.ok) {
        setErrorMessage(resp.error || "Failed to submit board");
      } else {
        toast({ title: "Board submitted" });
      }
    });
  };

  const startGame = (roomId) => {
    if (!socket || !roomId) return;
    socket.emit("start_game", { roomId });
  };

  const callNumber = (roomId, num) => {
    if (!socket || !roomId) return;
    socket.emit("call_number", { roomId, number: num });
  };

  return {
    room,
    cells,
    setCells,
    markedNumbers,
    setMarkedNumbers,
    errors,
    setErrors,
    errorMessage,
    setErrorMessage,
    isHost,
    socketId,
    createRoom,
    joinRoom,
    submitBoard,
    startGame,
    callNumber,
    setRoom,
  };
}
