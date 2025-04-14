import { useCallback, useEffect, useRef, useState } from "react";
import { getGraphNodesArray, hiddenSingle, isUnitStrongLink } from "./solution";

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

export interface HyperGraphNode {
  cells: Candidate[];
  next: HyperGraphNode[];
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

export interface HyperGraph {
  [key: number]: HyperGraphNode[];
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

export const createHyperGraph = (
  board: CellData[][],
  candidateMap: CandidateMap
): HyperGraph => {
  const hyperGraph: HyperGraph = {};

  for (let num = 1; num <= 9; num++) {
    hyperGraph[num] = [];
    const candidates = candidateMap[num]?.all ?? [];
    if (candidates.length === 0) continue;

    // 单位置到超图节点的映射
    const nodeMap = new Map<string, HyperGraphNode>();
    // 多位置到超图节点的映射
    const multiNodeMap = new Map<string, HyperGraphNode>();

    // 为每个候选数位置创建单节点
    for (const candidate of candidates) {
      const key = `${candidate.row},${candidate.col}`;
      nodeMap.set(key, {
        cells: [
          {
            row: candidate.row,
            col: candidate.col,
            candidates: candidate.candidates,
          },
        ],
        next: [],
      });
    }

    // 第一步：识别单单强链接
    const strongLinks: [Candidate, Candidate][] = [];
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const pos1 = candidates[i];
        const pos2 = candidates[j];
        if (isUnitStrongLink(board, pos1, pos2, num, candidateMap)) {
          strongLinks.push([pos1, pos2]);

          // 建立单单强链接
          const key1 = `${pos1.row},${pos1.col}`;
          const key2 = `${pos2.row},${pos2.col}`;
          const node1 = nodeMap.get(key1);
          const node2 = nodeMap.get(key2);

          if (node1 && node2) {
            if (!node1.next.includes(node2)) {
              node1.next.push(node2);
            }
            if (!node2.next.includes(node1)) {
              node2.next.push(node1);
            }
          }
        }
      }
    }

    // 第二步：识别单多强链接

    // 处理行的单多强链接
    for (const [rowIndex, rowData] of candidateMap[num].row.entries()) {
      if (rowData.count >= 3 && rowData.count <= 4) {
        // 按宫分组
        const boxGroups = new Map<number, Candidate[]>();
        rowData.positions.forEach((pos) => {
          const boxIndex = Math.floor(pos.col / 3);
          if (!boxGroups.has(boxIndex)) {
            boxGroups.set(boxIndex, []);
          }
          boxGroups.get(boxIndex)!.push(pos);
        });

        // 为每个至少有2个候选数的宫创建多节点
        if (boxGroups.size !== 2) continue;
        boxGroups.forEach((cells, boxIndex) => {
          if (cells.length >= 2) {
            // 计算其他宫的单元格数量
            let remainingCellCount = 0;
            boxGroups.forEach((otherCells, otherBoxIndex) => {
              if (boxIndex !== otherBoxIndex) {
                remainingCellCount += otherCells.length;
              }
            });

            // 如果多元格+单元格等于行内候选数总数，才建立强链接
            if (cells.length + remainingCellCount === rowData.count) {
              const multiKey = cells
                .map((c) => `${c.row}-${c.col}`)
                .sort()
                .join(",");

              const multiNode: HyperGraphNode = {
                cells: cells,
                next: [],
              };
              multiNodeMap.set(multiKey, multiNode);

              // 连接该多节点与其他宫的单节点
              boxGroups.forEach((otherCells, otherBoxIndex) => {
                if (boxIndex !== otherBoxIndex && otherCells.length === 1) {
                  const singleCell = otherCells[0];
                  const singleKey = `${singleCell.row},${singleCell.col}`;
                  const singleNode = nodeMap.get(singleKey);

                  if (singleNode) {
                    if (!multiNode.next.includes(singleNode)) {
                      multiNode.next.push(singleNode);
                    }
                    if (!singleNode.next.includes(multiNode)) {
                      singleNode.next.push(multiNode);
                    }
                  }
                }
              });
            }
          }
        });
      }
    }

