import React, { useState, useEffect } from "react";
import { Card, Button, message } from "antd";
import {
  useTimer,
  isValid,
  solve,
  getCellClassName,
  checkSolutionStatus,
} from "../tools";
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
  previousDraft: number[]; // 添加这一行
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
  const [visualHint2, setVisualHint2] = useState<boolean>(false);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [redoHistory, setRedoHistory] = useState<Move[]>([]);
  const [eraseMode, setEraseMode] = useState<boolean>(false);
  const [draftMode, setDraftMode] = useState<boolean>(false);
  const [remainingCounts, setRemainingCounts] = useState<number[]>(
    Array(9).fill(9)
  );
  const [errorCell, setErrorCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const errorCooldownPeriod = 1000; // 错误冷却时间，单位毫秒
  const time = useTimer();
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState<1 | 2>(1);

  const generateBoard = () => {
    // const initialBoard = Array(9).fill(null).map(() => Array(9).fill(null));
    const initialBoard = [
      [3,null,8,null,2,9,5,7,null],
      [9,null,5,7,null,null,null,null,null],
      [null,4,null,null,null,null,9,null,6],
      [null,null,null,null,9,3,null,4,null],
      [6,9,null,null,null,null,7,5,null],
      [8,null,null,null,5,null,null,null,9],
      [null,null,6,1,null,null,null,9,5],
      [null,null,9,null,null,null,8,null,3],
      [null,null,2,9,null,null,null,null,7],
    ];

    const newBoard: CellData[][] = initialBoard.map((row) =>
      row.map((value) => ({
        value,
        isGiven: value !== null,
        draft: [],
      }))
    );

    setBoard(newBoard);

    // 生成解决方案
    const solvedBoard = newBoard.map((row) => row.map((cell) => ({ ...cell })));
    solve(solvedBoard);
    setSolution(
      solvedBoard.map((row) => row.map((cell) => cell?.value)) as number[][]
    );
  };

  useEffect(() => {
    generateBoard();
  }, []);

  useEffect(() => {
    updateRemainingCounts();
  }, [board]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (/^[1-9]$/.test(key)) {
        const number = parseInt(key);
        handleNumberSelect(number);
      } else if (selectionMode === 2 && selectedCell) {
        const { row, col } = selectedCell;
        let newRow = row;
        let newCol = col;

        switch (key) {
          case "ArrowUp":
            newRow = Math.max(0, row - 1);
            break;
          case "ArrowDown":
            newRow = Math.min(8, row + 1);
            break;
          case "ArrowLeft":
            newCol = Math.max(0, col - 1);
            break;
          case "ArrowRight":
            newCol = Math.min(8, col + 1);
            break;
          case "Backspace":
            handleCellChange(row, col, { button: 2 } as React.MouseEvent);
            return;
        }

        if (newRow !== row || newCol !== col) {
          setSelectedCell({ row: newRow, col: newCol });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectionMode, selectedCell, remainingCounts]);

  const updateRemainingCounts = () => {
    const counts = Array(9).fill(9);
    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.value) {
          counts[cell.value - 1]--;
        }
      });
    });
    setRemainingCounts(counts);
  };

  const handleCellChange = (
    row: number,
    col: number,
    event: React.MouseEvent
  ) => {
    if (selectionMode === 2) {
      setSelectedCell({ row, col });

      // 在选中模式2下处理右键擦除
      if ((event.button === 2 || eraseMode) && !board[row][col].isGiven) {
        const newBoard = board.map((r) => r.map((c) => ({ ...c })));
        const cell = newBoard[row][col];
        const previousValue = cell.value;
        const previousDraft = [...cell.draft];

        cell.value = null;
        cell.draft = [];
        setMoveHistory([
          ...moveHistory,
          { row, col, previousValue, newValue: null, previousDraft },
        ]);
        setRedoHistory([]);
        setBoard(newBoard);
      }

      return;
    }

    if (board[row][col]?.isGiven || board[row][col]?.value !== null) {
      return;
    }

    const newBoard = board.map((r) => r.map((c) => ({ ...c })));
    const cell = newBoard[row][col];
    const previousValue = cell.value;
    const previousDraft = [...cell.draft];

    if (event.button === 2 || eraseMode) {
      // 右键点击或擦除模式
      if (!draftMode && cell.value === null) {
        // 在非草稿模式下，如果方格没有值，不执行擦除操作
        return;
      }
      if (cell.value !== null || cell.draft.length > 0) {
        cell.value = null;
        cell.draft = [];
        setMoveHistory([
          ...moveHistory,
          { row, col, previousValue, newValue: null, previousDraft },
        ]);
        setRedoHistory([]);
      }
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
      // 验证填入的数字是否为有效候选数字
      const candidates = getCandidates(row, col);
      if (candidates.includes(selectedNumber)) {
        cell.value = selectedNumber;
        cell.draft = [];
        // 记录填写数字操作
        setMoveHistory([
          ...moveHistory,
          { row, col, previousValue, newValue: selectedNumber, previousDraft },
        ]);
        setRedoHistory([]);
      } else {
        const currentTime = Date.now();
        if (
          lastErrorTime === null ||
          currentTime - lastErrorTime > errorCooldownPeriod
        ) {
          setErrorCount((prevCount) => prevCount + 1);
          setErrorCell({ row, col });
          setLastErrorTime(currentTime);
          setTimeout(() => setErrorCell(null), errorCooldownPeriod);
        }
        return;
      }
    }

    setBoard(newBoard);
  };

  // 撤销
  const handleUndo = () => {
    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove) {
      const { row, col, previousValue, previousDraft } = lastMove;
      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
      newBoard[row][col].value = previousValue;
      newBoard[row][col].draft = previousDraft; // 恢复之前的草稿数据
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
      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
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

  const solveSudoku = () => {
    const solvedBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    if (solve(solvedBoard)) {
      setBoard(solvedBoard);
    }
    message.info(`解的情况: ${checkSolutionStatus(solvedBoard)}`);
  };

  const handleEraseMode = () => {
    if (selectionMode === 1) {
      setEraseMode(!eraseMode);
    } else if (selectionMode === 2 && selectedCell) {
      const { row, col } = selectedCell;
      handleCellChange(row, col, { button: 2 } as React.MouseEvent);
    }
    setSelectedNumber(null);
  };

  const handleNumberSelect = (number: number) => {
    if (selectionMode === 2 && selectedCell) {
      const { row, col } = selectedCell;
      const cell = board[row][col];

      if (cell.isGiven || cell.value !== null) {
        return;
      }

      const newBoard = board.map((r) => r.map((c) => ({ ...c })));
      const newCell = newBoard[row][col];
      const previousValue = newCell.value;
      const previousDraft = [...newCell.draft];

      if (draftMode) {
        const draftSet = new Set(newCell.draft);
        if (draftSet.has(number)) {
          draftSet.delete(number);
        } else {
          draftSet.add(number);
        }
        newCell.draft = Array.from(draftSet).sort((a, b) => a - b);
      } else {
        const candidates = getCandidates(row, col);
        if (candidates.includes(number)) {
          newCell.value = number;
          newCell.draft = [];
          setMoveHistory([
            ...moveHistory,
            { row, col, previousValue, newValue: number, previousDraft },
          ]);
          setRedoHistory([]);
        } else {
          const currentTime = Date.now();
          if (
            lastErrorTime === null ||
            currentTime - lastErrorTime > errorCooldownPeriod
          ) {
            setErrorCount((prevCount) => prevCount + 1);
            setErrorCell({ row, col });
            setLastErrorTime(currentTime);
            setTimeout(() => setErrorCell(null), errorCooldownPeriod);
          }
          return;
        }
      }

      setBoard(newBoard);
    } else {
      setSelectedNumber((prevNumber) =>
        prevNumber === number ? null : number
      );
    }
    setEraseMode(false);
  };

  const handleDraftMode = () => {
    setDraftMode(!draftMode);
    setShowCandidates(false);
  };

  const handleShowCandidates = () => {
    setShowCandidates(!showCandidates);
    setDraftMode(false);
  };

  const handleVisualHint2 = () => {
    setVisualHint2(!visualHint2);
  };

  const handlePrint = () => {
    console.log(board);
  };

  const handleSelectionMode = (mode: 1 | 2) => {
    setSelectionMode(mode);
    setSelectedNumber(null);
    setSelectedCell(null);
  };

  const handleCopyOfficialDraft = () => {
    const newBoard = board.map((row, rowIndex) =>
      row.map((cell, colIndex) => ({
        ...cell,
        draft: getCandidates(rowIndex, colIndex),
      }))
    );
    setBoard(newBoard);
    setDraftMode(true);
    setShowCandidates(false);
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
              onClick={(e) => handleCellChange(rowIndex, colIndex, e)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleCellChange(rowIndex, colIndex, e);
              }}
              className={`${getCellClassName(
                board,
                rowIndex,
                colIndex,
                selectedNumber,
                visualHint2
              )} ${
                errorCell?.row === rowIndex && errorCell?.col === colIndex
                  ? "errorCell"
                  : ""
              }
              ${
                selectionMode === 2 &&
                selectedCell?.row === rowIndex &&
                selectedCell?.col === colIndex
                  ? "selectedCell"
                  : ""
              }`}
            >
              {cell.value !== null ? (
                cell.value
              ) : showCandidates ? (
                <div className="draftGrid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="draftCell">
                      {getCandidates(rowIndex, colIndex).includes(num)
                        ? num
                        : ""}
                    </div>
                  ))}
                </div>
              ) : cell.draft.length > 0 ? (
                <div className="draftGrid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div key={num} className="draftCell">
                      {cell.draft.includes(num) ? num : ""}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="selectMode">
        <Button
          onClick={() => handleSelectionMode(1)}
          type={selectionMode === 1 ? "primary" : "default"}
        >
          选中模式1
        </Button>
        <Button
          onClick={() => handleSelectionMode(2)}
          type={selectionMode === 2 ? "primary" : "default"}
        >
          选中模式2
        </Button>
      </div>
      <div className="controlButtons">
        <Button onClick={handleUndo} disabled={moveHistory.length === 0}>
          撤销
        </Button>
        <Button onClick={handleRedo} disabled={redoHistory.length === 0}>
          回撤
        </Button>

        <Button
          onClick={handleEraseMode}
          type={selectionMode === 1 && eraseMode ? "primary" : "default"}
        >
          擦除
        </Button>
        <Button
          onClick={handleDraftMode}
          type={draftMode ? "primary" : "default"}
        >
          我的草稿
        </Button>
        <Button onClick={handleCopyOfficialDraft}>一键复制</Button>
        <Button
          onClick={handleShowCandidates}
          type={showCandidates ? "primary" : "default"}
        >
          官方草稿
        </Button>
        <Button
          onClick={handleVisualHint2}
          type={visualHint2 ? "primary" : "default"}
        >
          视觉辅助2
        </Button>
        <Button>提示</Button>
      </div>
      <div className="numberButtons">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
          <Button
            key={number}
            onClick={() => handleNumberSelect(number)}
            type={
              selectionMode === 1 && selectedNumber === number
                ? "primary"
                : "default"
            }
            className="number-button"
            disabled={remainingCounts[number - 1] === 0}
          >
            <div className="selected-number">{number}</div>
            <div className="remaining-count">{remainingCounts[number - 1]}</div>
          </Button>
        ))}
      </div>
      <Button className="solveButton" onClick={solveSudoku}>
        求解数独
      </Button>
      <Button className="printButton" onClick={handlePrint}>
        打印
      </Button>
    </Card>
  );
};

export default Sudoku;