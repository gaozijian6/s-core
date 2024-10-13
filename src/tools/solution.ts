import { CellData } from "../views/sudoku";
import { getCandidates } from "../tools";
import { SOLUTION_METHODS } from "../constans";
interface Result {
  row: number;
  col: number;
  method: number;
  target: number;
}

// 唯一余数法
export const singleCandidate = (board: CellData[][]): Result | null => {

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell?.value === null) {
        const candidates = getCandidates(board, row, col);
        if (candidates.length === 1) {
          return { row, col, method: SOLUTION_METHODS.SINGLE_CANDIDATE, target: candidates[0] };
        }
      }
    }
  }

  return null;
};

// 隐藏单元法
export const hiddenSingle = (board: CellData[][]): Result | null => {
  // 检查每一行
  for (let row = 0; row < 9; row++) {
    const rowCandidates: { [key: number]: number[] } = {};
    for (let col = 0; col < 9; col++) {
      if (board[row][col].value === null) {
        const candidates = getCandidates(board, row, col);
        candidates.forEach(num => {
          rowCandidates[num] = rowCandidates[num] || [];
          rowCandidates[num].push(col);
        });
      }
    }
    for (const [num, cols] of Object.entries(rowCandidates)) {
      if (cols.length === 1) {
        return { row, col: cols[0], method: SOLUTION_METHODS.HIDDEN_SINGLE_ROW, target: Number(num) };
      }
    }
  }

  // 检查每一列
  for (let col = 0; col < 9; col++) {
    const colCandidates: { [key: number]: number[] } = {};
    for (let row = 0; row < 9; row++) {
      if (board[row][col].value === null) {
        const candidates = getCandidates(board, row, col);
        candidates.forEach(num => {
          colCandidates[num] = colCandidates[num] || [];
          colCandidates[num].push(row);
        });
      }
    }
    for (const [num, rows] of Object.entries(colCandidates)) {
      if (rows.length === 1) {
        return { row: rows[0], col, method: SOLUTION_METHODS.HIDDEN_SINGLE_COLUMN, target: Number(num) };
      }
    }
  }

  // 检查每一宫
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCandidates: { [key: number]: { row: number, col: number }[] } = {};
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          if (board[row][col].value === null) {
            const candidates = getCandidates(board, row, col);
            candidates.forEach(num => {
              boxCandidates[num] = boxCandidates[num] || [];
              boxCandidates[num].push({ row, col });
            });
          }
        }
      }
      for (const [num, cells] of Object.entries(boxCandidates)) {
        if (cells.length === 1) {
          return { row: cells[0].row, col: cells[0].col, method: SOLUTION_METHODS.HIDDEN_SINGLE_BOX, target: Number(num) };
        }
      }
    }
  }

  return null;
}