    // 处理列的单多强链接
    for (const [colIndex, colData] of candidateMap[num].col.entries()) {
      if (colData.count >= 3 && colData.count <= 4) {
        // 按宫分组
        const boxGroups = new Map<number, Candidate[]>();
        colData.positions.forEach((pos) => {
          const boxIndex = Math.floor(pos.row / 3);
          if (!boxGroups.has(boxIndex)) {
            boxGroups.set(boxIndex, []);
          }
          boxGroups.get(boxIndex)!.push(pos);
        });

        // 为每个至少有2个候选数的宫创建多节点
        if (boxGroups.size !== 2) continue;
        boxGroups.forEach((cells, boxIndex) => {
          if (cells.length >= 2) {
            // 计算其他宫的单元格数量
            let remainingCellCount = 0;
            boxGroups.forEach((otherCells, otherBoxIndex) => {
              if (boxIndex !== otherBoxIndex) {
                remainingCellCount += otherCells.length;
              }
            });

            // 如果多元格+单元格等于列内候选数总数，才建立强链接
            if (cells.length + remainingCellCount === colData.count) {
              const multiKey = cells
                .map((c) => `${c.row}-${c.col}`)
                .sort()
                .join(",");

              // 避免重复创建节点
              if (!multiNodeMap.has(multiKey)) {
                const multiNode: HyperGraphNode = {
                  cells: cells,
                  next: [],
                };
                multiNodeMap.set(multiKey, multiNode);
              }

              const multiNode = multiNodeMap.get(multiKey)!;

              // 连接该多节点与其他宫的单节点
              boxGroups.forEach((otherCells, otherBoxIndex) => {
                if (boxIndex !== otherBoxIndex && otherCells.length === 1) {
                  const singleCell = otherCells[0];
                  const singleKey = `${singleCell.row},${singleCell.col}`;
                  const singleNode = nodeMap.get(singleKey);

                  if (singleNode) {
                    if (!multiNode.next.includes(singleNode)) {
                      multiNode.next.push(singleNode);
                    }
                    if (!singleNode.next.includes(multiNode)) {
                      singleNode.next.push(multiNode);
                    }
                  }
                }
              });
            }
          }
        });
      }
    }

