import type { CellData } from "../views/sudoku";

// 选择数字后高亮显示
const getCellClassName = (board: CellData[][], rowIndex: number, colIndex: number, selectedNumber: number | null, visualHint: boolean) => {
    const cell = board[rowIndex][colIndex];
    const baseClass = `sudokuCell ${
      cell.value === null ? "emptySudokuCell" : ""
    } ${cell.isGiven ? "givenNumber" : ""}`;

    if (selectedNumber !== null) {
      if (board[rowIndex][colIndex].value === selectedNumber) {
        return `${baseClass} selectedNumber`;
      }

      if (visualHint) {
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
    }

    return baseClass;
  };

export default getCellClassName;