import { CellData } from "../views/sudoku";
import { SOLUTION_METHODS } from "../constans";
import { areCellsInSameUnit } from "./index";
export interface Position {
  row: number;
  col: number;
}
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
export const singleCandidate = (board: CellData[][]): Result | null => {
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
export const blockElimination = (board: CellData[][]): Result | null => {
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
              prompt: cells, // 添加 prompt
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
              prompt: cells, // 添加 prompt
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
          if (cell?.value === null && cell?.draft?.length === 2) {
            boxCells.push({ row, col, draft: cell.draft });
          }
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
                if (
                  (row !== cell1.row || col !== cell1.col) &&
                  (row !== cell2.row || col !== cell2.col)
                ) {
                  const cell = board[row][col];
                  if (
                    cell?.value === null &&
                    cell?.draft?.some((n) => n === num1 || n === num2)
                  ) {
                    positionsToRemove.push({ row, col });
                  }
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
                  if (
                    cell?.value === null &&
                    cell?.draft?.some((n) => n === num1 || n === num2)
                  ) {
                    positionsToRemove.push({ row: cell1.row, col });
                  }
                }
              }
            }

            if (sameCol) {
              for (let row = 0; row < 9; row++) {
                if (Math.floor(row / 3) !== boxRow) {
                  const cell = board[row][cell1.col];
                  if (
                    cell?.value === null &&
                    cell?.draft?.some((n) => n === num1 || n === num2)
                  ) {
                    positionsToRemove.push({ row, col: cell1.col });
                  }
                }
              }
            }

            if (positionsToRemove.length > 0) {
              return {
                position: positionsToRemove,
                prompt: [cell1, cell2], // 添加 prompt
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
            cell.draft?.forEach((num) => {
              if (!candidatesMap[num]) candidatesMap[num] = [];
              candidatesMap[num].push({ row, col });
            });
          }
        }
      }

      const result = checkHiddenPair(
        candidatesMap,
        board,
        SOLUTION_METHODS.HIDDEN_PAIR
      );
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
  const pairs = Object.entries(candidatesMap).filter(
    ([,positions]) => positions.length === 2
  );

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
            prompt: [pos1, pos2], // 添加 prompt
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

// X-Wing
export const xWing = (board: CellData[][]): Result | null => {
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
        if (!areCellsInSameUnit(cellA, cellC) || areCellsInSameUnit(cellB, cellC)) continue;

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
export const xyzWing = (board: CellData[][]): Result | null => {
  // 遍历所有单元格
  for (let rowA = 0; rowA < 9; rowA++) {
    for (let colA = 0; colA < 9; colA++) {
      const cellA = board[rowA]?.[colA];
      if (cellA?.value !== null || cellA?.draft?.length !== 3) continue;

      // 寻找候选数是A的子集的单元格B
      for (let rowB = 0; rowB < 9; rowB++) {
        for (let colB = 0; colB < 9; colB++) {
          if (rowA === rowB && colA === colB) continue;
          if (!areCellsInSameUnit({ row: rowA, col: colA }, { row: rowB, col: colB })) continue;

          const cellB = board[rowB]?.[colB];
          if (cellB?.value !== null || cellB?.draft?.length < 2 || cellB?.draft?.length > 3) continue;
          if (!cellB.draft.every(num => cellA.draft?.includes(num))) continue;

          // 寻找候选数是A的子集的单元格C
          for (let rowC = 0; rowC < 9; rowC++) {
            for (let colC = 0; colC < 9; colC++) {
              if ((rowA === rowC && colA === colC) || (rowB === rowC && colB === colC)) continue;
              if (!areCellsInSameUnit({ row: rowA, col: colA }, { row: rowC, col: colC })) continue;
              if (!areCellsInSameUnit({ row: rowB, col: colB }, { row: rowC, col: colC })) continue;

              const cellC = board[rowC]?.[colC];
              if (cellC?.value !== null || cellC?.draft?.length < 2 || cellC?.draft?.length > 3) continue;
              if (!cellC.draft.every(num => cellA.draft?.includes(num))) continue;

              // 检查B和C的候选数是否覆盖了A的所有候选数
              const combinedCandidates = new Set([...cellB.draft, ...cellC.draft]);
              if (combinedCandidates.size !== 3) continue;

              // 找到符合条件的XYZ-Wing
              const affectedPositions: Position[] = [];

              // 检查与ABC在同一单元的格子
              for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                  if ((row === rowA && col === colA) || (row === rowB && col === colB) || (row === rowC && col === colC)) continue;

                  const isInSameUnitWithA = areCellsInSameUnit({ row: rowA, col: colA }, { row, col });
                  const isInSameUnitWithB = areCellsInSameUnit({ row: rowB, col: colB }, { row, col });
                  const isInSameUnitWithC = areCellsInSameUnit({ row: rowC, col: colC }, { row, col });

                  if (isInSameUnitWithA && isInSameUnitWithB && isInSameUnitWithC) {
                    const cell = board[row]?.[col];
                    if (cell?.value === null && cellA.draft?.some(num => cell.draft?.includes(num))) {
                      affectedPositions.push({ row, col });
                    }
                  }
                }
              }

              if (affectedPositions.length > 0) {
                return {
                  position: affectedPositions,
                  prompt: [{ row: rowA, col: colA }, { row: rowB, col: colB }, { row: rowC, col: colC }],
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
//         } else if (!visited[neighbor]) {
//           dfs(neighbor, startNode, length + 1);
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