    // 处理宫的单多强链接
    for (const [boxIndex, boxData] of candidateMap[num].box.entries()) {
      if (boxData.count >= 3 && boxData.count <= 4) {
        // 按行分组
        const rowGroups = new Map<number, Candidate[]>();
        // 按列分组
        const colGroups = new Map<number, Candidate[]>();

        boxData.positions.forEach((pos) => {
          if (!rowGroups.has(pos.row)) {
            rowGroups.set(pos.row, []);
          }
          rowGroups.get(pos.row)!.push(pos);

          if (!colGroups.has(pos.col)) {
            colGroups.set(pos.col, []);
          }
          colGroups.get(pos.col)!.push(pos);
        });

        // 处理行分组中的单多强链接
        if (rowGroups.size !== 2) continue;
        rowGroups.forEach((cells, rowIndex) => {
          if (cells.length >= 2) {
            // 确保单多强链接的单元格和多元格总数等于宫内该候选数的总数
            let remainingCellCount = 0;
            rowGroups.forEach((otherCells, otherRowIndex) => {
              if (rowIndex !== otherRowIndex) {
                // 计算其他行的单元格总数
                remainingCellCount += otherCells.length;
              }
            });

            // 如果多元格+单元格等于宫内候选数总数，才建立强链接
            if (cells.length + remainingCellCount === boxData.count) {
              const multiKey = cells
                .map((c) => `${c.row}-${c.col}`)
                .sort()
                .join(",");

              // 避免重复创建节点
              if (!multiNodeMap.has(multiKey)) {
                const multiNode: HyperGraphNode = {
                  cells: cells,
                  next: [],
                };
                multiNodeMap.set(multiKey, multiNode);
              }

              const multiNode = multiNodeMap.get(multiKey)!;

              // 找出同宫内其他行的单个候选位置
              rowGroups.forEach((otherCells, otherRowIndex) => {
                if (rowIndex !== otherRowIndex && otherCells.length === 1) {
                  const singleCell = otherCells[0];
                  const singleKey = `${singleCell.row},${singleCell.col}`;
                  const singleNode = nodeMap.get(singleKey);

                  if (singleNode) {
                    if (!multiNode.next.includes(singleNode)) {
                      multiNode.next.push(singleNode);
                    }
                    if (!singleNode.next.includes(multiNode)) {
                      singleNode.next.push(multiNode);
                    }
                  }
                }
              });
            }
          }
        });

        // 处理列分组中的单多强链接
        if (colGroups.size !== 2) continue;
        colGroups.forEach((cells, colIndex) => {
          if (cells.length >= 2) {
            // 确保单多强链接的单元格和多元格总数等于宫内该候选数的总数
            let remainingCellCount = 0;
            colGroups.forEach((otherCells, otherColIndex) => {
              if (colIndex !== otherColIndex) {
                // 计算其他列的单元格总数
                remainingCellCount += otherCells.length;
              }
            });

            // 如果多元格+单元格等于宫内候选数总数，才建立强链接
            if (cells.length + remainingCellCount === boxData.count) {
              const multiKey = cells
                .map((c) => `${c.row}-${c.col}`)
                .sort()
                .join(",");

              // 避免重复创建节点
              if (!multiNodeMap.has(multiKey)) {
                const multiNode: HyperGraphNode = {
                  cells: cells,
                  next: [],
                };
                multiNodeMap.set(multiKey, multiNode);
              }

              const multiNode = multiNodeMap.get(multiKey)!;

              // 找出同宫内其他列的单个候选位置
              colGroups.forEach((otherCells, otherColIndex) => {
                if (colIndex !== otherColIndex && otherCells.length === 1) {
                  const singleCell = otherCells[0];
                  const singleKey = `${singleCell.row},${singleCell.col}`;
                  const singleNode = nodeMap.get(singleKey);

                  if (singleNode) {
                    if (!multiNode.next.includes(singleNode)) {
                      multiNode.next.push(singleNode);
                    }
                    if (!singleNode.next.includes(multiNode)) {
                      singleNode.next.push(multiNode);
                    }
                  }
                }
              });
            }
          }
        });
      }
    }

