import { SOLUTION_METHODS } from "../constans";
import { areCellsInSameUnit, solve } from "./index";
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
  rows?: number[];
  cols?: number[];
  row?: number;
  col?: number;
  box?: number;
  isWeakLink?: boolean;
  chainStructure?: string;
}

// 检查候选数法
export const checkCandidate = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  answerBoard: CellData[][]
): Result | null => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row]?.[col];
      const answerCell = answerBoard[row]?.[col];

      if (cell?.value === null && answerCell?.value !== null) {
        const missingCandidate = answerCell.value;
        if (!cell.draft?.includes(missingCandidate)) {
          return {
            position: [{ row, col }],
            prompt: [{ row, col }],
            method: SOLUTION_METHODS.CHECK_CANDIDATE,
            target: [missingCandidate],
            isFill: false,
          };
        }
      }
    }
  }

  return null;
};

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
              row: cells[0].row,
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
              col: cells[0].col,
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
              row,
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
              col,
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
              row: cell1.row,
              col: cell1.col,
              box: Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3),
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

            // 三个候选方格里都只有abc候选数
            const allHaveThreeCandidates =
              cellA.candidates.length === 3 &&
              cellB.candidates.length === 3 &&
              cellC.candidates.length === 3 &&
              cellA.candidates.every((num) => uniqueCandidates.includes(num)) &&
              cellB.candidates.every((num) => uniqueCandidates.includes(num)) &&
              cellC.candidates.every((num) => uniqueCandidates.includes(num));

            // 新增条件：两个候选方格有abc候选数，另一个有其中两个
            const twoFullOnePartial =
              (cellA.candidates.length === 3 &&
                cellB.candidates.length === 3 &&
                cellC.candidates.length === 2 &&
                cellC.candidates.every((num) =>
                  uniqueCandidates.includes(num)
                )) ||
              (cellA.candidates.length === 3 &&
                cellC.candidates.length === 3 &&
                cellB.candidates.length === 2 &&
                cellB.candidates.every((num) =>
                  uniqueCandidates.includes(num)
                )) ||
              (cellB.candidates.length === 3 &&
                cellC.candidates.length === 3 &&
                cellA.candidates.length === 2 &&
                cellA.candidates.every((num) =>
                  uniqueCandidates.includes(num)
                ));

            if (
              (hasThreeCandidates && hasTwoDifferentPairs) ||
              allHaveThreeCandidates ||
              twoFullOnePartial
            ) {
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
                  row: cellA.pos.row,
                  col: cellA.pos.col,
                  box:
                    Math.floor(cellA.pos.row / 3) * 3 +
                    Math.floor(cellA.pos.col / 3),
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
                row: cellA.pos.row,
                col: cellA.pos.col,
                box:
                  Math.floor(cellA.pos.row / 3) * 3 +
                  Math.floor(cellA.pos.col / 3),
              };
            }
          }
        }
      }
    }
  }

  return null;
};

// 显性四数对
export const nakedQuadruple = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkNakedQuadruple(board, "row");
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkNakedQuadruple(board, "col");
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkNakedQuadruple(board, "box");
  if (boxResult) return boxResult;

  return null;
};

