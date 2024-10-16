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
  selectedNumber: number | null
) => {
  const cell = board[rowIndex][colIndex];
  const baseClass = `sudokuCell ${
    cell.value === null ? "emptySudokuCell" : ""
  } ${cell.isGiven ? "givenNumber" : ""}`;

  if (selectedNumber !== null) {
    if (cell.value === selectedNumber) {
      return `${baseClass} selectedNumber`;
    } else if (cell.value === null && cell.draft.includes(selectedNumber)) {
      return `${baseClass} candidateNumber`;
    }
  }

  return baseClass;
};

// 检测数独解的情况
export const checkSolutionStatus = (
  board: CellData[][]
): "无解" | "有唯一解" | "有多解" => {
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
    return "无解";
  } else if (solutionCount === 1) {
    return "有唯一解";
  } else {
    return "有多解";
  }
};

export const checkNumberInRowColumnAndBox = (
  board: CellData[][],
  row: number,
  col: number,
  num: number
): { row: number; col: number }[] => {
  const conflictCells: { row: number; col: number }[] = [];

  // 检查行
  for (let i = 0; i < 9; i++) {
    if (board[row][i].value === num) {
      conflictCells.push({ row, col: i });
    }
  }

  // 检查列
  for (let i = 0; i < 9; i++) {
    if (board[i][col].value === num) {
      conflictCells.push({ row: i, col });
    }
  }

  // 检查3x3方格
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRow + i][boxCol + j].value === num) {
        conflictCells.push({ row: boxRow + i, col: boxCol + j });
      }
    }
  }

  return conflictCells;
};

// 添加新的函数来更新相关单元格的草稿数字
export const updateRelatedCellsDraft = (
  board: CellData[][],
  position: { row: number; col: number }[],
  value: number,
  getCandidates: (board: CellData[][], row: number, col: number) => number[],
  isUndo: boolean = false
) => {
  const affectedCells: { row: number; col: number }[] = [];

  // 收集受影响的单元格
  position.forEach(({ row, col }) => {
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i].value === null) {
        affectedCells.push({ row, col: i });
      }
      if (i !== row && board[i][col].value === null) {
        affectedCells.push({ row: i, col });
      }
    }

    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let i = boxRow; i < boxRow + 3; i++) {
      for (let j = boxCol; j < boxCol + 3; j++) {
        if ((i !== row || j !== col) && board[i][j].value === null) {
          affectedCells.push({ row: i, col: j });
        }
      }
    }
  });

  // 去重受影响的单元格
  const uniqueAffectedCells = Array.from(
    new Set(affectedCells.map((cell) => `${cell.row},${cell.col}`))
  ).map((str) => {
    const [row, col] = str.split(",");
    return { row: Number(row), col: Number(col) };
  });

  // 更新受影响的单元格
  uniqueAffectedCells.forEach(({ row, col }) => {
    const cell = board[row][col];
    const candidates = getCandidates(board, row, col);
    updateCellDraft(cell, value, candidates, isUndo);
  });

  return uniqueAffectedCells;
};

const updateCellDraft = (
  cell: CellData,
  value: number,
  candidates: number[],
  isUndo: boolean
) => {
  if (isUndo) {
    // 如果是撤销操作，添加候选数字
    if (candidates.includes(value) && !cell.draft.includes(value)) {
      cell.draft.push(value);
      cell.draft.sort((a, b) => a - b);
    }
  } else {
    // 如果是填入数字操作，移除候选数字
    cell.draft = cell.draft.filter((num) => num !== value);
  }
};

export const getCandidates = (
  board: CellData[][],
  row: number,
  col: number
): number[] => {
  if (board[row][col].value !== null) return [];
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValid(board, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
};

// 深拷贝棋盘状态
export const deepCopyBoard = (board: CellData[][]): CellData[][] => {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      draft: [...cell.draft],
    }))
  );
};

// 记录操作历史的接口
interface BoardHistory {
  board: CellData[][];
  action: string;
  affectedCells?: { row: number; col: number }[];
  isOfficialDraft?: boolean;
}