    // 处理行的多多强链接
    for (const [rowIndex, rowData] of candidateMap[num].row.entries()) {
      if (rowData.count >= 4) {
        // 至少需要4个候选数才能形成多多强链（每个多节点至少2个单元格）
        // 按宫分组
        const boxGroups = new Map<number, Candidate[]>();
        rowData.positions.forEach((pos) => {
          const boxIndex = Math.floor(pos.col / 3);
          if (!boxGroups.has(boxIndex)) {
            boxGroups.set(boxIndex, []);
          }
          boxGroups.get(boxIndex)!.push(pos);
        });

        // 必须至少有2个宫，且每个宫内至少有2个候选数
        if (boxGroups.size >= 2) {
          // 遍历所有可能的宫对组合
          const boxIndices = Array.from(boxGroups.keys());
          for (let i = 0; i < boxIndices.length; i++) {
            for (let j = i + 1; j < boxIndices.length; j++) {
              const boxIndex1 = boxIndices[i];
              const boxIndex2 = boxIndices[j];

              const cells1 = boxGroups.get(boxIndex1)!;
              const cells2 = boxGroups.get(boxIndex2)!;

              // 确保两个宫各自至少有2个候选数
              if (cells1.length >= 2 && cells2.length >= 2) {
                // 检查两个多节点总和是否等于行内候选数总数
                if (cells1.length + cells2.length === rowData.count) {
                  // 创建第一个多节点 - 添加row_前缀区分
                  const multiKey1 =
                    "row_" +
                    cells1
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey1)) {
                    const multiNode1: HyperGraphNode = {
                      cells: cells1,
                      next: [],
                    };
                    multiNodeMap.set(multiKey1, multiNode1);
                  }

                  // 创建第二个多节点 - 添加row_前缀区分
                  const multiKey2 =
                    "row_" +
                    cells2
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey2)) {
                    const multiNode2: HyperGraphNode = {
                      cells: cells2,
                      next: [],
                    };
                    multiNodeMap.set(multiKey2, multiNode2);
                  }

                  const multiNode1 = multiNodeMap.get(multiKey1)!;
                  const multiNode2 = multiNodeMap.get(multiKey2)!;

                  // 建立多多强链接
                  if (!multiNode1.next.includes(multiNode2)) {
                    multiNode1.next.push(multiNode2);
                  }
                  if (!multiNode2.next.includes(multiNode1)) {
                    multiNode2.next.push(multiNode1);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 处理列的多多强链接
    for (const [colIndex, colData] of candidateMap[num].col.entries()) {
      if (colData.count >= 4) {
        // 至少需要4个候选数才能形成多多强链（每个多节点至少2个单元格）
        // 按宫分组
        const boxGroups = new Map<number, Candidate[]>();
        colData.positions.forEach((pos) => {
          const boxIndex = Math.floor(pos.row / 3);
          if (!boxGroups.has(boxIndex)) {
            boxGroups.set(boxIndex, []);
          }
          boxGroups.get(boxIndex)!.push(pos);
        });

        // 必须至少有2个宫，且每个宫内至少有2个候选数
        if (boxGroups.size >= 2) {
          // 遍历所有可能的宫对组合
          const boxIndices = Array.from(boxGroups.keys());
          for (let i = 0; i < boxIndices.length; i++) {
            for (let j = i + 1; j < boxIndices.length; j++) {
              const boxIndex1 = boxIndices[i];
              const boxIndex2 = boxIndices[j];

              const cells1 = boxGroups.get(boxIndex1)!;
              const cells2 = boxGroups.get(boxIndex2)!;

              // 确保两个宫各自至少有2个候选数
              if (cells1.length >= 2 && cells2.length >= 2) {
                // 检查两个多节点总和是否等于列内候选数总数
                if (cells1.length + cells2.length === colData.count) {
                  // 创建第一个多节点 - 添加col_前缀区分
                  const multiKey1 =
                    "col_" +
                    cells1
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey1)) {
                    const multiNode1: HyperGraphNode = {
                      cells: cells1,
                      next: [],
                    };
                    multiNodeMap.set(multiKey1, multiNode1);
                  }

                  // 创建第二个多节点 - 添加col_前缀区分
                  const multiKey2 =
                    "col_" +
                    cells2
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey2)) {
                    const multiNode2: HyperGraphNode = {
                      cells: cells2,
                      next: [],
                    };
                    multiNodeMap.set(multiKey2, multiNode2);
                  }

                  const multiNode1 = multiNodeMap.get(multiKey1)!;
                  const multiNode2 = multiNodeMap.get(multiKey2)!;

                  // 建立多多强链接
                  if (!multiNode1.next.includes(multiNode2)) {
                    multiNode1.next.push(multiNode2);
                  }
                  if (!multiNode2.next.includes(multiNode1)) {
                    multiNode2.next.push(multiNode1);
                  }
                }
              }
            }
          }
        }
      }
    }

