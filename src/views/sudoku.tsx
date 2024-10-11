import React, { useState, useEffect } from "react";
import { Card, Button, message } from "antd";
import { useTimer } from "../tools/ticker";
import isValid from "../tools/isValid";
import solve from "../tools/solve";
import "./sudoku.less";

export interface CellData {
  value: number | null;
  isGiven: boolean;
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
      .map(() => Array(9).fill({ value: null, isGiven: false }))
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [solution, setSolution] = useState<number[][]>([]);
  const [showCandidates, setShowCandidates] = useState<boolean>(false);
  const [visualHint, setVisualHint] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [redoHistory, setRedoHistory] = useState<Move[]>([]);
  const [eraseMode, setEraseMode] = useState<boolean>(false);
  const time = useTimer();

  const generateBoard = () => {
    const newBoard: CellData[][] = [
      [{ value: 6, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 5, isGiven: true }, { value: 9, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 4, isGiven: true }],
      [{ value: 9, isGiven: true }, { value: null, isGiven: false }, { value: 1, isGiven: true }, { value: 8, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 2, isGiven: true }, { value: null, isGiven: false }],
      [{ value: null, isGiven: false }, { value: null, isGiven: false }, { value: 5, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 6, isGiven: true }, { value: 3, isGiven: true }],
      [{ value: null, isGiven: false }, { value: 5, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 1, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 9, isGiven: true }, { value: 6, isGiven: true }],
      [{ value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 3, isGiven: true }, { value: 7, isGiven: true }, { value: 5, isGiven: true }, { value: null, isGiven: false }],
      [{ value: null, isGiven: false }, { value: 9, isGiven: true }, { value: 6, isGiven: true }, { value: null, isGiven: false }, { value: 5, isGiven: true }, { value: 7, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }],
      [{ value: 5, isGiven: true }, { value: 7, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 8, isGiven: true }, { value: null, isGiven: false }, { value: 1, isGiven: true }],
      [{ value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 8, isGiven: true }, { value: 5, isGiven: true }, { value: 2, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }],
      [{ value: null, isGiven: false }, { value: 2, isGiven: true }, { value: null, isGiven: false }, { value: 7, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }, { value: 6, isGiven: true }, { value: null, isGiven: false }, { value: null, isGiven: false }]
    ];
    setBoard(newBoard);

    // 生成解决方案
    const solvedBoard = newBoard.map(row => row.map(cell => ({ ...cell })));
    solve(solvedBoard);
    setSolution(solvedBoard.map(row => row.map(cell => cell.value)) as number[][]);
  };

  useEffect(() => {
    generateBoard();
  }, []);

  const handleCellChange = (row: number, col: number) => {
    if (!board[row][col].isGiven) {
      const newBoard = board.map(r => r.map(c => ({ ...c })));
      const previousValue = newBoard[row][col].value;
      let newValue: number | null = null;

      if (eraseMode) {
        if (!newBoard[row][col].isGiven) {
          newBoard[row][col].value = null;
          newValue = null;
        }
      } else if (selectedNumber) {
        const candidates = getCandidates(row, col);
        if (candidates.includes(selectedNumber)) {
          newBoard[row][col].value = selectedNumber;
          newValue = selectedNumber;
        } else {
          setErrorCount(errorCount + 1);
          message.error("输入错误，请重试。");
          return;
        }
      }

      if (newValue !== previousValue) {
        setMoveHistory([...moveHistory, { row, col, previousValue, newValue }]);
        setRedoHistory([]);
        setBoard(newBoard);
      }
    }
  };

  // 撤销
  const handleUndo = () => {
    if (moveHistory.length > 0) {
      const newMoveHistory = [...moveHistory];
      const lastMove = newMoveHistory.pop();
      if (lastMove) {
        const { row, col, previousValue } = lastMove;
        const newBoard = board.map(r => r.map(c => ({ ...c })));
        newBoard[row][col].value = previousValue;
        setBoard(newBoard);
        setMoveHistory(newMoveHistory);
        setRedoHistory([lastMove, ...redoHistory]);
      }
    }
  };

  // 回撤
  const handleRedo = () => {
    if (redoHistory.length > 0) {
      const newRedoHistory = [...redoHistory];
      const nextMove = newRedoHistory.shift();
      if (nextMove) {
        const { row, col, newValue } = nextMove;
        const newBoard = board.map(r => r.map(c => ({ ...c })));
        newBoard[row][col].value = newValue;
        setBoard(newBoard);
        setRedoHistory(newRedoHistory);
        setMoveHistory([...moveHistory, nextMove]);
      }
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

  const getCellClassName = (rowIndex: number, colIndex: number) => {
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

  const handleNumberSelect = (num: number) => {
    setSelectedNumber(num);
    setEraseMode(false);
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
              className={getCellClassName(rowIndex, colIndex)}
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
        <Button>我的草稿</Button>
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
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            onClick={() => handleNumberSelect(num)}
            type={selectedNumber === num ? "primary" : "default"}
          >
            {num}
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