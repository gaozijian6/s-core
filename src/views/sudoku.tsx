import React, { useState, useEffect } from "react";
import { Card, Button, message } from "antd";
import { useTimer } from "../tools/ticker";
import isValid from "../tools/isValid";
import solve from "../tools/solve";
import getCellClassName from "../tools/getCellClassName";
import "./sudoku.less";

export interface CellData {
  value: number | null;
  isGiven: boolean;
  draft: number[]; // 添加草稿数字数组
}

interface Move {
  row: number;
  col: number;
  previousValue: number | null;
  newValue: number | null;
}

const Sudoku: React.FC = () => {
  const [board, setBoard] = useState<CellData[][]>(
    Array(9)
      .fill(null)
      .map(() => Array(9).fill({ value: null, isGiven: false, draft: [] }))
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [solution, setSolution] = useState<number[][]>([]);
  const [showCandidates, setShowCandidates] = useState<boolean>(false);
  const [visualHint, setVisualHint] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [redoHistory, setRedoHistory] = useState<Move[]>([]);
  const [eraseMode, setEraseMode] = useState<boolean>(false);
  const [draftMode, setDraftMode] = useState<boolean>(false);
  const time = useTimer();

  const generateBoard = () => {
    const initialBoard = [
      [6, null, null, 5, 9, null, null, null, 4],
      [9, null, 1, 8, null, null, null, 2, null],
      [null, null, 5, null, null, null, null, 6, 3],
      [null, 5, null, null, 1, null, null, 9, 6],
      [null, null, null, null, null, 3, 7, 5, null],
      [null, 9, 6, null, 5, 7, null, null, null],
      [5, 7, null, null, null, null, 8, null, 1],
      [null, null, null, null, 8, 5, 2, null, null],
      [null, 2, null, 7, null, null, 6, null, null]
    ];

    const newBoard: CellData[][] = initialBoard.map(row =>
      row.map(value => ({
        value,
        isGiven: value !== null,
        draft: []
      }))
    );

    setBoard(newBoard);

    // 生成解决方案
    const solvedBoard = newBoard.map(row => row.map(cell => ({ ...cell })));
    solve(solvedBoard);
    setSolution(solvedBoard.map(row => row.map(cell => cell?.value)) as number[][]);
  };

  useEffect(() => {
    generateBoard();
  }, []);

  const handleCellChange = (row: number, col: number) => {
    if (board[row][col]?.isGiven) {
      return;
    }

    const newBoard = board.map(r => r.map(c => ({ ...c })));
    const cell = newBoard[row][col];
    const previousValue = cell.value;

    if (eraseMode) {
      cell.value = null;
      cell.draft = [];
      // 记录擦除操作
      setMoveHistory([...moveHistory, { row, col, previousValue, newValue: null }]);
      setRedoHistory([]);
    } else if (draftMode && selectedNumber) {
      // 处理草稿模式，不记录在撤销历史中
      const draftSet = new Set(cell.draft);
      if (draftSet.has(selectedNumber)) {
        draftSet.delete(selectedNumber);
      } else {
        draftSet.add(selectedNumber);
      }
      cell.draft = Array.from(draftSet).sort((a, b) => a - b);
    } else if (selectedNumber) {
      cell.value = selectedNumber;
      cell.draft = [];
      // 记录填写数字操作
      setMoveHistory([...moveHistory, { row, col, previousValue, newValue: selectedNumber }]);
      setRedoHistory([]);
    }

    setBoard(newBoard);
  };

  // 撤销
  const handleUndo = () => {
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove) {
      const { row, col, previousValue } = lastMove;
      const newBoard = board.map(r => r.map(c => ({ ...c })));
      newBoard[row][col].value = previousValue;
      newBoard[row][col].draft = []; // 清除草稿
      setBoard(newBoard);
      setMoveHistory(moveHistory.slice(0, -1));
      setRedoHistory([lastMove, ...redoHistory]);
    }
  };

  // 回撤
  const handleRedo = () => {
    const nextMove = redoHistory[0];
    if (nextMove) {
      const { row, col, newValue } = nextMove;
      const newBoard = board.map(r => r.map(c => ({ ...c })));
      newBoard[row][col].value = newValue;
      newBoard[row][col].draft = []; // 清除草稿
      setBoard(newBoard);
      setRedoHistory(redoHistory.slice(1));
      setMoveHistory([...moveHistory, nextMove]);
    }
  };

  const getCandidates = (row: number, col: number): number[] => {
    if (board[row][col].value !== null) return [];
    const candidates = [];
    for (let num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        candidates.push(num);
      }
    }
    return candidates;
  };

