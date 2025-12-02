function checkWinnerServer(board, markedSet) {
  const grid = board.map(c => c || "");
  let completedLines = 0;

  // rows
  for (let i = 0; i < 5; i++) {
    const row = grid.slice(i * 5, i * 5 + 5);
    if (row.every(num => num && markedSet.has(num))) completedLines++;
  }

  // cols
  for (let i = 0; i < 5; i++) {
    const col = [
      grid[i],
      grid[i + 5],
      grid[i + 10],
      grid[i + 15],
      grid[i + 20],
    ];
    if (col.every(num => num && markedSet.has(num))) completedLines++;
  }

  // diagonals
  const diag1 = [grid[0], grid[6], grid[12], grid[18], grid[24]];
  const diag2 = [grid[4], grid[8], grid[12], grid[16], grid[20]];

  if (diag1.every(num => num && markedSet.has(num))) completedLines++;
  if (diag2.every(num => num && markedSet.has(num))) completedLines++;

  return completedLines >= 5;
}

function validateBoard(board) {
  if (!Array.isArray(board) || board.length !== 25) {
    return "Board must have 25 cells";
  }

  const nums = board.map((x) => parseInt(x, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 1 || n > 25)) {
    return "Numbers must be between 1 and 25";
  }

  const uniq = new Set(nums);
  if (uniq.size !== 25) {
    return "Numbers must be unique";
  }

  return null;
}

module.exports = {
  checkWinnerServer,
  validateBoard
};

