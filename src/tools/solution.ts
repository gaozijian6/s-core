import { SOLUTION_METHODS } from '../constans';
import type {
  CandidateMap,
  CandidateStats,
  CellData,
  Graph,
  GraphNode,
  Position,
  Candidate,
} from './index';

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
  label?: string;
  highlightPromts1?: {
    row: number;
    col: number;
    value: number | null;
  }[];
  highlightPromts2?: {
    row: number;
    col: number;
    value: number | null;
  }[];
  highlightPromts3?: {
    row: number;
    col: number;
    value: number | null;
  }[];
  highlightDeletes?: {
    row: number;
    col: number;
    value: number[] | null;
  }[];
}

export interface DifferenceMap {
  [key: string]: number[];
}

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

export const findDifferenceDraft = (
  beforeBoard: CellData[][],
  afterBoard: CellData[][]
): DifferenceMap => {
  const differenceMap: DifferenceMap = {};
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const beforeDraft = beforeBoard[row]?.[col]?.draft || [];
      const afterDraft = afterBoard[row]?.[col]?.draft || [];
      const newCandidates = afterDraft.filter(num => !beforeDraft.includes(num));
      afterDraft.forEach(num => {
        if (!beforeDraft.includes(num)) {
          newCandidates.push(num);
        }
      });
      if (newCandidates.length > 0) {
        differenceMap[`${row},${col}`] = newCandidates;
      }
    }
  }
  return differenceMap;
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
        board[row][col].draft?.forEach(num => {
          rowCandidates[num] = rowCandidates[num] || [];
          rowCandidates[num].push(col);
        });
      }
    }
    for (const [num, cols] of Object.entries(rowCandidates)) {
      if (cols.length === 1) {
        return {
          position: [{ row, col: cols[0] }],
          prompt: cols.map(col => ({ row, col })), // 添加 prompt
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
        board[row][col].draft?.forEach(num => {
          colCandidates[num] = colCandidates[num] || [];
          colCandidates[num].push(row);
        });
      }
    }
    for (const [num, rows] of Object.entries(colCandidates)) {
      if (rows.length === 1) {
        return {
          position: [{ row: rows[0], col }],
          prompt: rows.map(row => ({ row, col })), // 添加 prompt
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
      const boxCandidates: { [key: number]: { row: number; col: number }[] } = {};
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          if (board[row][col].value === null) {
            board[row][col].draft?.forEach(num => {
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
      const boxCandidates: { [key: number]: { row: number; col: number }[] } = {};

      // 收集宫内每个数字的候选位置
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const row = boxRow * 3 + i;
          const col = boxCol * 3 + j;
          if (board[row][col].value === null) {
            board[row][col].draft?.forEach(num => {
              boxCandidates[num] = boxCandidates[num] || [];
              boxCandidates[num].push({ row, col });
            });
          }
        }
      }

      // 检查每个候选数字
      for (const [num, cells] of Object.entries(boxCandidates)) {
        const rows = new Set(cells.map(cell => cell.row));
        const cols = new Set(cells.map(cell => cell.col));

        // 区块摒除法（行）
        if (rows.size === 1) {
          const targetRow = Array.from(rows)[0];
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 9; i++) {
            if (Math.floor(i / 3) !== boxCol) {
              const cell = board[targetRow]?.[i];
              if (cell?.value === null && cell?.draft?.includes?.(Number(num))) {
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
              if (cell?.value === null && cell?.draft?.includes?.(Number(num))) {
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
        board[row]?.[col]?.draft?.forEach(num => {
          rowCandidates[num] = rowCandidates[num] || [];
          rowCandidates[num].push({ col });
        });
      }
    }

    for (const [num, cells] of Object.entries(rowCandidates)) {
      if (cells.length >= 2 && cells.length <= 3) {
        const boxCol = Math.floor(cells[0].col / 3);
        if (cells.every(cell => Math.floor(cell.col / 3) === boxCol)) {
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const checkRow = Math.floor(row / 3) * 3 + i;
              const checkCol = boxCol * 3 + j;
              if (checkRow !== row) {
                const cell = board[checkRow]?.[checkCol];
                if (cell?.value === null && cell?.draft?.includes?.(Number(num))) {
                  positionsToRemove.push({ row: checkRow, col: checkCol });
                }
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells.map(cell => ({ row, col: cell.col })),
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
        board[row]?.[col]?.draft?.forEach(num => {
          colCandidates[num] = colCandidates[num] || [];
          colCandidates[num].push({ row });
        });
      }
    }

    for (const [num, cells] of Object.entries(colCandidates)) {
      if (cells.length >= 2 && cells.length <= 3) {
        const boxRow = Math.floor(cells[0].row / 3);
        if (cells.every(cell => Math.floor(cell.row / 3) === boxRow)) {
          const positionsToRemove: { row: number; col: number }[] = [];
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const checkRow = boxRow * 3 + i;
              const checkCol = Math.floor(col / 3) * 3 + j;
              if (checkCol !== col) {
                const cell = board[checkRow]?.[checkCol];
                if (cell?.value === null && cell?.draft?.includes?.(Number(num))) {
                  positionsToRemove.push({ row: checkRow, col: checkCol });
                }
              }
            }
          }
          if (positionsToRemove.length > 0) {
            return {
              position: positionsToRemove,
              prompt: cells.map(cell => ({ row: cell.row, col })),
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
    const pairCandidates = candidates.filter(cell => cell.candidates.length === 2);

    for (let i = 0; i < pairCandidates.length; i++) {
      const cell1 = pairCandidates[i];
      const [num1, num2] = cell1.candidates;

      // 检查行、列、宫
      const units = [
        { type: 'row', value: cell1.row },
        { type: 'col', value: cell1.col },
        {
          type: 'box',
          value: Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3),
        },
      ];

      for (const unit of units) {
        const unitCells =
          (
            candidateMap[num][unit.type as keyof (typeof candidateMap)[number]] as Map<
              number,
              CandidateStats
            >
          )?.get?.(unit.value)?.positions ?? [];
        // 在同一单元中找到另一个具有相同候选数的方格
        const cell2 = unitCells.find(
          c =>
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
                ((unit.type === 'row' && i === cell1.row) ||
                  (unit.type === 'col' && j === cell1.col) ||
                  (unit.type === 'box' &&
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
            const position = affectedCells.map(c => ({
              row: c.row,
              col: c.col,
            }));
            const prompt = [
              { row: cell1.row, col: cell1.col },
              { row: cell2.row, col: cell2.col },
            ];
            const getMethodKey = (unitType: string): string => {
              switch (unitType) {
                case 'row':
                  return 'ROW';
                case 'col':
                  return 'COLUMN';
                case 'box':
                  return 'BOX';
                default:
                  return unitType.toUpperCase();
              }
            };
            const method =
              SOLUTION_METHODS[
                `NAKED_PAIR_${getMethodKey(unit.type)}` as keyof typeof SOLUTION_METHODS
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
  const rowResult = checkNakedTriple1(board, 'row');
  if (rowResult) return rowResult;

  // 检查列
  const colResult = checkNakedTriple1(board, 'col');
  if (colResult) return colResult;

  // 检查宫
  const boxResult = checkNakedTriple1(board, 'box');
  if (boxResult) return boxResult;

  return null;
};

const checkNakedTriple1 = (board: CellData[][], unitType: 'row' | 'col' | 'box'): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    const cellsWithCandidates: { pos: Position; candidates: number[] }[] = [];

    // 收集单元内的候选数和位置
    for (let i = 0; i < 9; i++) {
      const [row, col] =
        unitType === 'row'
          ? [unit, i]
          : unitType === 'col'
            ? [i, unit]
            : [Math.floor(unit / 3) * 3 + Math.floor(i / 3), (unit % 3) * 3 + (i % 3)];
      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.length >= 2 && cell.draft?.length <= 3) {
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
            ...new Set([...cellA.candidates, ...cellB.candidates, ...cellC.candidates]),
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
                !cellA.candidates.every(num => cellB.candidates.includes(num))) ||
              (cellA.candidates.length === 2 &&
                cellC.candidates.length === 2 &&
                !cellA.candidates.every(num => cellC.candidates.includes(num))) ||
              (cellB.candidates.length === 2 &&
                cellC.candidates.length === 2 &&
                !cellB.candidates.every(num => cellC.candidates.includes(num)));

            // 三个候选方格里都只有abc候选数
            const allHaveThreeCandidates =
              cellA.candidates.length === 3 &&
              cellB.candidates.length === 3 &&
              cellC.candidates.length === 3 &&
              cellA.candidates.every(num => uniqueCandidates.includes(num)) &&
              cellB.candidates.every(num => uniqueCandidates.includes(num)) &&
              cellC.candidates.every(num => uniqueCandidates.includes(num));

            // 新增条件：两个候选方格有abc候选数，另一个有其中两个
            const twoFullOnePartial =
              (cellA.candidates.length === 3 &&
                cellB.candidates.length === 3 &&
                cellC.candidates.length === 2 &&
                cellC.candidates.every(num => uniqueCandidates.includes(num))) ||
              (cellA.candidates.length === 3 &&
                cellC.candidates.length === 3 &&
                cellB.candidates.length === 2 &&
                cellB.candidates.every(num => uniqueCandidates.includes(num))) ||
              (cellB.candidates.length === 3 &&
                cellC.candidates.length === 3 &&
                cellA.candidates.length === 2 &&
                cellA.candidates.every(num => uniqueCandidates.includes(num)));

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
                  unitType === 'row'
                    ? [unit, m]
                    : unitType === 'col'
                      ? [m, unit]
                      : [Math.floor(unit / 3) * 3 + Math.floor(m / 3), (unit % 3) * 3 + (m % 3)];
                const cell = board[row]?.[col];
                if (
                  cell?.value === null &&
                  !prompt.some(p => p.row === row && p.col === col) &&
                  cell.draft?.some(num => [a, b, c].includes(num))
                ) {
                  affectedPositions.push({ row, col });
                }
              }

              if (affectedPositions.length > 0) {
                const getMethodKey = (unitType: string): string => {
                  switch (unitType) {
                    case 'row':
                      return 'ROW1';
                    case 'col':
                      return 'COLUMN1';
                    case 'box':
                      return 'BOX1';
                    default:
                      return unitType.toUpperCase();
                  }
                };

                const method =
                  SOLUTION_METHODS[
                    `NAKED_TRIPLE_${getMethodKey(unitType)}` as keyof typeof SOLUTION_METHODS
                  ];

                return {
                  position: affectedPositions,
                  prompt,
                  method,
                  target: uniqueCandidates,
                  isFill: false,
                  row: cellA.pos.row,
                  col: cellA.pos.col,
                  box: Math.floor(cellA.pos.row / 3) * 3 + Math.floor(cellA.pos.col / 3),
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
  const rowResult = checkNakedTriple2(board, 'row');
  if (rowResult) return rowResult;

  const colResult = checkNakedTriple2(board, 'col');
  if (colResult) return colResult;

  const boxResult = checkNakedTriple2(board, 'box');
  if (boxResult) return boxResult;

  return null;
};

const checkNakedTriple2 = (board: CellData[][], unitType: 'row' | 'col' | 'box'): Result | null => {
  for (let unit = 0; unit < 9; unit++) {
    const cellsWithCandidates: { pos: Position; candidates: number[] }[] = [];

    for (let i = 0; i < 9; i++) {
      const [row, col] =
        unitType === 'row'
          ? [unit, i]
          : unitType === 'col'
            ? [i, unit]
            : [Math.floor(unit / 3) * 3 + Math.floor(i / 3), (unit % 3) * 3 + (i % 3)];
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
            ...new Set([...cellA.candidates, ...cellB.candidates, ...cellC.candidates]),
          ];

          if (uniqueCandidates.length === 3) {
            const [a, b, c] = uniqueCandidates;
            const affectedPositions: Position[] = [];
            const prompt: Position[] = [cellA.pos, cellB.pos, cellC.pos];

            for (let m = 0; m < 9; m++) {
              const [row, col] =
                unitType === 'row'
                  ? [unit, m]
                  : unitType === 'col'
                    ? [m, unit]
                    : [Math.floor(unit / 3) * 3 + Math.floor(m / 3), (unit % 3) * 3 + (m % 3)];
              const cell = board[row]?.[col];
              if (
                cell?.value === null &&
                !prompt.some(p => p.row === row && p.col === col) &&
                cell.draft?.some(num => [a, b, c].includes(num))
              ) {
                affectedPositions.push({ row, col });
              }
            }

            if (affectedPositions.length > 0) {
              const getMethodKey = (unitType: string): string => {
                switch (unitType) {
                  case 'row':
                    return 'ROW2';
                  case 'col':
                    return 'COLUMN2';
                  case 'box':
                    return 'BOX2';
                  default:
                    return unitType.toUpperCase();
                }
              };
              const method =
                SOLUTION_METHODS[
                  `NAKED_TRIPLE_${getMethodKey(unitType)}` as keyof typeof SOLUTION_METHODS
                ];

              return {
                position: affectedPositions,
                prompt,
                method,
                target: uniqueCandidates,
                isFill: false,
                row: cellA.pos.row,
                col: cellA.pos.col,
                box: Math.floor(cellA.pos.row / 3) * 3 + Math.floor(cellA.pos.col / 3),
              };
            }
          }
        }
      }
    }
  }

  return null;
};

export const hiddenPair = (board: CellData[][], candidateMap: CandidateMap, graph: Graph) => {
  for (let row = 0; row < 9; row++) {
    for (let num1 = 1; num1 <= 8; num1++) {
      for (let num2 = num1 + 1; num2 <= 9; num2++) {
        const { count: count1, positions: positions1 } = candidateMap[num1].row.get(row) || {
          count1: 0,
          positions1: [],
        };
        const { count: count2, positions: positions2 } = candidateMap[num2].row.get(row) || {
          count2: 0,
          positions2: [],
        };
        if (count1 === 2 && count2 === 2) {
          const positionsArray = [...(positions1 || []), ...(positions2 || [])].map(pos => ({
            row: pos.row,
            col: pos.col,
          }));
          const uniquePositions = Array.from(
            new Set(positionsArray.map(pos => JSON.stringify(pos)))
          ).map(str => JSON.parse(str));
          if (uniquePositions.length === 2) {
            const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
            const allCandidatesSet = new Set(allCandidates.flat());
            if (allCandidatesSet.size !== 2) {
              return {
                isFill: false,
                position: uniquePositions,
                prompt: uniquePositions,
                method: SOLUTION_METHODS.HIDDEN_PAIR_ROW,
                target: Array.from(allCandidatesSet).filter(num => num !== num1 && num !== num2),
              };
            }
          }
        }
      }
    }
  }
  for (let col = 0; col < 9; col++) {
    for (let num1 = 1; num1 <= 8; num1++) {
      for (let num2 = num1 + 1; num2 <= 9; num2++) {
        const { count: count1, positions: positions1 } = candidateMap[num1].col.get(col) || {
          count1: 0,
          positions1: [],
        };
        const { count: count2, positions: positions2 } = candidateMap[num2].col.get(col) || {
          count2: 0,
          positions2: [],
        };
        if (count1 === 2 && count2 === 2) {
          const positionsArray = [...(positions1 || []), ...(positions2 || [])].map(pos => ({
            col: pos.col,
            row: pos.row,
          }));
          const uniquePositions = Array.from(
            new Set(positionsArray.map(pos => JSON.stringify(pos)))
          ).map(str => JSON.parse(str));
          if (uniquePositions.length === 2) {
            const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
            const allCandidatesSet = new Set(allCandidates.flat());
            if (allCandidatesSet.size !== 2) {
              return {
                isFill: false,
                position: uniquePositions,
                prompt: uniquePositions,
                method: SOLUTION_METHODS.HIDDEN_PAIR_COLUMN,
                target: Array.from(allCandidatesSet).filter(num => num !== num1 && num !== num2),
              };
            }
          }
        }
      }
    }
  }
  for (let box = 0; box < 9; box++) {
    for (let num1 = 1; num1 <= 8; num1++) {
      for (let num2 = num1 + 1; num2 <= 9; num2++) {
        const { count: count1, positions: positions1 } = candidateMap[num1].box.get(box) || {
          count1: 0,
          positions1: [],
        };
        const { count: count2, positions: positions2 } = candidateMap[num2].box.get(box) || {
          count2: 0,
          positions2: [],
        };
        if (count1 === 2 && count2 === 2) {
          const positionsArray = [...(positions1 || []), ...(positions2 || [])].map(pos => ({
            col: pos.col,
            row: pos.row,
          }));
          const uniquePositions = Array.from(
            new Set(positionsArray.map(pos => JSON.stringify(pos)))
          ).map(str => JSON.parse(str));
          if (uniquePositions.length === 2) {
            const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
            const allCandidatesSet = new Set(allCandidates.flat());
            if (allCandidatesSet.size !== 2) {
              return {
                isFill: false,
                position: uniquePositions,
                prompt: uniquePositions,
                method: SOLUTION_METHODS.HIDDEN_PAIR_BOX,
                target: Array.from(allCandidatesSet).filter(num => num !== num1 && num !== num2),
              };
            }
          }
        }
      }
    }
  }
  return null;
};

export const hiddenTriple = (board: CellData[][], candidateMap: CandidateMap, graph: Graph) => {
  for (let row = 0; row < 9; row++) {
    for (let num1 = 1; num1 <= 7; num1++) {
      for (let num2 = num1 + 1; num2 <= 8; num2++) {
        for (let num3 = num2 + 1; num3 <= 9; num3++) {
          const { count: count1, positions: positions1 } = candidateMap[num1].row.get(row) || {
            count1: 0,
            positions1: [],
          };
          const { count: count2, positions: positions2 } = candidateMap[num2].row.get(row) || {
            count2: 0,
            positions2: [],
          };
          const { count: count3, positions: positions3 } = candidateMap[num3].row.get(row) || {
            count3: 0,
            positions3: [],
          };
          if (count1 <= 3 && count2 <= 3 && count3 <= 3) {
            const positionsArray = [
              ...(positions1 || []),
              ...(positions2 || []),
              ...(positions3 || []),
            ].map(pos => ({ row: pos.row, col: pos.col }));
            const uniquePositions = Array.from(
              new Set(positionsArray.map(pos => JSON.stringify(pos)))
            ).map(str => JSON.parse(str));
            if (uniquePositions.length === 3) {
              const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
              const allCandidatesSet = new Set(allCandidates.flat());
              if (allCandidatesSet.size !== 3) {
                return {
                  isFill: false,
                  position: uniquePositions,
                  prompt: uniquePositions,
                  method: SOLUTION_METHODS.HIDDEN_TRIPLE_ROW,
                  target: Array.from(allCandidatesSet).filter(
                    num => num !== num1 && num !== num2 && num !== num3
                  ),
                };
              }
            }
          }
        }
      }
    }
  }
  for (let col = 0; col < 9; col++) {
    for (let num1 = 1; num1 <= 7; num1++) {
      for (let num2 = num1 + 1; num2 <= 8; num2++) {
        for (let num3 = num2 + 1; num3 <= 9; num3++) {
          const { count1, positions: positions1 } = candidateMap[num1].col.get(col) || {
            count1: 0,
            positions1: [],
          };
          const { count2, positions: positions2 } = candidateMap[num2].col.get(col) || {
            count2: 0,
            positions2: [],
          };
          const { count3, positions: positions3 } = candidateMap[num3].col.get(col) || {
            count3: 0,
            positions3: [],
          };
          if (count1 <= 3 && count2 <= 3 && count3 <= 3) {
            const positionsArray = [
              ...(positions1 || []),
              ...(positions2 || []),
              ...(positions3 || []),
            ].map(pos => ({ col: pos.col, row: pos.row }));
            const uniquePositions = Array.from(
              new Set(positionsArray.map(pos => JSON.stringify(pos)))
            ).map(str => JSON.parse(str));
            if (uniquePositions.length === 3) {
              const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
              const allCandidatesSet = new Set(allCandidates.flat());
              if (allCandidatesSet.size !== 3) {
                return {
                  isFill: false,
                  position: uniquePositions,
                  prompt: uniquePositions,
                  method: SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN,
                  target: Array.from(allCandidatesSet).filter(
                    num => num !== num1 && num !== num2 && num !== num3
                  ),
                };
              }
            }
          }
        }
      }
    }
  }
  for (let box = 0; box < 9; box++) {
    for (let num1 = 1; num1 <= 7; num1++) {
      for (let num2 = num1 + 1; num2 <= 8; num2++) {
        for (let num3 = num2 + 1; num3 <= 9; num3++) {
          const { count1, positions: positions1 } = candidateMap[num1].box.get(box) || {
            count1: 0,
            positions1: [],
          };
          const { count2, positions: positions2 } = candidateMap[num2].box.get(box) || {
            count2: 0,
            positions2: [],
          };
          const { count3, positions: positions3 } = candidateMap[num3].box.get(box) || {
            count3: 0,
            positions3: [],
          };
          if (count1 <= 3 && count2 <= 3 && count3 <= 3) {
            const positionsArray = [
              ...(positions1 || []),
              ...(positions2 || []),
              ...(positions3 || []),
            ].map(pos => ({ col: pos.col, row: pos.row }));
            const uniquePositions = Array.from(
              new Set(positionsArray.map(pos => JSON.stringify(pos)))
            ).map(str => JSON.parse(str));
            if (uniquePositions.length === 3) {
              const allCandidates = uniquePositions.map(pos => board[pos.row][pos.col].draft);
              const allCandidatesSet = new Set(allCandidates.flat());
              if (allCandidatesSet.size !== 3) {
                return {
                  isFill: false,
                  position: uniquePositions,
                  prompt: uniquePositions,
                  method: SOLUTION_METHODS.HIDDEN_TRIPLE_BOX,
                  target: Array.from(allCandidatesSet).filter(
                    num => num !== num1 && num !== num2 && num !== num3
                  ),
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

          const index = isRow ? 'col' : 'row';
          if (pos1[index] === pos3[index] && pos2[index] === pos4[index]) {
            const affectedPositions: Position[] = [];

            for (let k = 0; k < 9; k++) {
              if (k !== pos1[isRow ? 'row' : 'col'] && k !== pos3[isRow ? 'row' : 'col']) {
                const checkPos1 = isRow ? { row: k, col: pos1.col } : { row: pos1.row, col: k };
                const checkPos2 = isRow ? { row: k, col: pos2.col } : { row: pos2.row, col: k };

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
                method: isRow ? SOLUTION_METHODS.X_WING_ROW : SOLUTION_METHODS.X_WING_COLUMN,
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
            const posC = otherPositions.find(pos =>
              isRow
                ? pos.col === posA.col || pos.col === posB.col
                : pos.row === posA.row || pos.row === posB.row
            );

            if (posC) {
              const groupD = otherPositions.filter(pos => pos !== posC);

              const isGroupDInSameBox = groupD.every(
                pos =>
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
                  !groupD.some(pos => pos.row === r && pos.col === c);

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
                    const targetCol = posC.col === posA.col ? posB.col : posA.col;
                    for (let r = cdBoxRow * 3; r < cdBoxRow * 3 + 3; r++) {
                      if (isNotABCD(r, targetCol) && board[r][targetCol].draft?.includes(num)) {
                        positionsToExclude.push({ row: r, col: targetCol });
                      }
                    }
                  } else {
                    const targetRow = posC.row === posA.row ? posB.row : posA.row;
                    for (let c = cdBoxCol * 3; c < cdBoxCol * 3 + 3; c++) {
                      if (isNotABCD(targetRow, c) && board[targetRow][c].draft?.includes(num)) {
                        positionsToExclude.push({ row: targetRow, col: c });
                      }
                    }
                  }
                }

                if (
                  positionsToExclude.length > 0 &&
                  Math.floor(groupD[0].row / 3) === Math.floor(positionsToExclude[0].row / 3) &&
                  Math.floor(groupD[0].col / 3) === Math.floor(positionsToExclude[0].col / 3)
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
          const commonCandidateBC = candidatesB.find(num => candidatesC.includes(num));
          const commonCandidateAC = candidatesA.find(num => candidatesC.includes(num));
          const commonCandidateAB = candidatesA.find(num => candidatesB.includes(num));
          if (!commonCandidateBC || !commonCandidateAC || !commonCandidateAB) {
            continue;
          }
          if (new Set([commonCandidateBC, commonCandidateAC, commonCandidateAB]).size !== 3) {
            continue;
          }
          // 找到符合条件的 XY-Wing
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
          const commonCandidateAC = candidatesA.find(num => candidatesC.includes(num));
          const commonCandidateBA = candidatesB.find(num => candidatesA.includes(num));
          const commonCandidateBC = candidatesB.find(num => candidatesC.includes(num));
          if (!commonCandidateAC || !commonCandidateBA || !commonCandidateBC) {
            continue;
          }
          if (new Set([commonCandidateAC, commonCandidateBA, commonCandidateBC]).size !== 3) {
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
                if (cell?.value === null && cell.draft?.includes(targetNumber)) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length > 0) {
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
          const commonCandidateAB = candidatesA.find(num => candidatesB.includes(num));
          const commonCandidateCA = candidatesC.find(num => candidatesA.includes(num));
          const commonCandidateCB = candidatesC.find(num => candidatesB.includes(num));
          if (!commonCandidateAB || !commonCandidateCA || !commonCandidateCB) {
            continue;
          }
          if (new Set([commonCandidateAB, commonCandidateCA, commonCandidateCB]).size !== 3) {
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
                if (cell?.value === null && cell.draft?.includes(targetNumber)) {
                  affectedPositions.push({ row, col });
                }
              }
            }
          }

          if (affectedPositions.length > 0) {
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
        const cellsInRow = candidateMap[x]?.row?.get(cellA.row)?.positions ?? [];
        const cellsInCol = candidateMap[x]?.col?.get(cellA.col)?.positions ?? [];
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
          if ((!hasCXY && !hasCXZ) || (hasCXY && hasXY) || (hasCXZ && hasXZ)) continue;

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
    cell1.draft.every(n => cell2.draft.includes(n))
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
    const otherNum1 = cell1.draft.find(n => n !== num);
    const otherNum2 = cell2.draft.find(n => n !== num);

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
          if (col !== position1.col && col !== position2.col && checkCellC(position1.row, col)) {
            return true;
          }
        }
      }

      if (isSameCol) {
        for (let row = 0; row < 9; row++) {
          if (row !== position1.row && row !== position2.row && checkCellC(row, position1.col)) {
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
    const [a, b] = cellA.draft.filter(n => n !== num);
    if (cellB.draft.includes(num) && (cellB.draft.includes(a) || cellB.draft.includes(b))) {
      const units = getCommonUnits(positionA, positionB, board);
      for (const unit of units) {
        const cellC = board[unit.row]?.[unit.col];
        if (cellC.draft.includes(num)) continue;
        if (cellC.draft.length === 2) {
          if (cellA.draft.includes(cellC.draft[0]) && cellA.draft.includes(cellC.draft[1])) {
            return true;
          }
        }
      }
    }
  } else if (cellA.draft.length === 3 && cellB.draft.length === 3) {
    if (cellA.draft.every(n => cellB.draft.includes(n))) {
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
  const box1 = Math.floor(position1.row / 3) * 3 + Math.floor(position1.col / 3);
  const box2 = Math.floor(position2.row / 3) * 3 + Math.floor(position2.col / 3);
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
        if (isUnitStrongLink(board, position1, position2, Number(num), candidateMap)) {
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

      if (currentNode.row === position1.row && currentNode.col === position1.col) {
        foundPosition1 = true;
      }

      if (currentNode.row === position2.row && currentNode.col === position2.col) {
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

export const getGraphNode = (pos: Position, num: number, graph: Graph): GraphNode | null => {
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
    if (currentNode.row === targetNode.row && currentNode.col === targetNode.col) {
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
  dfs(graphNode1, graphNode2, visited, [{ row: graphNode1.row, col: graphNode1.col }]);

  return paths;
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
    const queue: { node: GraphNode; depth: number }[] = [{ node: startNode, depth: 0 }];
    const visited: Set<string> = new Set();

    while (queue.length > 0) {
      const { node: currentNode, depth } = queue.shift()!;
      const key = `${currentNode.row},${currentNode.col}`;

      if (visited.has(key)) {
        continue;
      }

      visited.add(key);

      if (currentNode.row === position1.row && currentNode.col === position1.col) {
        // 找到第一个位置，继续搜索第二个位置
        const subQueue: { node: GraphNode; depth: number }[] = [{ node: currentNode, depth: 0 }];
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

        if (true) {
          // 寻找一条包含四个节点的路径
          const paths = findFourPath(pos1, pos2, num, graph);
          for (const path of paths) {
            if (path.length !== 4) {
              continue;
            }

            // 找到共同影响的区域
            let affectedPositions = findCommonAffectedPositions(pos1, pos2, board, num);

            // 排除与路径开头和结尾都为强连接的位置
            affectedPositions = affectedPositions.filter(pos => {
              const isStrongLinkWithStart = isUnitStrongLink(
                board,
                pos,
                path[0],
                num,
                candidateMap
              );
              const isStrongLinkWithEnd = isUnitStrongLink(board, pos, path[3], num, candidateMap);
              return !(isStrongLinkWithStart && isStrongLinkWithEnd);
            });

            if (
              affectedPositions.length > 0 &&
              !affectedPositions.some(pos =>
                path.some(pathPos => pathPos.row === pos.row && pathPos.col === pos.col)
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

        if (true) {
          // 寻找一条包含六个节点的路径
          const paths = findSixPath(pos1, pos2, num, graph);
          for (const path of paths) {
            if (path.length !== 6) {
              continue;
            }

            // 找到共同影响的区域
            let affectedPositions = findCommonAffectedPositions(pos1, pos2, board, num);

            // 排除与路径开头和结尾都为强连接的位置
            affectedPositions = affectedPositions.filter(pos => {
              const isStrongLinkWithStart = isUnitStrongLink(
                board,
                pos,
                path[0],
                num,
                candidateMap
              );
              const isStrongLinkWithEnd = isUnitStrongLink(board, pos, path[5], num, candidateMap);
              return !(isStrongLinkWithStart && isStrongLinkWithEnd);
            });

            if (
              affectedPositions.length > 0 &&
              !affectedPositions.some(pos =>
                path.some(pathPos => pathPos.row === pos.row && pathPos.col === pos.col)
              )
            ) {
              return {
                position: affectedPositions,
                prompt: path,
                method: SOLUTION_METHODS.SKYSCRAPER,
                target: [num],
                isFill: false,
                label: '6',
              };
            }
          }
        }
      }
    }
  }

  return null;
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
export const skyscraper2 = (
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
              if (isWeakLink(board, nodesArr[i][k], nodesArr[j][l], Number(num), candidateMap)) {
                const graphNode1 = findGraphNodeByPosition(nodesArr[i][k], Number(num), graph);
                const graphNode2 = findGraphNodeByPosition(nodesArr[j][l], Number(num), graph);
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
                            nodesArr[j][l],
                            { row: graphNode2_1.row, col: graphNode2_1.col },
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

export const isInSameBox = (pos1: Position | GraphNode, pos2: Position | GraphNode): boolean => {
  return (
    Math.floor((pos1 as Position).row / 3) === Math.floor((pos2 as Position).row / 3) &&
    Math.floor((pos1 as Position).col / 3) === Math.floor((pos2 as Position).col / 3)
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
                    chainStructure: '3-2-1',
                  };
                }
              }
              // 寻找距离D为3的强连接
              const graphNodes = findGraphNodeByDistance(graphNodeD, 3);
              for (const graphNodeG of graphNodes ?? []) {
                const paths = findFourPath(D, graphNodeG, num, graph);
                for (const path of paths) {
                  if (
                    path.some(
                      p =>
                        (p.row === A?.row && p.col === A?.col) ||
                        (p.row === B?.row && p.col === B?.col) ||
                        (p.row === C?.row && p.col === C?.col)
                    )
                  ) {
                    continue;
                  }
                  let position: Position[] = [];
                  if (
                    Math.floor(A.row / 3) !== Math.floor(graphNodeG.row / 3) &&
                    board[A.row]?.[graphNodeG.col].value === null &&
                    board[A.row]?.[graphNodeG.col]?.draft?.includes(num) &&
                    graphNodeG.col !== A.col &&
                    graphNodeG.col !== B.col
                  ) {
                    position.push({ row: A.row, col: graphNodeG.col });
                  } else if (Math.floor(A.row / 3) === Math.floor(graphNodeG.row / 3)) {
                    for (let col = 0; col < 9; col++) {
                      if (
                        Math.floor(col / 3) === Math.floor(graphNodeG.col / 3) &&
                        board[A.row]?.[col].value === null &&
                        board[A.row]?.[col]?.draft?.includes(num) &&
                        col !== A.col &&
                        col !== B.col
                      ) {
                        position.push({ row: A.row, col });
                      }
                    }
                  }

                  // 检查position中的元素是否与prompt中的元素位置相同，如果相同则剔除
                  const promptPositions = [A, B, C, ...path];
                  position = position.filter(
                    pos =>
                      !promptPositions.some(
                        promptPos => promptPos.row === pos.row && promptPos.col === pos.col
                      )
                  );

                  // 如果position为空，则不返回结果
                  if (position.length === 0) {
                    continue;
                  }
                  return {
                    position,
                    prompt: [A, B, C, ...path],
                    method: SOLUTION_METHODS.COMBINATION_CHAIN,
                    target: [num],
                    isFill: false,
                    isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                    chainStructure: '3-4-1',
                  };
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
                      position: [{ row: graphNodeE.row, col: C.col }],
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
                      isWeakLink: candidateMap[num].row.get(A.row)?.count != 3 ? true : false,
                      chainStructure: '3-2-2',
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
                      chainStructure: '3-2-1',
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
                        p =>
                          (p.row === A?.row && p.col === A?.col) ||
                          (p.row === B?.row && p.col === B?.col) ||
                          (p.row === C?.row && p.col === C?.col)
                      )
                    ) {
                      continue;
                    }
                    // 检查列的情况
                    let position: Position[] = [];
                    if (
                      Math.floor(A.col / 3) !== Math.floor(graphNodeG.col / 3) &&
                      board[graphNodeG.row]?.[A.col].value === null &&
                      board[graphNodeG.row]?.[A.col]?.draft?.includes(num) &&
                      graphNodeG.row !== A.row &&
                      graphNodeG.row !== B.row
                    ) {
                      position.push({ row: graphNodeG.row, col: A.col });
                    } else if (Math.floor(A.col / 3) === Math.floor(graphNodeG.col / 3)) {
                      for (let row = 0; row < 9; row++) {
                        if (
                          Math.floor(row / 3) === Math.floor(graphNodeG.row / 3) &&
                          board[row]?.[A.col].value === null &&
                          board[row]?.[A.col]?.draft?.includes(num) &&
                          row !== A.row &&
                          row !== B.row
                        ) {
                          position.push({ row, col: A.col });
                        }
                      }
                    }

                    // 检查position中的元素是否与prompt中的元素位置相同，如果相同则剔除
                    const promptPositions = [A, B, C, ...path];
                    position = position.filter(
                      pos =>
                        !promptPositions.some(
                          promptPos => promptPos.row === pos.row && promptPos.col === pos.col
                        )
                    );

                    // 如果position为空，则不返回结果
                    if (position.length === 0) {
                      continue;
                    }
                    return {
                      position,
                      prompt: [A, B, C, ...path],
                      method: SOLUTION_METHODS.COMBINATION_CHAIN,
                      target: [num],
                      isFill: false,
                      isWeakLink: isWeakLink(board, C, D, num, candidateMap),
                      chainStructure: '3-4-1',
                    };
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
                      isWeakLink: candidateMap[num].col.get(A.col)?.count != 3 ? true : false,
                      chainStructure: '3-2-2',
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
      if ((row === pos1.row && col === pos1.col) || (row === pos2.row && col === pos2.col)) {
        continue;
      }

      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.includes(num)) {
        if (areCellsInSameUnit({ row, col }, pos1) && areCellsInSameUnit({ row, col }, pos2)) {
          affectedPositions.push({ row, col });
        }
      }
    }
  }

  return affectedPositions;
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

// 已知两个强关联的格子，寻找A到B为6个格子的所有路径
export const findSixPath = (
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

    if (path.length === 6 && node.row === pos2.row && node.col === pos2.col) {
      allPaths.push([...path]);
    }

    if (path.length < 6) {
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

// 获取两个格子的共同区域
const getCommonUnits = (pos1: Position, pos2: Position, board: CellData[][]): Position[] => {
  const units: Position[] = [];
  const uniquePositions = new Set<string>();
  const units1 = getUnits(pos1, board);
  const units2 = getUnits(pos2, board);
  for (const unit1 of units1) {
    if (units2.some(unit2 => unit2.row === unit1.row && unit2.col === unit1.col)) {
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

// 试数法
export const trialAndErrorDIY = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  let minLength = 10;
  let minPosition: Position | null = null;
  let minValue: number | null = null;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell.value === null && cell.draft?.length) {
        if (cell.draft.length < minLength) {
          minLength = cell.draft.length;
          minPosition = { row, col };
          minValue = board[row][col].draft[0];
        }
      }
    }
  }

  if (minPosition && minValue) {
    return {
      position: [minPosition],
      prompt: [minPosition],
      method: SOLUTION_METHODS.TRIAL_AND_ERROR,
      target: [minValue],
      isFill: true,
    };
  }
  return null;
};

export const trialAndError = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  answerBoard?: CellData[][]
): Result | null => {
  if (!answerBoard) return null;
  let minLength = 10;
  let minPosition: Position | null = null;
  let minValue: number | null = null;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell.value === null && cell.draft?.length) {
        if (cell.draft.length < minLength) {
          minLength = cell.draft.length;
          minPosition = { row, col };
          minValue = answerBoard[row][col].value;
        }
      }
    }
  }

  if (minPosition && minValue) {
    return {
      position: [minPosition],
      prompt: [minPosition],
      method: SOLUTION_METHODS.TRIAL_AND_ERROR,
      target: [minValue],
      isFill: true,
    };
  }
  return null;
};

export const getGraphNodesArray = (graphNode: GraphNode): GraphNode[] => {
  const resultNodes: GraphNode[] = [];
  const visited = new Set<string>();
  const queue: GraphNode[] = [graphNode];

  while (queue.length > 0) {
    const currentNode = queue.shift();
    if (!currentNode) continue;

    const key = `${currentNode.row}-${currentNode.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    resultNodes.push(currentNode);

    for (const nextNode of currentNode.next) {
      queue.push(nextNode);
    }
  }

  return resultNodes;
};

export const Loop = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (const num in graph) {
    const startNodesArray = graph[num];
    if (startNodesArray.length < 2) continue;
    for (let i = 0; i < startNodesArray.length; i++) {
      const someNode = startNodesArray[i];
      const graphNodesArray = getGraphNodesArray(someNode);
      if (graphNodesArray.length < 3) continue;
      for (const startNode of graphNodesArray) {
        const endNodesArray = findGraphNodeByDistance(startNode, 2);
        for (const endNode of endNodesArray) {
          let endNode1: GraphNode | null = null;
          let startNode1: GraphNode | null = null;
          let j = 0;
          for (j = 0; j < startNodesArray.length; j++) {
            if (j === i) continue;
            const startNodesArray1 = getGraphNodesArray(startNodesArray[j]);
            for (const node of startNodesArray1) {
              if (
                isWeakLink(
                  board,
                  { row: endNode.row, col: endNode.col },
                  { row: node.row, col: node.col },
                  Number(num),
                  candidateMap
                )
              ) {
                endNode1 = node;
              }
            }
          }
          let k = 0;
          for (k = 0; k < startNodesArray.length; k++) {
            if (k === i || k === j) continue;
            const startNodesArray1 = getGraphNodesArray(startNodesArray[k]);
            for (const node of startNodesArray1) {
              if (
                isWeakLink(
                  board,
                  { row: startNode.row, col: startNode.col },
                  { row: node.row, col: node.col },
                  Number(num),
                  candidateMap
                )
              ) {
                startNode1 = node;
              }
            }
          }
          if (
            startNode1 &&
            endNode1 &&
            startNode1.row === endNode1.row &&
            startNode1.col === endNode1.col
          ) {
            continue;
          }
          // 3-2
          if (
            startNode1 &&
            endNode1 &&
            isUnitStrongLink(
              board,
              { row: startNode1.row, col: startNode1.col },
              { row: endNode1.row, col: endNode1.col },
              Number(num),
              candidateMap
            )
          ) {
            let rootNodeArray1 = findGraphNodeByDistance(startNode, 1);
            let rootNodeArray2 = findGraphNodeByDistance(endNode, 1);
            if (rootNodeArray1.length && rootNodeArray2.length) {
              for (const rootNode1 of rootNodeArray1) {
                for (const rootNode2 of rootNodeArray2) {
                  if (rootNode1.row === rootNode2.row && rootNode1.col === rootNode2.col) {
                    return {
                      label: '3-2',
                      position: [{ row: rootNode1.row, col: rootNode1.col }],
                      prompt: [
                        { row: rootNode1.row, col: rootNode1.col },
                        { row: startNode.row, col: startNode.col },
                        { row: endNode.row, col: endNode.col },
                        { row: startNode1.row, col: startNode1.col },
                        { row: endNode1.row, col: endNode1.col },
                      ],
                      method: SOLUTION_METHODS.LOOP,
                      isFill: true,
                      target: [Number(num)],
                    };
                  }
                }
              }
            }
          }
          // 3-2-2 & 3-4
          if (startNode1 && endNode1) {
            const startNodes2Array = findGraphNodeByDistance(startNode1, 1);
            const endNodes2Array = findGraphNodeByDistance(endNode1, 1);
            if (startNodes2Array.length && endNodes2Array.length) {
              for (const startNode2 of startNodes2Array) {
                if (startNode2.row === startNode1.row && startNode2.col === startNode1.col) {
                  continue;
                }
                for (const endNode2 of endNodes2Array) {
                  if (endNode2.row === endNode1.row && endNode2.col === endNode1.col) {
                    continue;
                  }
                  if (endNode2.row === startNode2.row && endNode2.col === startNode2.col) {
                    continue;
                  }
                  // 3-2-2
                  if (
                    isWeakLink(
                      board,
                      { row: startNode2.row, col: startNode2.col },
                      { row: endNode2.row, col: endNode2.col },
                      Number(num),
                      candidateMap
                    )
                  ) {
                    let rootNodeArray1 = findGraphNodeByDistance(startNode, 1);
                    let rootNodeArray2 = findGraphNodeByDistance(endNode, 1);
                    if (rootNodeArray1.length && rootNodeArray2.length) {
                      for (const rootNode1 of rootNodeArray1) {
                        for (const rootNode2 of rootNodeArray2) {
                          if (rootNode1.row === rootNode2.row && rootNode1.col === rootNode2.col) {
                            return {
                              label: '3-2-2',
                              position: [{ row: rootNode1.row, col: rootNode1.col }],
                              prompt: [
                                { row: rootNode1.row, col: rootNode1.col },
                                { row: startNode.row, col: startNode.col },
                                { row: endNode.row, col: endNode.col },
                                { row: startNode1.row, col: startNode1.col },
                                { row: startNode2.row, col: startNode2.col },
                                { row: endNode1.row, col: endNode1.col },
                                { row: endNode2.row, col: endNode2.col },
                              ],
                              method: SOLUTION_METHODS.LOOP,
                              isFill: true,
                              target: [Number(num)],
                            };
                          }
                        }
                      }
                    }
                  }
                  // 3-4
                  if (
                    isUnitStrongLink(
                      board,
                      { row: startNode2.row, col: startNode2.col },
                      { row: endNode2.row, col: endNode2.col },
                      Number(num),
                      candidateMap
                    )
                  ) {
                    let rootNodeArray1 = findGraphNodeByDistance(startNode, 1);
                    let rootNodeArray2 = findGraphNodeByDistance(endNode, 1);
                    if (rootNodeArray1.length && rootNodeArray2.length) {
                      for (const rootNode1 of rootNodeArray1) {
                        for (const rootNode2 of rootNodeArray2) {
                          if (rootNode1.row === rootNode2.row && rootNode1.col === rootNode2.col) {
                            return {
                              label: '3-4',
                              position: [{ row: rootNode1.row, col: rootNode1.col }],
                              prompt: [
                                { row: rootNode1.row, col: rootNode1.col },
                                { row: startNode.row, col: startNode.col },
                                { row: endNode.row, col: endNode.col },
                                { row: startNode1.row, col: startNode1.col },
                                { row: startNode2.row, col: startNode2.col },
                                { row: endNode1.row, col: endNode1.col },
                                { row: endNode2.row, col: endNode2.col },
                              ],
                              method: SOLUTION_METHODS.LOOP,
                              isFill: true,
                              target: [Number(num)],
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
    }
  }
  return null;
};

export const getEmptyCellsInRow = (row: number, board: CellData[][]): Position[] => {
  const emptyCells: Position[] = [];
  for (let col = 0; col < 9; col++) {
    if (board[row][col].draft.length) {
      emptyCells.push({ row, col });
    }
  }
  return emptyCells;
};

export const getEmptyCellsInCol = (col: number, board: CellData[][]): Position[] => {
  const emptyCells: Position[] = [];
  for (let row = 0; row < 9; row++) {
    if (board[row][col].draft.length) {
      emptyCells.push({ row, col });
    }
  }
  return emptyCells;
};

export const getEmptyCellsInBox = (
  pos1: Position,
  pos2: Position,
  board: CellData[][]
): Position[] => {
  const emptyCells: Position[] = [];
  const box1 = Math.floor(pos1.row / 3) * 3 + Math.floor(pos1.col / 3);
  const box2 = Math.floor(pos2.row / 3) * 3 + Math.floor(pos2.col / 3);

  if (box1 === box2) {
    const startRow = Math.floor(pos1.row / 3) * 3;
    const startCol = Math.floor(pos1.col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
      for (let c = startCol; c < startCol + 3; c++) {
        if (
          board[r][c].draft.length &&
          !((r === pos1.row && c === pos1.col) || (r === pos2.row && c === pos2.col))
        ) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }
  }

  return emptyCells;
};

// Unique Rectangle
export const uniqueRectangle = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  for (let num = 1; num <= 9; num++) {
    // 标准型
    for (let row = 0; row < 9; row++) {
      if (candidateMap[num].row.get(row)?.count === 2) {
        const cell1 = candidateMap[num].row.get(row)?.positions[0];
        const cell2 = candidateMap[num].row.get(row)?.positions[1];
        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let col1 = cell1.col;
          let col2 = cell2.col;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          if (
            candidateMap[num].col.get(col1)?.count === 2 ||
            candidateMap[num].col.get(col2)?.count === 2
          ) {
            let cell3: Candidate | undefined;
            let cell4: Candidate | undefined;
            if (candidateMap[num].col.get(col1)?.count === 2) {
              if (candidateMap[num].col.get(col1)?.positions[0].row === cell1.row) {
                cell3 = candidateMap[num].col.get(col1)?.positions[1];
                cell4 = {
                  row: cell3?.row,
                  col: cell2.col,
                  candidates: board[cell3?.row][cell2.col].draft,
                };
              } else {
                cell3 = candidateMap[num].col.get(col1)?.positions[0];
                cell4 = {
                  row: cell3?.row,
                  col: cell2.col,
                  candidates: board[cell3?.row][cell2.col].draft,
                };
              }
            } else if (candidateMap[num].col.get(col2)?.count === 2) {
              if (candidateMap[num].col.get(col2)?.positions[0].row === cell2.row) {
                cell3 = candidateMap[num].col.get(col2)?.positions[1];
                cell4 = {
                  row: cell3?.row,
                  col: cell1.col,
                  candidates: board[cell3?.row][cell1.col].draft,
                };
              } else {
                cell3 = candidateMap[num].col.get(col2)?.positions[0];
                cell4 = {
                  row: cell3?.row,
                  col: cell1.col,
                  candidates: board[cell3?.row][cell1.col].draft,
                };
              }
            }
            if (cell3?.row !== cell4?.row) continue;
            if (cell3 && cell4) {
              let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              let arr = [box1, box2, box3, box4];
              let set = new Set(arr);
              if (
                JSON.stringify(cell3.candidates) === JSON.stringify(cell1.candidates) &&
                cell4.candidates.includes(a) &&
                cell4.candidates.includes(b) &&
                cell4.candidates.length > 2 &&
                set.size === 2
              ) {
                return {
                  isFill: false,
                  position: [{ row: cell4.row, col: cell4.col }],
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [a, b],
                  label: 'ab-ab-ab-abc',
                };
              }
            }
          }
        }
      }
    }
    // ab-ab-abc-abc行
    for (let row = 0; row < 9; row++) {
      if (candidateMap[num].row.get(row)?.count === 2) {
        const cell1 = candidateMap[num].row.get(row)?.positions[0];
        const cell2 = candidateMap[num].row.get(row)?.positions[1];
        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let col1 = cell1.col;
          let col2 = cell2.col;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let row2 = 0; row2 < 9; row2++) {
            if (row2 === row) continue;
            if (
              board[row2][col1].draft.length === 3 &&
              JSON.stringify(board[row2][col1].draft) === JSON.stringify(board[row2][col2].draft) &&
              board[row2][col1].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col1,
                candidates: board[row2][col1].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              const c = board[row2][col1].draft.find(item => item !== a && item !== b);
              if (!c) continue;
              const affectedCells = findCommonAffectedPositions(
                { row: cell3.row, col: cell3.col },
                { row: cell4.row, col: cell4.col },
                board,
                c
              );
              const deleteCells: Position[] = [];
              for (const cell of affectedCells) {
                if (board[cell.row][cell.col].draft.includes(c)) {
                  deleteCells.push(cell);
                }
              }
              let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              let arr = [box1, box2, box3, box4];
              let set = new Set(arr);
              if (deleteCells.length && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c],
                  label: 'ab-ab-abc-abc',
                };
              }
            }
          }
        }
      }
    }
    // ab-ab-abc-abc列
    for (let col = 0; col < 9; col++) {
      if (candidateMap[num].col.get(col)?.count === 2) {
        const cell1 = candidateMap[num].col.get(col)?.positions[0];
        const cell2 = candidateMap[num].col.get(col)?.positions[1];
        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let row1 = cell1.row;
          let row2 = cell2.row;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let col2 = 0; col2 < 9; col2++) {
            if (col2 === col) continue;
            if (
              board[row1][col2].draft.length === 3 &&
              JSON.stringify(board[row1][col2].draft) === JSON.stringify(board[row2][col2].draft) &&
              board[row1][col2].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row1,
                col: col2,
                candidates: board[row1][col2].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              const c = board[row1][col2].draft.find(item => item !== a && item !== b);
              if (!c) continue;
              const affectedCells = findCommonAffectedPositions(
                { row: cell3.row, col: cell3.col },
                { row: cell4.row, col: cell4.col },
                board,
                c
              );
              const deleteCells: Position[] = [];
              for (const cell of affectedCells) {
                if (board[cell.row][cell.col].draft.includes(c)) {
                  deleteCells.push(cell);
                }
              }
              let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              let arr = [box1, box2, box3, box4];
              let set = new Set(arr);
              if (deleteCells.length && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c],
                  label: 'ab-ab-abc-abc',
                };
              }
            }
          }
        }
      }
    }

    // ab-ab-abc-abcd行
    for (let row = 0; row < 9; row++) {
      if (candidateMap[num].row.get(row)?.count === 2) {
        const cell1 = candidateMap[num].row.get(row)?.positions[0];
        const cell2 = candidateMap[num].row.get(row)?.positions[1];

        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let col1 = cell1.col;
          let col2 = cell2.col;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let row2 = 0; row2 < 9; row2++) {
            if (row2 === row) continue;

            if (
              board[row2][col1].draft.length === 3 &&
              board[row2][col1].draft.includes(a) &&
              board[row2][col1].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col1,
                candidates: board[row2][col1].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
            } else if (
              board[row2][col2].draft.length === 3 &&
              board[row2][col2].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              cell4 = {
                row: row2,
                col: col1,
                candidates: board[row2][col1].draft,
              };
            }
            const other = cell3?.candidates.filter(item => item !== a && item !== b);
            if (
              cell3 &&
              cell4 &&
              cell4.candidates.length === 4 &&
              cell4.candidates.includes(a) &&
              cell4.candidates.includes(b) &&
              cell4.candidates.includes(other[0])
            ) {
              const remainingCandidates1 = cell4.candidates.filter(
                item => item !== a && item !== b
              );
              const remainingCandidates2 = cell3.candidates.filter(
                item => item !== a && item !== b
              );
              if (
                remainingCandidates1.length === 2 &&
                remainingCandidates1.includes(remainingCandidates2[0])
              ) {
                const [c, d] = remainingCandidates1;
                const affectedCells_Row = getEmptyCellsInRow(cell3.row, board);
                let deleteCells: Position[] = [];
                let cell5: Candidate | undefined;
                for (const cell of affectedCells_Row) {
                  if (
                    (cell.row === cell3.row && cell.col === cell3.col) ||
                    (cell.row === cell4.row && cell.col === cell4.col)
                  )
                    continue;
                  if (
                    board[cell.row][cell.col].draft.includes(c) &&
                    board[cell.row][cell.col].draft.includes(d) &&
                    board[cell.row][cell.col].draft.length === 2
                  ) {
                    cell5 = {
                      row: cell.row,
                      col: cell.col,
                      candidates: board[cell.row][cell.col].draft,
                    };
                    continue;
                  }

                  if (
                    board[cell.row][cell.col].draft.length >= 2 &&
                    (board[cell.row][cell.col].draft.includes(c) ||
                      board[cell.row][cell.col].draft.includes(d))
                  ) {
                    deleteCells.push(cell);
                  }
                }

                let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
                let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
                let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
                let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
                let arr = [box1, box2, box3, box4];
                let set = new Set(arr);

                if (deleteCells.length && cell5 && set.size === 2) {
                  return {
                    isFill: false,
                    position: deleteCells,
                    prompt: [
                      { row: cell1.row, col: cell1.col },
                      { row: cell2.row, col: cell2.col },
                      { row: cell3.row, col: cell3.col },
                      { row: cell4.row, col: cell4.col },
                      { row: cell5.row, col: cell5.col },
                    ],
                    method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                    target: [c, d],
                    label: 'ab-ab-abc-abcd',
                  };
                }
                deleteCells = [];
                cell5 = undefined;
                const affectedCells_Box = getEmptyCellsInBox(
                  { row: cell3.row, col: cell3.col },
                  { row: cell4.row, col: cell4.col },
                  board
                );
                for (const cell of affectedCells_Box) {
                  if (
                    (cell.row === cell3.row && cell.col === cell3.col) ||
                    (cell.row === cell4.row && cell.col === cell4.col)
                  )
                    continue;
                  if (
                    board[cell.row][cell.col].draft.includes(c) &&
                    board[cell.row][cell.col].draft.includes(d) &&
                    board[cell.row][cell.col].draft.length === 2
                  ) {
                    cell5 = {
                      row: cell.row,
                      col: cell.col,
                      candidates: board[cell.row][cell.col].draft,
                    };
                    continue;
                  }
                  if (
                    board[cell.row][cell.col].draft.length >= 2 &&
                    (board[cell.row][cell.col].draft.includes(c) ||
                      board[cell.row][cell.col].draft.includes(d))
                  ) {
                    deleteCells.push(cell);
                  }
                }
                box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
                box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
                box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
                box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
                arr = [box1, box2, box3, box4];
                set = new Set(arr);
                if (deleteCells.length && cell5 && set.size === 2) {
                  return {
                    isFill: false,
                    position: deleteCells,
                    prompt: [
                      { row: cell1.row, col: cell1.col },
                      { row: cell2.row, col: cell2.col },
                      { row: cell3.row, col: cell3.col },
                      { row: cell4.row, col: cell4.col },
                      { row: cell5.row, col: cell5.col },
                    ],
                    method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                    target: [c, d],
                    label: 'ab-ab-abc-abcd',
                  };
                }
              }
            }
          }
        }
      }
    }
    // ab-ab-abc-abcd列
    for (let col = 0; col < 9; col++) {
      if (candidateMap[num].col.get(col)?.count === 2) {
        const cell1 = candidateMap[num].col.get(col)?.positions[0];
        const cell2 = candidateMap[num].col.get(col)?.positions[1];

        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let row1 = cell1.row;
          let row2 = cell2.row;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let col2 = 0; col2 < 9; col2++) {
            if (col2 === col) continue;

            if (
              board[row1][col2].draft.length === 3 &&
              board[row1][col2].draft.includes(a) &&
              board[row1][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row1,
                col: col2,
                candidates: board[row1][col2].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
            } else if (
              board[row2][col2].draft.length === 3 &&
              board[row2][col2].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              cell4 = {
                row: row1,
                col: col2,
                candidates: board[row1][col2].draft,
              };
            }
            const other = cell3?.candidates.filter(item => item !== a && item !== b);
            if (
              cell3 &&
              cell4 &&
              cell4.candidates.length === 4 &&
              cell4.candidates.includes(a) &&
              cell4.candidates.includes(b) &&
              cell4.candidates.includes(other[0])
            ) {
              const remainingCandidates1 = cell4.candidates.filter(
                item => item !== a && item !== b
              );
              const remainingCandidates2 = cell3.candidates.filter(
                item => item !== a && item !== b
              );
              if (
                remainingCandidates1.length === 2 &&
                remainingCandidates1.includes(remainingCandidates2[0])
              ) {
                const [c, d] = remainingCandidates1;
                const affectedCells_Col = getEmptyCellsInCol(cell3.col, board);
                let deleteCells: Position[] = [];
                let cell5: Candidate | undefined;
                for (const cell of affectedCells_Col) {
                  if (
                    (cell.row === cell3.row && cell.col === cell3.col) ||
                    (cell.row === cell4.row && cell.col === cell4.col)
                  )
                    continue;
                  if (
                    board[cell.row][cell.col].draft.includes(c) &&
                    board[cell.row][cell.col].draft.includes(d) &&
                    board[cell.row][cell.col].draft.length === 2
                  ) {
                    cell5 = {
                      row: cell.row,
                      col: cell.col,
                      candidates: board[cell.row][cell.col].draft,
                    };
                    continue;
                  }
                  if (
                    board[cell.row][cell.col].draft.length >= 2 &&
                    (board[cell.row][cell.col].draft.includes(c) ||
                      board[cell.row][cell.col].draft.includes(d))
                  ) {
                    deleteCells.push(cell);
                  }
                }
                let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
                let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
                let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
                let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
                let arr = [box1, box2, box3, box4];
                let set = new Set(arr);
                if (deleteCells.length && cell5 && set.size === 2) {
                  return {
                    isFill: false,
                    position: deleteCells,
                    prompt: [
                      { row: cell1.row, col: cell1.col },
                      { row: cell2.row, col: cell2.col },
                      { row: cell3.row, col: cell3.col },
                      { row: cell4.row, col: cell4.col },
                      { row: cell5.row, col: cell5.col },
                    ],
                    method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                    target: [c, d],
                    label: 'ab-ab-abc-abcd',
                  };
                }
                deleteCells = [];
                cell5 = undefined;
                const affectedCells_Box = getEmptyCellsInBox(
                  { row: cell3.row, col: cell3.col },
                  { row: cell4.row, col: cell4.col },
                  board
                );
                for (const cell of affectedCells_Box) {
                  if (
                    (cell.row === cell3.row && cell.col === cell3.col) ||
                    (cell.row === cell4.row && cell.col === cell4.col)
                  )
                    continue;
                  if (
                    board[cell.row][cell.col].draft.includes(c) &&
                    board[cell.row][cell.col].draft.includes(d) &&
                    board[cell.row][cell.col].draft.length === 2
                  ) {
                    cell5 = {
                      row: cell.row,
                      col: cell.col,
                      candidates: board[cell.row][cell.col].draft,
                    };
                    continue;
                  }
                  if (
                    board[cell.row][cell.col].draft.length >= 2 &&
                    (board[cell.row][cell.col].draft.includes(c) ||
                      board[cell.row][cell.col].draft.includes(d))
                  ) {
                    deleteCells.push(cell);
                  }
                }
                box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
                box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
                box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
                box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
                arr = [box1, box2, box3, box4];
                set = new Set(arr);
                if (deleteCells.length && cell5 && set.size === 2) {
                  return {
                    isFill: false,
                    position: deleteCells,
                    prompt: [
                      { row: cell1.row, col: cell1.col },
                      { row: cell2.row, col: cell2.col },
                      { row: cell3.row, col: cell3.col },
                      { row: cell4.row, col: cell4.col },
                      { row: cell5.row, col: cell5.col },
                    ],
                    method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                    target: [c, d],
                    label: 'ab-ab-abc-abcd',
                  };
                }
              }
            }
          }
        }
      }
    }

    // ab-ab-abc-abd行
    for (let row = 0; row < 9; row++) {
      if (candidateMap[num].row.get(row)?.count === 2) {
        const cell1 = candidateMap[num].row.get(row)?.positions[0];
        const cell2 = candidateMap[num].row.get(row)?.positions[1];

        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let col1 = cell1.col;
          let col2 = cell2.col;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let row2 = 0; row2 < 9; row2++) {
            if (row2 === row) continue;

            if (
              board[row2][col1].draft.length === 3 &&
              board[row2][col1].draft.includes(a) &&
              board[row2][col1].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col1,
                candidates: board[row2][col1].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
            } else if (
              board[row2][col2].draft.length === 3 &&
              board[row2][col2].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              cell4 = {
                row: row2,
                col: col1,
                candidates: board[row2][col1].draft,
              };
            }
            const other = cell3?.candidates.filter(item => item !== a && item !== b);
            if (
              cell3 &&
              cell4 &&
              cell4.candidates.length === 3 &&
              cell4.candidates.includes(a) &&
              cell4.candidates.includes(b) &&
              !cell4.candidates.includes(other[0])
            ) {
              const remainingCandidates1 = cell4.candidates.filter(
                item => item !== a && item !== b
              );
              const remainingCandidates2 = cell3.candidates.filter(
                item => item !== a && item !== b
              );
              const c = remainingCandidates1[0];
              const d = remainingCandidates2[0];
              const affectedCells_Row = getEmptyCellsInRow(cell3.row, board);
              let deleteCells: Position[] = [];
              let cell5: Candidate | undefined;
              for (const cell of affectedCells_Row) {
                if (
                  (cell.row === cell3.row && cell.col === cell3.col) ||
                  (cell.row === cell4.row && cell.col === cell4.col)
                )
                  continue;
                if (
                  board[cell.row][cell.col].draft.includes(c) &&
                  board[cell.row][cell.col].draft.includes(d) &&
                  board[cell.row][cell.col].draft.length === 2
                ) {
                  cell5 = {
                    row: cell.row,
                    col: cell.col,
                    candidates: board[cell.row][cell.col].draft,
                  };
                  continue;
                }
                if (
                  board[cell.row][cell.col].draft.length >= 2 &&
                  (board[cell.row][cell.col].draft.includes(c) ||
                    board[cell.row][cell.col].draft.includes(d))
                ) {
                  deleteCells.push(cell);
                }
              }
              let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              let arr = [box1, box2, box3, box4];
              let set = new Set(arr);
              if (deleteCells.length && cell5 && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                    { row: cell5.row, col: cell5.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c, d],
                  label: 'ab-ab-abc-abcd',
                };
              }
              deleteCells = [];
              cell5 = undefined;
              const affectedCells_Box = getEmptyCellsInBox(
                { row: cell3.row, col: cell3.col },
                { row: cell4.row, col: cell4.col },
                board
              );
              for (const cell of affectedCells_Box) {
                if (
                  (cell.row === cell3.row && cell.col === cell3.col) ||
                  (cell.row === cell4.row && cell.col === cell4.col)
                )
                  continue;
                if (
                  board[cell.row][cell.col].draft.includes(c) &&
                  board[cell.row][cell.col].draft.includes(d) &&
                  board[cell.row][cell.col].draft.length === 2
                ) {
                  cell5 = {
                    row: cell.row,
                    col: cell.col,
                    candidates: board[cell.row][cell.col].draft,
                  };
                  continue;
                }
                if (
                  board[cell.row][cell.col].draft.length >= 2 &&
                  (board[cell.row][cell.col].draft.includes(c) ||
                    board[cell.row][cell.col].draft.includes(d))
                ) {
                  deleteCells.push(cell);
                }
              }
              box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              arr = [box1, box2, box3, box4];
              set = new Set(arr);
              if (deleteCells.length && cell5 && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                    { row: cell5.row, col: cell5.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c, d],
                  label: 'ab-ab-abc-abcd',
                };
              }
            }
          }
        }
      }
    }
    // ab-ab-abc-abcd列
    for (let col = 0; col < 9; col++) {
      if (candidateMap[num].col.get(col)?.count === 2) {
        const cell1 = candidateMap[num].col.get(col)?.positions[0];
        const cell2 = candidateMap[num].col.get(col)?.positions[1];

        if (
          cell1 &&
          cell2 &&
          JSON.stringify(cell1.candidates) === JSON.stringify(cell2.candidates) &&
          cell1.candidates.length === 2
        ) {
          let row1 = cell1.row;
          let row2 = cell2.row;
          let [a, b] = [cell1.candidates[0], cell1.candidates[1]];
          let cell3: Candidate | undefined;
          let cell4: Candidate | undefined;
          for (let col2 = 0; col2 < 9; col2++) {
            if (col2 === col) continue;

            if (
              board[row1][col2].draft.length === 3 &&
              board[row1][col2].draft.includes(a) &&
              board[row1][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row1,
                col: col2,
                candidates: board[row1][col2].draft,
              };
              cell4 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
            } else if (
              board[row2][col2].draft.length === 3 &&
              board[row2][col2].draft.includes(a) &&
              board[row2][col2].draft.includes(b)
            ) {
              cell3 = {
                row: row2,
                col: col2,
                candidates: board[row2][col2].draft,
              };
              cell4 = {
                row: row1,
                col: col2,
                candidates: board[row1][col2].draft,
              };
            }
            const other = cell3?.candidates.filter(item => item !== a && item !== b);
            if (
              cell3 &&
              cell4 &&
              cell4.candidates.length === 3 &&
              cell4.candidates.includes(a) &&
              cell4.candidates.includes(b) &&
              !cell4.candidates.includes(other[0])
            ) {
              const remainingCandidates1 = cell4.candidates.filter(
                item => item !== a && item !== b
              );
              const remainingCandidates2 = cell3.candidates.filter(
                item => item !== a && item !== b
              );
              const c = remainingCandidates1[0];
              const d = remainingCandidates2[0];
              const affectedCells_Col = getEmptyCellsInCol(cell3.col, board);
              let deleteCells: Position[] = [];
              let cell5: Candidate | undefined;
              for (const cell of affectedCells_Col) {
                if (
                  (cell.row === cell3.row && cell.col === cell3.col) ||
                  (cell.row === cell4.row && cell.col === cell4.col)
                )
                  continue;
                if (
                  board[cell.row][cell.col].draft.includes(c) &&
                  board[cell.row][cell.col].draft.includes(d) &&
                  board[cell.row][cell.col].draft.length === 2
                ) {
                  cell5 = {
                    row: cell.row,
                    col: cell.col,
                    candidates: board[cell.row][cell.col].draft,
                  };
                  continue;
                }
                if (
                  board[cell.row][cell.col].draft.length >= 2 &&
                  (board[cell.row][cell.col].draft.includes(c) ||
                    board[cell.row][cell.col].draft.includes(d))
                ) {
                  deleteCells.push(cell);
                }
              }
              let box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              let box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              let box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              let box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              let arr = [box1, box2, box3, box4];
              let set = new Set(arr);
              if (deleteCells.length && cell5 && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                    { row: cell5.row, col: cell5.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c, d],
                  label: 'ab-ab-abc-abcd',
                };
              }
              deleteCells = [];
              cell5 = undefined;
              const affectedCells_Box = getEmptyCellsInBox(
                { row: cell3.row, col: cell3.col },
                { row: cell4.row, col: cell4.col },
                board
              );
              for (const cell of affectedCells_Box) {
                if (
                  (cell.row === cell3.row && cell.col === cell3.col) ||
                  (cell.row === cell4.row && cell.col === cell4.col)
                )
                  continue;
                if (
                  board[cell.row][cell.col].draft.includes(c) &&
                  board[cell.row][cell.col].draft.includes(d) &&
                  board[cell.row][cell.col].draft.length === 2
                ) {
                  cell5 = {
                    row: cell.row,
                    col: cell.col,
                    candidates: board[cell.row][cell.col].draft,
                  };
                  continue;
                }
                if (
                  board[cell.row][cell.col].draft.length >= 2 &&
                  (board[cell.row][cell.col].draft.includes(c) ||
                    board[cell.row][cell.col].draft.includes(d))
                ) {
                  deleteCells.push(cell);
                }
              }
              box1 = Math.floor(cell1.row / 3) * 3 + Math.floor(cell1.col / 3);
              box2 = Math.floor(cell2.row / 3) * 3 + Math.floor(cell2.col / 3);
              box3 = Math.floor(cell3.row / 3) * 3 + Math.floor(cell3.col / 3);
              box4 = Math.floor(cell4.row / 3) * 3 + Math.floor(cell4.col / 3);
              arr = [box1, box2, box3, box4];
              set = new Set(arr);
              if (deleteCells.length && cell5 && set.size === 2) {
                return {
                  isFill: false,
                  position: deleteCells,
                  prompt: [
                    { row: cell1.row, col: cell1.col },
                    { row: cell2.row, col: cell2.col },
                    { row: cell3.row, col: cell3.col },
                    { row: cell4.row, col: cell4.col },
                    { row: cell5.row, col: cell5.col },
                  ],
                  method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                  target: [c, d],
                  label: 'ab-ab-abc-abcd',
                };
              }
            }
          }
        }
      }
    }

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 9; col++) {
        const cell1 = board[row][col];
        if (cell1.draft.length === 2) {
          const [a, b] = cell1.draft;

          for (let row2 = row + 1; row2 < 9; row2++) {
            for (let col2 = 0; col2 < 9; col2++) {
              if (col2 === col) continue;

              const cell2 = board[row2][col2];
              if (cell2.draft.length === 2 && cell2.draft.includes(a) && cell2.draft.includes(b)) {
                const cell3 = board[row][col2];
                const cell4 = board[row2][col];

                if (
                  cell3.draft.length === 3 &&
                  cell3.draft.includes(a) &&
                  cell3.draft.includes(b) &&
                  JSON.stringify(cell3.draft) === JSON.stringify(cell4.draft)
                ) {
                  const c = cell3.draft.filter(item => item !== a && item !== b)[0];

                  const box1 = Math.floor(row / 3) * 3 + Math.floor(col / 3);
                  const box2 = Math.floor(row2 / 3) * 3 + Math.floor(col2 / 3);
                  const box3 = Math.floor(row / 3) * 3 + Math.floor(col2 / 3);
                  const box4 = Math.floor(row2 / 3) * 3 + Math.floor(col / 3);
                  const arr = [box1, box2, box3, box4];

                  const set = new Set(arr);
                  if (set.size === 2) {
                    const commonAffectedCells = findCommonAffectedPositions(
                      { row, col: col2 },
                      { row: row2, col },
                      board,
                      c
                    );
                    const deleteCells: Position[] = [];
                    for (const cell of commonAffectedCells) {
                      if (board[cell.row][cell.col].draft.includes(c)) {
                        deleteCells.push(cell);
                      }
                    }
                    if (deleteCells.length) {
                      return {
                        isFill: false,
                        position: deleteCells,
                        prompt: [
                          { row, col },
                          { row: row2, col: col2 },
                          { row, col: col2 },
                          { row: row2, col },
                        ],
                        method: SOLUTION_METHODS.UNIQUE_RECTANGLE,
                        target: [c],
                        label: 'ab-abc-ab-abc',
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
  return null;
};

// 双全值坟墓
export const BinaryUniversalGrave = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  let target: number[] = [];
  let position: Position[] = [];
  let prompt: Position[] = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell.draft.length === 2) {
        const [a, b] = cell.draft;
        const rowCount1 = candidateMap[a].row.get(row)?.count || 0;
        const colCount1 = candidateMap[a].col.get(col)?.count || 0;
        const boxCount1 =
          candidateMap[a].box.get(Math.floor(row / 3) * 3 + Math.floor(col / 3))?.count || 0;
        const rowCount2 = candidateMap[b].row.get(row)?.count || 0;
        const colCount2 = candidateMap[b].col.get(col)?.count || 0;
        const boxCount2 =
          candidateMap[b].box.get(Math.floor(row / 3) * 3 + Math.floor(col / 3))?.count || 0;
        if (
          rowCount1 === 2 &&
          colCount1 === 2 &&
          boxCount1 === 2 &&
          rowCount2 === 2 &&
          colCount2 === 2 &&
          boxCount2 === 2
        ) {
          continue;
        } else if (
          rowCount1 === 2 &&
          colCount1 === 2 &&
          boxCount1 === 2 &&
          (rowCount2 === 3 || colCount2 === 3 || boxCount2 === 3)
        ) {
          if (!target.includes(b)) {
            target.push(b);
          }
        } else if (
          rowCount2 === 2 &&
          colCount2 === 2 &&
          boxCount2 === 2 &&
          (rowCount1 === 3 || colCount1 === 3 || boxCount1 === 3)
        ) {
          if (!target.includes(a)) {
            target.push(a);
          }
        }
      } else if (cell.draft.length === 3) {
        prompt.push({ row, col });
        if (prompt.length === 2) {
          return null;
        }
      } else if (cell.draft.length >= 4) {
        return null;
      }
    }
  }
  if (prompt.length === 1 && target.length === 1) {
    return {
      isFill: true,
      position: [{ row: prompt[0].row, col: prompt[0].col }],
      prompt,
      method: SOLUTION_METHODS.BINARY_UNIVERSAL_GRAVE,
      target: target,
    };
  }
  return null;
};

// 给定坐标，获取影响区
const getAffectedCells = (
  position: Position,
  num: number,
  candidateMap: CandidateMap
): Position[] => {
  if (!num) {
    return [];
  }
  let affectedCells: Position[] = [];
  for (const pos of candidateMap[num].row.get(position.row)?.positions || []) {
    if (pos.row === position.row && pos.col === position.col) continue;
    const isHas = affectedCells.some(item => item.row === pos.row && item.col === pos.col);
    if (!isHas) {
      affectedCells.push(pos);
    }
  }
  for (const pos of candidateMap[num].col.get(position.col)?.positions || []) {
    if (pos.row === position.row && pos.col === position.col) continue;
    const isHas = affectedCells.some(item => item.row === pos.row && item.col === pos.col);
    if (!isHas) {
      affectedCells.push(pos);
    }
  }
  for (const pos of candidateMap[num].box.get(
    Math.floor(position.row / 3) * 3 + Math.floor(position.col / 3)
  )?.positions || []) {
    if (pos.row === position.row && pos.col === position.col) continue;
    const isHas = affectedCells.some(item => item.row === pos.row && item.col === pos.col);
    if (!isHas) {
      affectedCells.push(pos);
    }
  }
  affectedCells = affectedCells.map(item => ({
    row: item.row,
    col: item.col,
  }));
  return affectedCells;
};

class Node {
  row: number;
  col: number;
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null; // 尝试向当前方格填入的值
  noValue: number[]; // 当前方格不能填入的值
  sons1: Node[] = []; // 双数置换的下一方格
  sons2: Node[] = []; // 被消除候选数的方格
  sons3: Node[] = []; // 强链关系导致填入候选数的方格
  father: Node | null = null;
  depth: number;
  label: '双' | '弱' | '强' | '';

  constructor(
    row: number,
    col: number,
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null,
    depth: number,
    father: Node | null = null,
    noValue: number[] = [],
    label: '双' | '弱' | '强' | '' = ''
  ) {
    this.row = row;
    this.col = col;
    this.value = value;
    this.depth = depth;
    this.father = father;
    this.noValue = noValue;
    this.label = label;
  }
}

// 获取节点的所有祖先节点
const getAncestors = (
  node: Node
): {
  ancestors: { row: number; col: number; value: number | null }[];
  root: Node | null;
  label: string;
} => {
  const ancestors: { row: number; col: number; value: number | null }[] = [];
  let current: Node | null = node;
  let lastCurrent: Node | null = null;
  let label: string = '';

  while (current) {
    ancestors.unshift({
      row: current.row,
      col: current.col,
      value: current.value,
    });
    label = current?.label + label;
    lastCurrent = current;
    current = current.father;
  }

  return { ancestors, root: lastCurrent, label };
};

// 检查位置是否已经在祖先链中
const isInAncestors = (node: Node, row: number, col: number): boolean => {
  let current: Node | null = node;
  while (current) {
    if (current.row === row && current.col === col) {
      return true;
    }
    current = current.father;
  }
  return false;
};

// 递归构建连锁反应树
const buildChainTree = (
  node: Node,
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  depth: number,
  visitedMap: Set<string>
): void => {
  if (node.depth >= depth) return;

  visitedMap.add(`${node.row}-${node.col}`);
  // 创建一个新的visitedMap副本，以避免修改原始集合
  const newVisitedMap1 = new Set<string>(visitedMap);
  const newVisitedMap2 = new Set<string>(visitedMap);
  const newVisitedMap3 = new Set<string>(visitedMap);
  const pos: Position = { row: node.row, col: node.col };

  // 1. 处理双数置换 (sons1)
  const affectedCells1 = getAffectedCells(pos, node.value, candidateMap);

  for (const pos of affectedCells1) {
    // 检查是否已经在祖先链中，避免循环
    if (newVisitedMap1.has(`${pos.row}-${pos.col}`)) continue;

    // 如果单元格包含当前节点的值作为候选数
    if (board[pos.row][pos.col].draft.length === 2) {
      const other =
        node.value === board[pos.row][pos.col].draft[0]
          ? board[pos.row][pos.col].draft[1]
          : board[pos.row][pos.col].draft[0];
      const son = new Node(pos.row, pos.col, other, node.depth + 1, node, [node.value], '双');
      node.sons1.push(son);
      buildChainTree(son, board, candidateMap, graph, depth, newVisitedMap1);
    }
  }

  // 2. 处理消除候选数 (sons2)
  const affectedCells2 = getAffectedCells(
    { row: node.row, col: node.col },
    node.value,
    candidateMap
  );

  for (const pos of affectedCells2) {
    // 检查是否已经在祖先链中，避免循环
    if (newVisitedMap2.has(`${pos.row}-${pos.col}`)) continue;

    const son = new Node(pos.row, pos.col, null, node.depth + 1, node, [node.value], '弱');
    node.sons2.push(son);
    buildChainTree(son, board, candidateMap, graph, depth, newVisitedMap2);
  }

  // 3. 处理强链关系 (sons3)
  for (const noValue of node.noValue) {
    const graphNode_noValue = getGraphNode(pos, noValue, graph);
    const nodesArray = findGraphNodeByDistance(graphNode_noValue, 1);
    for (const graphNode of nodesArray) {
      // 检查是否已经在祖先链中，避免循环
      if (newVisitedMap3.has(`${graphNode.row}-${graphNode.col}`)) continue;
      const restCandidates = board[graphNode.row][graphNode.col].draft.filter(v => v !== noValue);
      const son = new Node(
        graphNode.row,
        graphNode.col,
        noValue,
        node.depth + 1,
        node,
        restCandidates,
        '强'
      );
      node.sons3.push(son);
      buildChainTree(son, board, candidateMap, graph, depth, newVisitedMap3);
    }
  }
};

export const doubleColorChain = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 寻找可能的起始点
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell.draft.length === 2) {
        const [a, b] = cell.draft;

        // 单独对 a 构建
        const rootA = new Node(row, col, a, 1, null, [b], '');
        buildChainTree(rootA, board, candidateMap, graph, 6, new Set());

        // 单独对 b 构建
        const rootB = new Node(row, col, b, 1, null, [a], '');
        buildChainTree(rootB, board, candidateMap, graph, 6, new Set());

        // 将rootA的所有节点放入数组
        const nodesA: Node[] = [];
        const collectNodesA = (root: Node) => {
          const queue: Node[] = [root];
          let index = 0;

          while (index < queue.length) {
            const node = queue[index++];
            nodesA.push(node);

            queue.push(...node.sons1, ...node.sons2, ...node.sons3);
          }
        };
        collectNodesA(rootA);

        // 将rootB的所有节点放入数组
        const nodesB: Node[] = [];
        const collectNodesB = (root: Node) => {
          const queue: Node[] = [root];
          let index = 0;

          while (index < queue.length) {
            const node = queue[index++];
            nodesB.push(node);

            queue.push(...node.sons1, ...node.sons2, ...node.sons3);
          }
        };
        collectNodesB(rootB);

        for (const nodeA of nodesA) {
          for (const nodeB of nodesB) {
            if (nodeA.depth === 2 && nodeB.depth === 2) continue;
            if (nodeA.depth === 1 && nodeB.depth === 2) continue;
            if (nodeA.depth === 2 && nodeB.depth === 1) continue;
            if (nodeA.depth === 3 && nodeB.depth === 1) continue;
            if (nodeA.depth === 1 && nodeB.depth === 3) continue;
            const isInSameUnit = areCellsInSameUnit(
              { row: nodeA.row, col: nodeA.col },
              { row: nodeB.row, col: nodeB.col }
            );
            // 情况一：如果存在两个方格里填入的数字相同，那么检查他们的共同影响区
            if (
              nodeA.value &&
              nodeB.value &&
              nodeA.value === nodeB.value &&
              !(nodeA.row === nodeB.row && nodeA.col === nodeB.col)
            ) {
              // 检查是否有共同影响区域
              const commonUnits = findCommonAffectedPositions(
                { row: nodeA.row, col: nodeA.col },
                { row: nodeB.row, col: nodeB.col },
                board,
                nodeA.value
              );

              if (commonUnits.length > 0) {
                // 获取两个节点的所有祖先
                const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                const isHasDuplicate = [...ancestorsA, ...ancestorsB].some(item =>
                  commonUnits.some(pos => pos.row === item.row && pos.col === item.col)
                );
                if (isHasDuplicate) continue;

                return {
                  isFill: false,
                  position: commonUnits,
                  target: [nodeA.value],
                  method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                  prompt: [...ancestorsA, ...ancestorsB],
                  label: `①${labelA}-${labelB}`,
                  highlightPromts1: ancestorsA,
                  highlightPromts2: ancestorsB,
                  highlightDeletes: commonUnits.map(pos => ({
                    row: pos.row,
                    col: pos.col,
                    value: [nodeA.value],
                  })),
                };
              }
            }
            // 情况二：如果两个方格填入的数字不同，但是其中一个方格的候选数是另一个方格填入的数字
            else if (
              isInSameUnit &&
              nodeA.value &&
              nodeB.value &&
              nodeA.value !== nodeB.value &&
              !(nodeA.row === nodeB.row && nodeA.col === nodeB.col)
            ) {
              if (board[nodeA.row][nodeA.col].draft.includes(nodeB.value)) {
                // 获取两个节点的所有祖先
                const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);

                return {
                  isFill: false,
                  position: [{ row: nodeA.row, col: nodeA.col }],
                  target: [nodeB.value],
                  method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                  prompt: [...ancestorsA, ...ancestorsB],
                  label: `②${labelA}-${labelB}`,
                  highlightPromts1: ancestorsA,
                  highlightPromts2: ancestorsB,
                  highlightDeletes: [
                    {
                      row: nodeA.row,
                      col: nodeA.col,
                      value: [nodeB.value],
                    },
                  ],
                };
              }
              if (board[nodeB.row][nodeB.col].draft.includes(nodeA.value)) {
                // 获取两个节点的所有祖先
                const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);

                return {
                  isFill: false,
                  position: [{ row: nodeB.row, col: nodeB.col }],
                  target: [nodeA.value],
                  method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                  prompt: [...ancestorsA, ...ancestorsB],
                  label: `③${labelA}-${labelB}`,
                  highlightPromts1: ancestorsA,
                  highlightPromts2: ancestorsB,
                  highlightDeletes: [
                    {
                      row: nodeB.row,
                      col: nodeB.col,
                      value: [nodeA.value],
                    },
                  ],
                };
              }
            } else if (
              nodeA.value &&
              nodeB.value &&
              nodeA.row === nodeB.row &&
              nodeA.col === nodeB.col
            ) {
              // 获取该位置的所有候选数
              const cell = board[nodeA.row][nodeA.col];
              // 找出除了nodeA和nodeB填入的值以外的其他候选数
              const otherCandidates = cell.draft.filter(
                value => value !== nodeA.value && value !== nodeB.value
              );

              if (otherCandidates.length > 0) {
                // 获取两个节点的所有祖先
                const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);

                return {
                  isFill: false,
                  position: [{ row: nodeA.row, col: nodeA.col }],
                  target: otherCandidates,
                  method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                  prompt: [...ancestorsA, ...ancestorsB],
                  label: `④${labelA}-${labelB}`,
                  highlightPromts1: ancestorsA,
                  highlightPromts2: ancestorsB,
                  highlightDeletes: [
                    {
                      row: nodeA.row,
                      col: nodeA.col,
                      value: otherCandidates,
                    },
                  ],
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

export const swordfish = (board: CellData[][], candidateMap: CandidateMap, graph: Graph) => {
  for (let num = 1; num <= 9; num++) {
    if (true) {
      const arr: { row: number; positions: Position[] }[] = [];
      for (let row = 0; row < 9; row++) {
        const rowStats = candidateMap[num].row.get(row);
        if (rowStats && (rowStats.positions.length === 2 || rowStats.positions.length === 3)) {
          arr.push({ row, positions: rowStats.positions });
        }
      }
      if (arr.length >= 3) {
        for (let i = 0; i < arr.length - 2; i++) {
          for (let j = i + 1; j < arr.length - 1; j++) {
            for (let k = j + 1; k < arr.length; k++) {
              const { positions: positions1 } = arr[i];
              const { positions: positions2 } = arr[j];
              const { positions: positions3 } = arr[k];
              const row1 = arr[i].row;
              const row2 = arr[j].row;
              const row3 = arr[k].row;

              const allPositions = [...positions1, ...positions2, ...positions3];
              const allCols = allPositions.map(pos => pos.col);
              const uniqueCols = new Set(allCols);

              if (uniqueCols.size === 3) {
                const deletedPositions: Position[] = [];
                for (const col of uniqueCols) {
                  const positions = candidateMap[num].col.get(col)?.positions;
                  for (const pos of positions) {
                    if (![row1, row2, row3].includes(pos.row)) {
                      deletedPositions.push(pos);
                    }
                  }
                }
                if (deletedPositions.length) {
                  return {
                    isFill: false,
                    position: deletedPositions,
                    prompt: allPositions,
                    method: SOLUTION_METHODS.SWORDFISH_ROW,
                    target: [num],
                  };
                }
              }
            }
          }
        }
      }
    }
    // 列版本的剑鱼
    if (true) {
      const arr: { col: number; positions: Position[] }[] = [];
      for (let col = 0; col < 9; col++) {
        const colStats = candidateMap[num].col.get(col);
        if (colStats && (colStats.positions.length === 2 || colStats.positions.length === 3)) {
          arr.push({ col, positions: colStats.positions });
        }
      }
      if (arr.length >= 3) {
        for (let i = 0; i < arr.length - 2; i++) {
          for (let j = i + 1; j < arr.length - 1; j++) {
            for (let k = j + 1; k < arr.length; k++) {
              const { positions: positions1 } = arr[i];
              const { positions: positions2 } = arr[j];
              const { positions: positions3 } = arr[k];
              const col1 = arr[i].col;
              const col2 = arr[j].col;
              const col3 = arr[k].col;

              const allPositions = [...positions1, ...positions2, ...positions3];
              const allRows = allPositions.map(pos => pos.row);
              const uniqueRows = new Set(allRows);

              if (uniqueRows.size === 3) {
                const deletedPositions: Position[] = [];
                for (const row of uniqueRows) {
                  const positions = candidateMap[num].row.get(row)?.positions;
                  for (const pos of positions) {
                    if (![col1, col2, col3].includes(pos.col)) {
                      deletedPositions.push(pos);
                    }
                  }
                }
                if (deletedPositions.length) {
                  return {
                    isFill: false,
                    position: deletedPositions,
                    prompt: allPositions,
                    method: SOLUTION_METHODS.SWORDFISH_COLUMN,
                    target: [num],
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

export const jellyfish = (board: CellData[][], candidateMap: CandidateMap, graph: Graph) => {
  for (let num = 1; num <= 9; num++) {
    if (true) {
      const arr: { row: number; positions: Position[] }[] = [];
      for (let row = 0; row < 9; row++) {
        const rowStats = candidateMap[num].row.get(row);
        if (
          rowStats &&
          (rowStats.positions.length === 2 ||
            rowStats.positions.length === 3 ||
            rowStats.positions.length === 4)
        ) {
          arr.push({ row, positions: rowStats.positions });
        }
      }
      if (arr.length >= 4) {
        for (let i = 0; i < arr.length - 3; i++) {
          for (let j = i + 1; j < arr.length - 2; j++) {
            for (let k = j + 1; k < arr.length - 1; k++) {
              for (let l = k + 1; l < arr.length; l++) {
                const { positions: positions1 } = arr[i];
                const { positions: positions2 } = arr[j];
                const { positions: positions3 } = arr[k];
                const { positions: positions4 } = arr[l];
                const row1 = arr[i].row;
                const row2 = arr[j].row;
                const row3 = arr[k].row;
                const row4 = arr[l].row;

                const allPositions = [...positions1, ...positions2, ...positions3, ...positions4];
                const allCols = allPositions.map(pos => pos.col);
                const uniqueCols = new Set(allCols);
                if (uniqueCols.size === 4) {
                  const deletedPositions: Position[] = [];
                  for (const col of uniqueCols) {
                    const positions = candidateMap[num].col.get(col)?.positions;
                    for (const pos of positions) {
                      if (![row1, row2, row3, row4].includes(pos.row)) {
                        deletedPositions.push(pos);
                      }
                    }
                  }
                  if (deletedPositions.length) {
                    return {
                      isFill: false,
                      position: deletedPositions,
                      prompt: allPositions,
                      method: SOLUTION_METHODS.JELLYFISH_ROW,
                      target: [num],
                    };
                  }
                }
              }
            }
          }
        }
      }
      // 列版本的剑鱼
      if (true) {
        const arr: { col: number; positions: Position[] }[] = [];
        for (let col = 0; col < 9; col++) {
          const colStats = candidateMap[num].col.get(col);
          if (
            colStats &&
            (colStats.positions.length === 2 ||
              colStats.positions.length === 3 ||
              colStats.positions.length === 4)
          ) {
            arr.push({ col, positions: colStats.positions });
          }
        }
        if (arr.length >= 3) {
          for (let i = 0; i < arr.length - 3; i++) {
            for (let j = i + 1; j < arr.length - 2; j++) {
              for (let k = j + 1; k < arr.length - 1; k++) {
                for (let l = k + 1; l < arr.length; l++) {
                  const { positions: positions1 } = arr[i];
                  const { positions: positions2 } = arr[j];
                  const { positions: positions3 } = arr[k];
                  const { positions: positions4 } = arr[l];
                  const col1 = arr[i].col;
                  const col2 = arr[j].col;
                  const col3 = arr[k].col;
                  const col4 = arr[l].col;

                  const allPositions = [...positions1, ...positions2, ...positions3, ...positions4];
                  const allRows = allPositions.map(pos => pos.row);
                  const uniqueRows = new Set(allRows);

                  if (uniqueRows.size === 4) {
                    const deletedPositions: Position[] = [];
                    for (const row of uniqueRows) {
                      const positions = candidateMap[num].row.get(row)?.positions;
                      for (const pos of positions) {
                        if (![col1, col2, col3, col4].includes(pos.col)) {
                          deletedPositions.push(pos);
                        }
                      }
                    }
                    if (deletedPositions.length) {
                      return {
                        isFill: false,
                        position: deletedPositions,
                        prompt: allPositions,
                        method: SOLUTION_METHODS.JELLYFISH_COLUMN,
                        target: [num],
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
  return null;
};

const findCommonAffectedPositions_Three = (
  pos1: Position,
  pos2: Position,
  pos3: Position,
  num: number,
  board: CellData[][]
) => {
  const affectedPositions: Position[] = [];

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (
        (row === pos1.row && col === pos1.col) ||
        (row === pos2.row && col === pos2.col) ||
        (row === pos3.row && col === pos3.col)
      ) {
        continue;
      }

      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.includes(num)) {
        if (
          areCellsInSameUnit({ row, col }, pos1) &&
          areCellsInSameUnit({ row, col }, pos2) &&
          areCellsInSameUnit({ row, col }, pos3)
        ) {
          affectedPositions.push({ row, col });
        }
      }
    }
  }

  return affectedPositions;
};

export const wxyzWing = (board: CellData[][], candidateMap: CandidateMap, graph: Graph) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell1 = board[row][col];
      if (cell1.draft.length === 4) {
        const [a, b, c, d] = cell1.draft;
        const affectedCells = getUnits({ row, col }, board);
        for (const pos2 of affectedCells) {
          const cell2 = board[pos2.row][pos2.col];
          if (cell2.draft.length === 2 && cell2.draft.every(num => cell1.draft.includes(num))) {
            for (const pos3 of affectedCells) {
              if (pos3.row === pos2.row && pos3.col === pos2.col) continue;
              const cell3 = board[pos3.row][pos3.col];
              if (cell3.draft.length === 2 && cell3.draft.every(num => cell1.draft.includes(num))) {
                for (const pos4 of affectedCells) {
                  if (
                    (pos4.row === pos3.row && pos4.col === pos3.col) ||
                    (pos4.row === pos2.row && pos4.col === pos2.col)
                  )
                    continue;
                  const cell4 = board[pos4.row][pos4.col];
                  if (
                    cell4.draft.length === 2 &&
                    cell4.draft.every(num => cell1.draft.includes(num))
                  ) {
                    const set = new Set([...cell2.draft, ...cell3.draft, ...cell4.draft]);
                    if (set.size !== 4) continue;
                    const isCell2andCell3inSameUnit = areCellsInSameUnit(pos2, pos3);
                    const isCell2andCell4inSameUnit = areCellsInSameUnit(pos2, pos4);
                    const isCell3andCell4inSameUnit = areCellsInSameUnit(pos3, pos4);
                    if (
                      isCell2andCell3inSameUnit &&
                      isCell2andCell4inSameUnit &&
                      isCell3andCell4inSameUnit
                    )
                      continue;
                    const commonCandidate = cell2.draft.find(
                      num => cell3.draft.includes(num) && cell4.draft.includes(num)
                    );
                    if (!commonCandidate) continue;
                    if (
                      !(
                        isCell2andCell3inSameUnit &&
                        isCell2andCell4inSameUnit &&
                        isCell3andCell4inSameUnit
                      )
                    ) {
                      const affectedPositions = findCommonAffectedPositions_Three(
                        pos2,
                        pos3,
                        pos4,
                        commonCandidate,
                        board
                      );
                      const deletedPositions = affectedPositions.filter(
                        pos => !(pos.row === row && pos.col === col)
                      );
                      if (deletedPositions.length) {
                        return {
                          isFill: false,
                          position: deletedPositions,
                          prompt: [{ row, col }, pos2, pos3, pos4],
                          method: SOLUTION_METHODS.WXYZ_WING,
                          target: [commonCandidate],
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

export const tripleColorChain = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph
): Result | null => {
  // 寻找可能的起始点
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const cell = board[row][col];
      if (cell.draft.length === 3) {
        const [a, b, c] = cell.draft;

        // 单独对 a 构建
        const rootA = new Node(row, col, a, 1, null, [b], '');
        buildChainTree(rootA, board, candidateMap, graph, 4, new Set());

        // 单独对 b 构建
        const rootB = new Node(row, col, b, 1, null, [a], '');
        buildChainTree(rootB, board, candidateMap, graph, 4, new Set());

        // 单独对 c 构建
        const rootC = new Node(row, col, c, 1, null, [a, b], '');
        buildChainTree(rootC, board, candidateMap, graph, 4, new Set());

        // 将rootA的所有节点放入数组
        const nodesA: Node[] = [];
        const collectNodesA = (root: Node) => {
          const queue: Node[] = [root];
          let index = 0;

          while (index < queue.length) {
            const node = queue[index++];
            nodesA.push(node);

            queue.push(...node.sons1, ...node.sons2, ...node.sons3);
          }
        };
        collectNodesA(rootA);

        // 将rootB的所有节点放入数组
        const nodesB: Node[] = [];
        const collectNodesB = (root: Node) => {
          const queue: Node[] = [root];
          let index = 0;

          while (index < queue.length) {
            const node = queue[index++];
            nodesB.push(node);

            queue.push(...node.sons1, ...node.sons2, ...node.sons3);
          }
        };
        collectNodesB(rootB);

        // 将rootC的所有节点放入数组
        const nodesC: Node[] = [];
        const collectNodesC = (root: Node) => {
          const queue: Node[] = [root];
          let index = 0;

          while (index < queue.length) {
            const node = queue[index++];
            nodesC.push(node);

            queue.push(...node.sons1, ...node.sons2, ...node.sons3);
          }
        };
        collectNodesC(rootC);

        for (const nodeA of nodesA) {
          for (const nodeB of nodesB) {
            for (const nodeC of nodesC) {
              if (nodeA.depth === 1 && nodeB.depth <= 3 && nodeC.depth <= 3) continue;
              if (nodeA.depth <= 3 && nodeB.depth === 1 && nodeC.depth <= 3) continue;
              if (nodeA.depth <= 3 && nodeB.depth <= 3 && nodeC.depth === 1) continue;

              const isInSameUnitAB = areCellsInSameUnit(
                { row: nodeA.row, col: nodeA.col },
                { row: nodeB.row, col: nodeB.col }
              );
              const isInSameUnitAC = areCellsInSameUnit(
                { row: nodeA.row, col: nodeA.col },
                { row: nodeC.row, col: nodeC.col }
              );
              const isInSameUnitBC = areCellsInSameUnit(
                { row: nodeB.row, col: nodeB.col },
                { row: nodeC.row, col: nodeC.col }
              );
              // 情况一：如果存在两个方格里填入的数字相同，那么检查他们的共同影响区
              if (
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeA.value === nodeB.value &&
                nodeA.value === nodeC.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                // 检查是否有共同影响区域
                const commonUnits = findCommonAffectedPositions_Three(
                  { row: nodeA.row, col: nodeA.col },
                  { row: nodeB.row, col: nodeB.col },
                  { row: nodeC.row, col: nodeC.col },
                  nodeA.value,
                  board
                );

                if (commonUnits.length > 0) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);
                  const isHasDuplicate = [...ancestorsA, ...ancestorsB, ...ancestorsC].some(item =>
                    commonUnits.some(pos => pos.row === item.row && pos.col === item.col)
                  );
                  if (isHasDuplicate) continue;

                  return {
                    isFill: false,
                    position: commonUnits,
                    target: [nodeA.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `①${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: commonUnits.map(pos => ({
                      row: pos.row,
                      col: pos.col,
                      value: [nodeA.value],
                    })),
                  };
                }
              }
              // 情况二：B占据了被删除点且看得到A、C
              else if (
                isInSameUnitAB &&
                isInSameUnitBC &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeA.value !== nodeB.value &&
                nodeB.value !== nodeC.value &&
                nodeA.value === nodeC.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                if (board[nodeB.row][nodeB.col].draft.includes(nodeA.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeB.row, col: nodeB.col }],
                    target: [nodeA.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `②${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeB.row,
                        col: nodeB.col,
                        value: [nodeA.value],
                      },
                    ],
                  };
                }
              }
              // 情况三：A占据了被删除点且看得到B、C
              else if (
                isInSameUnitAB &&
                isInSameUnitAC &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeA.value !== nodeB.value &&
                nodeA.value !== nodeC.value &&
                nodeB.value === nodeC.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                if (board[nodeA.row][nodeA.col].draft.includes(nodeB.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeA.row, col: nodeA.col }],
                    target: [nodeB.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `③${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeA.row,
                        col: nodeA.col,
                        value: [nodeB.value],
                      },
                    ],
                  };
                }
              }
              // 情况四：C占据了被删除点且看得到A、B
              else if (
                isInSameUnitAC &&
                isInSameUnitBC &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeB.value !== nodeC.value &&
                nodeA.value !== nodeC.value &&
                nodeB.value === nodeA.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                if (board[nodeC.row][nodeC.col].draft.includes(nodeA.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeC.row, col: nodeC.col }],
                    target: [nodeA.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `④${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeC.row,
                        col: nodeC.col,
                        value: [nodeA.value],
                      },
                    ],
                  };
                }
              }
              // 情况五：AB占据了被删除点且看得到C
              else if (
                isInSameUnitAC &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeC.value !== nodeA.value &&
                nodeC.value !== nodeB.value &&
                nodeA.row === nodeB.row &&
                nodeA.col === nodeB.col &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                if (board[nodeA.row][nodeA.col].draft.includes(nodeC.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeB.row, col: nodeB.col }],
                    target: [nodeC.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `⑤${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeB.row,
                        col: nodeB.col,
                        value: [nodeC.value],
                      },
                    ],
                  };
                }
              }
              // 情况六：BC占据了被删除点且看得到A
              else if (
                isInSameUnitAB &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeC.value !== nodeA.value &&
                nodeB.value !== nodeA.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                !(nodeA.row === nodeC.row && nodeA.col === nodeC.col) &&
                nodeB.row === nodeC.row &&
                nodeB.col === nodeC.col
              ) {
                if (board[nodeC.row][nodeC.col].draft.includes(nodeA.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeB.row, col: nodeB.col }],
                    target: [nodeA.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `⑥${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeB.row,
                        col: nodeB.col,
                        value: [nodeA.value],
                      },
                    ],
                  };
                }
              }
              // 情况七：AC占据了被删除点且看得到B
              else if (
                isInSameUnitAB &&
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeA.value !== nodeB.value &&
                nodeC.value !== nodeB.value &&
                !(nodeA.row === nodeB.row && nodeA.col === nodeB.col) &&
                nodeA.row === nodeC.row &&
                nodeA.col === nodeC.col &&
                !(nodeB.row === nodeC.row && nodeB.col === nodeC.col)
              ) {
                if (board[nodeC.row][nodeC.col].draft.includes(nodeB.value)) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeC.row, col: nodeC.col }],
                    target: [nodeB.value],
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `⑦${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeC.row,
                        col: nodeC.col,
                        value: [nodeB.value],
                      },
                    ],
                  };
                }
              }
              // 情况八：ABC占据了被删除点
              else if (
                nodeA.value &&
                nodeB.value &&
                nodeC.value &&
                nodeA.row === nodeB.row &&
                nodeA.col === nodeB.col &&
                nodeA.row === nodeC.row &&
                nodeA.col === nodeC.col &&
                nodeB.row === nodeC.row &&
                nodeB.col === nodeC.col
              ) {
                // 获取该位置的所有候选数
                const cell = board[nodeA.row][nodeA.col];
                // 找出除了nodeA和nodeB填入的值以外的其他候选数
                const otherCandidates = cell.draft.filter(
                  value => value !== nodeA.value && value !== nodeB.value && value !== nodeC.value
                );

                if (otherCandidates.length > 0) {
                  // 获取两个节点的所有祖先
                  const { ancestors: ancestorsA, root: rootA, label: labelA } = getAncestors(nodeA);
                  const { ancestors: ancestorsB, root: rootB, label: labelB } = getAncestors(nodeB);
                  const { ancestors: ancestorsC, root: rootC, label: labelC } = getAncestors(nodeC);

                  return {
                    isFill: false,
                    position: [{ row: nodeA.row, col: nodeA.col }],
                    target: otherCandidates,
                    method: SOLUTION_METHODS.TRIPLE_COLOR_CHAIN,
                    prompt: [...ancestorsA, ...ancestorsB, ...ancestorsC],
                    label: `⑧${labelA}-${labelB}-${labelC}`,
                    highlightPromts1: ancestorsA,
                    highlightPromts2: ancestorsB,
                    highlightPromts3: ancestorsC,
                    highlightDeletes: [
                      {
                        row: nodeA.row,
                        col: nodeA.col,
                        value: otherCandidates,
                      },
                    ],
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