const checkNakedQuadruple = (
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
        cell.draft?.length <= 4
      ) {
        cellsWithCandidates.push({ pos: { row, col }, candidates: cell.draft });
      }
    }

    // 检查所有可能的四个格子组合
    for (let i = 0; i < cellsWithCandidates.length - 3; i++) {
      for (let j = i + 1; j < cellsWithCandidates.length - 2; j++) {
        for (let k = j + 1; k < cellsWithCandidates.length - 1; k++) {
          for (let l = k + 1; l < cellsWithCandidates.length; l++) {
            const cellA = cellsWithCandidates[i];
            const cellB = cellsWithCandidates[j];
            const cellC = cellsWithCandidates[k];
            const cellD = cellsWithCandidates[l];

            const uniqueCandidates = [
              ...new Set([
                ...cellA.candidates,
                ...cellB.candidates,
                ...cellC.candidates,
                ...cellD.candidates,
              ]),
            ];

            if (uniqueCandidates.length === 4) {
              const [a, b, c, d] = uniqueCandidates;

              // 检查是否满足显性四数对法的条件
              const hasFourCandidates =
                cellA.candidates.length === 4 ||
                cellB.candidates.length === 4 ||
                cellC.candidates.length === 4 ||
                cellD.candidates.length === 4;

              const allHaveThreeOrFourCandidates =
                cellA.candidates.length >= 3 &&
                cellB.candidates.length >= 3 &&
                cellC.candidates.length >= 3 &&
                cellD.candidates.length >= 3;

              if (hasFourCandidates && allHaveThreeOrFourCandidates) {
                const affectedPositions: Position[] = [];
                const prompt: Position[] = [
                  cellA.pos,
                  cellB.pos,
                  cellC.pos,
                  cellD.pos,
                ];

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
                    cell.draft?.some((num) => [a, b, c, d].includes(num))
                  ) {
                    affectedPositions.push({ row, col });
                  }
                }

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

                  const method =
                    SOLUTION_METHODS[
                      `NAKED_QUADRUPLE_${getMethodKey(
                        unitType
                      )}` as keyof typeof SOLUTION_METHODS
                    ];

                  return {
                    position: affectedPositions,
                    prompt,
                    method,
                    target: uniqueCandidates,
                    isFill: false,
                    row: cellA.pos.row,
                    col: cellA.pos.col,
                    box:
                      Math.floor(cellA.pos.row / 3) * 3 +
                      Math.floor(cellA.pos.col / 3),
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
                row: pair[0].row,
                col: pair[0].col,
                box:
                  Math.floor(pair[0].row / 3) * 3 + Math.floor(pair[0].col / 3),
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
              row: candidateCells[0].row,
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
              col: candidateCells[0].col,
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
              box,
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
                    row: positionsArray[0].row,
                    col: positionsArray[0].col,
                    box:
                      Math.floor(positionsArray[0].row / 3) * 3 +
                      Math.floor(positionsArray[0].col / 3),
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
  const rowResult = checkXWing(board, true);
  if (rowResult) return rowResult;

  const colResult = checkXWing(board, false);
  if (colResult) return colResult;

  return null;
};

const checkXWing = (board: CellData[][], isRow: boolean): Result | null => {
  for (let num = 1; num <= 9; num++) {
    const candidatePositions: Position[][] = [];

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

    if (candidatePositions.length >= 2) {
      for (let i = 0; i < candidatePositions.length - 1; i++) {
        for (let j = i + 1; j < candidatePositions.length; j++) {
          const [pos1, pos2] = candidatePositions[i];
          const [pos3, pos4] = candidatePositions[j];

          const index = isRow ? "col" : "row";
          if (pos1[index] === pos3[index] && pos2[index] === pos4[index]) {
            const affectedPositions: Position[] = [];

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
                method: isRow
                  ? SOLUTION_METHODS.X_WING_ROW
                  : SOLUTION_METHODS.X_WING_COLUMN,
                target: [num],
                isFill: false,
                rows: [pos1.row, pos3.row],
                cols: [pos1.col, pos3.col],
              };
            }
          }
        }
      }
    }
  }

  return null;
};

// 二阶退化鱼
export const xWingVarient = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkXWingVarient(board, candidateMap, true);
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkXWingVarient(board, candidateMap, false);
  if (colResult) return colResult;

  return null;
};

const checkXWingVarient = (
  board: CellData[][],
  candidateMap: CandidateMap,
  isRow: boolean
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    for (let i = 0; i < 9; i++) {
      const positions = isRow
        ? candidateMap[num]?.row?.get(i)?.positions
        : candidateMap[num]?.col?.get(i)?.positions;

      if (positions?.length === 2) {
        const [posA, posB] = positions;

        for (let j = 0; j < 9; j++) {
          if (j === i) continue;
          const otherPositions = isRow
            ? candidateMap[num]?.row?.get(j)?.positions
            : candidateMap[num]?.col?.get(j)?.positions;

          if (otherPositions?.length === 3 || otherPositions?.length === 4) {
            const posC = otherPositions.find((pos) =>
              isRow
                ? pos.col === posA.col || pos.col === posB.col
                : pos.row === posA.row || pos.row === posB.row
            );

            if (posC) {
              const groupD = otherPositions.filter((pos) => pos !== posC);

              const isGroupDInSameBox = groupD.every(
                (pos) =>
                  Math.floor(pos.row / 3) === Math.floor(groupD[0].row / 3) &&
                  Math.floor(pos.col / 3) === Math.floor(groupD[0].col / 3)
              );

              const dBoxCol = Math.floor(groupD[0].col / 3);
              const dBoxRow = Math.floor(groupD[0].row / 3);
              const aBoxCol = Math.floor(posA.col / 3);
              const aBoxRow = Math.floor(posA.row / 3);
              const bBoxCol = Math.floor(posB.col / 3);
              const bBoxRow = Math.floor(posB.row / 3);

              const isDInSameBoxWithAB = isRow
                ? dBoxCol === aBoxCol || dBoxCol === bBoxCol
                : dBoxRow === aBoxRow || dBoxRow === bBoxRow;

              if (!isDInSameBoxWithAB) continue;

              if (isGroupDInSameBox) {
                const abInSameBox =
                  Math.floor(posA.row / 3) === Math.floor(posB.row / 3) &&
                  Math.floor(posA.col / 3) === Math.floor(posB.col / 3);

                const cdBoxRow = Math.floor(groupD[0].row / 3);
                const cdBoxCol = Math.floor(groupD[0].col / 3);

                const positionsToExclude: Position[] = [];

                const isNotABCD = (r: number, c: number) =>
                  !(r === posA.row && c === posA.col) &&
                  !(r === posB.row && c === posB.col) &&
                  !(r === posC.row && c === posC.col) &&
                  !groupD.some((pos) => pos.row === r && pos.col === c);

                if (abInSameBox) {
                  // AB 在同一宫，排除 CD 所属宫内其他方格
                  for (let r = cdBoxRow * 3; r < cdBoxRow * 3 + 3; r++) {
                    for (let c = cdBoxCol * 3; c < cdBoxCol * 3 + 3; c++) {
                      if (isNotABCD(r, c) && board[r][c].draft?.includes(num)) {
                        positionsToExclude.push({ row: r, col: c });
                      }
                    }
                  }
                } else {
                  // AB 不在同一宫
                  if (isRow) {
                    const targetCol =
                      posC.col === posA.col ? posB.col : posA.col;
                    for (let r = cdBoxRow * 3; r < cdBoxRow * 3 + 3; r++) {
                      if (
                        isNotABCD(r, targetCol) &&
                        board[r][targetCol].draft?.includes(num)
                      ) {
                        positionsToExclude.push({ row: r, col: targetCol });
                      }
                    }
                  } else {
                    const targetRow =
                      posC.row === posA.row ? posB.row : posA.row;
                    for (let c = cdBoxCol * 3; c < cdBoxCol * 3 + 3; c++) {
                      if (
                        isNotABCD(targetRow, c) &&
                        board[targetRow][c].draft?.includes(num)
                      ) {
                        positionsToExclude.push({ row: targetRow, col: c });
                      }
                    }
                  }
                }

                if (
                  positionsToExclude.length > 0 &&
                  Math.floor(groupD[0].row / 3) ===
                    Math.floor(positionsToExclude[0].row / 3) &&
                  Math.floor(groupD[0].col / 3) ===
                    Math.floor(positionsToExclude[0].col / 3)
                ) {
                  return {
                    position: positionsToExclude,
                    prompt: [posA, posB, posC, ...groupD],
                    method: isRow
                      ? SOLUTION_METHODS.X_WING_VARIENT_ROW
                      : SOLUTION_METHODS.X_WING_VARIENT_COLUMN,
                    target: [num],
                    isFill: false,
                    rows: [posA.row, posC.row],
                    cols: [posA.col, posC.col],
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
// XY-Wing
export const xyWing = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
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

      for (let k = 0; k < cellsWithTwoCandidates.length; k++) {
        if (k === i || k === j) continue;
        const cellC = cellsWithTwoCandidates[k];
        const candidatesC = board[cellC.row]?.[cellC.col]?.draft ?? [];
        if (
          areCellsInSameUnit(cellA, cellB) &&
          areCellsInSameUnit(cellA, cellC) &&
          !areCellsInSameUnit(cellB, cellC)
        ) {
          // 检查候选数是否符合 XY-Wing 模式
          const commonCandidateBC = candidatesB.find((num) =>
            candidatesC.includes(num)
          );
          const commonCandidateAC = candidatesA.find((num) =>
            candidatesC.includes(num)
          );
          const commonCandidateAB = candidatesA.find((num) =>
            candidatesB.includes(num)
          );
          if (!commonCandidateBC || !commonCandidateAC || !commonCandidateAB) {
            continue;
          }
          if (
            new Set([commonCandidateBC, commonCandidateAC, commonCandidateAB])
              .size !== 3
          ) {
            continue;
          }
          // 找到符合条的 XY-Wing
          const targetNumber = commonCandidateBC as number;
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
                if (
                  cell?.value === null &&
                  cell.draft?.includes(targetNumber)
                ) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length === 1) {
            return {
              position: affectedPositions,
              prompt: [cellA, cellB, cellC],
              method: SOLUTION_METHODS.XY_WING,
              target: [targetNumber],
              isFill: false,
              row: cellA.row,
              col: cellA.col,
              box: Math.floor(cellA.row / 3) * 3 + Math.floor(cellA.col / 3),
            };
          }
        } else if (
          areCellsInSameUnit(cellB, cellA) &&
          areCellsInSameUnit(cellB, cellC) &&
          !areCellsInSameUnit(cellA, cellC)
        ) {
          // 检查候选数是否符合 XY-Wing 模式
          const commonCandidateAC = candidatesA.find((num) =>
            candidatesC.includes(num)
          );
          const commonCandidateBA = candidatesB.find((num) =>
            candidatesA.includes(num)
          );
          const commonCandidateBC = candidatesB.find((num) =>
            candidatesC.includes(num)
          );
          if (!commonCandidateAC || !commonCandidateBA || !commonCandidateBC) {
            continue;
          }
          if (
            new Set([commonCandidateAC, commonCandidateBA, commonCandidateBC])
              .size !== 3
          ) {
            continue;
          }
          // 找到符合条件的 XY-Wing
          const targetNumber = commonCandidateAC as number;
          const affectedPositions: Position[] = [];

          // 检查与 A 和 C 在同一单元的格子
          for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
              if (
                (row === cellA.row && col === cellA.col) ||
                (row === cellC.row && col === cellC.col)
              )
                continue;

              const isInSameUnitWithA = areCellsInSameUnit(cellA, { row, col });
              const isInSameUnitWithC = areCellsInSameUnit(cellC, { row, col });

              if (isInSameUnitWithA && isInSameUnitWithC) {
                const cell = board[row]?.[col];
                if (
                  cell?.value === null &&
                  cell.draft?.includes(targetNumber)
                ) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length === 1) {
            return {
              position: affectedPositions,
              prompt: [cellB, cellA, cellC],
              method: SOLUTION_METHODS.XY_WING,
              target: [targetNumber],
              isFill: false,
              row: cellB.row,
              col: cellB.col,
              box: Math.floor(cellB.row / 3) * 3 + Math.floor(cellB.col / 3),
            };
          }
        } else if (
          areCellsInSameUnit(cellC, cellA) &&
          areCellsInSameUnit(cellC, cellB) &&
          !areCellsInSameUnit(cellA, cellB)
        ) {
          // 检查候选数是否符合 XY-Wing 模式
          const commonCandidateAB = candidatesA.find((num) =>
            candidatesB.includes(num)
          );
          const commonCandidateCA = candidatesC.find((num) =>
            candidatesA.includes(num)
          );
          const commonCandidateCB = candidatesC.find((num) =>
            candidatesB.includes(num)
          );
          if (!commonCandidateAB || !commonCandidateCA || !commonCandidateCB) {
            continue;
          }
          if (
            new Set([commonCandidateAB, commonCandidateCA, commonCandidateCB])
              .size !== 3
          ) {
            continue;
          }
          // 找到符合条件的 XY-Wing
          const targetNumber = commonCandidateAB as number;
          const affectedPositions: Position[] = [];

          // 检查与 A 和 B 在同一单元的格子
          for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
              if (
                (row === cellA.row && col === cellA.col) ||
                (row === cellB.row && col === cellB.col)
              )
                continue;

              const isInSameUnitWithA = areCellsInSameUnit(cellA, { row, col });
              const isInSameUnitWithB = areCellsInSameUnit(cellB, { row, col });

              if (isInSameUnitWithA && isInSameUnitWithB) {
                const cell = board[row]?.[col];
                if (
                  cell?.value === null &&
                  cell.draft?.includes(targetNumber)
                ) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length === 1) {
            return {
              position: affectedPositions,
              prompt: [cellC, cellA, cellB],
              method: SOLUTION_METHODS.XY_WING,
              target: [targetNumber],
              isFill: false,
              row: cellC.row,
              col: cellC.col,
              box: Math.floor(cellC.row / 3) * 3 + Math.floor(cellC.col / 3),
            };
          }
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
  // 遍历每个数字的候选位置
  for (let num = 1; num <= 9; num++) {
    const candidates = candidateMap[num]?.all ?? [];

    // 遍历所有候选位置，寻找三个候选数的方格A
    for (const cellA of candidates) {
      if (cellA.candidates.length !== 3) continue;
      let [x, y, z] = cellA.candidates;
      if (num !== x) {
        // 调整顺序使得x为num
        if (num === y) {
          [x, y] = [y, x];
        } else if (num === z) {
          [x, z] = [z, x];
        }
      }

      // 在A所在宫中寻找方格B
      const boxRow = Math.floor(cellA.row / 3);
      const boxCol = Math.floor(cellA.col / 3);
      const box = boxRow * 3 + boxCol;

      const cellsInBox = candidateMap[x]?.box?.get(box)?.positions ?? [];
      for (const cellB of cellsInBox) {
        if (cellB.row === cellA.row && cellB.col === cellA.col) continue;
        const cellBDraft = board[cellB.row][cellB.col].draft;
        if (cellBDraft.length !== 2) continue;

        // 检查B的候选数是否为xy或xz
        const hasXY = cellBDraft.includes(x) && cellBDraft.includes(y);
        const hasXZ = cellBDraft.includes(x) && cellBDraft.includes(z);
        if (!hasXY && !hasXZ) continue;

        // 在A所在的行和列中寻找方格C
        const cellsInRow =
          candidateMap[x]?.row?.get(cellA.row)?.positions ?? [];
        const cellsInCol =
          candidateMap[x]?.col?.get(cellA.col)?.positions ?? [];
        const potentialCells = [...cellsInRow, ...cellsInCol];

        for (const cellC of potentialCells) {
          if (
            (cellC.row === cellA.row && cellC.col === cellA.col) ||
            (cellC.row === cellB.row && cellC.col === cellB.col)
          )
            continue;

          const cellCDraft = board[cellC.row][cellC.col].draft;
          if (cellCDraft.length !== 2) continue;

          // 检查C的候选数是否为xy或xz，且与B不同
          const hasCXY = cellCDraft.includes(x) && cellCDraft.includes(y);
          const hasCXZ = cellCDraft.includes(x) && cellCDraft.includes(z);
          if ((!hasCXY && !hasCXZ) || (hasCXY && hasXY) || (hasCXZ && hasXZ))
            continue;

          // 寻找受影响的方格D
          const affectedPositions: Position[] = [];

          // 在A所在宫中寻找D
          for (let row = boxRow * 3; row < boxRow * 3 + 3; row++) {
            for (let col = boxCol * 3; col < boxCol * 3 + 3; col++) {
              if (
                (row === cellA.row && col === cellA.col) ||
                (row === cellB.row && col === cellB.col) ||
                (row === cellC.row && col === cellC.col)
              )
                continue;

              // D必须与A和C的共同行或列上
              const isInSameLineWithAC =
                (row === cellA.row && row === cellC.row) ||
                (col === cellA.col && col === cellC.col);

              if (isInSameLineWithAC) {
                const cell = board[row][col];
                if (cell.value === null && cell.draft.includes(x)) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length > 0) {
            return {
              position: affectedPositions,
              prompt: [
                { row: cellA.row, col: cellA.col },
                { row: cellB.row, col: cellB.col },
                { row: cellC.row, col: cellC.col },
              ],
              method: SOLUTION_METHODS.XYZ_WING,
              target: [x],
              isFill: false,
              row: cellA.row,
              col: cellA.col,
              box: Math.floor(cellA.row / 3) * 3 + Math.floor(cellA.col / 3),
            };
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

  // 情况一：检查两个单元格是否都只有两个候选数，且包含相同的候选数12 12
  if (
    cell1.draft.length === 2 &&
    cell2.draft.length === 2 &&
    cell1.draft.every((n) => cell2.draft.includes(n))
  ) {
    return true;
  }

  // 情况二：检查是否存在第三个单元格C，其候选数为AB的候选数的并集12 23 13
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

  if (cellA.draft.length === 3 && cellB.draft.length === 2) {
    const [a, b] = cellA.draft.filter((n) => n !== num);
    if (
      cellB.draft.includes(num) &&
      (cellB.draft.includes(a) || cellB.draft.includes(b))
    ) {
      const units = getCommonUnits(positionA, positionB, board);
      for (const unit of units) {
        const cellC = board[unit.row]?.[unit.col];
        if (cellC.draft.includes(num)) continue;
        if (cellC.draft.length === 2) {
          if (
            cellA.draft.includes(cellC.draft[0]) &&
            cellA.draft.includes(cellC.draft[1])
          ) {
            return true;
          }
        }
      }
    }
  } else if (cellA.draft.length === 3 && cellB.draft.length === 3) {
    if (cellA.draft.every((n) => cellB.draft.includes(n))) {
      const units = getCommonUnits(positionA, positionB, board);
      for (const unit of units) {
        const cellC = board[unit.row]?.[unit.col];
        if (cellC.draft.includes(num)) continue;
        if (
          cellC.draft.length === 2 &&
          cellA.draft.includes(cellC.draft[0]) &&
          cellA.draft.includes(cellC.draft[1])
        ) {
          return true;
        }
        if (cellC.draft.length === 3) {
          if (
            cellA.draft.includes(cellC.draft[0]) &&
            cellA.draft.includes(cellC.draft[1]) &&
            cellA.draft.includes(cellC.draft[2])
          ) {
            return true;
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

// 获取两个格子的共同区域
const getCommonUnits = (
  pos1: Position,
  pos2: Position,
  board: CellData[][]
): Position[] => {
  const units: Position[] = [];
  const uniquePositions = new Set<string>();
  const units1 = getUnits(pos1, board);
  const units2 = getUnits(pos2, board);
  for (const unit1 of units1) {
    if (
      units2.some((unit2) => unit2.row === unit1.row && unit2.col === unit1.col)
    ) {
      const key = `${unit1.row},${unit1.col}`;
      if (!uniquePositions.has(key)) {
        uniquePositions.add(key);
        units.push(unit1);
      }
    }
  }

  return units;
};

// 获取一个格子所在的所有区域
const getUnits = (pos: Position, board: CellData[][]): Position[] => {
  const units: Position[] = [];
  const uniquePositions = new Set<string>();

  // 获取行单元
  for (let col = 0; col < 9; col++) {
    if (board[pos.row][col].value === null && col !== pos.col) {
      const key = `${pos.row},${col}`;
      if (!uniquePositions.has(key)) {
        uniquePositions.add(key);
        units.push({ row: pos.row, col });
      }
    }
  }

  // 获取列单元
  for (let row = 0; row < 9; row++) {
    if (board[row][pos.col].value === null && row !== pos.row) {
      const key = `${row},${pos.col}`;
      if (!uniquePositions.has(key)) {
        uniquePositions.add(key);
        units.push({ row, col: pos.col });
      }
    }
  }

  // 获取宫单元
  const startRow = Math.floor(pos.row / 3) * 3;
  const startCol = Math.floor(pos.col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (
        board[startRow + i][startCol + j].value === null &&
        (startRow + i !== pos.row || startCol + j !== pos.col)
      ) {
        const key = `${startRow + i},${startCol + j}`;
        if (!uniquePositions.has(key)) {
          uniquePositions.add(key);
          units.push({ row: startRow + i, col: startCol + j });
        }
      }
    }
  }

  return units;
};

// 已知位置和候选数找到graph对应的节点
export const findGraphNodeByPosition = (
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

// 判断是否为弱链
export const isWeakLink = (
  board: CellData[][],
  pos1: Position,
  pos2: Position,
  num: number,
  candidateMap: CandidateMap
) => {
  if (isUnitStrongLink(board, pos1, pos2, num, candidateMap)) {
    return false;
  }
  if (areCellsInSameUnit(pos1, pos2)) {
    return true;
  }
  return false;
};

// skyscraper2(单节点弱链2-2)
export const skyscraper2_2 = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (const num of Object.keys(graph)) {
    const graphArr = graph[Number(num)];
    if (graphArr.length >= 2) {
      const nodesArr: Position[][] = [];
      for (const graphNode of graphArr) {
        const queue: GraphNode[] = [graphNode];
        const visited: Set<string> = new Set();
        const nodes: Position[] = [];

        while (queue.length > 0) {
          const currentNode = queue.shift()!;
          const key = `${currentNode.row},${currentNode.col}`;

          if (visited.has(key)) {
            continue;
          }

          visited.add(key);
          nodes.push({
            row: currentNode.row,
            col: currentNode.col,
          });

          for (const nextNode of currentNode.next) {
            queue.push(nextNode);
          }
        }

        nodesArr.push(nodes);
      }

      for (let i = 0; i < nodesArr.length - 1; i++) {
        for (let j = i + 1; j < nodesArr.length; j++) {
          for (let k = 0; k < nodesArr[i].length; k++) {
            for (let l = 0; l < nodesArr[j].length; l++) {
              if (
                isWeakLink(
                  board,
                  nodesArr[i][k],
                  nodesArr[j][l],
                  Number(num),
                  candidateMap
                )
              ) {
                const graphNode1 = findGraphNodeByPosition(
                  nodesArr[i][k],
                  Number(num),
                  graph
                );
                const graphNode2 = findGraphNodeByPosition(
                  nodesArr[j][l],
                  Number(num),
                  graph
                );
                if (!graphNode1 || !graphNode2) continue;
                for (const graphNode1_1 of graphNode1.next) {
                  for (const graphNode2_1 of graphNode2?.next ?? []) {
                    const commonUnits = getCommonUnits(
                      { row: graphNode1_1.row, col: graphNode1_1.col },
                      { row: graphNode2_1.row, col: graphNode2_1.col },
                      board
                    );
                    if (commonUnits.length) {
                      const positions: Position[] = [];
                      for (const unit of commonUnits) {
                        const cell = board[unit.row]?.[unit.col];
                        if (cell?.draft?.includes(Number(num))) {
                          positions.push(unit);
                        }
                      }
                      if (positions.length) {
                        return {
                          position: positions,
                          prompt: [
                            { row: graphNode1_1.row, col: graphNode1_1.col },
                            nodesArr[i][k],
                            { row: graphNode2_1.row, col: graphNode2_1.col },
                            nodesArr[j][l],
                          ],
                          method: SOLUTION_METHODS.SKYSCRAPER2,
                          target: [Number(num)],
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
      }
    }
  }
  return null;
};

export const getGraphNodesCounts = (graphNode: GraphNode): number => {
  const visited = new Set<string>();
  const queue: GraphNode[] = [graphNode];
  let count = 0;

  while (queue.length > 0) {
    const node = queue.shift()!;
    const key = `${node.row},${node.col}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);
    count++;

    for (const nextNode of node.next) {
      queue.push(nextNode);
    }
  }

  return count;
};

export const getGraphNode = (
  pos: Position,
  num: number,
  graph: Graph
): GraphNode | null => {
  const graphArr = graph[num] ?? [];
  for (const graphNode of graphArr) {
    const queue: GraphNode[] = [graphNode];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const node = queue.shift()!;
      const key = `${node.row},${node.col}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (node.row === pos.row && node.col === pos.col) {
        return node;
      }

      queue.push(...node.next);
    }
  }

  return null;
};

export const getGraphNodePaths = (
  graphNode1: GraphNode | null,
  graphNode2: GraphNode | null
): Position[][] => {
  if (!graphNode1 || !graphNode2) return [];
  const paths: Position[][] = [];
  const dfs = (
    currentNode: GraphNode,
    targetNode: GraphNode,
    visited: Set<string>,
    currentPath: Position[]
  ) => {
    if (
      currentNode.row === targetNode.row &&
      currentNode.col === targetNode.col
    ) {
      paths.push([...currentPath]);
      return;
    }

    for (const nextNode of currentNode.next) {
      const key = `${nextNode.row},${nextNode.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        currentPath.push({ row: nextNode.row, col: nextNode.col });
        dfs(nextNode, targetNode, visited, currentPath);
        currentPath.pop();
        visited.delete(key);
      }
    }
  };

  const visited = new Set<string>();
  const startKey = `${graphNode1.row},${graphNode1.col}`;
  visited.add(startKey);
  dfs(graphNode1, graphNode2, visited, [
    { row: graphNode1.row, col: graphNode1.col },
  ]);

  return paths;
};

export const remotePair = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (const num in candidateMap) {
    for (const row of candidateMap[num].row.values()) {
      if (!row) continue;
      if (row.count > 2) {
        for (let i = 0; i < row.positions.length - 1; i++) {
          for (let j = i + 1; j < row.positions.length; j++) {
            const pos1 = row.positions[i];
            const pos2 = row.positions[j];
            if (
              !isUnitStrongLink(board, pos1, pos2, Number(num), candidateMap) &&
              isStrongLink(pos1, pos2, Number(num), graph)
            ) {
              const graphNode1 = getGraphNode(pos1, Number(num), graph);
              const graphNode2 = getGraphNode(pos2, Number(num), graph);
              if (!graphNode1 || !graphNode2) continue;
              const paths = getGraphNodePaths(graphNode1, graphNode2);
              for (const path of paths) {
                if (path.length === 4 || path.length === 6) {
                  const positions = row.positions
                    .filter((pos) => pos !== pos1 && pos !== pos2)
                    .map((pos) => ({ row: pos.row, col: pos.col }));

                  if (positions.length) {
                    return {
                      position: positions,
                      prompt: path,
                      method: SOLUTION_METHODS.REMOTE_PAIR,
                      target: [Number(num)],
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
    for (const col of candidateMap[num].col.values()) {
      if (!col) continue;
      if (col.count && col.count > 2) {
        for (let i = 0; i < col.positions.length - 1; i++) {
          for (let j = i + 1; j < col.positions.length; j++) {
            const pos1 = col.positions[i];
            const pos2 = col.positions[j];
            if (
              !isUnitStrongLink(board, pos1, pos2, Number(num), candidateMap) &&
              isStrongLink(pos1, pos2, Number(num), graph)
            ) {
              const graphNode1 = getGraphNode(pos1, Number(num), graph);
              const graphNode2 = getGraphNode(pos2, Number(num), graph);
              if (!graphNode1 || !graphNode2) continue;
              const paths = getGraphNodePaths(graphNode1, graphNode2);
              for (const path of paths) {
                if (path.length === 4 || path.length === 6) {
                  const positions = col.positions
                    .filter((pos) => pos !== pos1 && pos !== pos2)
                    .map((pos) => ({ row: pos.row, col: pos.col }));
                  if (positions.length) {
                    return {
                      position: positions,
                      prompt: path,
                      method: SOLUTION_METHODS.REMOTE_PAIR,
                      target: [Number(num)],
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

    for (const box of candidateMap[num].box.values()) {
      if (!box) continue;
      if (box.count && box.count > 2) {
        for (let i = 0; i < box.positions.length - 1; i++) {
          for (let j = i + 1; j < box.positions.length; j++) {
            const pos1 = box.positions[i];
            const pos2 = box.positions[j];
            if (
              !isUnitStrongLink(board, pos1, pos2, Number(num), candidateMap) &&
              isStrongLink(pos1, pos2, Number(num), graph)
            ) {
              const graphNode1 = getGraphNode(pos1, Number(num), graph);
              const graphNode2 = getGraphNode(pos2, Number(num), graph);
              if (!graphNode1 || !graphNode2) continue;
              const paths = getGraphNodePaths(graphNode1, graphNode2);
              for (const path of paths) {
                if (path.length === 4 || path.length === 6) {
                  const positions = box.positions
                    .filter((pos) => pos !== pos1 && pos !== pos2)
                    .map((pos) => ({ row: pos.row, col: pos.col }));
                  if (positions.length) {
                    return {
                      position: positions,
                      prompt: path,
                      method: SOLUTION_METHODS.REMOTE_PAIR,
                      target: [Number(num)],
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
  }
  return null;
};

export const isInSameBox = (
  pos1: Position | GraphNode,
  pos2: Position | GraphNode
): boolean => {
  return (
    Math.floor((pos1 as Position).row / 3) ===
      Math.floor((pos2 as Position).row / 3) &&
    Math.floor((pos1 as Position).col / 3) ===
      Math.floor((pos2 as Position).col / 3)
  );
};

export const findGraphNodeByDistance = (
  graphNode: GraphNode | null,
  distance: number
): GraphNode[] => {
  if (!graphNode) return [];
  const resultNodes: GraphNode[] = [];
  const visited = new Set<string>();
  const dfs = (node: GraphNode, currentDistance: number) => {
    const key = `${node.row}-${node.col}`;
    if (visited.has(key)) return;
    visited.add(key);

    if (currentDistance === distance) {
      resultNodes.push(node);
      visited.delete(key);
      return;
    }

    if (currentDistance < distance) {
      for (const nextNode of node.next) {
        dfs(nextNode, currentDistance + 1);
      }
    }
    visited.delete(key);
  };

  dfs(graphNode, 0);

  return resultNodes;
};

// 已知两个强关联的格子，寻找A到B为4个格子的所有路径
export const findFourPath = (
  pos1: Position,
  pos2: Position,
  num: number,
  graph: Graph
): Position[][] => {
  const startNode = findGraphNodeByPosition(pos1, num, graph);
  if (!startNode) {
    return [];
  }

  const visited: Set<string> = new Set();
  const path: Position[] = [];
  const allPaths: Position[][] = [];

  const dfs = (node: GraphNode) => {
    const key = `${node.row},${node.col}`;

    if (visited.has(key)) {
      return;
    }

    visited.add(key);
    path.push({ row: node.row, col: node.col });

    if (path.length === 4 && node.row === pos2.row && node.col === pos2.col) {
      allPaths.push([...path]);
    }

    if (path.length < 4) {
      for (const nextNode of node.next) {
        dfs(nextNode);
      }
    }

    visited.delete(key);
    path.pop();
  };

  dfs(startNode);
  return allPaths;
};

// 组合链,2-2、4
export const combinationChain = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    for (const box of candidateMap[num]?.box.values() ?? []) {
      if (box.count === 3) {
        const [pos1, pos2, pos3] = box.positions;
        let A: Position | null = null;
        let B: Position | null = null;
        let C: Position | null = null;
        if (pos1.row === pos3.row && pos1.row !== pos2.row) {
          A = { row: pos1.row, col: pos1.col };
          B = { row: pos3.row, col: pos3.col };
          C = { row: pos2.row, col: pos2.col };
        }
        if (pos1.row === pos2.row && pos1.row !== pos3.row) {
          A = { row: pos1.row, col: pos1.col };
          B = { row: pos2.row, col: pos2.col };
          C = { row: pos3.row, col: pos3.col };
        }
        if (pos2.row === pos3.row && pos1.row !== pos2.row) {
          A = { row: pos2.row, col: pos2.col };
          B = { row: pos3.row, col: pos3.col };
          C = { row: pos1.row, col: pos1.col };
        }
        if (A && B && C) {
          // 让单节点为桥梁
          for (const D of candidateMap[num].col.get(C.col)?.positions ?? []) {
            if (!isInSameBox(D, C)) {
              const graphNodeD = getGraphNode(D, num, graph);
              // 寻找距离D为1的强连接
              for (const graphNodeE of graphNodeD?.next ?? []) {
                if (
                  isInSameBox(graphNodeE, C) ||
                  isInSameBox(graphNodeE, D) ||
                  isInSameBox(graphNodeE, A) ||
                  isInSameBox(graphNodeE, B)
                )
                  continue;
                if (
                  board[C.row]?.[graphNodeE.col].value === null &&
                  board[A.row]?.[graphNodeE.col]?.draft?.includes(num)
                ) {
                  return {
                    position: [{ row: A.row, col: graphNodeE.col }],
                    prompt: [
                      A,
                      B,
                      C,
                      { row: D.row, col: D.col },
                      { row: graphNodeE.row, col: graphNodeE.col },
                    ],
                    method: SOLUTION_METHODS.COMBINATION_CHAIN,
                    target: [num],
                    isFill: false,
                    isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                    chainStructure: "3-2-1",
                  };
                }
              }
              // 寻找距离D为3的强连接
              const graphNodes = findGraphNodeByDistance(graphNodeD, 3);
              for (const graphNodeG of graphNodes) {
                const paths = findFourPath(D, graphNodeG, num, graph);
                for (const path of paths) {
                  if (
                    path.some(
                      (p) =>
                        (p.row === A?.row && p.col === A?.col) ||
                        (p.row === B?.row && p.col === B?.col) ||
                        (p.row === C?.row && p.col === C?.col)
                    )
                  ) {
                    continue;
                  }
                  if (
                    board[A.row]?.[graphNodeG.col].value === null &&
                    board[A.row]?.[graphNodeG.col]?.draft?.includes(num)
                  ) {
                    return {
                      position: [{ row: A.row, col: graphNodeG.col }],
                      prompt: [A, B, C, ...path],
                      method: SOLUTION_METHODS.COMBINATION_CHAIN,
                      target: [num],
                      isFill: false,
                      isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                      chainStructure: "3-4-1",
                    };
                  }
                }
              }
            }
            // 让双节点为桥梁
            for (const D of candidateMap[num].row.get(A.row)?.positions ?? []) {
              if (!isInSameBox(D, C)) {
                const graphNodeD = getGraphNode(D, num, graph);
                // 寻找距离D为1的强连接
                for (const graphNodeE of graphNodeD?.next ?? []) {
                  if (
                    isInSameBox(graphNodeE, C) ||
                    isInSameBox(graphNodeE, D) ||
                    isInSameBox(graphNodeE, A) ||
                    isInSameBox(graphNodeE, B)
                  )
                    continue;

                  if (
                    board[C.row]?.[graphNodeE.col].value === null &&
                    board[graphNodeE.row]?.[C.col]?.draft?.includes(num)
                  ) {
                    return {
                      position: [{ row: C.row, col: graphNodeE.col }],
                      prompt: [
                        A,
                        B,
                        C,
                        { row: D.row, col: D.col },
                        { row: graphNodeE.row, col: graphNodeE.col },
                      ],
                      method: SOLUTION_METHODS.COMBINATION_CHAIN,
                      target: [num],
                      isFill: false,
                      isWeakLink:
                        candidateMap[num].row.get(A.row)?.count != 3
                          ? true
                          : false,
                      chainStructure: "3-2-2",
                    };
                  }
                }
              }
            }
          }
          A = null;
          B = null;
          C = null;
          if (pos1.col === pos3.col && pos1.col !== pos2.col) {
            A = { row: pos1.row, col: pos1.col };
            B = { row: pos3.row, col: pos3.col };
            C = { row: pos2.row, col: pos2.col };
          }
          if (pos1.col === pos2.col && pos1.col !== pos3.col) {
            A = { row: pos1.row, col: pos1.col };
            B = { row: pos2.row, col: pos2.col };
            C = { row: pos3.row, col: pos3.col };
          }
          if (pos2.col === pos3.col && pos1.col !== pos2.col) {
            A = { row: pos2.row, col: pos2.col };
            B = { row: pos3.row, col: pos3.col };
            C = { row: pos1.row, col: pos1.col };
          }

          if (A && B && C) {
            // 让单节点为桥梁
            for (const D of candidateMap[num].row.get(C.row)?.positions ?? []) {
              if (!isInSameBox(D, C)) {
                const graphNodeD = getGraphNode(D, num, graph);

                // 寻找距离D为1的强连接
                for (const graphNodeE of graphNodeD?.next ?? []) {
                  if (
                    isInSameBox(graphNodeE, C) ||
                    isInSameBox(graphNodeE, D) ||
                    isInSameBox(graphNodeE, A) ||
                    isInSameBox(graphNodeE, B)
                  )
                    continue;

                  if (
                    board[C.row]?.[graphNodeE.col].value === null &&
                    board[graphNodeE.row]?.[A.col]?.draft?.includes(num)
                  ) {
                    return {
                      position: [{ row: graphNodeE.row, col: A.col }],
                      prompt: [
                        A,
                        B,
                        C,
                        { row: D.row, col: D.col },
                        { row: graphNodeE.row, col: graphNodeE.col },
                      ],
                      method: SOLUTION_METHODS.COMBINATION_CHAIN,
                      target: [num],
                      isFill: false,
                      isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                      chainStructure: "3-2-1",
                    };
                  }
                }
                // 寻找距离D为3的强连接
                const graphNodes = findGraphNodeByDistance(graphNodeD, 3);
                for (const graphNodeG of graphNodes) {
                  const paths = findFourPath(D, graphNodeG, num, graph);
                  for (const path of paths) {
                    if (
                      path.some(
                        (p) =>
                          (p.row === A?.row && p.col === A?.col) ||
                          (p.row === B?.row && p.col === B?.col) ||
                          (p.row === C?.row && p.col === C?.col)
                      )
                    ) {
                      continue;
                    }
                    if (
                      board[graphNodeG.row]?.[A.col].value === null &&
                      board[graphNodeG.row]?.[A.col]?.draft?.includes(num)
                    ) {
                      return {
                        position: [{ row: graphNodeG.row, col: A.col }],
                        prompt: [A, B, C, ...path],
                        method: SOLUTION_METHODS.COMBINATION_CHAIN,
                        target: [num],
                        isFill: false,
                        isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                        chainStructure: "3-4-1",
                      };
                    }
                  }
                }
              }
            }
            // 让双节点为桥梁
            for (const D of candidateMap[num].col.get(A.col)?.positions ?? []) {
              if (!isInSameBox(D, C)) {
                const graphNodeD = getGraphNode(D, num, graph);
                // 寻找距离D为1的强连接
                for (const graphNodeE of graphNodeD?.next ?? []) {
                  if (
                    isInSameBox(graphNodeE, C) ||
                    isInSameBox(graphNodeE, D) ||
                    isInSameBox(graphNodeE, A) ||
                    isInSameBox(graphNodeE, B)
                  )
                    continue;

                  if (
                    board[C.row]?.[graphNodeE.col].value === null &&
                    board[C.row]?.[graphNodeE.col]?.draft?.includes(num)
                  ) {
                    return {
                      position: [{ row: C.row, col: graphNodeE.col }],
                      prompt: [
                        A,
                        B,
                        C,
                        { row: D.row, col: D.col },
                        { row: graphNodeE.row, col: graphNodeE.col },
                      ],
                      method: SOLUTION_METHODS.COMBINATION_CHAIN,
                      target: [num],
                      isFill: false,
                      isWeakLink:
                        candidateMap[num].col.get(A.col)?.count != 3
                          ? true
                          : false,
                      chainStructure: "3-2-2",
                    };
                  }
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
        const paths = findFourPath(pos1, pos2, num, graph);
        for (const path of paths) {
          if (path.length !== 4) {
            continue;
          }

          // 找到共同影响的区域
          let affectedPositions = findCommonAffectedPositions(
            pos1,
            pos2,
            board,
            num
          );

          // 排除与路径开头和结尾都为强连接的位置
          affectedPositions = affectedPositions.filter((pos) => {
            const isStrongLinkWithStart = isUnitStrongLink(
              board,
              pos,
              path[0],
              num,
              candidateMap
            );
            const isStrongLinkWithEnd = isUnitStrongLink(
              board,
              pos,
              path[3],
              num,
              candidateMap
            );
            return !(isStrongLinkWithStart && isStrongLinkWithEnd);
          });

          if (
            affectedPositions.length > 0 &&
            !affectedPositions.some((pos) =>
              path.some(
                (pathPos) => pathPos.row === pos.row && pathPos.col === pos.col
              )
            )
          ) {
            return {
              position: affectedPositions,
              prompt: path,
              method: SOLUTION_METHODS.SKYSCRAPER,
              target: [num],
              isFill: false,
            };
          }
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

// 三阶鱼
export const swordfish = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 检查行
  const rowResult = checkSwordfish(board, candidateMap, true);
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkSwordfish(board, candidateMap, false);
  if (colResult) return colResult;

  return null;
};

const checkSwordfish = (
  board: CellData[][],
  candidateMap: CandidateMap,
  isRow: boolean
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    const candidatePositions: Position[][] = [];

    // 收集候选数字位置
    for (let i = 0; i < 9; i++) {
      const positions = isRow
        ? candidateMap[num]?.row?.get(i)?.positions ?? []
        : candidateMap[num]?.col?.get(i)?.positions ?? [];
      if (positions.length >= 2 && positions.length <= 3) {
        candidatePositions.push(positions);
      }
    }

    // 检查三阶鱼模式
    if (candidatePositions.length >= 3) {
      for (let i = 0; i < candidatePositions.length - 2; i++) {
        for (let j = i + 1; j < candidatePositions.length - 1; j++) {
          for (let k = j + 1; k < candidatePositions.length; k++) {
            const combinedPositions = [
              ...candidatePositions[i],
              ...candidatePositions[j],
              ...candidatePositions[k],
            ];
            const uniqueIndices = new Set(
              combinedPositions.map((pos) => (isRow ? pos.col : pos.row))
            );

            if (uniqueIndices.size === 3) {
              const a = isRow
                ? candidatePositions[0][0].row
                : candidatePositions[0][0].col;
              const b = isRow
                ? candidatePositions[1][0].row
                : candidatePositions[1][0].col;
              const c = isRow
                ? candidatePositions[2][0].row
                : candidatePositions[2][0].col;
              if (
                Math.floor(a / 3) == Math.floor(b / 3) ||
                Math.floor(a / 3) == Math.floor(c / 3) ||
                Math.floor(b / 3) == Math.floor(c / 3)
              ) {
                continue;
              }

              const affectedPositions: Position[] = [];

              // 寻找可以消除候选数字的位置
              for (const index of uniqueIndices) {
                for (let m = 0; m < 9; m++) {
                  const checkPos = isRow
                    ? { row: m, col: index }
                    : { row: index, col: m };
                  if (
                    !combinedPositions.some(
                      (pos) =>
                        pos.row === checkPos.row && pos.col === checkPos.col
                    )
                  ) {
                    const cell = board[checkPos.row]?.[checkPos.col];
                    if (cell?.draft?.includes(num)) {
                      affectedPositions.push(checkPos);
                    }
                  }
                }
              }

              if (affectedPositions.length > 0) {
                return {
                  position: affectedPositions,
                  prompt: combinedPositions,
                  method: isRow
                    ? SOLUTION_METHODS.SWORDFISH_ROW
                    : SOLUTION_METHODS.SWORDFISH_COLUMN,
                  target: [num],
                  isFill: false,
                  rows: isRow ? [a, b, c] : undefined,
                  cols: isRow ? undefined : [a, b, c],
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

// wxyz-wing
export const wxyzWing = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 遍历所有数字找到可能的pivot
  for (let num1 = 1; num1 <= 8; num1++) {
    for (let num2 = num1 + 1; num2 <= 9; num2++) {
      const candidates1 = candidateMap[num1]?.all ?? [];
      const candidates2 = candidateMap[num2]?.all ?? [];

      // 找到同时包含num1和num2的格子作为pivot
      const pivots = candidates1.filter((pos1) =>
        candidates2.some(
          (pos2) =>
            pos2.row === pos1.row &&
            pos2.col === pos1.col &&
            board[pos1.row][pos1.col].draft.length === 2
        )
      );

      for (const pivot of pivots) {
        const pivotCell = board[pivot.row][pivot.col];
        const [x, y] = pivotCell.draft;

        // 找C
        const units = getUnits(pivot, board);

        for (const unit of units) {
          const cellC = board[unit.row][unit.col];
          if (cellC.draft.length !== 2) continue;
          const [w, z] = cellC.draft;
          if (w === x || w === y || z === x || z === y) {
            continue;
          }
          // 找A
          const commonUnits = getCommonUnits(unit, pivot, board);
          for (const commonUnit of commonUnits) {
            const cellA = board[commonUnit.row][commonUnit.col];
            if (commonUnit.row == pivot.row && commonUnit.col == pivot.col)
              continue;
            if (cellA.draft.length !== 2) continue;
            const [a1, a2] = cellA.draft;
            if (pivotCell.draft.includes(a1) && pivotCell.draft.includes(a2))
              continue;
            if (cellC.draft.includes(a1) && cellC.draft.includes(a2)) continue;
            const draft = [...pivotCell.draft, ...cellC.draft];
            if (!draft.includes(a1) || !draft.includes(a2)) continue;

            // 找B
            const units2 = getUnits(pivot, board);
            for (const unit2 of units2) {
              if (unit2.row === commonUnit.row && unit2.col === commonUnit.col)
                continue;
              if (unit2.row === unit.row && unit2.col === unit.col) continue;
              const cellB = board[unit2.row][unit2.col];
              if (cellB.draft.length !== 2) continue;
              const [b1, b2] = cellB.draft;
              if (cellB.draft.includes(a1) || cellB.draft.includes(a2))
                continue;
              if (!draft.includes(b1) || !draft.includes(b2)) continue;
              const commonUnits2 = getCommonUnits(unit2, unit, board);
              let commonCandidate = null;
              if (cellB.draft.includes(b1) && cellC.draft.includes(b1)) {
                commonCandidate = b1;
              } else if (cellB.draft.includes(b2) && cellC.draft.includes(b2)) {
                commonCandidate = b2;
              }

              const position: Position[] = [];
              for (const commonUnit2 of commonUnits2) {
                if (
                  commonUnit2.row == commonUnit.row &&
                  commonUnit2.col == commonUnit.col
                )
                  continue;
                if (commonUnit2.row == unit.row && commonUnit2.col == unit.col)
                  continue;
                if (
                  commonUnit2.row == unit2.row &&
                  commonUnit2.col == unit2.col
                )
                  continue;
                if (
                  commonUnit2.row == pivot.row &&
                  commonUnit2.col == pivot.col
                )
                  continue;
                const cellD = board[commonUnit2.row][commonUnit2.col];
                if (cellD.draft.includes(commonCandidate!)) {
                  position.push(commonUnit2);
                }
              }
              if (position.length > 0) {
                return {
                  position,
                  prompt: [
                    { row: pivot.row, col: pivot.col },
                    unit,
                    unit2,
                    commonUnit,
                  ],
                  method: SOLUTION_METHODS.WXYZ_WING,
                  target: [commonCandidate!],
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

// 试数法
export const trialAndError = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));
  if (solve(newBoard)) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const cell = board[row][col];
        if (cell.value === null && cell.draft?.length === 2) {
          const correctValue = newBoard[row][col].value;
          return {
            position: [{ row, col }],
            prompt: [{ row, col }],
            method: SOLUTION_METHODS.TRIAL_AND_ERROR,
            target: [correctValue as number],
            isFill: true,
          };
        }
      }
    }
  }
  return null;
};
