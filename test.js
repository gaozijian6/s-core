const convertToBoard = (solution) => {
  if (solution.length !== 81) {
    throw new Error("Invalid solution length");
  }
  // 创建9x9的二维数组
  const board = [];
  for (let i = 0; i < 9; i++) {
    const row = [];
    for (let j = 0; j < 9; j++) {
      // 从字符串中获取对应位置的数字并转换为数值类型
      row.push(Number(solution[i * 9 + j]));
    }
    board.push(row);
  }
  return board;
};

const isValidBoard = (board) => {
  // 检查每一行
  for (let i = 0; i < 9; i++) {
    const row = new Set();
    for (let j = 0; j < 9; j++) {
      if (board[i][j] !== 0) {
        if (row.has(board[i][j])) return false;
        row.add(board[i][j]);
      }
    }
  }

  // 检查每一列
  for (let j = 0; j < 9; j++) {
    const col = new Set();
    for (let i = 0; i < 9; i++) {
      if (board[i][j] !== 0) {
        if (col.has(board[i][j])) return false;
        col.add(board[i][j]);
      }
    }
  }

  // 检查每个3x3方格
  for (let block = 0; block < 9; block++) {
    const box = new Set();
    const rowStart = Math.floor(block / 3) * 3;
    const colStart = (block % 3) * 3;

    for (let i = rowStart; i < rowStart + 3; i++) {
      for (let j = colStart; j < colStart + 3; j++) {
        if (board[i][j] !== 0) {
          if (box.has(board[i][j])) return false;
          box.add(board[i][j]);
        }
      }
    }
  }

  return true;
};

const isValidSudoku = (sudoku) => {
  const { puzzle, solution } = sudoku;
  if (puzzle.length !== 81 || solution.length !== 81) {
    return false;
  }
  for (let i = 0; i < 81; i++) {
    if (puzzle[i] == 0) continue;
    if (puzzle[i] !== solution[i]) {
      return false;
    }
  }
  const solutionBoard = convertToBoard(solution);
  return isValidBoard(solutionBoard);
};

console.log(
  isValidSudoku({
    puzzle:
      "000000500306005040400890002009063100007009300600000090200040960008000000060702080",
    solution:
      "782634519396125847415897632859263174127489356634571298271348965548916723963752481",
  })
);