// 创建一个新的 hook 来管理棋盘状态和历史
export const useSudokuBoard = (initialBoard: CellData[][]) => {
  const [board, setBoard] = useState<CellData[][]>(initialBoard);
  const [history, setHistory] = useState<BoardHistory[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const updateBoard = (
    newBoard: CellData[][],
    action: string,
    affectedCells?: { row: number; col: number }[],
    isOfficialDraft: boolean = false
  ) => {
    const newHistory = history.slice(0, currentStep + 1);
    newHistory.push({
      board: newBoard,
      action,
      affectedCells,
      isOfficialDraft,
    });
    setHistory(newHistory);
    setCurrentStep(newHistory.length - 1);
    setBoard(newBoard);
  };

  const undo = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      const prevBoard = deepCopyBoard(history[prevStep].board);
      const currentAction = history[currentStep].action;
      const isOfficialDraft = history[currentStep].isOfficialDraft;

      if (currentAction.startsWith("设置")) {
        const match = currentAction.match(/设置 \((\d+), (\d+)\)/);
        if (match) {
          const [, rowStr, colStr] = match;
          const row = parseInt(rowStr);
          const col = parseInt(colStr);

          // 恢复被修改的单元格
          prevBoard[row][col] = { ...history[prevStep].board[row][col] };

          // 如果是一键草稿操作，更新其他单元格的草稿数字
          if (isOfficialDraft) {
            for (let i = 0; i < 9; i++) {
              for (let j = 0; j < 9; j++) {
                if (i !== row || j !== col) {
                  prevBoard[i][j].draft = getCandidates(prevBoard, i, j);
                }
              }
            }
          }
        }
      }

      setCurrentStep(prevStep);
      setBoard(prevBoard);
    }
  };

  const redo = () => {
    if (currentStep < history.length - 1) {
      setCurrentStep(currentStep + 1);
      setBoard(deepCopyBoard(history[currentStep + 1].board));
    }
  };

  return { board, updateBoard, undo, redo, history, currentStep };
};

// 复制官方草稿
export const copyOfficialDraft = (board: CellData[][]): CellData[][] => {
  return board.map((row, rowIndex) =>
    row.map((cell, colIndex) => ({
      ...cell,
      draft: getCandidates(board, rowIndex, colIndex),
    }))
  );
};

// 给定两个坐标和候选数，判断是否为强连接
export const isStrongLink = (
  board: CellData[][],
  row1: number,
  col1: number,
  row2: number,
  col2: number,
  num: number
): boolean => {
  const cell1 = board[row1][col1];
  const cell2 = board[row2][col2];

  if (!cell1.draft?.includes(num) || !cell2.draft?.includes(num)) {
    return false;
  }

  const sameRow = row1 === row2;
  const sameCol = col1 === col2;
  const sameBox = Math.floor(row1 / 3) === Math.floor(row2 / 3) && Math.floor(col1 / 3) === Math.floor(col2 / 3);

  if (!sameRow && !sameCol && !sameBox) {
    return false;
  }

  if (cell1.draft?.length === 2 && cell2.draft?.length === 2) {
    const otherNum1 = cell1.draft?.find(n => n !== num);
    const otherNum2 = cell2.draft?.find(n => n !== num);
    if (otherNum1 === otherNum2) {
      return true;
    }
  }

  const a = cell1.draft?.find(n => n !== num);
  const b = cell2.draft?.find(n => n !== num);

  if (!a || !b) {
    return false;
  }

  const checkCell = (row: number, col: number): boolean => {
    if ((row === row1 && col === col1) || (row === row2 && col === col2)) {
      return false;
    }
    const cellC = board[row][col];
    return cellC.draft?.includes(num);
  };

  if (sameRow) {
    for (let col = 0; col < 9; col++) {
      if (checkCell(row1, col)) return false;
    }
  } else if (sameCol) {
    for (let row = 0; row < 9; row++) {
      if (checkCell(row, col1)) return false;
    }
  } else {
    const boxStartRow = Math.floor(row1 / 3) * 3;
    const boxStartCol = Math.floor(col1 / 3) * 3;
    for (let row = boxStartRow; row < boxStartRow + 3; row++) {
      for (let col = boxStartCol; col < boxStartCol + 3; col++) {
        if (checkCell(row, col)) return false;
      }
    }
  }

  return true;
};
