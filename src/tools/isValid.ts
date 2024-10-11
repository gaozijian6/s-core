import type { CellData } from "../views/sudoku";

const isValid = (
    board: CellData[][],
    row: number,
    col: number,
    num: number
  ): boolean => {
    // 检查行
    for (let x = 0; x < 9; x++) {
      if (board[row][x].value === num) return false;
    }

    // 检查列
    for (let x = 0; x < 9; x++) {
      if (board[x][col].value === num) return false;
    }

    // 检查3x3方格
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol].value === num) return false;
      }
    }

    return true;
  };

export default isValid;