    // 处理宫的多多强链接
    for (const [boxIndex, boxData] of candidateMap[num].box.entries()) {
      if (boxData.count >= 4) {
        // 至少需要4个候选数才能形成多多强链（每个多节点至少2个单元格）
        // 按行分组
        const rowGroups = new Map<number, Candidate[]>();
        // 按列分组
        const colGroups = new Map<number, Candidate[]>();

        boxData.positions.forEach((pos) => {
          if (!rowGroups.has(pos.row)) {
            rowGroups.set(pos.row, []);
          }
          rowGroups.get(pos.row)!.push(pos);

          if (!colGroups.has(pos.col)) {
            colGroups.set(pos.col, []);
          }
          colGroups.get(pos.col)!.push(pos);
        });

        // 处理行分组中的多多强链接
        if (rowGroups.size >= 2) {
          // 遍历所有可能的行对组合
          const rowIndices = Array.from(rowGroups.keys());
          for (let i = 0; i < rowIndices.length; i++) {
            for (let j = i + 1; j < rowIndices.length; j++) {
              const rowIndex1 = rowIndices[i];
              const rowIndex2 = rowIndices[j];

              const cells1 = rowGroups.get(rowIndex1)!;
              const cells2 = rowGroups.get(rowIndex2)!;

              // 确保两个行各自至少有2个候选数
              if (cells1.length >= 2 && cells2.length >= 2) {
                // 检查两个多节点总和是否等于宫内候选数总数
                if (cells1.length + cells2.length === boxData.count) {
                  // 创建第一个多节点 - 添加前缀box_row_来区分
                  const multiKey1 =
                    "box_row_" +
                    cells1
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey1)) {
                    const multiNode1: HyperGraphNode = {
                      cells: cells1,
                      next: [],
                    };
                    multiNodeMap.set(multiKey1, multiNode1);
                  }

                  // 创建第二个多节点 - 添加前缀box_row_来区分
                  const multiKey2 =
                    "box_row_" +
                    cells2
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey2)) {
                    const multiNode2: HyperGraphNode = {
                      cells: cells2,
                      next: [],
                    };
                    multiNodeMap.set(multiKey2, multiNode2);
                  }

                  const multiNode1 = multiNodeMap.get(multiKey1)!;
                  const multiNode2 = multiNodeMap.get(multiKey2)!;

                  // 建立多多强链接
                  if (!multiNode1.next.includes(multiNode2)) {
                    multiNode1.next.push(multiNode2);
                  }
                  if (!multiNode2.next.includes(multiNode1)) {
                    multiNode2.next.push(multiNode1);
                  }
                }
              }
            }
          }
        }

        // 处理列分组中的多多强链接
        if (colGroups.size >= 2) {
          // 遍历所有可能的列对组合
          const colIndices = Array.from(colGroups.keys());
          for (let i = 0; i < colIndices.length; i++) {
            for (let j = i + 1; j < colIndices.length; j++) {
              const colIndex1 = colIndices[i];
              const colIndex2 = colIndices[j];

              const cells1 = colGroups.get(colIndex1)!;
              const cells2 = colGroups.get(colIndex2)!;

              // 确保两个列各自至少有2个候选数
              if (cells1.length >= 2 && cells2.length >= 2) {
                // 检查两个多节点总和是否等于宫内候选数总数
                if (cells1.length + cells2.length === boxData.count) {
                  // 创建第一个多节点 - 添加前缀box_col_来区分
                  const multiKey1 =
                    "box_col_" +
                    cells1
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey1)) {
                    const multiNode1: HyperGraphNode = {
                      cells: cells1,
                      next: [],
                    };
                    multiNodeMap.set(multiKey1, multiNode1);
                  }

                  // 创建第二个多节点 - 添加前缀box_col_来区分
                  const multiKey2 =
                    "box_col_" +
                    cells2
                      .map((c) => `${c.row}-${c.col}`)
                      .sort()
                      .join(",");

                  // 避免重复创建节点
                  if (!multiNodeMap.has(multiKey2)) {
                    const multiNode2: HyperGraphNode = {
                      cells: cells2,
                      next: [],
                    };
                    multiNodeMap.set(multiKey2, multiNode2);
                  }

                  const multiNode1 = multiNodeMap.get(multiKey1)!;
                  const multiNode2 = multiNodeMap.get(multiKey2)!;

                  // 建立多多强链接
                  if (!multiNode1.next.includes(multiNode2)) {
                    multiNode1.next.push(multiNode2);
                  }
                  if (!multiNode2.next.includes(multiNode1)) {
                    multiNode2.next.push(multiNode1);
                  }
                }
              }
            }
          }
        }

        // 处理行列交叉的多多强链接（实验性）
        // 这种情况是指宫内的一组位于同一行的单元格与另一组位于同一列的单元格形成的强链
        if (rowGroups.size >= 1 && colGroups.size >= 1) {
          for (const [rowIndex, rowCells] of rowGroups.entries()) {
            if (rowCells.length >= 2) {
              for (const [colIndex, colCells] of colGroups.entries()) {
                if (colCells.length >= 2) {
                  // 检查两组是否有重叠单元格
                  const rowCellsSet = new Set(
                    rowCells.map((c) => `${c.row},${c.col}`)
                  );
                  const colCellsSet = new Set(
                    colCells.map((c) => `${c.row},${c.col}`)
                  );

                  // 获取交集
                  const intersection = [...rowCellsSet].filter((key) =>
                    colCellsSet.has(key)
                  );

                  // 如果没有交集或交集很小，并且两组单元格总数（减去交集）等于宫内候选数总数
                  if (
                    (intersection.length === 0 || intersection.length === 1) &&
                    rowCells.length + colCells.length - intersection.length ===
                      boxData.count
                  ) {
                    // 创建不重叠的行单元格集合
                    const uniqueRowCells = rowCells.filter(
                      (c) => !intersection.includes(`${c.row},${c.col}`)
                    );

                    // 创建不重叠的列单元格集合
                    const uniqueColCells = colCells.filter(
                      (c) => !intersection.includes(`${c.row},${c.col}`)
                    );

                    if (
                      uniqueRowCells.length >= 2 &&
                      uniqueColCells.length >= 2
                    ) {
                      // 创建行多节点 - 添加前缀box_cross_row_来区分
                      const multiKeyRow =
                        "box_cross_row_" +
                        uniqueRowCells
                          .map((c) => `${c.row}-${c.col}`)
                          .sort()
                          .join(",");

                      // 避免重复创建节点
                      if (!multiNodeMap.has(multiKeyRow)) {
                        const multiNodeRow: HyperGraphNode = {
                          cells: uniqueRowCells,
                          next: [],
                        };
                        multiNodeMap.set(multiKeyRow, multiNodeRow);
                      }

                      // 创建列多节点 - 添加前缀box_cross_col_来区分
                      const multiKeyCol =
                        "box_cross_col_" +
                        uniqueColCells
                          .map((c) => `${c.row}-${c.col}`)
                          .sort()
                          .join(",");

                      // 避免重复创建节点
                      if (!multiNodeMap.has(multiKeyCol)) {
                        const multiNodeCol: HyperGraphNode = {
                          cells: uniqueColCells,
                          next: [],
                        };
                        multiNodeMap.set(multiKeyCol, multiNodeCol);
                      }

                      const multiNodeRow = multiNodeMap.get(multiKeyRow)!;
                      const multiNodeCol = multiNodeMap.get(multiKeyCol)!;

                      // 建立多多强链接
                      if (!multiNodeRow.next.includes(multiNodeCol)) {
                        multiNodeRow.next.push(multiNodeCol);
                      }
                      if (!multiNodeCol.next.includes(multiNodeRow)) {
                        multiNodeCol.next.push(multiNodeRow);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 将所有连通的节点集加入超图
    const visited = new Set<HyperGraphNode>();
    const allNodes = [...nodeMap.values(), ...multiNodeMap.values()];

    // 第一步：清理所有节点的next列表，确保没有自引用
    for (const node of allNodes) {
      node.next = node.next.filter(next => next !== node);
    }

    // 第二步：创建按单元格内容分组的映射
    const cellsContentMap = new Map<string, HyperGraphNode[]>();

    // 基于单元格内容而非前缀分组，这样可以找到具有相同单元格的所有节点
    allNodes.forEach(node => {
      const cellsContent = node.cells
        .map(cell => `${cell.row},${cell.col}`)
        .sort()
        .join('|');
      
      if (!cellsContentMap.has(cellsContent)) {
        cellsContentMap.set(cellsContent, []);
      }
      cellsContentMap.get(cellsContent)!.push(node);
    });

    // 第三步：合并具有相同单元格内容的节点的连接
    for (const [cellsContent, nodes] of cellsContentMap.entries()) {
      if (nodes.length > 1) {
        // 首先，收集所有这些节点的next引用
        const allNextNodes = new Set<HyperGraphNode>();
        nodes.forEach(node => {
          node.next.forEach(next => {
            if (next !== node) {  // 防止自引用
              allNextNodes.add(next);
            }
          });
        });

        // 然后，确保每个节点都连接到所有收集到的next节点
        nodes.forEach(node => {
          // 清空当前next列表
          node.next = [];
          
          // 添加所有非自引用的next节点
          allNextNodes.forEach(next => {
            if (next !== node) {  // 再次检查以防止自引用
              node.next.push(next);
            }
          });

          // 还要添加与其共享单元格内容但不是自身的节点
          nodes.forEach(otherNode => {
            if (otherNode !== node && !node.next.includes(otherNode)) {
              node.next.push(otherNode);
            }
          });
        });
      }
    }

    // 第四步和第五步的改进实现：通过比较cells内容而非引用来判断节点是否相同

    // 辅助函数：生成节点的cells的唯一标识
    const getCellsSignature = (node: HyperGraphNode): string => {
      return node.cells
        .map(cell => `${cell.row},${cell.col}`)
        .sort()
        .join('|');
    };

    // 辅助函数：检查两个节点是否代表相同的cells组合
    const isSameNodeCells = (node1: HyperGraphNode, node2: HyperGraphNode): boolean => {
      const sig1 = getCellsSignature(node1);
      const sig2 = getCellsSignature(node2);
      return sig1 === sig2;
    };

    // 第四步：修复所有互相引用并去除重复节点
    for (const nodeA of allNodes) {
      // 使用Map来存储唯一的next节点，键是cells内容的标识
      const uniqueNextNodes = new Map<string, HyperGraphNode>();
      
      // 收集所有唯一的next节点，忽略自身
      nodeA.next.forEach(nextNode => {
        // 检查是否是自引用（基于cells内容而非引用）
        if (!isSameNodeCells(nodeA, nextNode)) {
          const signature = getCellsSignature(nextNode);
          uniqueNextNodes.set(signature, nextNode);
        }
      });
      
      // 重置next列表，只包含唯一的next节点
      nodeA.next = Array.from(uniqueNextNodes.values());
    }

    // 第五步：确保互相引用
    for (const nodeA of allNodes) {
      for (const nodeB of allNodes) {
        // 跳过相同的节点（基于cells内容）
        if (isSameNodeCells(nodeA, nodeB)) continue;
        
        // 检查nodeA的next是否包含nodeB
        const nodeAHasNodeB = nodeA.next.some(next => isSameNodeCells(next, nodeB));
        
        // 检查nodeB的next是否包含nodeA
        const nodeBHasNodeA = nodeB.next.some(next => isSameNodeCells(next, nodeA));
        
        // 如果一方包含另一方，但另一方不包含一方，则添加互相引用
        if (nodeAHasNodeB && !nodeBHasNodeA) {
          nodeB.next.push(nodeA);
        } else if (!nodeAHasNodeB && nodeBHasNodeA) {
          nodeA.next.push(nodeB);
        }
      }
    }

    // 第六步：再次清理所有节点的next列表，确保没有重复项和自引用
    for (const node of allNodes) {
      // 使用Map来去除重复节点（基于cells内容）
      const uniqueNext = new Map<string, HyperGraphNode>();
      
      node.next.forEach(nextNode => {
        // 跳过自引用
        if (!isSameNodeCells(node, nextNode)) {
          const signature = getCellsSignature(nextNode);
          uniqueNext.set(signature, nextNode);
        }
      });
      
      node.next = Array.from(uniqueNext.values());
    }

    // 第七步：使用BFS找出所有连通组件
    for (const node of allNodes) {
      if (!visited.has(node)) {
        const component: HyperGraphNode[] = [];
        const queue: HyperGraphNode[] = [node];
        const componentVisited = new Set<HyperGraphNode>();

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (componentVisited.has(current)) continue;

          componentVisited.add(current);
          component.push(current);
          visited.add(current);

          for (const next of current.next) {
            if (next !== current && !componentVisited.has(next)) {
              queue.push(next);
            }
          }
        }

        // 只有当连通分量中至少有2个节点时才加入超图
        if (component.length >= 2) {
          hyperGraph[num].push(component[0]);
        }
      }
    }
  }

  return hyperGraph;
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
  const graphRef = useRef<Graph>(createGraph(initialBoard, candidateMap));
  const hyperGraphRef = useRef<HyperGraph>(
    createHyperGraph(initialBoard, candidateMap)
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
    graphRef.current = createGraph(newBoard, newCandidateMap);
    hyperGraphRef.current = createHyperGraph(newBoard, newCandidateMap);
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
    graph: graphRef.current,
    hyperGraph: hyperGraphRef.current,
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
