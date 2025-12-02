import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useSocket } from "../context/socketContext";

const BingoGrid = () => {
  
  //socket context
  const { socket, connected } = useSocket();

  //Room State
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState({
          host: null,
          players:  null,
          gameType: "",
          gameStatus: "pre_setup", // "pre_setup" | "setup" | "playing" | "finished"
          numbersCalled: [],
          gameStarted: false,
          boards: {},
          calledNumbers: new Set(), 
          winner: null,    
          currentTurn: null
        });

  // Grid state
  const [cells, setCells] = useState(Array(25).fill(null));

  // Error state
  const [errors, setErrors] = useState(Array(25).fill(false));
  const [errorMessage, setErrorMessage] = useState("");
  
  // Game state
  const [gameStatus, setGameStatus] = useState(room?.gameStatus); // "pre_setup" | "setup" | "playing" | "finished"

  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [currentTurn, setCurrentTurn] = useState(room?.currentTurn); 
  const [winner, setWinner] = useState(room?.winner);

  const handleCellChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    //Dont allow duplicate number entering
    if (cells.includes(value)) {
      const newErrors = [...errors];
      newErrors[index] = true;
      setErrors(newErrors);
      setErrorMessage("Duplicate numbers are not allowed.");
      return;
    }

    // Clear errors when changing input
    const newErrors = [...errors];
    newErrors[index] = false;
    setErrors(newErrors);
    setErrorMessage("");

    const newCells = [...cells];
    newCells[index] = value || null;
    setCells(newCells);
  };

  const fillRandomGrid = () => {
    const numbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
    const grid = numbers.sort(() => Math.random() - 0.5);
    setCells(grid);
    setErrors(Array(25).fill(false));
    setErrorMessage("✅ Random grid generated!");
    setTimeout(() => setErrorMessage(""), 2000);
  };

  const checkWinner = (grid, marked) => {
    const gridNums = grid.map((c) => c || "");
    let completedLines = 0;
    
    // Check rows
    for (let i = 0; i < 5; i++) {
      const row = gridNums.slice(i * 5, i * 5 + 5);
      if (row.every((num) => num && marked.has(num))) {
        completedLines++;
      }
    }
    
    // Check columns
    for (let i = 0; i < 5; i++) {
      const col = [
        gridNums[i],
        gridNums[i + 5],
        gridNums[i + 10],
        gridNums[i + 15],
        gridNums[i + 20],
      ];
      if (col.every((num) => num && marked.has(num))) {
        completedLines++;
      }
    }
    
    // Check diagonals
    const diag1 = [gridNums[0], gridNums[6], gridNums[12], gridNums[18], gridNums[24]];
    const diag2 = [gridNums[4], gridNums[8], gridNums[12], gridNums[16], gridNums[20]];
    if (diag1.every((num) => num && marked.has(num))) {
      completedLines++;
    }
    if (diag2.every((num) => num && marked.has(num))) {
      completedLines++;
    }
    
    return completedLines >= 5;
  };

  //Handle human turn 
  const handleNumberClick = (num) => {
    // if (gameStatus !== "playing" || currentTurn !== socket.id || markedNumbers.has(num)) return;
    
    const newMarked = new Set(markedNumbers);
    newMarked.add(num);
    setMarkedNumbers(newMarked);
    
    socket.emit("call_number", { roomId, number: num });
    console.log(`You called number: ${num}`, cells);
    toast({
      title: "Your Turn",
      description: `You called: ${num}`,
    });
    
    // Check if human won
    if (checkWinner(cells, newMarked)) {
      setGameStatus("finished");
      toast({
        title: "Congratulations!",
        description: "You win!",
      });
      return;
    }
    
  };

  const validateGrid = () => {
    const newErrors = Array(25).fill(false);
    let hasError = false;

    // Check for duplicates and range
    cells.forEach((cell, index) => {
      if (cell) {
        const numValue = parseInt(cell, 10);
        
        // Check range
        if (numValue < 1 || numValue > 25) {
          newErrors[index] = true;
          hasError = true;
          setErrorMessage("⚠️ Numbers must be between 1-25");
          return;
        }

        // Check for duplicates
        const duplicateIndex = cells.findIndex(
          (c, idx) => idx !== index && c === cell
        );
        if (duplicateIndex !== -1) {
          newErrors[index] = true;
          newErrors[duplicateIndex] = true;
          hasError = true;
          setErrorMessage("⚠️ Duplicate numbers detected");
        }
      }
    });

    setErrors(newErrors);
    
    if (!hasError) {
      // Check if all cells are filled
      if (cells.some((cell) => !cell)) {
        setErrorMessage("⚠️ Please fill all cells");
        return;
      }
      setErrorMessage("✅ Grid is valid!");
      socket.emit("submit_board", { roomId, board: cells });
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  const startGame = () => {
    if (cells.some((cell) => !cell)) {
      setErrorMessage("⚠️ Please fill all cells first");
      return;
    }
    
    socket.emit("start_game", { roomId });

  };

  //reset logic
  const resetGame = () => {
    setCells(Array(25).fill(null));
    setErrors(Array(25).fill(false));
    setErrorMessage("");
    setGameStatus("setup");
    setMarkedNumbers(new Set());
    setCurrentTurn(null);
    setWinner(null);
  };

  useEffect(() => {
    if(!socket) {
      return;
    }
    const handleGameStarted = (data) => {
      console.log("Game started event received:", data);
      setGameStatus("playing");
      setMarkedNumbers(new Set());
      setCurrentTurn(data.currentTurn);
      setErrorMessage("");
      toast({
        title: "Game Started!",
        description: "Your turn - click a number to call it",
      });
    };

    const handleGameError = (data) => {
      console.log("Game error received:", data);
      setErrorMessage(data.message);
      toast({
        title: "Game Error",
        description: data.message,
        variant: "destructive",
      });
    };

    const handleNumberCalled = ({ number, calledNumbers, currentTurn }) => {
      console.log(`Number called cjndsknc: `, number, calledNumbers);

      setMarkedNumbers(new Set(calledNumbers.map(String)));
      setCurrentTurn(currentTurn);
      // setMarkedNumbers(new Set(calledNumbers.map(String)));
    };

    const handleGameFinished = (data) => {
      console.log("Game finished event received:", data);
      setGameStatus("finished");
      setWinner(data.winner);
      toast({
        title: "Game Over",
        description: data.winner === socket.id ? "You win!" : `${data.winner} wins!`,
      });
    };

    socket.on("game_started", handleGameStarted);
    socket.on("number_called", handleNumberCalled);
    socket.on("game_error", handleGameError);
    socket.on("game_finished", handleGameFinished);

    return () => {
      socket.off("game_started", handleGameStarted);
      socket.off("number_called", handleNumberCalled);
      socket.off("game_error", handleGameError);
      socket.off("game_finished", handleGameFinished);
    };
  }, [socket]);

  const setupRoom = () => {

    if (!socket || !connected) {
      socket.connect();
      console.log("Socket connected in game room setup");
    }

    socket.emit("create_room", { gameType: "BINGO" }, (resp) => {
      setRoomId(resp.roomId);
      setRoom(resp.room);
      console.log("Room created with ID:", resp.roomId);
    });

  }

  const joinRoom = () => {

    if (!socket || !connected) {
      socket.connect();
      console.log("Socket connected in game room join");
    }

    socket.emit("join_room", { roomId: roomId }, (resp) => {
      console.log("Join room response:", resp);
      if (resp.success) {
        console.log("Joined room:", roomId);
      } else {
        console.log("Failed to join room:", resp.message);
      }
    });

  }

  // socket.on("start_game", { roomId }, (data) => {
  //   console.log("Game started event received:", data);
  //   setGameStatus("playing");
  // });

  console.log(room);
  return (
    <div className="h-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-4">
          {gameStatus === "pre_setup" && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground">
                Waiting for other players to join...
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button 
                onClick={() => {
                  setupRoom();
                  setGameStatus("setup")
                }} 
              >
                Create Room
              </Button>
              <form action="" className="flex gap-2 w-full">
                <Input 
                  placeholder="Enter Room ID" 
                  value={roomId} 
                  onChange={(e) => {
                    console.log(e.target.value);
                    setRoomId(e.target.value)}
                  }
                />
                <Button 
                  onClick={() => {
                    joinRoom();
                    setGameStatus("setup")
                  }} 
                >
                  Join Room
                </Button>
              </form>
              </div>
            </div>
          )}
          {gameStatus === "setup" && (
            <p className="text-muted-foreground">
              Enter numbers from 1-25 (no duplicates)
            </p>
          )}
          {gameStatus === "playing" && (
            <p className="text-lg font-semibold text-foreground">
              {currentTurn === socket.id ? "Your Turn" : `${currentTurn} Turn`}
            </p>
          )}
          {gameStatus === "finished" && (
            <p className="text-2xl font-bold text-primary">
              {winner === socket.id ? "🎉 You Win!" : `${winner} Wins!"`}
            </p>
          )}
        </div>

        {gameStatus !== "pre_setup" && (
          <Card className="p-6 shadow-xl flex">
            <div className="grid grid-cols-5 gap-3">
              {gameStatus === "setup" ? (
                cells.map((cell, index) => (
                  <div key={index} className="aspect-square">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={cell || ""}
                      onChange={(e) => handleCellChange(index, e.target.value)}
                      className={cn(
                        "h-full w-full text-center text-2xl font-bold",
                        "bg-[hsl(var(--bingo-cell))]",
                        "border-2 border-[hsl(var(--bingo-cell-border))]",
                        "focus:border-primary focus:ring-2 focus:ring-primary/20",
                        "transition-all duration-200",
                        errors[index] &&
                          "bg-[hsl(var(--bingo-cell-error))] border-[hsl(var(--bingo-cell-error-border))] animate-pulse"
                      )}
                      placeholder=""
                    />
                  </div>
                ))
              ) : (
                cells.map((cell, index) => {
                  const isMarked = cell && markedNumbers.has(cell);
                  const canClick =
                    gameStatus === "playing" &&
                    currentTurn === socket.id &&
                    !isMarked;
                  
                  return (
                    <div key={index} className="aspect-square">
                      <button
                        onClick={() => handleNumberClick(cell)}
                        disabled={!canClick}
                        className={cn(
                          "h-full w-full text-center text-2xl font-bold rounded-md",
                          "border-2 transition-all duration-200",
                          isMarked
                            ? "bg-primary text-primary-foreground border-primary line-through"
                            : "bg-[hsl(var(--bingo-cell))] text-foreground border-[hsl(var(--bingo-cell-border))]",
                          canClick &&
                            "hover:bg-primary/20 hover:border-primary cursor-pointer",
                          !canClick &&
                            !isMarked &&
                            "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {cell}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {errorMessage && (
              <div
                className={cn(
                  "mt-4 text-center text-sm font-medium",
                  errorMessage.includes("✅") ? "text-green-600" : "text-destructive"
                )}
              >
                {errorMessage}
              </div>
            )}

            {gameStatus === "setup" && (
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={validateGrid} 
                  className="flex-1"
                  size="lg"
                  variant="outline"
                >
                  Validate Grid
                </Button>
                <Button
                  onClick={fillRandomGrid}
                  className="flex-1"
                  size="lg"
                  variant="outline"
                >
                  Random Grid
                </Button>
                <Button 
                  onClick={startGame} 
                  disabled={cells.some((cell) => !cell) || room.host !== socket.id}
                  className="flex-1"
                  size="lg"
                >
                  Start Game
                </Button>
              </div>
            )}

            {gameStatus === "finished" && (
              <>
                <Button 
                  onClick={resetGame} 
                  className="w-full mt-6"
                  size="lg"
                >
                  Play Again
                </Button>
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default BingoGrid;
