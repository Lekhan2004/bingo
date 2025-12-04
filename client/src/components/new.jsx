// src/components/bingo/BingoGrid.tsx
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBingoGame } from "@/hooks/use-bingo";
import { useSocket } from "@/context/socketContext";

const BingoGrid = () => {
  const {
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
    setRoom
  } = useBingoGame();

  const [roomIdInput, setRoomIdInput] = useState("");

  const gameStatus = room.gameStatus;

  // reuse your existing handleCellChange, fillRandomGrid, checkWinner here
  // but instead of emitting directly submit through submitBoard/startGame/callNumber

  // example for calling a number:
  function handleNumberClick(num) {
    if (!num || !room.id) return;

    const newMarked = new Set(markedNumbers);
    newMarked.add(num);
    setMarkedNumbers(newMarked);
    callNumber(room.id, num);
    console.log(`You called number: ${num}`, cells);
    toast({
      title: "Your Turn",
      description: `You called: ${num}`,
    });
    
    if (checkWinner(cells, newMarked)) {
      setRoom((prev) => ({
        ...prev,
        gameStatus: "finished",

      }));
      toast({
        title: "Congratulations!",
        description: "You win!",
      });
      return;
    }
  }

    // Reuse your existing handleCellChange function
    const handleCellChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    // Prevent duplicates
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

    // Call submitBoard when the grid is valid
    validateGrid();
    };

    // Reuse fillRandomGrid to fill the grid randomly and submit the board
    const fillRandomGrid = () => {
        const numbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
        const grid = numbers.sort(() => Math.random() - 0.5);
        setCells(grid);
        setErrors(Array(25).fill(false));
        setErrorMessage("✅ Random grid generated!");
        setTimeout(() => setErrorMessage(""), 2000);

        // Trigger submitBoard after filling the grid
        submitBoard(room.id);  // Submit the grid to the backend
    };

    // Reuse the existing checkWinner function
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

        // If there are at least 5 completed lines, it's a win
        if (completedLines >= 5) {
            setGameStatus("finished");
            toast({
            title: "Congratulations!",
            description: "You win!",
            });
            return true;  // Player wins
        }
        return false;  // No winner
    };

    // example for submitting board:
    function validateGrid() {
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
        // keep your local validation, then:
        if (!room.id) return;
        if(!hasError) {
            submitBoard(room.id);
        }
    }

  return (
    <div className="h-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-4">
        {/* header section unchanged except for using room and socketId */}
        {gameStatus === "pre_setup" && (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">
              Waiting for other players to join...
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => {
                  createRoom();
                }}
              >
                Create Room
              </Button>
              <form
                className="flex gap-2 w-full"
                onSubmit={(e) => {
                  e.preventDefault();
                  joinRoom(roomIdInput);
                }}
              >
                <Input
                  placeholder="Enter Room ID"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                />
                <Button type="submit">Join Room</Button>
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
        {/* your grid rendering almost unchanged, but using handleNumberClick etc */}
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
