import { CellData } from "../views/sudoku";
import { SOLUTION_METHODS } from "../constans";

interface Position {
  row: number;
  col: number;
}
interface Result {
  // 是否填入数字,true:在position[0]位置填入target数字,false:删除position里所有的值为target的候选数字
  isFill: boolean;
  position: Position[];
  method: string;
  target: number[];
}

// 唯一余数法
export const singleCandidate = (board: CellData[][]): Result | null => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell?.value === null && cell.draft?.length === 1) {
        return {
          position: [{ row, col }],
          method: SOLUTION_METHODS.SINGLE_CANDIDATE,
          target: [cell.draft[0]],
          isFill: true,
        };
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
        board[row][col].draft?.forEach((num) => {
          rowCandidates[num] = rowCandidates[num] || [];
          rowCandidates[num].push(col);
        });
      }
    }
    for (const [num, cols] of Object.entries(rowCandidates)) {
      if (cols.length === 1) {
        return {
          position: [{ row, col: cols[0] }],
          method: SOLUTION_METHODS.HIDDEN_SINGLE_ROW,
          target: [Number(num)],
          isFill: true,
        };
      }
    }
  }

  // 检查每一列
  for (let col = 0; col < 9; col++) {
    const colCandidates: { [key: number]: number[] } = {};
    for (let row = 0; row < 9; row++) {
      if (board[row][col].value === null) {
        board[row][col].draft?.forEach((num) => {
          colCandidates[num] = colCandidates[num] || [];
          colCandidates[num].push(row);
        });
      }
    }
    for (const [num, rows] of Object.entries(colCandidates)) {
      if (rows.length === 1) {
        return {
          position: [{ row: rows[0], col }],
          method: SOLUTION_METHODS.HIDDEN_SINGLE_COLUMN,
          target: [Number(num)],
          isFill: true,
        };
      }
    }
  }

  // 检查每一宫
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCandidates: { [key: number]: { row: number; col: number }[] } =
        {};
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          if (board[row][col].value === null) {
            board[row][col].draft?.forEach((num) => {
              boxCandidates[num] = boxCandidates[num] || [];
              boxCandidates[num].push({ row, col });
            });
          }
        }
      }
      for (const [num, cells] of Object.entries(boxCandidates)) {
        if (cells.length === 1) {
          return {
            position: [{ row: cells[0].row, col: cells[0].col }],
            method: SOLUTION_METHODS.HIDDEN_SINGLE_BOX,
            target: [Number(num)],
            isFill: true,
          };
        }
      }
    }
  }

  return null;
};

// 区块摒除法
export const blockElimination = (board: CellData[][]): Result | null => {
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCandidates: { [key: number]: { row: number; col: number }[] } = {};

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          if (board[row][col].value === null) {
            board[row][col].draft?.forEach((num) => {
              boxCandidates[num] = boxCandidates[num] || [];
              boxCandidates[num].push({ row, col });
            });
          }
        }
      }

      for (const [num, cells] of Object.entries(boxCandidates)) {
        const rows = new Set(cells.map((cell) => cell.row));
        const cols = new Set(cells.map((cell) => cell.col));

        if (rows.size === 1) {
          const targetRow = Array.from(rows)[0];
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 9; i++) {
            if (Math.floor(i / 3) !== boxCol) {
              const cell = board[targetRow][i];
              if (cell.value === null && cell.draft?.includes?.(Number(num))) {
                positionsToRemove.push({ row: targetRow, col: i });
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_ROW,
              target: [Number(num)],
              isFill: false,
            };
          }
        }

        if (cols.size === 1) {
          const targetCol = Array.from(cols)[0];
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 9; i++) {
            if (Math.floor(i / 3) !== boxRow) {
              const cell = board[i][targetCol];
              if (cell.value === null && cell.draft?.includes?.(Number(num))) {
                positionsToRemove.push({ row: i, col: targetCol });
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_COLUMN,
              target: [Number(num)],
              isFill: false,
            };
          }
        }
      }
    }
  }

  return null;
};

// 显性数对法
export const nakedPair = (board: CellData[][]): Result | null => {
  // 检查每一宫
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCells: { row: number; col: number; draft: number[] }[] = [];

      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          const cell = board[row][col];
          cell?.value === null && cell?.draft?.length === 2 && boxCells.push({ row, col, draft: cell.draft });
        }
      }

      for (let i = 0; i < boxCells.length; i++) {
        for (let j = i + 1; j < boxCells.length; j++) {
          const cell1 = boxCells[i];
          const cell2 = boxCells[j];
          
          if (cell1.draft?.toString() === cell2.draft?.toString()) {
            const positionsToRemove: Position[] = [];
            const [num1, num2] = cell1.draft;

            // 检查宫内其他格子
            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                const row = boxRow * 3 + r;
                const col = boxCol * 3 + c;
                if ((row !== cell1.row || col !== cell1.col) && (row !== cell2.row || col !== cell2.col)) {
                  const cell = board[row][col];
                  cell?.value === null && cell?.draft?.some(n => n === num1 || n === num2) && positionsToRemove.push({ row, col });
                }
              }
            }

            // 检查是否在同一行或同一列
            const sameRow = cell1.row === cell2.row;
            const sameCol = cell1.col === cell2.col;

            if (sameRow) {
              for (let col = 0; col < 9; col++) {
                if (Math.floor(col / 3) !== boxCol) {
                  const cell = board[cell1.row][col];
                  cell?.value === null && cell?.draft?.some(n => n === num1 || n === num2) && positionsToRemove.push({ row: cell1.row, col });
                }
              }
            }

            if (sameCol) {
              for (let row = 0; row < 9; row++) {
                if (Math.floor(row / 3) !== boxRow) {
                  const cell = board[row][cell1.col];
                  cell?.value === null && cell?.draft?.some(n => n === num1 || n === num2) && positionsToRemove.push({ row, col: cell1.col });
                }
              }
            }

            if (positionsToRemove.length > 0) {
              return {
                position: positionsToRemove,
                method: SOLUTION_METHODS.NAKED_PAIR,
                target: [num1, num2],
                isFill: false,
              };
            }
          }
        }
      }
    }
  }

  return null;
};

// 隐形数对法
export const hiddenPair = (board: CellData[][]): Result | null => {
  // 检查3x3宫格
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const candidatesMap: { [key: number]: Position[] } = {};
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r;
          const col = boxCol * 3 + c;
          const cell = board[row][col];
          if (cell?.value === null) {
            cell.draft?.forEach(num => {
              if (!candidatesMap[num]) candidatesMap[num] = [];
              candidatesMap[num].push({ row, col });
            });
          }
        }
      }
      
      const result = checkHiddenPair(candidatesMap, board, SOLUTION_METHODS.HIDDEN_PAIR);
      if (result) return result;
    }
  }

  return null;
};

const checkHiddenPair = (
  candidatesMap: { [key: number]: Position[] },
  board: CellData[][],
  method: string
): Result | null => {
  const pairs = Object.entries(candidatesMap).filter(([_, positions]) => positions.length === 2);
  
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [num1, positions1] = pairs[i];
      const [num2, positions2] = pairs[j];
      
      if (JSON.stringify(positions1) === JSON.stringify(positions2)) {
        const [pos1, pos2] = positions1;
        const cell1 = board[pos1.row][pos1.col];
        const cell2 = board[pos2.row][pos2.col];
        
        if (cell1?.draft?.length > 2 || cell2?.draft?.length > 2) {
          return {
            position: [pos1, pos2],
            method,
            target: [Number(num1), Number(num2)],
            isFill: false,
          };
        }
      }
    }
  }
  
  return null;
};