//   const getCellClassName = (rowIndex: number, colIndex: number) => {
//     const cell = board[rowIndex][colIndex];
//     const baseClass = `sudokuCell ${
//       cell.value === null ? "emptySudokuCell" : ""
//     } ${cell.isGiven ? "givenNumber" : ""}`;

//     if (selectedNumber !== null) {
//       if (board[rowIndex][colIndex].value === selectedNumber) {
//         return `${baseClass} selectedNumber`;
//       }

//       if (visualHint) {
//         const isInSameRow = board[rowIndex].some(
//           (c) => c.value === selectedNumber
//         );
//         const isInSameCol = board.some(
//           (row) => row[colIndex].value === selectedNumber
//         );

//         const startRow = Math.floor(rowIndex / 3) * 3;
//         const startCol = Math.floor(colIndex / 3) * 3;
//         let isInSameBox = false;
//         for (let i = 0; i < 3; i++) {
//           for (let j = 0; j < 3; j++) {
//             if (board[startRow + i][startCol + j].value === selectedNumber) {
//               isInSameBox = true;
//               break;
//             }
//           }
//           if (isInSameBox) break;
//         }

//         if (isInSameRow || isInSameCol || isInSameBox) {
//           return `${baseClass} visualHint`;
//         }
//       }
//     }

//     return baseClass;
//   };

  const solveSudoku = () => {
    const solvedBoard = board.map(row => row.map(cell => ({ ...cell })));
    if (solve(solvedBoard)) {
      setBoard(solvedBoard);
      message.success("数独已解决！");
    } else {
      message.error("无法解决此数独！");
    }
  };

  const handleEraseMode = () => {
    setEraseMode(!eraseMode);
    setSelectedNumber(null);
  };

  const handleNumberSelect = (number: number) => {
    setSelectedNumber(prevNumber => prevNumber === number ? null : number);
    setEraseMode(false);
  };

  const handleDraftMode = () => {
    setDraftMode(!draftMode);
    setEraseMode(false);
    setSelectedNumber(null);
  };

  return (
    <Card title="数独游戏">
      <div className="gameInfo">
        <span>错误次数：{errorCount}</span>
        <span>{time}</span>
      </div>
      <div className="sudokuGrid">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCellChange(rowIndex, colIndex)}
              className={getCellClassName(board, rowIndex, colIndex, selectedNumber, visualHint)}
            >
              {cell.value !== null ? (
                cell.value
              ) : showCandidates ? (
                <div className="candidatesGrid">
                  {getCandidates(rowIndex, colIndex).map((candidate) => (
                    <div key={candidate} className="candidateCell">
                      {candidate}
                    </div>
                  ))}
                </div>
              ) : cell.draft.length > 0 ? (
                <div className="draftGrid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="draftCell">
                      {cell.draft.includes(num) ? num : ''}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="controlButtons">
        <Button onClick={handleUndo} disabled={moveHistory.length === 0}>撤销</Button>
        <Button onClick={handleRedo} disabled={redoHistory.length === 0}>回撤</Button>
        
        <Button
          onClick={handleEraseMode}
          type={eraseMode ? "primary" : "default"}
        >
          擦除
        </Button>
        <Button onClick={handleDraftMode} type={draftMode ? "primary" : "default"}>
          打草稿
        </Button>
        <Button
          onClick={() => setShowCandidates(!showCandidates)}
          type={showCandidates ? "primary" : "default"}
        >
          官方草稿
        </Button>
        <Button
          onClick={() => setVisualHint(!visualHint)}
          type={visualHint ? "primary" : "default"}
        >
          视觉辅助
        </Button>
        <Button>提示</Button>
      </div>
      <div className="numberButtons">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <Button
            key={number}
            onClick={() => handleNumberSelect(number)}
            type={selectedNumber === number ? "primary" : "default"}
          >
            {number}
          </Button>
        ))}
      </div>
      <Button className="solveButton" onClick={solveSudoku}>
        求解数独
      </Button>
    </Card>
  );
};

export default Sudoku;
