import { useEffect, useState } from "react";
import type { CellData } from "../views/sudoku";

export const isValid = (
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

export const solve = (board: CellData[][]): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col].value === null) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col].value = num;
            if (solve(board)) {
              return true;
            }
            board[row][col].value = null;
          }
        }
        return false;
      }
    }
  }
  return true;
};

export const useTimer = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  return formatTime(seconds);
};

export const getCellClassName = (
  board: CellData[][],
  rowIndex: number,
  colIndex: number,
  selectedNumber: number | null,
  visualHint: boolean,
  visualHint2: boolean
) => {
  const cell = board[rowIndex][colIndex];
  const baseClass = `sudokuCell ${
    cell.value === null ? "emptySudokuCell" : ""
  } ${cell.isGiven ? "givenNumber" : ""}`;

  if (selectedNumber !== null) {
    if (visualHint) {
      if (board[rowIndex][colIndex].value === selectedNumber) {
        return `${baseClass} selectedNumber`;
      }

      const isInSameRow = board[rowIndex].some(
        (c) => c.value === selectedNumber
      );
      const isInSameCol = board.some(
        (row) => row[colIndex].value === selectedNumber
      );

      const startRow = Math.floor(rowIndex / 3) * 3;
      const startCol = Math.floor(colIndex / 3) * 3;
      let isInSameBox = false;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[startRow + i][startCol + j].value === selectedNumber) {
            isInSameBox = true;
            break;
          }
        }
        if (isInSameBox) break;
      }

      if (isInSameRow || isInSameCol || isInSameBox) {
        return `${baseClass} visualHint`;
      }
    }

    if (visualHint2 && cell.value === null) {
      if (isValid(board, rowIndex, colIndex, selectedNumber)) {
        return `${baseClass} visualHint2`;
      }
    }
  }

  return baseClass;
};

// 检测数独解的情况
export const checkSolutionStatus = (board: CellData[][]): '无解' | '有唯一解' | '有多解' => {
  let solutionCount = 0;
  const emptyCells: [number, number][] = [];

  // 找出所有空白格子
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col].value === null) {
        emptyCells.push([row, col]);
      }
    }
  }

  const backtrack = (index: number): boolean => {
    if (index === emptyCells.length) {
      solutionCount++;
      return solutionCount > 1;
    }

    const [row, col] = emptyCells[index];
    for (let num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        board[row][col].value = num;
        if (backtrack(index + 1)) {
          return true;
        }
        board[row][col].value = null;
      }
    }
    return false;
  };

  backtrack(0);

  if (solutionCount === 0) {
    return '无解';
  } else if (solutionCount === 1) {
    return '有唯一解';
  } else {
    return '有多解';
  }
};
