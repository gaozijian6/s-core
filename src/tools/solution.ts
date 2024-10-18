import { SOLUTION_METHODS } from "../constans";
import { areCellsInSameUnit } from "./index";
import type {
  CandidateMap,
  CandidateStats,
  CellData,
  Graph,
  GraphNode,
  Position,
  Candidate,
} from "./index";

export interface Result {
  // 是否填入数字,true:在position[0]位置填入target数字,false:删除position里所有的值为target的候选数字
  isFill: boolean;
  // 要填入的位置或删除候选数字的位置
  position: Position[];
  // prompt记录根据哪些方格推导出要删除哪些方格候选数字
  prompt: Position[];
  method: string;
  target: number[];
}

// 唯一余数法
export const singleCandidate = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.length === 1) {
        return {
          position: [{ row, col }],
          prompt: [{ row, col }], // 在这种情况下，prompt 与 position 相同
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
export const hiddenSingle = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
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
          prompt: cols.map((col) => ({ row, col })), // 添加 prompt
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
          prompt: rows.map((row) => ({ row, col })), // 添加 prompt
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
            prompt: cells, // 添加 prompt
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
export const blockElimination = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查每个3x3宫格
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxCandidates: { [key: number]: { row: number; col: number }[] } =
        {};

      // 收集宫内每个数字的候选位置
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

      // 检查每个候选数字
      for (const [num, cells] of Object.entries(boxCandidates)) {
        const rows = new Set(cells.map((cell) => cell.row));
        const cols = new Set(cells.map((cell) => cell.col));

        // 区块摒除法（行）
        if (rows.size === 1) {
          const targetRow = Array.from(rows)[0];
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 9; i++) {
            if (Math.floor(i / 3) !== boxCol) {
              const cell = board[targetRow]?.[i];
              if (
                cell?.value === null &&
                cell?.draft?.includes?.(Number(num))
              ) {
                positionsToRemove.push({ row: targetRow, col: i });
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells,
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_ROW,
              target: [Number(num)],
              isFill: false,
            };
          }
        }

        // 区块摒除法（列）
        if (cols.size === 1) {
          const targetCol = Array.from(cols)[0];
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 9; i++) {
            if (Math.floor(i / 3) !== boxRow) {
              const cell = board[i]?.[targetCol];
              if (
                cell?.value === null &&
                cell?.draft?.includes?.(Number(num))
              ) {
                positionsToRemove.push({ row: i, col: targetCol });
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells,
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_COLUMN,
              target: [Number(num)],
              isFill: false,
            };
          }
        }
      }
    }
  }

  // 检查每一行
  for (let row = 0; row < 9; row++) {
    const rowCandidates: { [key: number]: { col: number }[] } = {};
    for (let col = 0; col < 9; col++) {
      if (board[row]?.[col]?.value === null) {
        board[row]?.[col]?.draft?.forEach((num) => {
          rowCandidates[num] = rowCandidates[num] || [];
          rowCandidates[num].push({ col });
        });
      }
    }

    for (const [num, cells] of Object.entries(rowCandidates)) {
      if (cells.length >= 2 && cells.length <= 3) {
        const boxCol = Math.floor(cells[0].col / 3);
        if (cells.every((cell) => Math.floor(cell.col / 3) === boxCol)) {
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const checkRow = Math.floor(row / 3) * 3 + i;
              const checkCol = boxCol * 3 + j;
              if (checkRow !== row) {
                const cell = board[checkRow]?.[checkCol];
                if (
                  cell?.value === null &&
                  cell?.draft?.includes?.(Number(num))
                ) {
                  positionsToRemove.push({ row: checkRow, col: checkCol });
                }
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells.map((cell) => ({ row, col: cell.col })),
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_ROW,
              target: [Number(num)],
              isFill: false,
            };
          }
        }
      }
    }
  }

  // 检查每一列
  for (let col = 0; col < 9; col++) {
    const colCandidates: { [key: number]: { row: number }[] } = {};
    for (let row = 0; row < 9; row++) {
      if (board[row]?.[col]?.value === null) {
        board[row]?.[col]?.draft?.forEach((num) => {
          colCandidates[num] = colCandidates[num] || [];
          colCandidates[num].push({ row });
        });
      }
    }

    for (const [num, cells] of Object.entries(colCandidates)) {
      if (cells.length >= 2 && cells.length <= 3) {
        const boxRow = Math.floor(cells[0].row / 3);
        if (cells.every((cell) => Math.floor(cell.row / 3) === boxRow)) {
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const checkRow = boxRow * 3 + i;
              const checkCol = Math.floor(col / 3) * 3 + j;
              if (checkCol !== col) {
                const cell = board[checkRow]?.[checkCol];
                if (
                  cell?.value === null &&
                  cell?.draft?.includes?.(Number(num))
                ) {
                  positionsToRemove.push({ row: checkRow, col: checkCol });
                }
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells.map((cell) => ({ row: cell.row, col })),
              method: SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_COLUMN,
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
export const nakedPair = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 遍历所有数字的候选位置
  for (let num = 1; num <= 9; num++) {
    const candidates = candidateMap[num]?.all ?? [];

    // 找到只有两个候选数的方格
    const pairCandidates = candidates.filter(
      (cell) => cell.candidates.length === 2
    );

    for (let i = 0; i < pairCandidates.length; i++) {
      const cell1 = pairCandidates[i];
      const [num1, num2] = cell1.candidates;

      // 检查行、列、宫
      const units = [
        { type: "row", value: cell1.row },
        { type: "col", value: cell1.col },
        {
          type: "box",
          value: Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3),
        },
      ];

      for (const unit of units) {
        const unitCells =
          (
            candidateMap[num][
              unit.type as keyof (typeof candidateMap)[number]
            ] as Map<number, CandidateStats>
          )?.get?.(unit.value)?.positions ?? [];
        // 在同一单元中找到另一个具有相同候选数的方格
        const cell2 = unitCells.find(
          (c) =>
            (c.row !== cell1.row || c.col !== cell1.col) &&
            c.candidates.length === 2 &&
            c.candidates.includes(num1) &&
            c.candidates.includes(num2)
        );

        if (cell2) {
          // 找到受影响的方格
          const affectedCells = [];
          for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
              if (
                (i !== cell1.row || j !== cell1.col) &&
                (i !== cell2.row || j !== cell2.col) &&
                ((unit.type === "row" && i === cell1.row) ||
                  (unit.type === "col" && j === cell1.col) ||
                  (unit.type === "box" &&
                    Math.floor(i / 3) === Math.floor(cell1.row / 3) &&
                    Math.floor(j / 3) === Math.floor(cell1.col / 3)))
              ) {
                const cell = board[i][j];
                if (
                  cell.value === null &&
                  (cell.draft.includes(num1) || cell.draft.includes(num2))
                ) {
                  affectedCells.push({
                    row: i,
                    col: j,
                    candidates: cell.draft,
                  });
                }
              }
            }
          }

          if (affectedCells.length > 0) {
            const position = affectedCells.map((c) => ({
              row: c.row,
              col: c.col,
            }));
            const prompt = [
              { row: cell1.row, col: cell1.col },
              { row: cell2.row, col: cell2.col },
            ];
            const getMethodKey = (unitType: string): string => {
              switch (unitType) {
                case "row":
                  return "ROW";
                case "col":
                  return "COLUMN";
                case "box":
                  return "BOX";
                default:
                  return unitType.toUpperCase();
              }
            };
            const method =
              SOLUTION_METHODS[
                `NAKED_PAIR_${getMethodKey(
                  unit.type
                )}` as keyof typeof SOLUTION_METHODS
              ];
            const target = [num1, num2];

            return {
              position,
              prompt,
              method,
              target,
              isFill: false,
            };
          }
        }
      }
    }
  }

  return null;
};

// 显性三数对法1
export const nakedTriple1 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkNakedTriple1(board, "row");
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkNakedTriple1(board, "col");
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkNakedTriple1(board, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkNakedTriple1 = (
  board: CellData[][],
  unitType: "row" | "col" | "box"
): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    const cellsWithCandidates: { pos: Position; candidates: number[] }[] = [];

    // 收集单元内的候选数和位置
    for (let i = 0; i < 9; i++) {
      const [row, col] =
        unitType === "row"
          ? [unit, i]
          : unitType === "col"
          ? [i, unit]
          : [
              Math.floor(unit / 3) * 3 + Math.floor(i / 3),
              (unit % 3) * 3 + (i % 3),
            ];
      const cell = board[row]?.[col];
      if (
        cell?.value === null &&
        cell.draft?.length >= 2 &&
        cell.draft?.length <= 3
      ) {
        cellsWithCandidates.push({ pos: { row, col }, candidates: cell.draft });
      }
    }

    // 检查所有可能的三个格子组合
    for (let i = 0; i < cellsWithCandidates.length - 2; i++) {
      for (let j = i + 1; j < cellsWithCandidates.length - 1; j++) {
        for (let k = j + 1; k < cellsWithCandidates.length; k++) {
          const cellA = cellsWithCandidates[i];
          const cellB = cellsWithCandidates[j];
          const cellC = cellsWithCandidates[k];

          const uniqueCandidates = [
            ...new Set([
              ...cellA.candidates,
              ...cellB.candidates,
              ...cellC.candidates,
            ]),
          ];

          if (uniqueCandidates.length === 3) {
            const [a, b, c] = uniqueCandidates;

            // 检查是否满足显性三数对法1的条件
            const hasThreeCandidates =
              cellA.candidates.length === 3 ||
              cellB.candidates.length === 3 ||
              cellC.candidates.length === 3;
            const hasTwoDifferentPairs =
              (cellA.candidates.length === 2 &&
                cellB.candidates.length === 2 &&
                !cellA.candidates.every((num) =>
                  cellB.candidates.includes(num)
                )) ||
              (cellA.candidates.length === 2 &&
                cellC.candidates.length === 2 &&
                !cellA.candidates.every((num) =>
                  cellC.candidates.includes(num)
                )) ||
              (cellB.candidates.length === 2 &&
                cellC.candidates.length === 2 &&
                !cellB.candidates.every((num) =>
                  cellC.candidates.includes(num)
                ));

            if (hasThreeCandidates && hasTwoDifferentPairs) {
              const affectedPositions: Position[] = [];
              const prompt: Position[] = [cellA.pos, cellB.pos, cellC.pos];

              // 检查其他格子是否受影响
              for (let m = 0; m < 9; m++) {
                const [row, col] =
                  unitType === "row"
                    ? [unit, m]
                    : unitType === "col"
                    ? [m, unit]
                    : [
                        Math.floor(unit / 3) * 3 + Math.floor(m / 3),
                        (unit % 3) * 3 + (m % 3),
                      ];
                const cell = board[row]?.[col];
                if (
                  cell?.value === null &&
                  !prompt.some((p) => p.row === row && p.col === col) &&
                  cell.draft?.some((num) => [a, b, c].includes(num))
                ) {
                  affectedPositions.push({ row, col });
                }
              }

              if (affectedPositions.length > 0) {
                const getMethodKey = (unitType: string): string => {
                  switch (unitType) {
                    case "row":
                      return "ROW1";
                    case "col":
                      return "COLUMN1";
                    case "box":
                      return "BOX1";
                    default:
                      return unitType.toUpperCase();
                  }
                };

                const method =
                  SOLUTION_METHODS[
                    `NAKED_TRIPLE_${getMethodKey(
                      unitType
                    )}` as keyof typeof SOLUTION_METHODS
                  ];

                return {
                  position: affectedPositions,
                  prompt,
                  method,
                  target: uniqueCandidates,
                  isFill: false,
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
};

// 显性三数对法2
export const nakedTriple2 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  const rowResult = checkNakedTriple2(board, "row");
  if (rowResult) return rowResult;

  const colResult = checkNakedTriple2(board, "col");
  if (colResult) return colResult;

  const boxResult = checkNakedTriple2(board, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkNakedTriple2 = (
  board: CellData[][],
  unitType: "row" | "col" | "box"
): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    const cellsWithCandidates: { pos: Position; candidates: number[] }[] = [];

    for (let i = 0; i < 9; i++) {
      const [row, col] =
        unitType === "row"
          ? [unit, i]
          : unitType === "col"
          ? [i, unit]
          : [
              Math.floor(unit / 3) * 3 + Math.floor(i / 3),
              (unit % 3) * 3 + (i % 3),
            ];
      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.length === 2) {
        cellsWithCandidates.push({ pos: { row, col }, candidates: cell.draft });
      }
    }

    for (let i = 0; i < cellsWithCandidates.length - 2; i++) {
      for (let j = i + 1; j < cellsWithCandidates.length - 1; j++) {
        for (let k = j + 1; k < cellsWithCandidates.length; k++) {
          const cellA = cellsWithCandidates[i];
          const cellB = cellsWithCandidates[j];
          const cellC = cellsWithCandidates[k];

          const uniqueCandidates = [
            ...new Set([
              ...cellA.candidates,
              ...cellB.candidates,
              ...cellC.candidates,
            ]),
          ];

          if (uniqueCandidates.length === 3) {
            const [a, b, c] = uniqueCandidates;
            const affectedPositions: Position[] = [];
            const prompt: Position[] = [cellA.pos, cellB.pos, cellC.pos];

            for (let m = 0; m < 9; m++) {
              const [row, col] =
                unitType === "row"
                  ? [unit, m]
                  : unitType === "col"
                  ? [m, unit]
                  : [
                      Math.floor(unit / 3) * 3 + Math.floor(m / 3),
                      (unit % 3) * 3 + (m % 3),
                    ];
              const cell = board[row]?.[col];
              if (
                cell?.value === null &&
                !prompt.some((p) => p.row === row && p.col === col) &&
                cell.draft?.some((num) => [a, b, c].includes(num))
              ) {
                affectedPositions.push({ row, col });
              }
            }

            if (affectedPositions.length > 0) {
              const getMethodKey = (unitType: string): string => {
                switch (unitType) {
                  case "row":
                    return "ROW2";
                  case "col":
                    return "COLUMN2";
                  case "box":
                    return "BOX2";
                  default:
                    return unitType.toUpperCase();
                }
              };
              const method =
                SOLUTION_METHODS[
                  `NAKED_TRIPLE_${getMethodKey(
                    unitType
                  )}` as keyof typeof SOLUTION_METHODS
                ];

              return {
                position: affectedPositions,
                prompt,
                method,
                target: uniqueCandidates,
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
export const hiddenPair = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkHiddenPair(board, candidateMap, "row");
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkHiddenPair(board, candidateMap, "col");
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkHiddenPair(board, candidateMap, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkHiddenPair = (
  board: CellData[][],
  candidateMap: CandidateMap,
  unitType: "row" | "col" | "box"
): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    for (let num1 = 1; num1 <= 8; num1++) {
      for (let num2 = num1 + 1; num2 <= 9; num2++) {
        const positions1 =
          candidateMap[num1][unitType].get(unit)?.positions ?? [];
        const positions2 =
          candidateMap[num2][unitType].get(unit)?.positions ?? [];

        if (positions1.length === 2 && positions2.length === 2) {
          const pair = positions1.filter((pos1) =>
            positions2.some(
              (pos2) => pos1.row === pos2.row && pos1.col === pos2.col
            )
          );

          if (pair.length === 2) {
            const affectedPositions: Position[] = [];
            const prompt: Position[] = [];
            const targetNumbers: number[] = [];

            pair.forEach((pos) => {
              const cell = board[pos.row][pos.col];
              const otherCandidates =
                cell.draft?.filter((n) => n !== num1 && n !== num2) ?? [];
              if (otherCandidates.length > 0) {
                affectedPositions.push(pos);
                targetNumbers.push(...otherCandidates);
              }
              prompt.push(pos);
            });

            if (affectedPositions.length > 0) {
              const getMethodKey = (unitType: string): string => {
                switch (unitType) {
                  case "row":
                    return "ROW";
                  case "col":
                    return "COLUMN";
                  case "box":
                    return "BOX";
                  default:
                    return unitType.toUpperCase();
                }
              };

              return {
                position: affectedPositions,
                prompt,
                method:
                  SOLUTION_METHODS[
                    `HIDDEN_PAIR_${getMethodKey(
                      unitType
                    )}` as keyof typeof SOLUTION_METHODS
                  ],
                target: [...new Set(targetNumbers)],
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

// 隐形三数对1
export const hiddenTriple1 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkHiddenTriple1(board, candidateMap, "row");
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkHiddenTriple1(board, candidateMap, "col");
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkHiddenTriple1(board, candidateMap, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkHiddenTriple1 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  unitType: "row" | "col" | "box"
): Result | null => {
  if (unitType === "row") {
    for (let num = 1; num <= 9; num++) {
      for (let row = 0; row < 9; row++) {
        const CandidateStats = candidateMap[num][unitType].get(row);
        if (CandidateStats?.count === 3) {
          const candidateCells = CandidateStats.positions;
          const candidates: number[] = [];
          candidateCells.forEach((cell) => {
            candidates.push(...board[cell.row][cell.col].draft);
          });
          const uniqueCandidates = [...new Set(candidates)];
          let n = 0;
          let target: number[] = [num];
          if (uniqueCandidates.length <= 3) continue;
          uniqueCandidates.forEach((candidate) => {
            if (candidate === num) return;
            if (
              candidateMap[candidate][unitType].get(row)?.count === 2 &&
              candidateMap[candidate][unitType]
                .get(row)
                ?.positions.every((pos) => {
                  if (
                    CandidateStats.positions.some(
                      (p) => p.row === pos.row && p.col === pos.col
                    )
                  ) {
                    return true;
                  }
                  return false;
                })
            ) {
              n++;
              target.push(candidate);
            }
          });
          if (n === 2) {
            return {
              position: CandidateStats.positions,
              prompt: CandidateStats.positions,
              target: candidates.filter((c) => !target.includes(c)),
              method: SOLUTION_METHODS.HIDDEN_TRIPLE_ROW1,
              isFill: false,
            };
          }
        }
      }
    }
  }

  if (unitType === "col") {
    for (let num = 1; num <= 9; num++) {
      for (let col = 0; col < 9; col++) {
        const CandidateStats = candidateMap[num][unitType].get(col);
        if (CandidateStats?.count === 3) {
          const candidateCells = CandidateStats.positions;
          const candidates: number[] = [];
          candidateCells.forEach((cell) => {
            candidates.push(...board[cell.row][cell.col].draft);
          });
          const uniqueCandidates = [...new Set(candidates)];
          let n = 0;
          let target: number[] = [num];
          if (uniqueCandidates.length <= 3) continue;
          uniqueCandidates.forEach((candidate) => {
            if (candidate === num) return;
            if (
              candidateMap[candidate][unitType].get(col)?.count === 2 &&
              candidateMap[candidate][unitType]
                .get(col)
                ?.positions.every((pos) => {
                  if (
                    CandidateStats.positions.some(
                      (p) => p.row === pos.row && p.col === pos.col
                    )
                  ) {
                    return true;
                  }
                  return false;
                })
            ) {
              n++;
              target.push(candidate);
            }
          });
          if (n === 2) {
            return {
              position: CandidateStats.positions,
              prompt: CandidateStats.positions,
              target: candidates.filter((c) => !target.includes(c)),
              method: SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN1,
              isFill: false,
            };
          }
        }
      }
    }
  }

  if (unitType === "box") {
    for (let num = 1; num <= 9; num++) {
      for (let box = 0; box < 9; box++) {
        const CandidateStats = candidateMap[num][unitType].get(box);
        if (CandidateStats?.count === 3) {
          const candidateCells = CandidateStats.positions;
          const candidates: number[] = [];
          candidateCells.forEach((cell) => {
            candidates.push(...board[cell.row][cell.col].draft);
          });
          const uniqueCandidates = [...new Set(candidates)];
          let n = 0;
          let target: number[] = [num];
          if (uniqueCandidates.length <= 3) continue;
          uniqueCandidates.forEach((candidate) => {
            if (candidate === num) return;
            if (
              candidateMap[candidate][unitType].get(box)?.count === 2 &&
              candidateMap[candidate][unitType]
                .get(box)
                ?.positions.every((pos) => {
                  if (
                    CandidateStats.positions.some(
                      (p) => p.row === pos.row && p.col === pos.col
                    )
                  ) {
                    return true;
                  }
                  return false;
                })
            ) {
              n++;
              target.push(candidate);
            }
          });
          if (n === 2) {
            return {
              position: CandidateStats.positions,
              prompt: CandidateStats.positions,
              target: candidates.filter((c) => !target.includes(c)),
              method: SOLUTION_METHODS.HIDDEN_TRIPLE_BOX1,
              isFill: false,
            };
          }
        }
      }
    }
  }

  return null;
};

// 隐形三数对2
export const hiddenTriple2 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkHiddenTriple2(board, candidateMap, "row");
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkHiddenTriple2(board, candidateMap, "col");
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkHiddenTriple2(board, candidateMap, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkHiddenTriple2 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  unitType: "row" | "col" | "box"
): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const candidatePairs: [number, number, CandidateStats][] = [];

    candidates.forEach((candidate) => {
      const stats = candidateMap[candidate][unitType].get(unit);
      if (stats?.count === 2) {
        candidatePairs.push([candidate, stats.count, stats]);
      }
    });

    if (candidatePairs.length >= 3) {
      for (let i = 0; i < candidatePairs.length - 2; i++) {
        for (let j = i + 1; j < candidatePairs.length - 1; j++) {
          for (let k = j + 1; k < candidatePairs.length; k++) {
            const [a, , statsA] = candidatePairs[i];
            const [b, , statsB] = candidatePairs[j];
            const [c, , statsC] = candidatePairs[k];

            const allPositions = new Set([
              ...statsA.positions,
              ...statsB.positions,
              ...statsC.positions,
            ]);

            if (allPositions.size === 3) {
              const positionsArray = Array.from(allPositions);
              if (
                positionsArray.every((pos) => {
                  const cell = board[pos.row][pos.col];
                  const candidatesInCell = [a, b, c].filter((num) =>
                    cell.draft.includes(num)
                  );
                  return candidatesInCell.length === 2;
                })
              ) {
                const otherCandidates = positionsArray.flatMap((pos) => {
                  const cell = board[pos.row][pos.col];
                  return cell.draft.filter((num) => ![a, b, c].includes(num));
                });

                if (otherCandidates.length > 0) {
                  const getMethodKey = (unitType: string): string => {
                    switch (unitType) {
                      case "row":
                        return "ROW";
                      case "col":
                        return "COLUMN";
                      case "box":
                        return "BOX";
                      default:
                        return unitType.toUpperCase();
                    }
                  };
                  const method =
                    SOLUTION_METHODS[
                      `HIDDEN_TRIPLE_${getMethodKey(
                        unitType
                      )}2` as keyof typeof SOLUTION_METHODS
                    ];
                  return {
                    position: positionsArray,
                    prompt: positionsArray,
                    target: otherCandidates,
                    method,
                    isFill: false,
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
};
// X-Wing
export const xWing = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkXWing(board, true);
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkXWing(board, false);
  if (colResult) return colResult;

  return null;
};

const checkXWing = (board: CellData[][], isRow: boolean): Result | null => {
  for (let num = 1; num <= 9; num++) {
    const candidatePositions: Position[][] = [];

    // 收集候选数字位置
    for (let i = 0; i < 9; i++) {
      const positions: Position[] = [];
      for (let j = 0; j < 9; j++) {
        const [row, col] = isRow ? [i, j] : [j, i];
        const cell = board[row]?.[col];
        if (cell?.value === null && cell.draft?.includes(num)) {
          positions.push({ row, col });
        }
      }
      if (positions.length === 2) {
        candidatePositions.push(positions);
      }
    }

    // 检查X-Wing模式
    if (candidatePositions.length >= 2) {
      for (let i = 0; i < candidatePositions.length - 1; i++) {
        for (let j = i + 1; j < candidatePositions.length; j++) {
          const [pos1, pos2] = candidatePositions[i];
          const [pos3, pos4] = candidatePositions[j];

          const index = isRow ? "col" : "row";
          if (pos1[index] === pos3[index] && pos2[index] === pos4[index]) {
            const affectedPositions: Position[] = [];

            // 寻找可以消除候选数字的位置
            for (let k = 0; k < 9; k++) {
              if (
                k !== pos1[isRow ? "row" : "col"] &&
                k !== pos3[isRow ? "row" : "col"]
              ) {
                const checkPos1 = isRow
                  ? { row: k, col: pos1.col }
                  : { row: pos1.row, col: k };
                const checkPos2 = isRow
                  ? { row: k, col: pos2.col }
                  : { row: pos2.row, col: k };

                const cell1 = board[checkPos1.row]?.[checkPos1.col];
                const cell2 = board[checkPos2.row]?.[checkPos2.col];

                if (cell1?.draft?.includes(num)) {
                  affectedPositions.push(checkPos1);
                }
                if (cell2?.draft?.includes(num)) {
                  affectedPositions.push(checkPos2);
                }
              }
            }

            if (affectedPositions.length > 0) {
              return {
                position: affectedPositions,
                prompt: [pos1, pos2, pos3, pos4],
                method: SOLUTION_METHODS.X_WING,
                target: [num],
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

// X-Wing变种
export const xWingVarient = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    const columnCandidates = candidateMap[num].col;

    // 遍历所有列
    for (let col1 = 0; col1 < 9; col1++) {
      const candidates1 = columnCandidates.get(col1);
      if (candidates1?.count !== 2) continue;

      const [pos1, pos2] = candidates1.positions;
      const box1 = Math.floor(pos1.row / 3);
      const box2 = Math.floor(pos2.row / 3);

      // 确保两个候选方格在不同的宫
      if (box1 === box2) continue;

      // 寻找第二列
      for (let col2 = 0; col2 < 9; col2++) {
        const candidates2 = columnCandidates.get(col2);
        if (!candidates2 || candidates2.count < 3 || candidates2.count > 4)
          continue;

        // 检查第二列的候选方格是否满足条件
        const boxC = candidates2.positions.find(
          (pos) =>
            Math.floor(pos.row / 3) !== box1 && Math.floor(pos.row / 3) !== box2
        );
        if (!boxC) continue;

        if (num === 8 && col2 === 0) {
          console.log(123);
        }

        const otherCandidates = candidates2.positions.filter(
          (pos) => pos !== boxC
        );
        if (otherCandidates.length < 2) continue;

        // 检查是否形成矩形
        const boxesSet = new Set([box1, box2, Math.floor(boxC.row / 3)]);
        if (
          otherCandidates.some((pos) => !boxesSet.has(Math.floor(pos.row / 3)))
        )
          continue;

        // 检查boxC所在列的其他行是否为空
        const boxCCol = boxC.col;
        const boxCRow = Math.floor(boxC.row / 3) * 3;
        let isValid = true;
        for (let r = boxCRow; r < boxCRow + 3; r++) {
          if (r !== boxC.row && board[r][boxCCol].value !== null) {
            isValid = false;
            break;
          }
        }
        if (!isValid) continue;

        // 找到可以删除候选数的位置
        const affectedPositions: Position[] = [];
        for (const pos of [pos1, pos2]) {
          if (
            board[pos.row][col2].value === null &&
            board[pos.row][col2].draft.includes(num)
          ) {
            affectedPositions.push({ row: pos.row, col: col2 });
          }
        }

        if (affectedPositions.length > 0) {
          return {
            position: affectedPositions,
            prompt: [pos1, pos2, boxC, ...otherCandidates],
            method: SOLUTION_METHODS.X_WING_VARIENT,
            target: [num],
            isFill: false,
          };
        }
      }
    }
  }

  return null;
};
// XY-Wing
export const xyWing = (board: CellData[][]): Result | null => {
  // 找出所有只有两个候选数的格子
  const cellsWithTwoCandidates: Position[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.length === 2) {
        cellsWithTwoCandidates.push({ row, col });
      }
    }
  }

  // 检查两个格子是否在同一宫或行或列
  const areCellsInSameUnit = (cell1: Position, cell2: Position) => {
    return (
      cell1.row === cell2.row ||
      cell1.col === cell2.col ||
      (Math.floor(cell1.row / 3) === Math.floor(cell2.row / 3) &&
        Math.floor(cell1.col / 3) === Math.floor(cell2.col / 3))
    );
  };

  // 遍历所有可能的 XY-Wing 组合
  for (let i = 0; i < cellsWithTwoCandidates.length; i++) {
    const cellA = cellsWithTwoCandidates[i];
    const candidatesA = board[cellA.row]?.[cellA.col]?.draft ?? [];

    for (let j = 0; j < cellsWithTwoCandidates.length; j++) {
      if (i === j) continue;
      const cellB = cellsWithTwoCandidates[j];
      const candidatesB = board[cellB.row]?.[cellB.col]?.draft ?? [];

      // 检查 A 和 B 是否在同一单元
      if (!areCellsInSameUnit(cellA, cellB)) continue;

      for (let k = 0; k < cellsWithTwoCandidates.length; k++) {
        if (k === i || k === j) continue;
        const cellC = cellsWithTwoCandidates[k];
        const candidatesC = board[cellC.row]?.[cellC.col]?.draft ?? [];

        // 检查 A 和 C 是否在同一单元，B 和 C 是否不在同一单元
        if (
          !areCellsInSameUnit(cellA, cellC) ||
          areCellsInSameUnit(cellB, cellC)
        )
          continue;

        // 检查候选数是否符合 XY-Wing 模式
        const [a, b] = candidatesA;
        const [b2, c] = candidatesB;
        const [a2, c2] = candidatesC;

        if (a !== a2 || b !== b2 || c !== c2) continue;

        // 找到符合条件的 XY-Wing
        const targetNumber = c;
        const affectedPositions: Position[] = [];

        // 检查与 B 和 C 在同一单元的格子
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            if (
              (row === cellB.row && col === cellB.col) ||
              (row === cellC.row && col === cellC.col)
            )
              continue;

            const isInSameUnitWithB = areCellsInSameUnit(cellB, { row, col });
            const isInSameUnitWithC = areCellsInSameUnit(cellC, { row, col });

            if (isInSameUnitWithB && isInSameUnitWithC) {
              const cell = board[row]?.[col];
              if (cell?.value === null && cell.draft?.includes(targetNumber)) {
                affectedPositions.push({ row, col });
              }
            }
          }
        }

        if (affectedPositions.length > 0) {
          return {
            position: affectedPositions,
            prompt: [cellA, cellB, cellC],
            method: SOLUTION_METHODS.XY_WING,
            target: [targetNumber],
            isFill: false,
          };
        }
      }
    }
  }

  return null;
};

// XYZ-Wing
export const xyzWing = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 遍历所有单元格
  for (let rowA = 0; rowA < 9; rowA++) {
    for (let colA = 0; colA < 9; colA++) {
      const cellA = board[rowA]?.[colA];
      if (cellA?.value !== null || cellA?.draft?.length !== 3) continue;

      // 寻找候选数是A的子集的单元格B
      for (let rowB = 0; rowB < 9; rowB++) {
        for (let colB = 0; colB < 9; colB++) {
          if (rowA === rowB && colA === colB) continue;
          if (
            !areCellsInSameUnit(
              { row: rowA, col: colA },
              { row: rowB, col: colB }
            )
          )
            continue;

          const cellB = board[rowB]?.[colB];
          if (
            cellB?.value !== null ||
            cellB?.draft?.length < 2 ||
            cellB?.draft?.length > 3
          )
            continue;
          if (!cellB.draft.every((num) => cellA.draft?.includes(num))) continue;

          // 寻找候选数是A的子集的单元格C
          for (let rowC = 0; rowC < 9; rowC++) {
            for (let colC = 0; colC < 9; colC++) {
              if (
                (rowA === rowC && colA === colC) ||
                (rowB === rowC && colB === colC)
              )
                continue;
              if (
                !areCellsInSameUnit(
                  { row: rowA, col: colA },
                  { row: rowC, col: colC }
                )
              )
                continue;
              if (
                !areCellsInSameUnit(
                  { row: rowB, col: colB },
                  { row: rowC, col: colC }
                )
              )
                continue;

              const cellC = board[rowC]?.[colC];
              if (
                cellC?.value !== null ||
                cellC?.draft?.length < 2 ||
                cellC?.draft?.length > 3
              )
                continue;
              if (!cellC.draft.every((num) => cellA.draft?.includes(num)))
                continue;

              // 检查B和C的候选数是否覆盖了A的所有候选数
              const combinedCandidates = new Set([
                ...cellB.draft,
                ...cellC.draft,
              ]);
              if (combinedCandidates.size !== 3) continue;

              // 找到符合条件的XYZ-Wing
              const affectedPositions: Position[] = [];

              // 检查与ABC在同一元的格子
              for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                  if (
                    (row === rowA && col === colA) ||
                    (row === rowB && col === colB) ||
                    (row === rowC && col === colC)
                  )
                    continue;

                  const isInSameUnitWithA = areCellsInSameUnit(
                    { row: rowA, col: colA },
                    { row, col }
                  );
                  const isInSameUnitWithB = areCellsInSameUnit(
                    { row: rowB, col: colB },
                    { row, col }
                  );
                  const isInSameUnitWithC = areCellsInSameUnit(
                    { row: rowC, col: colC },
                    { row, col }
                  );

                  if (
                    isInSameUnitWithA &&
                    isInSameUnitWithB &&
                    isInSameUnitWithC
                  ) {
                    const cell = board[row]?.[col];
                    if (
                      cell?.value === null &&
                      cellA.draft?.some((num) => cell.draft?.includes(num))
                    ) {
                      affectedPositions.push({ row, col });
                    }
                  }
                }
              }

              if (affectedPositions.length > 0) {
                return {
                  position: affectedPositions,
                  prompt: [
                    { row: rowA, col: colA },
                    { row: rowB, col: colB },
                    { row: rowC, col: colC },
                  ],
                  method: SOLUTION_METHODS.XYZ_WING,
                  target: cellA.draft,
                  isFill: false,
                };
              }
            }
          }
        }
      }
    }
  }

  return null;
};

// 给定两个坐标和候选数，判断是否为同区域的强连接
export const isUnitStrongLink = (
  board: CellData[][],
  position1: Position,
  position2: Position,
  num: number,
  candidateMap: CandidateMap
): boolean => {
  const cell1 = board[position1.row]?.[position1.col];
  const cell2 = board[position2.row]?.[position2.col];
  if (position1.row === position2.row && position1.col === position2.col) {
    return false;
  }

  // 检查是否在同一行、同一列或同一宫
  const isSameRow = position1.row === position2.row;
  const isSameCol = position1.col === position2.col;
  const isSameBox =
    Math.floor(position1.row / 3) === Math.floor(position2.row / 3) &&
    Math.floor(position1.col / 3) === Math.floor(position2.col / 3);

  if (!(isSameRow || isSameCol || isSameBox)) {
    return false;
  }

  // 情况一：检查两个单元格是否都只有两个候选数，且包含相同的候选数
  if (
    cell1.draft.length === 2 &&
    cell2.draft.length === 2 &&
    cell1.draft.every((n) => cell2.draft.includes(n))
  ) {
    return true;
  }

  // 情况二：检查是否存在第三个单元格C，其候选数为AB的候选数的并集
  if (
    cell1.draft.length === 2 &&
    cell2.draft.length === 2 &&
    cell1.draft.includes(num) &&
    cell2.draft.includes(num)
  ) {
    const otherNum1 = cell1.draft.find((n) => n !== num);
    const otherNum2 = cell2.draft.find((n) => n !== num);

    if (otherNum1 && otherNum2) {
      // 检查共同行、列和宫
      const checkCellC = (row: number, col: number) => {
        const cellC = board[row]?.[col];
        if (
          cellC?.draft.length === 2 &&
          cellC.draft.includes(otherNum1) &&
          cellC.draft.includes(otherNum2)
        ) {
          return true;
        }
      };

      if (isSameRow) {
        for (let col = 0; col < 9; col++) {
          if (
            col !== position1.col &&
            col !== position2.col &&
            checkCellC(position1.row, col)
          ) {
            return true;
          }
        }
      }

      if (isSameCol) {
        for (let row = 0; row < 9; row++) {
          if (
            row !== position1.row &&
            row !== position2.row &&
            checkCellC(row, position1.col)
          ) {
            return true;
          }
        }
      }

      if (isSameBox) {
        const startRow = Math.floor(position1.row / 3) * 3;
        const startCol = Math.floor(position1.col / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const row = startRow + i;
            const col = startCol + j;
            if (
              (row !== position1.row || col !== position1.col) &&
              (row !== position2.row || col !== position2.col) &&
              checkCellC(row, col)
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  // 情况三：格子A有候选数a、b、num，B有num、a或b，在格子AB所处的共同行或共同列或共同宫内寻找格子C，要求C的候选数为a、b
  const cellA = cell1.draft.length === 3 ? cell1 : cell2;
  const cellB = cellA === cell1 ? cell2 : cell1;
  const positionA = cellA === cell1 ? position1 : position2;
  const positionB = cellB === cell2 ? position2 : position1;

  if (cellA.draft.length === 3 && cellB.draft.length >= 2) {
    const [a, b] = cellA.draft.filter((n) => n !== num);
    if (
      cellB.draft.includes(num) &&
      (cellB.draft.includes(a) || cellB.draft.includes(b))
    ) {
      const checkCellC = (row: number, col: number) => {
        const cellC = board[row]?.[col];
        if (
          cellC?.draft.length === 2 &&
          cellC.draft.includes(a) &&
          cellC.draft.includes(b)
        ) {
          return true;
        }
      };

      // 检查共同行、列和宫
      if (isSameRow) {
        for (let col = 0; col < 9; col++) {
          if (
            col !== positionA.col &&
            col !== positionB.col &&
            checkCellC(positionA.row, col)
          ) {
            return true;
          }
        }
      }

      if (isSameCol) {
        for (let row = 0; row < 9; row++) {
          if (
            row !== positionA.row &&
            row !== positionB.row &&
            checkCellC(row, positionA.col)
          ) {
            return true;
          }
        }
      }

      if (isSameBox) {
        const startRow = Math.floor(positionA.row / 3) * 3;
        const startCol = Math.floor(positionA.col / 3) * 3;
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            const row = startRow + i;
            const col = startCol + j;
            if (
              (row !== positionA.row || col !== positionA.col) &&
              (row !== positionB.row || col !== positionB.col) &&
              checkCellC(row, col)
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  // 情况四：如果两个方格所在的行或列或宫只有它们俩，返回true
  // 检查行
  if (position1.row === position2.row) {
    const rowCandidates = candidateMap[num]?.row?.get(position1.row);
    if (rowCandidates?.count === 2) {
      return true;
    }
  }

  // 检查列

  if (position1.col === position2.col) {
    const colCandidates = candidateMap[num]?.col?.get(position1.col);

    if (colCandidates?.count === 2) {
      return true;
    }
  }

  // 检查宫
  const box1 =
    Math.floor(position1.row / 3) * 3 + Math.floor(position1.col / 3);
  const box2 =
    Math.floor(position2.row / 3) * 3 + Math.floor(position2.col / 3);
  if (box1 === box2) {
    const boxCandidates = candidateMap[num]?.box?.get(box1);
    if (boxCandidates?.count === 2) {
      return true;
    }
  }

  return false;
};

interface StrongLink {
  positions: Position[];
  num: number;
}

// 寻找强连接
export const findStrongLink = (
  board: CellData[][],
  candidateMap: CandidateMap
): StrongLink | null => {
  for (const [num, { all }] of Object.entries(candidateMap)) {
    const positions = all;
    for (let i = 0; i < positions.length - 1; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const position1 = { row: positions[i].row, col: positions[i].col };
        const position2 = { row: positions[j].row, col: positions[j].col };
        if (
          isUnitStrongLink(
            board,
            position1,
            position2,
            Number(num),
            candidateMap
          )
        ) {
          return { positions: [position1, position2], num: Number(num) };
        }
      }
    }
  }
  return null;
};

// 给定两个坐标和候选数，判断是否为强连接
export const isStrongLink = (
  position1: Position,
  position2: Position,
  num: number,
  graph: Graph
): boolean => {
  const startNodes = graph[num] || [];

  for (const startNode of startNodes) {
    const queue: GraphNode[] = [startNode];
    const visited: Set<string> = new Set();
    let foundPosition1 = false;
    let foundPosition2 = false;

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      const key = `${currentNode.row},${currentNode.col}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (
        currentNode.row === position1.row &&
        currentNode.col === position1.col
      ) {
        foundPosition1 = true;
      }

      if (
        currentNode.row === position2.row &&
        currentNode.col === position2.col
      ) {
        foundPosition2 = true;
      }

      if (foundPosition1 && foundPosition2) {
        return true;
      }

      for (const nextNode of currentNode.next) {
        queue.push(nextNode);
      }
    }
  }

  return false;
};

// 检查强连接的奇偶性
export const checkStrongLinkParity = (
  position1: Position,
  position2: Position,
  num: number,
  graph: Graph
): 0 | 1 | 2 => {
  const startNodes = graph[num] ?? [];

  for (const startNode of startNodes) {
    const queue: { node: GraphNode; depth: number }[] = [
      { node: startNode, depth: 0 },
    ];
    const visited: Set<string> = new Set();

    while (queue.length > 0) {
      const { node: currentNode, depth } = queue.shift()!;
      const key = `${currentNode.row},${currentNode.col}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (
        currentNode.row === position1.row &&
        currentNode.col === position1.col
      ) {
        // 找到第一个位置，继续搜索第二个位置
        const subQueue: { node: GraphNode; depth: number }[] = [
          { node: currentNode, depth: 0 },
        ];
        const subVisited: Set<string> = new Set();

        while (subQueue.length > 0) {
          const { node: subNode, depth: subDepth } = subQueue.shift()!;
          const subKey = `${subNode.row},${subNode.col}`;

          if (subVisited.has(subKey)) {
            continue;
          }

          subVisited.add(subKey);

          if (subNode.row === position2.row && subNode.col === position2.col) {
            // 找到第二个位置，判断奇偶性
            return subDepth % 2 === 0 ? 2 : 1;
          }

          for (const nextNode of subNode.next) {
            subQueue.push({ node: nextNode, depth: subDepth + 1 });
          }
        }
      }

      for (const nextNode of currentNode.next) {
        queue.push({ node: nextNode, depth: depth + 1 });
      }
    }
  }

  return 0;
};

// 摩天楼
export const skyscraper = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    const candidates = candidateMap[num]?.all ?? [];

    for (let i = 0; i < candidates.length - 1; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const pos1 = candidates[i];
        const pos2 = candidates[j];

        // 检查两个位置是否在同一区域
        if (areCellsInSameUnit(pos1, pos2)) {
          continue;
        }

        // 寻找一条包含四个节点的路径
        const path = findFourPath(pos1, pos2, num, graph);
        if (path.length !== 4) {
          continue;
        }

        // 找到共同影响的区域
        const affectedPositions = findCommonAffectedPositions(
          pos1,
          pos2,
          board,
          num
        );

        if (
          affectedPositions.length > 0 &&
          !areCellsInSameUnit(path[1], affectedPositions[0]) &&
          !areCellsInSameUnit(path[2], affectedPositions[0])
        ) {
          return path.length === 4
            ? {
                position: affectedPositions,
                prompt: path,
                method: SOLUTION_METHODS.SKYSCRAPER,
                target: [num],
                isFill: false,
              }
            : null;
        }
      }
    }
  }

  return null;
};

// 找到两个位置共同影响的区域
const findCommonAffectedPositions = (
  pos1: Position,
  pos2: Position,
  board: CellData[][],
  num: number
): Position[] => {
  const affectedPositions: Position[] = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (
        (row === pos1.row && col === pos1.col) ||
        (row === pos2.row && col === pos2.col)
      ) {
        continue;
      }

      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.includes(num)) {
        if (
          areCellsInSameUnit({ row, col }, pos1) &&
          areCellsInSameUnit({ row, col }, pos2)
        ) {
          affectedPositions.push({ row, col });
        }
      }
    }
  }

  return affectedPositions;
};

// 已知两个强关联的格子，寻找A到B为4个格子的路径
export const findFourPath = (
  pos1: Position,
  pos2: Position,
  num: number,
  graph: Graph
): Position[] => {
  const startNode = findGraphNode(pos1, num, graph);
  if (!startNode) {
    return [];
  }

  const visited: Set<string> = new Set();
  const path: Position[] = [];

  const dfs = (node: GraphNode): Position[] | null => {
    const key = `${node.row},${node.col}`;

    if (visited.has(key)) {
      return null;
    }

    visited.add(key);
    path.push({ row: node.row, col: node.col });

    if (path.length === 4 && node.row === pos2.row && node.col === pos2.col) {
      return [...path];
    }

    if (path.length < 4) {
      for (const nextNode of node.next) {
        const result = dfs(nextNode);
        if (result) {
          return result;
        }
      }
    }

    visited.delete(key);
    path.pop();
    return null;
  };

  const result = dfs(startNode);
  return result ?? [];
};

// 已知位置和候选数找到graph对应的节点
const findGraphNode = (
  position: Position,
  num: number,
  graph: Graph
): GraphNode | null => {
  const { row, col } = position;
  const startNodes = graph[num] ?? [];

  for (const startNode of startNodes) {
    const queue: GraphNode[] = [startNode];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const node = queue.shift()!;
      const key = `${node.row},${node.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (node.row === row && node.col === col) {
        return node;
      }

      queue.push(...node.next);
    }
  }

  return null;
};

// X-Chain
// export const xChain = (board: CellData[][]): Result | null => {
//   // 初始化一个空的结果数组
//   const results: Result[] = [];

//   // 遍历所有可能的数字
//   for (let num = 1; num <= 9; num++) {
//     // 为当前数字创建一个图
//     const graph: { [key: string]: string[] } = {};

//     // 构建图
//     for (let row = 0; row < 9; row++) {
//       for (let col = 0; col < 9; col++) {
//         if (board[row]?.[col]?.value === null && board[row]?.[col]?.draft?.includes(num)) {
//           const key = `${row},${col}`;
//           graph[key] = [];

//           // 检查同行、同列和同宫的其他单元格
//           for (let i = 0; i < 9; i++) {
//             if (i !== col && board[row]?.[i]?.value === null && board[row]?.[i]?.draft?.includes(num)) {
//               graph[key].push(`${row},${i}`);
//             }
//             if (i !== row && board[i]?.[col]?.value === null && board[i]?.[col]?.draft?.includes(num)) {
//               graph[key].push(`${i},${col}`);
//             }
//           }

//           const boxRow = Math.floor(row / 3) * 3;
//           const boxCol = Math.floor(col / 3) * 3;
//           for (let i = boxRow; i < boxRow + 3; i++) {
//             for (let j = boxCol; j < boxCol + 3; j++) {
//               if ((i !== row || j !== col) && board[i]?.[j]?.value === null && board[i]?.[j]?.draft?.includes(num)) {
//                 graph[key].push(`${i},${j}`);
//               }
//             }
//           }
//         }
//       }
//     }

//     // 寻找格链
//     const visited: { [key: string]: boolean } = {};
//     const path: string[] = [];

//     const dfs = (node: string, startNode: string, length: number) => {
//       visited[node] = true;
//       path.push(node);

//       for (const neighbor of graph[node] ?? []) {
//         if (neighbor === startNode && length > 3) {
//           // 找到一个有效的格链
//           const chain = path.map(pos => {
//             const [row, col] = pos.split(',').map(Number);
//             return { row, col };
//           });

//           // 检查是否可以消除候选数
//           const evenPositions = chain.filter((_, index) => index % 2 === 0);
//           const oddPositions = chain.filter((_, index) => index % 2 === 1);
//           const affectedPositions: Position[] = [];

//           for (let row = 0; row < 9; row++) {
//             for (let col = 0; col < 9; col++) {
//               if (board[row]?.[col]?.value === null && board[row]?.[col]?.draft?.includes(num)) {
//                 const pos = { row, col };
//                 if (!chain.some(p => p.row === row && p.col === col) &&
//                     (evenPositions.some(p => areCellsInSameUnit(p, pos)) &&
//                      oddPositions.some(p => areCellsInSameUnit(p, pos)))) {
//                   affectedPositions.push(pos);
//                 }
//               }
//             }
//           }

//           if (affectedPositions.length > 0) {
//             results.push({
//               position: affectedPositions,
//               prompt: chain,
//               method: SOLUTION_METHODS.X_CHAIN,
//               target: [num],
//               isFill: false,
//             });
//           }
//         }
//       }

//       visited[node] = false;
//       path.pop();
//     };

//     // 从每个节点开始搜索
//     for (const node in graph) {
//       dfs(node, node, 0);
//     }
//   }

//   // 返回找到的第一个结果，如果没有找到则返回null
//   return results.length > 0 ? results[0] : null;
// };
