import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";


const BingoGrid = () => {
  
  // Grid state
  const [cells, setCells] = useState(Array(25).fill(null));

  // Error state
  const [errors, setErrors] = useState(Array(25).fill(false));
  const [errorMessage, setErrorMessage] = useState("");
  
  // Game state
  const [gameStatus, setGameStatus] = useState("setup"); // "setup" | "playing" | "finished"
  const [computerGrid, setComputerGrid] = useState([]);
  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [currentTurn, setCurrentTurn] = useState("human"); // "human" | "computer"
  const [winner, setWinner] = useState(null); // "human" | "computer" | null

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

  const generateRandomGrid = () => {
    const numbers = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
    return numbers.sort(() => Math.random() - 0.5);
  };


  const fillRandomGrid = () => {
    const grid = generateRandomGrid();
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

  // Handle Computer turn
  const computerTurn = () => {
    // Find unmarked numbers in computer's grid
    const unmarked = computerGrid.filter((num) => !markedNumbers.has(num));
    if (unmarked.length === 0) return;
    
    // Pick random unmarked number
    const selectedNum = unmarked[Math.floor(Math.random() * unmarked.length)];
    
    setTimeout(() => {
      const newMarked = new Set(markedNumbers);
      newMarked.add(selectedNum);
      setMarkedNumbers(newMarked);
      
      toast({
        title: "Computer's Turn",
        description: `Computer called: ${selectedNum}`,
      });
      
      // Check if computer won
      if (checkWinner(computerGrid, newMarked)) {
        setWinner("computer");
        setGameStatus("finished");
        toast({
          title: "Game Over!",
          description: "Computer wins!",
          variant: "destructive",
        });
      } else {
        setCurrentTurn("human");
      }
    }, 1000);
  };

  //Handle human turn 
  const handleNumberClick = (num) => {
    if (gameStatus !== "playing" || currentTurn !== "human" || markedNumbers.has(num)) return;
    
    const newMarked = new Set(markedNumbers);
    newMarked.add(num);
    setMarkedNumbers(newMarked);
    
    toast({
      title: "Your Turn",
      description: `You called: ${num}`,
    });
    
    // Check if human won
    if (checkWinner(cells, newMarked)) {
      setWinner("human");
      setGameStatus("finished");
      toast({
        title: "Congratulations!",
        description: "You win!",
      });
      return;
    }
    
    setCurrentTurn("computer");
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
      setTimeout(() => setErrorMessage(""), 2000);
    }
  };

  const startGame = () => {
    if (cells.some((cell) => !cell)) {
      setErrorMessage("⚠️ Please fill all cells first");
      return;
    }
    
    const compGrid = generateRandomGrid();
    setComputerGrid(compGrid);
    setGameStatus("playing");
    setMarkedNumbers(new Set());
    setCurrentTurn("human");
    
    toast({
      title: "Game Started!",
      description: "Your turn - click a number to call it",
    });
  };

  //reset logic
  const resetGame = () => {
    setCells(Array(25).fill(null));
    setErrors(Array(25).fill(false));
    setErrorMessage("");
    setGameStatus("setup");
    setComputerGrid([]);
    setMarkedNumbers(new Set());
    setCurrentTurn("human");
    setWinner(null);
  };

  // Trigger computer turn
  useEffect(() => {
    if (gameStatus === "playing" && currentTurn === "computer" && !winner) {
      computerTurn();
    }
  }, [gameStatus, currentTurn, winner]);

  return (
    <div className="h-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-4">
          {gameStatus === "setup" && (
            <p className="text-muted-foreground">
              Enter numbers from 1-25 (no duplicates)
            </p>
          )}
          {gameStatus === "playing" && (
            <p className="text-lg font-semibold text-foreground">
              {currentTurn === "human" ? "Your Turn" : "Computer's Turn"}
            </p>
          )}
          {gameStatus === "finished" && (
            <p className="text-2xl font-bold text-primary">
              {winner === "human" ? "🎉 You Win!" : "💻 Computer Wins!"}
            </p>
          )}
        </div>

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
                  currentTurn === "human" &&
                  !isMarked;
                
                return (
                  <div key={index} className="aspect-square">
                    <button
                      onClick={() => cell && handleNumberClick(cell)}
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
                className="flex-1"
                size="lg"
              >
                Start Game
              </Button>
            </div>
          )}

          {gameStatus === "finished" && (
            <>
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-lg font-semibold text-center mb-4 text-muted-foreground">
                  Computer's Grid
                </h3>
                <div className="grid grid-cols-5 gap-2 opacity-80">
                  {computerGrid.map((cell, index) => {
                    const isMarked = markedNumbers.has(cell);
                    
                    return (
                      <div key={index} className="aspect-square">
                        <div
                          className={cn(
                            "h-full w-full text-center text-xl font-bold rounded-md",
                            "border-2 transition-all duration-200 flex items-center justify-center",
                            isMarked
                              ? "bg-secondary text-secondary-foreground border-secondary line-through"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {cell}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
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
      </div>
    </div>
  );
};

export default BingoGrid;
