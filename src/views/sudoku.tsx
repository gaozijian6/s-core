import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, message } from "antd";
import {
  useTimer,
  solve,
  getCellClassName,
  checkSolutionStatus,
  checkNumberInRowColumnAndBox,
  updateRelatedCellsDraft,
  getCandidates,
  useSudokuBoard,
  deepCopyBoard,
  copyOfficialDraft,
  isStrongLink,
} from "../tools";
import {
  hiddenSingle,
  singleCandidate,
  blockElimination,
  nakedPair,
  hiddenPair,
  xWing,
  xyWing,
  xyzWing,
} from "../tools/solution";
import "./sudoku.less";
import { SOLUTION_METHODS } from "../constans";

export interface CellData {
  value: number | null;
  isGiven: boolean;
  draft: number[]; // 添加草稿数字数组
}

const Sudoku: React.FC = () => {
  const initialBoard = Array(9)
    .fill(null)
    .map(() => Array(9).fill({ value: null, isGiven: false, draft: [] }));
  const { board, updateBoard, undo, redo, history, currentStep } =
    useSudokuBoard(initialBoard);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(1);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [eraseMode, setEraseMode] = useState<boolean>(false);
  const [draftMode, setDraftMode] = useState<boolean>(false);
  const [remainingCounts, setRemainingCounts] = useState<number[]>(
    Array(9).fill(9)
  );
  const [lastErrorTime, setLastErrorTime] = useState<number | null>(null);
  const errorCooldownPeriod = 1000; // 错误冷却时间，单位毫秒
  const time = useTimer();
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectionMode, setSelectionMode] = useState<1 | 2>(1);
  const [errorCells, setErrorCells] = useState<{ row: number; col: number }[]>(
    []
  );
  const [officialDraftUsed, setOfficialDraftUsed] = useState<boolean>(false);

  const generateBoard = () => {
    const initialBoard = Array(9)
      .fill(null)
      .map(() => Array(9).fill(null));
    // const initialBoard = [
    //   [9,null,null,4,3,7,1,8,null],
    //   [3,null,null,9,5,null,4,2,7],
    //   [4,7,null,null,8,null,3,9,null],
    //   [null,4,3,5,null,9,null,null,2],
    //   [null,null,null,3,null,null,null,4,9],
    //   [null,9,6,8,null,4,null,1,3],
    //   [null,3,4,null,9,5,null,null,8],
    //   [null,null,null,7,4,3,null,5,1],
    //   [null,5,null,6,null,8,null,3,4],
    // ];

    const newBoard: CellData[][] = initialBoard.map((row) =>
      row.map((value) => ({
        value,
        isGiven: value !== null,
        draft: [],
      }))
    );

    updateBoard(newBoard, "生成新棋盘");

    // 生成解决方案
    const solvedBoard = newBoard.map((row) => row.map((cell) => ({ ...cell })));
    solve(solvedBoard);
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
        if (selectionMode === 2 && selectedCell) {
          const { row, col } = selectedCell;
          const cell = board[row][col];

          if (cell.value !== null || cell.isGiven) {
            return;
          }

          const newBoard = deepCopyBoard(board);
          const newCell = newBoard[row][col];

          if (draftMode) {
            const draftSet = new Set(newCell.draft);
            if (draftSet.has(number)) {
              draftSet.delete(number);
            } else {
              draftSet.add(number);
            }
            newCell.draft = Array.from(draftSet).sort((a, b) => a - b);
            updateBoard(
              newBoard,
              `设置 (${row}, ${col}) 草稿为 ${newCell.draft}`
            );
          } else {
            const candidates = getCandidates(newBoard, row, col);
            if (candidates.includes(number)) {
              newCell.value = number;
              newCell.draft = [];
              updateBoard(newBoard, `设置 (${row}, ${col}) 为 ${number}`);
            } else {
              const currentTime = Date.now();
              if (
                lastErrorTime === null ||
                currentTime - lastErrorTime > errorCooldownPeriod
              ) {
                setErrorCount((prevCount) => prevCount + 1);
                setLastErrorTime(currentTime);
              }
              return;
            }
          }
        } else {
          handleNumberSelect(number);
        }
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
  }, [
    selectionMode,
    selectedCell,
    remainingCounts,
    board,
    draftMode,
    lastErrorTime,
  ]);

  useEffect(() => {
    if (selectionMode === 2 && !selectedCell) {
      setSelectedCell({ row: 0, col: 0 });
    }
  }, [selectionMode, selectedCell]);

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

  // 点击方格的回调函数
  const handleCellChange = (
    row: number,
    col: number,
    event: React.MouseEvent
  ) => {
    if (selectionMode === 2) {
      setSelectedCell({ row, col });

      // 在选中模式2下处理右键擦除
      if ((event.button === 2 || eraseMode) && !board[row][col].isGiven) {
        const newBoard = deepCopyBoard(board);
        const cell = newBoard[row][col];

        cell.value = null;
        cell.draft = [];
        updateBoard(newBoard, `擦除 (${row}, ${col})`);
      }

      return;
    }

    if (board[row][col]?.isGiven) {
      return;
    }

    const newBoard = deepCopyBoard(board);
    const cell = newBoard[row][col];

    // 处理擦除操作
    if (event.button === 2 || eraseMode) {
      if (cell.isGiven) {
        return;
      }

      if (cell.value !== null) {
        // 如果单元格有值，擦除该值
        const oldValue = cell.value;
        cell.value = null;

        // 只有在使用了一键草稿时才更新相关单元格的草稿数字
        if (officialDraftUsed) {
          const affectedCells = updateRelatedCellsDraft(
            newBoard,
            [{ row, col }],
            oldValue,
            getCandidates,
            true // 添加 isUndo 参数
          );
          updateBoard(newBoard, `擦除 (${row}, ${col}) 的值`, affectedCells);
        } else {
          updateBoard(newBoard, `擦除 (${row}, ${col}) 的值`);
        }
      } else if (
        draftMode &&
        selectedNumber &&
        cell.draft.includes(selectedNumber)
      ) {
        // 如果是草稿模式且有选中的数字，只擦除该候选数字
        cell.draft = cell.draft.filter((num) => num !== selectedNumber);
        updateBoard(
          newBoard,
          `从 (${row}, ${col}) 擦除草稿数字 ${selectedNumber}`
        );
      } else if (!draftMode && cell.draft.length > 0 && selectedNumber) {
        // 如果不是草稿模式且有草稿数字，擦除对应候选字
        if (cell.draft.includes(selectedNumber)) {
          cell.draft = cell.draft.filter((num) => num != selectedNumber);
          updateBoard(
            newBoard,
            `擦除 (${row}, ${col}) 的草稿数字 ${selectedNumber}`
          );
        } else {
          cell.draft.push(selectedNumber);
          cell.draft.sort((a, b) => a - b);
          updateBoard(
            newBoard,
            `在 (${row}, ${col}) 的草稿中添加 ${selectedNumber}`
          );
        }
      } else {
        return;
      }
      return;
    }
    // 处理草稿模式
    else if (draftMode && selectedNumber) {
      const conflictCells = checkNumberInRowColumnAndBox(
        newBoard,
        row,
        col,
        selectedNumber
      );
      if (conflictCells.length > 0) {
        setErrorCells(conflictCells);
        setTimeout(() => setErrorCells([]), 1000);
        return;
      }

      const draftSet = new Set(cell.draft);
      if (draftSet.has(selectedNumber)) {
        draftSet.delete(selectedNumber);
      } else {
        draftSet.add(selectedNumber);
      }
      cell.draft = Array.from(draftSet).sort((a, b) => a - b);
      updateBoard(newBoard, `设置 (${row}, ${col}) 草稿为 ${cell.draft}`);
    }
    // 处理非草稿模式
    else if (selectedNumber) {
      // 验证填入的数字是否为有效候选数字
      const candidates = getCandidates(newBoard, row, col);
      if (candidates.includes(selectedNumber)) {
        cell.value = selectedNumber;
        cell.draft = [];

        // 更新相关单元格的草稿数字
        const affectedCells = updateRelatedCellsDraft(
          newBoard,
          [{ row, col }],
          selectedNumber,
          getCandidates
        );

        updateBoard(
          newBoard,
          `设置 (${row}, ${col}) 为 ${selectedNumber}`,
          affectedCells
        );
      } else {
        const currentTime = Date.now();
        if (
          lastErrorTime === null ||
          currentTime - lastErrorTime > errorCooldownPeriod
        ) {
          setErrorCount((prevCount) => prevCount + 1);
          setErrorCells([{ row, col }]);
          setLastErrorTime(currentTime);
          setTimeout(() => setErrorCells([]), errorCooldownPeriod);
        }
        return;
      }
    }
  };

  // 撤销
  const handleUndo = () => {
    undo();
  };

  // 回撤
  const handleRedo = () => {
    redo();
  };

  const solveSudoku = () => {
    const solvedBoard = board.map((row) => row.map((cell) => ({ ...cell })));
    if (solve(solvedBoard)) {
      updateBoard(solvedBoard, "求解数独");
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
  };

  // 选择数字
  const handleNumberSelect = (number: number) => {
    if (selectionMode === 2 && selectedCell) {
      const { row, col } = selectedCell;
      const cell = board[row][col];

      if (cell.value !== null || cell.isGiven) {
        return;
      }

      const newBoard = deepCopyBoard(board);
      const newCell = newBoard[row][col];

      if (draftMode) {
        const conflictCells = checkNumberInRowColumnAndBox(
          newBoard,
          row,
          col,
          number
        );
        if (conflictCells.length > 0) {
          setErrorCells(conflictCells);
          setTimeout(() => setErrorCells([]), 1000);
          return;
        }

        const draftSet = new Set(newCell.draft);
        if (draftSet.has(number)) {
          draftSet.delete(number);
        } else {
          draftSet.add(number);
        }
        newCell.draft = Array.from(draftSet).sort((a, b) => a - b);
        updateBoard(newBoard, `设置 (${row}, ${col}) 草稿为 ${newCell.draft}`);
      } else {
        const candidates = getCandidates(newBoard, row, col);
        if (candidates.includes(number)) {
          newCell.value = number;
          newCell.draft = [];
          updateBoard(newBoard, `设置 (${row}, ${col}) 为 ${number}`);
        } else {
          const currentTime = Date.now();
          if (
            lastErrorTime === null ||
            currentTime - lastErrorTime > errorCooldownPeriod
          ) {
            setErrorCount((prevCount) => prevCount + 1);
            setLastErrorTime(currentTime);
          }
          return;
        }
      }
    } else {
      setSelectedNumber((prevNumber) =>
        prevNumber === number ? null : number
      );
    }
    setEraseMode(false);
  };

  const handleDraftMode = () => {
    setDraftMode(!draftMode);
  };

  const handleShowCandidates = useCallback(() => {
    const newBoard = copyOfficialDraft(board);
    updateBoard(newBoard, "复制官方草稿");
    setOfficialDraftUsed(true);
  }, [board, updateBoard]);

  const handleSelectionMode = (mode: 1 | 2) => {
    setSelectionMode(mode);
    setSelectedNumber(null);
  };

  const handleHint = () => {
    // const solveFunctions = [singleCandidate, hiddenSingle, blockElimination, nakedPair, hiddenPair, xWing,xyWing,xyzWing];
    const solveFunctions = [hiddenPair];
    let result = null;

    for (const solveFunction of solveFunctions) {
      result = solveFunction(board);
      if (result) {
        break;
      }
    }

    if (result) {
      const { position, target, method, isFill } = result;
      const newBoard = deepCopyBoard(board);
      if (isFill) {
        position.forEach(({ row, col }) => {
          newBoard[row][col].value = target[0];
          newBoard[row][col].draft = [];
        });

        // 更新相关单元格的草稿数字
        updateRelatedCellsDraft(newBoard, position, target[0], getCandidates);
        setSelectedCell({ row: position[0].row, col: position[0].col });
      } else {
        position.forEach(({ row, col }) => {
          newBoard[row][col].draft = newBoard[row][col].draft.filter(
            (num) => !target.includes(num)
          );
        });
      }

      console.log(result);

      updateBoard(
        newBoard,
        `提示：${SOLUTION_METHODS[method as keyof typeof SOLUTION_METHODS]} (${
          position[0].row
        }, ${position[0].col}) 为 ${target.join(", ")}`
      );
    }
  };

  const handlePrint = () => {
    console.log(board);
  };

  const handleStrongLink = () => {
    const result = isStrongLink(board, 0, 0, 2, 2, 4);
    console.log(result);
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
              className={`
                ${getCellClassName(board, rowIndex, colIndex, selectedNumber)}
                ${
                  errorCells.some(
                    (errorCell) =>
                      errorCell.row === rowIndex && errorCell.col === colIndex
                  )
                    ? "errorCell"
                    : ""
                }
                ${
                  selectionMode === 2 &&
                  selectedCell?.row === rowIndex &&
                  selectedCell?.col === colIndex
                    ? "selectedCell"
                    : ""
                }
              `}
            >
              {cell.value !== null ? (
                cell.value
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
        <Button onClick={handleUndo} disabled={currentStep === 0}>
          撤销
        </Button>
        <Button
          onClick={handleRedo}
          disabled={currentStep === history.length - 1}
        >
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
        <Button onClick={handleShowCandidates}>一键草稿</Button>
        <Button onClick={handleHint}>提示</Button>
        <Button onClick={handlePrint}>打印</Button>
        <Button onClick={handleStrongLink}>强连接判断</Button>
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
            disabled={!draftMode && remainingCounts[number - 1] === 0}
          >
            <div className="selected-number">{number}</div>
            <div className="remaining-count">{remainingCounts[number - 1]}</div>
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
