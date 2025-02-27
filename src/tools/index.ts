import { useCallback, useEffect, useState } from "react";
import { hiddenSingle, isUnitStrongLink } from "./solution";

export interface Position {
  row: number;
  col: number;
}

export interface Candidate extends Position {
  candidates: number[];
}

export interface GraphNode extends Candidate {
  next: GraphNode[];
}

export interface CellData {
  value: number | null;
  isGiven: boolean;
  draft: number[]; // 添加草稿数字数组
  highlightError?: string;
  highlights?: string[];
  highlightCandidates?: number[];
}

export interface Graph {
  [key: number]: GraphNode[];
}

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

export const solve = (standardBoard: CellData[][]): boolean => {
  const s = (board: CellData[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === null) {
          for (let num = 1; num <= 9; num++) {
            if (!standardBoard[row][col].draft.includes(num)) continue;
            if (isValid(board, row, col, num)) {
              console.log(row, col, num);
              
              board[row][col].value = num;
              if (s(board)) {
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
  return s(standardBoard);
};

export const solve2 = (standardBoard: CellData[][]): boolean => {
  const s = (board: CellData[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value === null) {
          for (let num = 9; num >= 1; num--) {
            if (!standardBoard[row][col].draft.includes(num)) continue;
            if (isValid(board, row, col, num)) {
              board[row][col].value = num;
              if (s(board)) {
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
  return s(standardBoard);
};

export const solve3 = (board: CellData[][]) => {
  const solveFunctions = [hiddenSingle];
  const getCounts = (board: CellData[][]) => {
    let counts = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col].value !== null) {
          counts++;
        }
      }
    }
    return counts;
  };

  let counts = getCounts(board);
  const standardBoard = copyOfficialDraft(board);

  firstWhile: while (true) {
    for (let i = 0; i < solveFunctions.length; i++) {
      const solveFunction = solveFunctions[i];
      let result = solveFunction(standardBoard, {}, {});

      if (result) {
        const { isFill, position, target } = result;
        position.forEach(({ row, col }) => {
          if (isFill) {
            counts++;
            if (counts === 81) {
              return standardBoard;
            }
            standardBoard[row][col].value = target[0];
            standardBoard[row][col].draft = [];

            // 更新受影响的单元格
            const affectedCells = updateRelatedCellsDraft(
              standardBoard,
              [{ row, col }],
              target[0],
              getCandidates
            );

            // 将受影响的单元格合并到 position 中
            position.push(...affectedCells);
          } else {
            standardBoard[row][col].draft =
              standardBoard[row][col].draft?.filter(
                (num) => !target.includes(num)
              ) ?? [];
          }
        });
        result = null;
        continue firstWhile;
      } else if (!result && i < solveFunctions.length - 1) {
        continue;
      } else {
        break firstWhile;
      }
    }
  }

  const board1 = deepCopyBoard(standardBoard);
  const board2 = deepCopyBoard(standardBoard);

  const solved2 = solve2(board2);

  if (isSameBoard(board1, board2)) {
    return standardBoard;
  }
  return null;
};


export const isHaveVoidDraft = (
  board: CellData[][],
  row: number,
  col: number
) => {
  // 检查行
  for (let i = 0; i < 9; i++) {
    if (board[row][i].value === null && board[row][i].draft?.length === 0) {
      return true;
    }
  }

  // 检查列
  for (let i = 0; i < 9; i++) {
    if (board[i][col].value === null && board[i][col].draft?.length === 0) {
      return true;
    }
  }

  // 检查宫
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const currentRow = boxRow + i;
      const currentCol = boxCol + j;
      if (
        board[currentRow][currentCol].value === null &&
        board[currentRow][currentCol].draft?.length === 0
      ) {
        return true;
      }
    }
  }

  return false;
};

// 检测数独解的情况
export const checkSolutionStatus = (
  board: CellData[][]
): "无解" | "有唯一解" | "有多解" => {
  const newBoard1 = deepCopyBoard(board);
  const newBoard2 = deepCopyBoard(board);

  // 正序填满棋盘
  const solved1 = solve(newBoard1);

  // 倒序填满棋盘
  const solved2 = solve2(newBoard2);

  if (!solved1 && !solved2) {
    return "无解";
  }

  if (isSameBoard(newBoard1, newBoard2)) {
    return "有唯一解";
  }

  return "有多解";
};

export const isSameBoard = (
  board1: CellData[][],
  board2: CellData[][]
): boolean => {
  return board1.every((row, rowIndex) =>
    row.every(
      (cell, colIndex) => cell.value === board2[rowIndex][colIndex].value
    )
  );
};

export const isValidBoard = (board: CellData[][]): boolean => {
  const newBoard1 = deepCopyBoard(board);
  const newBoard2 = deepCopyBoard(board);
  if (solve(newBoard1) && solve2(newBoard2)) {
    return isSameBoard(newBoard1, newBoard2);
  }
  return false;
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

export interface CandidateStats {
  count: number;
  positions: Candidate[];
}

// 修改 CandidateMap 接口
export interface CandidateMap {
  [key: number]: {
    row: Map<number, CandidateStats>;
    col: Map<number, CandidateStats>;
    box: Map<number, CandidateStats>;
    all: Candidate[];
  };
}

// 创建图结构
export const createGraph = (
  board: CellData[][],
  candidateMap: CandidateMap
): Graph => {
  const graph: Graph = {};

  for (let num = 1; num <= 9; num++) {
    const candidates = candidateMap[num]?.all ?? [];
    const subGraphs: GraphNode[][] = [];
    const visited: Map<string, Set<string>> = new Map();

    for (let i = 0; i < candidates.length; i++) {
      const startKey = `${candidates[i].row},${candidates[i].col}`;
      if (!visited.has(startKey)) {
        const subGraph: GraphNode[] = [];
        const queue: GraphNode[] = [
          {
            row: candidates[i].row,
            col: candidates[i].col,
            candidates: candidates[i].candidates,
            next: [],
          },
        ];
        visited.set(startKey, new Set());

        while (queue.length > 0) {
          const current = queue.shift()!;

          subGraph.push(current);

          for (let j = 0; j < candidates.length; j++) {
            const position1 = { row: current.row, col: current.col };
            const position2 = {
              row: candidates[j].row,
              col: candidates[j].col,
            };
            const key1 = `${position1.row},${position1.col}`;
            const key2 = `${position2.row},${position2.col}`;

            if (
              isUnitStrongLink(board, position1, position2, num, candidateMap)
            ) {
              let newNode = subGraph.find(
                (node) =>
                  node.row === position2.row && node.col === position2.col
              );

              if (!newNode) {
                newNode = {
                  row: position2.row,
                  col: position2.col,
                  candidates: candidates[j].candidates,
                  next: [],
                };
                subGraph.push(newNode);
              }

              if (
                !current.next.some(
                  (node) =>
                    node.row === newNode?.row && node.col === newNode?.col
                )
              ) {
                current.next.push(newNode);
              }

              if (
                !newNode.next.some(
                  (node) => node.row === current.row && node.col === current.col
                )
              ) {
                newNode.next.push(current);
              }

              if (!visited.has(key2) || !visited.get(key2)?.has(key1)) {
                queue.push(newNode);

                if (!visited.has(key2)) {
                  visited.set(key2, new Set());
                }
                visited.get(key2)?.add(key1);
              }

              if (!visited.has(key1) || !visited.get(key1)?.has(key2)) {
                if (!visited.has(key1)) {
                  visited.set(key1, new Set());
                }
                visited.get(key1)?.add(key2);
              }
            }
          }
        }

        if (subGraph.length) {
          const visitedNodes = new Set<string>();
          const queue = [subGraph[0]];
          let nodeCount = 0;

          while (queue.length > 0 && nodeCount < 3) {
            const currentNode = queue.shift();
            const nodeKey = `${currentNode?.row}-${currentNode?.col}`;

            if (!visitedNodes.has(nodeKey)) {
              visitedNodes.add(nodeKey);
              nodeCount++;

              currentNode?.next.forEach((nextNode) => {
                queue.push(nextNode);
              });
            }
          }

          if (nodeCount >= 2) {
            subGraphs.push(subGraph);
          }
        }
      }
    }

    if (subGraphs.length > 0) {
      graph[num] = subGraphs.map((subGraph) => subGraph[0]);
    }
  }

  return graph;
};

// 创建一个新的 hook 来管理棋盘状态和历史
export const useSudokuBoard = (initialBoard: CellData[][]) => {
  const [board, setBoard] = useState<CellData[][]>(initialBoard);
  const [answerBoard, setAnswerBoard] = useState<CellData[][]>(initialBoard);
  const [isSolved, setIsSolved] = useState<boolean>(false);
  const [history, setHistory] = useState<BoardHistory[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [candidateMap, setCandidateMap] = useState<CandidateMap>(() => {
    const initialCandidateMap: CandidateMap = {};
    for (let num = 1; num <= 9; num++) {
      initialCandidateMap[num] = {
        row: new Map(),
        col: new Map(),
        box: new Map(),
        all: [],
      };
    }
    return initialCandidateMap;
  });
  const [graph, setGraph] = useState<Graph>(() =>
    createGraph(initialBoard, candidateMap)
  );

  const updateCandidateMap = (newBoard: CellData[][]) => {
    const newCandidateMap: CandidateMap = {};
    for (let num = 1; num <= 9; num++) {
      newCandidateMap[num] = {
        row: new Map(),
        col: new Map(),
        box: new Map(),
        all: [],
      };
    }

    newBoard.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.value === null) {
          const boxIndex =
            Math.floor(rowIndex / 3) * 3 + Math.floor(colIndex / 3);
          const candidate: Candidate = {
            row: rowIndex,
            col: colIndex,
            candidates: cell.draft,
          };

          cell.draft.forEach((num) => {
            const updateStats = (
              map: Map<number, CandidateStats>,
              index: number
            ) => {
              const stats = map.get(index) ?? { count: 0, positions: [] };
              stats.count++;
              stats.positions.push(candidate);
              map.set(index, stats);
            };

            updateStats(newCandidateMap[num].row, rowIndex);
            updateStats(newCandidateMap[num].col, colIndex);
            updateStats(newCandidateMap[num].box, boxIndex);
            newCandidateMap[num].all.push(candidate);
          });
        }
      });
    });
    setGraph(createGraph(newBoard, newCandidateMap));
    setCandidateMap(newCandidateMap);
  };

  const updateBoard = (
    newBoard: CellData[][],
    action: string,
    affectedCells?: { row: number; col: number }[],
    isOfficialDraft: boolean = false,
    isRecord: boolean = true
  ) => {
    if (!isSolved) {
      const solvedBoard = newBoard.map((row) =>
        row.map((cell) => ({ ...cell }))
      );
      // solve(solvedBoard);
      setAnswerBoard(solvedBoard);
      setIsSolved(true);
    }
    if (isRecord) {
      // 如果填入正确值，清空历史记录并只保存当前操作
      setHistory([
        {
          board: newBoard,
          action,
          affectedCells,
          isOfficialDraft,
        },
      ]);
      setCurrentStep(0);
      // 其他操作保持原有逻辑
      const newHistory = history.slice(0, currentStep + 1);
      newHistory.push({
        board: newBoard,
        action,
        affectedCells,
        isOfficialDraft,
      });
      setHistory(newHistory);
      setCurrentStep(newHistory.length - 1);
    }
    setBoard(newBoard);
    updateCandidateMap(newBoard);
  };

  const undo = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      const previousBoard = history[newStep].board;
      setCurrentStep(newStep);
      setBoard(previousBoard);
      updateCandidateMap(previousBoard);
    }
  };

  const redo = () => {
    if (currentStep < history.length - 1) {
      const newStep = currentStep + 1;
      const nextBoard = history[newStep].board;
      setCurrentStep(newStep);
      setBoard(nextBoard);
      updateCandidateMap(nextBoard);
    }
  };

  // 添加清空历史记录的函数
  const clearHistory = useCallback(() => {
    // 保存当前棋盘状态作为唯一的历史记录
    const newHistory = [
      {
        board: board,
        action: "清空历史记录",
        affectedCells: [],
        isOfficialDraft: false,
      },
    ];
    setHistory(newHistory);
    setCurrentStep(0);
  }, [board]);

  return {
    board,
    updateBoard,
    undo,
    redo,
    history,
    currentStep,
    candidateMap,
    graph,
    answerBoard,
    clearHistory,
  };
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

// 检查两个格子是否在同一宫或行或列
export const areCellsInSameUnit = (cell1: Position, cell2: Position) => {
  // 检查是否在同一行
  const sameRow = cell1.row === cell2.row;

  // 检查是否在同一列
  const sameColumn = cell1.col === cell2.col;

  // 检查是否在同一宫
  const sameBox =
    Math.floor(cell1.row / 3) === Math.floor(cell2.row / 3) &&
    Math.floor(cell1.col / 3) === Math.floor(cell2.col / 3);

  return sameRow || sameColumn || sameBox;
};
