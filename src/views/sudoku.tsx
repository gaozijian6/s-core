import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, message, Drawer } from "antd";
import { CloseOutlined } from "@ant-design/icons";
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
} from "../tools";
import {
  hiddenSingle,
  singleCandidate,
  blockElimination,
  nakedPair,
  hiddenPair,
  xWing,
  xWingVarient,
  xyWing,
  xyzWing,
  findStrongLink,
  checkStrongLinkParity,
  skyscraper,
  hiddenTriple1,
  nakedTriple1,
  nakedTriple2,
  hiddenTriple2,
  nakedQuadruple,
  swordfish,
  eureka,
  trialAndError,
} from "../tools/solution";
import "./sudoku.less";
import type { CellData, Position } from "../tools";
import type { Result } from "../tools/solution";
import { SOLUTION_METHODS } from "../constans";

const Sudoku: React.FC = () => {
  const initialBoard = Array(9)
    .fill(null)
    .map(() => Array(9).fill({ value: null, isGiven: false, draft: [] }));
  const {
    board,
    updateBoard,
    undo,
    redo,
    history,
    currentStep,
    candidateMap,
    graph,
  } = useSudokuBoard(initialBoard);
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
  const [hintDrawerVisible, setHintDrawerVisible] = useState<boolean>(false);
  const [hintContent, setHintContent] = useState<string>("");
  const [hintMethod, setHintMethod] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

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

    let newBoard: CellData[][] = initialBoard.map((row) =>
      row.map((value) => ({
        value,
        isGiven: value !== null,
        draft: [],
      }))
    );

    newBoard = [
      [
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [6, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 3, 8],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 6],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 3, 8],
        },
        {
          value: 7,
          isGiven: false,
          draft: [],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: null,
          isGiven: false,
          draft: [5, 6, 7, 9],
        },
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 9],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 6, 7],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 5, 6, 7],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 5],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: 8,
          isGiven: false,
          draft: [],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: null,
          isGiven: false,
          draft: [5, 7, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [7, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [3, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [2, 4, 7, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [2, 5, 7],
        },
        {
          value: null,
          isGiven: false,
          draft: [2, 3, 4, 5, 8],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: 1,
          isGiven: false,
          draft: [],
        },
        {
          value: 6,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: null,
          isGiven: false,
          draft: [6, 7, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 6, 7, 8],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 6, 7, 8],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 5, 6, 7],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 5, 8],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: null,
          isGiven: false,
          draft: [6, 8],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [4, 6, 8],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [4, 8],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
        {
          value: 7,
          isGiven: false,
          draft: [],
        },
        {
          value: 1,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 7],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 2, 7],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 2],
        },
        {
          value: 8,
          isGiven: false,
          draft: [],
        },
        {
          value: 6,
          isGiven: false,
          draft: [],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: 1,
          isGiven: false,
          draft: [],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
        {
          value: 6,
          isGiven: false,
          draft: [],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: 8,
          isGiven: false,
          draft: [],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: 7,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: 2,
          isGiven: false,
          draft: [],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: 7,
          isGiven: false,
          draft: [],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: 6,
          isGiven: false,
          draft: [],
        },
        {
          value: 1,
          isGiven: false,
          draft: [],
        },
        {
          value: 9,
          isGiven: false,
          draft: [],
        },
        {
          value: 8,
          isGiven: false,
          draft: [],
        },
      ],
      [
        {
          value: null,
          isGiven: false,
          draft: [8, 9],
        },
        {
          value: 4,
          isGiven: false,
          draft: [],
        },
        {
          value: null,
          isGiven: false,
          draft: [8, 9],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 2],
        },
        {
          value: null,
          isGiven: false,
          draft: [1, 2],
        },
        {
          value: 7,
          isGiven: false,
          draft: [],
        },
        {
          value: 6,
          isGiven: false,
          draft: [],
        },
        {
          value: 3,
          isGiven: false,
          draft: [],
        },
        {
          value: 5,
          isGiven: false,
          draft: [],
        },
      ],
    ];

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

  const applyHintHighlight = (board: CellData[][], result: Result) => {
    const { position, target, prompt } = result;
    const newBoard = deepCopyBoard(board);
    prompt.forEach(({ row, col }: Position) => {
      newBoard[row][col].highlight = "promptHighlight";
      newBoard[row][col].highlightCandidates = target;
    });
    position.forEach(({ row, col }: Position) => {
      newBoard[row][col].highlight = "positionHighlight";
      newBoard[row][col].highlightCandidates = target;
    });

    return newBoard;
  };

  const removeHintHighlight = (board: CellData[][]) => {
    const updatedBoard = deepCopyBoard(board);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        delete updatedBoard[row][col].highlight;
        delete updatedBoard[row][col].highlightCandidates;
      }
    }
    return updatedBoard;
  };

  const handleHint = () => {
    const solveFunctions = [
      singleCandidate,
      hiddenSingle,
      blockElimination,
      nakedPair,
      nakedTriple1,
      nakedTriple2,
      hiddenPair,
      hiddenTriple1,
      hiddenTriple2,
      xWing,
      xWingVarient,
      xyWing,
      xyzWing,
      nakedQuadruple,
      // eureka,
      skyscraper,
      swordfish,
      trialAndError,
    ];
    let result = null;

    for (const solveFunction of solveFunctions) {
      result = solveFunction(board, candidateMap, graph);
      if (result) {
        setResult(result);
        setSelectedNumber(null);
        console.log(result);
        const boardWithHighlight = applyHintHighlight(board, result);
        setHintMethod(result.method);
        updateBoard(
          boardWithHighlight,
          `提示：${result.method}`,
          [],
          false,
          false
        );
        setHintContent(handleHintContent(result));
        setHintDrawerVisible(true);
        break;
      }
    }
  };

  const handleHintContent = (result: Result): string => {
    const { position, target, method, prompt, isFill } = result;
    let posStr = "";
    let candStr = "";
    let deleteStr = "";
    let promptCandidates = [];
    let uniquePromptCandidates = [];
    let diffCandidates = [];
    if (isFill) {
      switch (method) {
        case SOLUTION_METHODS.SINGLE_CANDIDATE:
          return `注意到单元格R${position[0].row + 1}C${
            position[0].col + 1
          }只剩${target.join(
            ", "
          )}一个候选数，所以可以确定该单元格的值为${target.join(", ")}`;
        case SOLUTION_METHODS.HIDDEN_SINGLE_ROW:
          setSelectedNumber(target[0]);
          return `候选数${target.join(",")}在第${
            position[0].row + 1
          }行中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
        case SOLUTION_METHODS.HIDDEN_SINGLE_COLUMN:
          setSelectedNumber(target[0]);
          return `候选数${target.join(",")}在第${
            position[0].col + 1
          }列中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
        case SOLUTION_METHODS.HIDDEN_SINGLE_BOX:
          setSelectedNumber(target[0]);
          return `候选数${target.join(",")}在宫${
            Math.floor(position[0].row / 3) * 3 +
            Math.floor(position[0].col / 3)
          }中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
        case SOLUTION_METHODS.TRIAL_AND_ERROR:
          return `尝试向只有两个候选数的方格内填入${target[0]}，若后续无解，则说明填入${target[0]}是错误的，应填入另一个候选数`;
      }
    } else {
      switch (method) {
        case SOLUTION_METHODS.BLOCK_ELIMINATION_ROW:
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          return `在此宫中，候选数${target.join(
            ","
          )}只能存在这些${posStr}格中，无论存在哪个方格中，这一行上的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_COLUMN:
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          return `在此宫中，候选数${target.join(
            ","
          )}只能存在这些${posStr}方格中，无论存在哪个方格中，这一列上的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_ROW:
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          return `在第${prompt[0].row + 1}行中，候选数${target.join(
            ","
          )}只能存在这些${posStr}方格中，无论存在哪个方格中，这一宫中的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_COLUMN:
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          return `在第${prompt[0].col + 1}列中，候选数${target.join(
            ","
          )}只能存在这些${posStr}方格中，无论存在哪个方格中，这一宫中的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
        case SOLUTION_METHODS.NAKED_PAIR_ROW:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此行其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_PAIR_COLUMN:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此列其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_PAIR_BOX:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          return `在此宫中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_ROW1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此行其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_COLUMN1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此列其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_BOX1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在此宫中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_ROW2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此行其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_COLUMN2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此列其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.NAKED_TRIPLE_BOX2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `在此宫中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
        case SOLUTION_METHODS.HIDDEN_PAIR_ROW:
          candStr = [...new Set(target)].join(",");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_PAIR_COLUMN:
          candStr = [...new Set(target)].join(",");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_PAIR_BOX:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在此宫中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_ROW1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_BOX1:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在此宫中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_ROW2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_BOX2:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在此宫中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_ROW:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_COLUMN:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_BOX:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          return `在此宫中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
        case SOLUTION_METHODS.X_WING_ROW:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = target.join(",");
          return `在${position[0].row + 1}、${
            position[2].row + 1
          }两行中，候选数${candStr}每行都有两个候选方格且他们的列号相同，在这四个候选方格内无论哪两个取值，都会导致这两列其他位置不应出现候选数${candStr}`;
        case SOLUTION_METHODS.X_WING_COLUMN:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = target.join(",");
          return `在${position[0].row + 1}、${
            position[2].col + 1
          }两列中，候选数${candStr}每列都有两个候选方格且他们的行号相同，在这四个候选方格内无论哪两个取值，都会导致这两行其他位置不应出现候选数${candStr}`;
        case SOLUTION_METHODS.XY_WING:
        case SOLUTION_METHODS.XYZ_WING:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          return `无论${posStr}这三个候选方格内如何取值，R${
            position[0].row + 1
          }C${position[0].col + 1}内都不能出现候选数${target[0]}`;
        case SOLUTION_METHODS.SKYSCRAPER:
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          if (position.length === 1) {
            deleteStr = `R${position[0].row + 1}C${position[0].col + 1}`;
          } else if (position.length === 2) {
            deleteStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}`;
          } else if (position.length === 3) {
            deleteStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}、R${position[2].row + 1}C${
              position[2].col + 1
            }`;
          }
          return `${posStr}四个方格构成共轭链，无论R${prompt[0].row + 1}C${
            prompt[0].col + 1
          }还是R${prompt[3].row + 1}C${prompt[3].col + 1}取值为${
            target[0]
          }，${deleteStr}内都不能出现候选数${target[0]}`;
        case SOLUTION_METHODS.SWORDFISH_ROW:
          if (prompt.length === 6) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${prompt[5].col + 1}`;
          } else if (prompt.length === 7) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}`;
          } else if (prompt.length === 8) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}、R${
              prompt[7].row + 1
            }C${prompt[7].col + 1}`;
          } else if (prompt.length === 9) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}、R${
              prompt[7].row + 1
            }C${prompt[7].col + 1}、R${prompt[8].row + 1}C${prompt[8].col + 1}`;
          }
          const columns = [...new Set(prompt.map((pos) => pos.col + 1))];
          console.log(columns);

          return `无论${posStr}这${prompt.length}个候选方格哪三个取${
            target[0]
          }，第${columns.join("、")}列内都不能出现候选数${target[0]}`;
        case SOLUTION_METHODS.SWORDFISH_COLUMN:
          if (prompt.length === 6) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${prompt[5].col + 1}`;
          } else if (prompt.length === 7) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}`;
          } else if (prompt.length === 8) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}、R${
              prompt[7].row + 1
            }C${prompt[7].col + 1}`;
          } else if (prompt.length === 9) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}、R${
              prompt[7].row + 1
            }C${prompt[7].col + 1}、R${prompt[8].row + 1}C${prompt[8].col + 1}`;
          }
          const rows = [...new Set(prompt.map((pos) => pos.row + 1))];
          return `无论${posStr}这${prompt.length}个候选方格哪三个取${
            target[0]
          }，第${rows.join("、")}行内都不能出现候选数${target[0]}`;
      }
    }

    return "";
  };

  const handleApplyHint = () => {
    if (result) {
      const { position, target, isFill } = result;
      const newBoard = deepCopyBoard(board);

      position.forEach(({ row, col }) => {
        if (isFill) {
          newBoard[row][col].value = target[0];
          newBoard[row][col].draft = [];

          // 更新受影响的单元格
          const affectedCells = updateRelatedCellsDraft(
            newBoard,
            [{ row, col }],
            target[0],
            getCandidates
          );

          // 将受影响的单元格合并到 position 中
          position.push(...affectedCells);
        } else {
          newBoard[row][col].draft =
            newBoard[row][col].draft?.filter((num) => !target.includes(num)) ??
            [];
        }
      });

      // 使用 updateBoard 函数更新棋盘
      updateBoard(newBoard, `应用提示：${result.method}`);

      // 移除提示高亮
      const updatedBoard = removeHintHighlight(newBoard);
      updateBoard(updatedBoard, "提示应用完成");

      setHintDrawerVisible(false);
      setResult(null); // 重置 result
    }
  };

  const handleCancelHint = () => {
    const updatedBoard = removeHintHighlight(board);
    updateBoard(updatedBoard, "取消提示", [], false);
    setHintDrawerVisible(false);
  };

  const handlePrint = () => {
    console.log(board);
  };

  const handleStrongLink = () => {
    const result = findStrongLink(board, candidateMap);
    console.log(result);
  };

  const handleCheckStrongLinkParity = () => {
    const result = checkStrongLinkParity(
      { row: 3, col: 2 },
      { row: 1, col: 6 },
      3,
      graph
    );
    console.log(result);
  };

  const handleGraph = () => {
    console.log(graph);
  };

  const handleDraft = () => {
    console.log(candidateMap);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && hintDrawerVisible) {
        handleApplyHint();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hintDrawerVisible, result]);

  return (
    <Card title="">
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
                ${cell.highlight || ""}
              `}
            >
              {cell.value !== null ? (
                cell.value
              ) : cell.draft.length > 0 ? (
                <div className="draftGrid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <div
                      key={num}
                      className={`draftCell ${
                        cell.draft.includes(num)
                          ? `${
                              cell.highlight === "positionHighlight" &&
                              cell?.highlightCandidates?.includes(num)
                                ? "candidateHighlightDelete"
                                : ""
                            } ${
                              cell.highlight === "promptHighlight" &&
                              cell?.highlightCandidates?.includes(num)
                                ? "candidateHighlightHint"
                                : ""
                            }`
                          : ""
                      }`}
                    >
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
        <Button onClick={handleCheckStrongLinkParity}>强连接奇偶性</Button>
        <Button onClick={handleGraph}>图</Button>
        <Button onClick={handleDraft}>候选数</Button>
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
      <Drawer
        title={
          <div style={{ textAlign: "center", width: "100%" }}>{hintMethod}</div>
        }
        placement="bottom"
        onClose={handleCancelHint}
        open={hintDrawerVisible}
        height={280}
        mask={false}
        closeIcon={
          <CloseOutlined style={{ position: "absolute", top: 8, right: 8 }} />
        }
        bodyStyle={{
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
        }}
        headerStyle={{ borderBottom: "none" }}
      >
        <p style={{ margin: "4px 0", textAlign: "center" }}>{hintContent}</p>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "auto",
          }}
        >
          <Button onClick={handleApplyHint} style={{ marginRight: "4px" }}>
            应用
          </Button>
          <Button onClick={handleCancelHint}>取消</Button>
        </div>
      </Drawer>
    </Card>
  );
};

export default Sudoku;
