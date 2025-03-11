import React, { useState, useEffect, useCallback } from "react";
import { Card, Button, message, Drawer, Input } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import {
  useTimer,
  solve,
  solve3,
  getCellClassName,
  checkSolutionStatus,
  checkNumberInRowColumnAndBox,
  updateRelatedCellsDraft,
  getCandidates,
  useSudokuBoard,
  deepCopyBoard,
  copyOfficialDraft,
  createGraph,
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
  skyscraper2,
  hiddenTriple1,
  nakedTriple1,
  nakedTriple2,
  hiddenTriple2,
  swordfish,
  trialAndErrorDIY,
  isUnitStrongLink,
  getGraphNodePaths,
  getGraphNode,
  combinationChain,
  XYChain,
  Loop,
  uniqueRectangle,
  BinaryUniversalGrave,
  jellyfish,
} from "../tools/solution";
import "./sudoku.less";
import type {
  CandidateMap,
  CandidateStats,
  CellData,
  Position,
} from "../tools";
import type { Result } from "../tools/solution";
import { SOLUTION_METHODS } from "../constans";
import mockBoard from "./mock";
import DLX from "../tools/DLX";
import extreme from "./extreme";
import hard from "./hard";
import { SudokuSolver } from "../tools/DLX";

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
    answerBoard,
    clearHistory,
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
  const [prompts, setPrompts] = useState<number[]>([]);
  const [positions, setPositions] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState<string>("");

  const convertToBoard = (index: number): CellData[][] => {
    const board = extreme[index].puzzle;
    
    const result: CellData[][] = [];
    for (let i = 0; i < 9; i++) {
      const row: CellData[] = [];
      for (let j = 0; j < 9; j++) {
        const value = parseInt(board[i * 9 + j]) || null;
        row.push({
          value,
          isGiven: value !== null,
          draft: [],
        });
      }
      result.push(row);
    }
    return result;
  };

  const convertToAnswer = (index: number): CellData[][] => {
    const board = extreme[index].solution;
    const result: CellData[][] = [];
    for (let i = 0; i < 9; i++) {
      const row: CellData[] = [];
      for (let j = 0; j < 9; j++) {
        const value = parseInt(board[i * 9 + j]) || null;
        row.push({
          value,
          isGiven: value !== null,
          draft: [],
        });
      }
      result.push(row);
    }
    return result;
  };

  const updateCandidateMap = (newBoard: CellData[][]) => {
    const newCandidateMap: CandidateMap = {};
    for (let num = 1; num <= 9; num++) {
      newCandidateMap[num] = {
        row: new Map(),
        col: new Map(),
        box: new Map(),
        all: [],
      };
    }

    newBoard.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell.value === null) {
          const boxIndex =
            Math.floor(rowIndex / 3) * 3 + Math.floor(colIndex / 3);
          const candidate: Candidate = {
            row: rowIndex,
            col: colIndex,
            candidates: cell.draft,
          };

          cell.draft.forEach((num) => {
            const updateStats = (
              map: Map<number, CandidateStats>,
              index: number
            ) => {
              const stats = map.get(index) ?? { count: 0, positions: [] };
              stats.count++;
              stats.positions.push(candidate);
              map.set(index, stats);
            };

            updateStats(newCandidateMap[num].row, rowIndex);
            updateStats(newCandidateMap[num].col, colIndex);
            updateStats(newCandidateMap[num].box, boxIndex);
            newCandidateMap[num].all.push(candidate);
          });
        }
      });
    });
    let graph = createGraph(newBoard, newCandidateMap);
    let candidateMap = newCandidateMap;
    return { candidateMap, graph };
  };

  const testExtreme = () => {
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
      skyscraper,
      skyscraper2,
      combinationChain,
      swordfish,
      Loop,
      uniqueRectangle,
      XYChain,
      jellyfish,
      BinaryUniversalGrave,
    ];

    const mapArray = [];
    const combinationChainMap = new Map();
    const failureMap = new Map();
    const falseSolutionMap = new Map();
    const skyscraperMap_6 = new Map();
    const binaryMap = new Map();
    const xyChainMap = new Map();
    const xyChainMap1 = new Map();
    const xyChainMap2 = new Map();
    const xyChainMap3 = new Map();
    const xyChainMap4 = new Map();
    const xyChainMap5 = new Map();
    const xyChainMap6 = new Map();
    const xyChainMap7 = new Map();
    const xyChainMap8 = new Map();
    const xyChainMap9 = new Map();
    const xyChainMap10 = new Map();
    const swordfishMap = new Map();
    const jellyfishMap = new Map();
    const xyzWingMap = new Map();
    const xyChainMap11 = new Map();
    const xyChainMap12 = new Map();
    const xyChainMap13 = new Map();
    const xyChainMap16 = new Map();
    const xyChainMap17 = new Map();
    const xyChainMap18 = new Map();
    const xyChainMap19 = new Map();
    const skyscraperMap2 = new Map();
    const xyChainMap20 = new Map();

    for (let i = 0; i < extreme.length; i++) {
      // for (let i = 0; i < 9; i++) {
      if (i % 100 === 0) {
        console.log(`正在处理第${i}个数独...`);
      }

      const map = new Map();
      let board2 = convertToBoard(i);
      let answer = convertToAnswer(i);
      board2 = copyOfficialDraft(board2);
      let counts = board2.reduce(
        (acc, row) => acc + row.filter((cell) => cell.value !== null).length,
        0
      );
      let { candidateMap, graph } = updateCandidateMap(board2);
      let result: Result | null = null;
      while (true) {
        let j = 0;
        for (j = 0; j < solveFunctions.length; j++) {
          result = solveFunctions[j](board2, candidateMap, graph);
          if (result === null) {
            continue;
          } else {
            break;
          }
        }
        if (j === solveFunctions.length && !result && counts !== 81) {
          failureMap.set(i, false);
          break;
        }
        if (result) {
          map.set(result.method, (map.get(result.method) || 0) + 1);

          const { position, target, isFill } = result;
          let targetValues = [...target];
          if (result.method === SOLUTION_METHODS.XY_CHAIN) {
            targetValues = [targetValues[targetValues.length - 1]];
          }
          if (isFill) {
            counts++;
          }
          switch (result.method) {
            case SOLUTION_METHODS.COMBINATION_CHAIN:
              combinationChainMap.set(i, result);
              break;
            case SOLUTION_METHODS.SKYSCRAPER:
              switch (result.label) {
                case "6":
                  skyscraperMap_6.set(i, result);
                  break;
              }
              break;
            case SOLUTION_METHODS.SKYSCRAPER2:
              skyscraperMap2.set(i, result);
              break;
            case SOLUTION_METHODS.BINARY_UNIVERSAL_GRAVE:
              binaryMap.set(i, result);
              break;
              case SOLUTION_METHODS.XY_CHAIN:
                switch (result.label) {
                  case "双双双":
                    xyChainMap1.set(i, true);
                    break;
                  case "弱强双":
                    xyChainMap2.set(i, true);
                    break;
                  case "弱强强":
                    xyChainMap3.set(i, true);
                    break;
                  case "双双双双":
                    xyChainMap4.set(i, true);
                    break;
                  case "弱强强强":
                    xyChainMap5.set(i, true);
                    break;
                  case "弱强强双":
                    xyChainMap6.set(i, true);
                    break;
                  case "弱强强强强":
                    xyChainMap7.set(i, true);
                    break;
                  case "弱强强强双":
                    xyChainMap8.set(i, true);
                    break;
                  case "弱强双双":
                    xyChainMap9.set(i, true);
                    break;
                  case "双双强强":
                    xyChainMap10.set(i, true);
                    break;
                  case "弱强强2":
                    xyChainMap11.set(i, true);
                    break;
                  case "弱强强强2":
                    xyChainMap12.set(i, true);
                    break;
                  case "弱强强强强2":
                    xyChainMap13.set(i, true);
                    break;
                  case "双双强强2":
                    xyChainMap16.set(i, true);
                    break;
                  case "双双强2":
                    xyChainMap17.set(i, true);
                    break;
                  case "双双强强强":
                    xyChainMap18.set(i, true);
                    break;
                  case "双双强强强2":
                    xyChainMap19.set(i, true);
                    break;
                  case "4":
                    xyChainMap20.set(i, true);
                    break;
                }
                break;
            case SOLUTION_METHODS.SWORDFISH_ROW:
            case SOLUTION_METHODS.SWORDFISH_COLUMN:
              swordfishMap.set(i, true);
              break;
            case SOLUTION_METHODS.JELLYFISH_ROW:
            case SOLUTION_METHODS.JELLYFISH_COLUMN:
              jellyfishMap.set(i, true);
              break;
            case SOLUTION_METHODS.XYZ_WING:
              xyzWingMap.set(i, true);
              break;
          }
          const newBoard = deepCopyBoard(board2);
          let isFalse = false;

          position.forEach(({ row, col }) => {
            if (isFill) {
              if (answer[row][col].value !== targetValues[0]) {
                falseSolutionMap.set(i, `${result?.method} ${result?.label}`);
                isFalse = true;
                return;
              }
              newBoard[row][col].value = targetValues[0];
              newBoard[row][col].draft = [];

              // 更新受影响的单元格
              const affectedCells = updateRelatedCellsDraft(
                newBoard,
                [{ row, col }],
                targetValues[0],
                getCandidates
              );

              // 将受影响的单元格合并到 position 中
              position.push(...affectedCells);
            } else {
              if (targetValues.includes(answer[row][col].value)) {
                falseSolutionMap.set(i, `${result?.method} ${result?.label}`);
                isFalse = true;
                return;
              }
              newBoard[row][col].draft =
                newBoard[row][col].draft?.filter(
                  (num) => !targetValues.includes(num)
                ) ?? [];
            }
          });
          if (isFalse) {
            break;
          }
          board2 = newBoard;
          ({ candidateMap, graph } = updateCandidateMap(board2));
          continue;
        }
        if (counts === 81) {
          break;
        }
      }
      mapArray.push(map);
    }
    console.log("failureMap", failureMap);
    console.log("combinationChainMap", combinationChainMap);
    console.log("skyscraperMap_6", skyscraperMap_6);
    console.log("binaryMap", binaryMap);
    console.log("xyChainMap1 双双双", xyChainMap1);
    console.log("xyChainMap2 弱强双", xyChainMap2);
    console.log("xyChainMap3 弱强强", xyChainMap3);
    console.log("xyChainMap4 双双双双", xyChainMap4);
    console.log("xyChainMap5 弱强强强", xyChainMap5);
    console.log("xyChainMap6 弱强强双", xyChainMap6);
    console.log("xyChainMap7 弱强强强强", xyChainMap7);
    console.log("xyChainMap8 弱强强强双", xyChainMap8);
    console.log("xyChainMap9 弱强双双", xyChainMap9);
    console.log("xyChainMap10 双双强强", xyChainMap10);
    console.log("falseSolutionMap", falseSolutionMap);
    console.log("xyChainMap11 弱强强2", xyChainMap11);
    console.log("xyChainMap12 弱强强强2", xyChainMap12);
    console.log("xyChainMap13 弱强强强强2", xyChainMap13);
    console.log("xyChainMap16 双双强强2", xyChainMap16);
    console.log("xyChainMap17 双双强2", xyChainMap17);
    console.log("xyChainMap18 双双强强强", xyChainMap18);
    console.log("xyChainMap19 双双强强强2", xyChainMap19);
    console.log("skyscraperMap2", skyscraperMap2);
    console.log("xyChainMap20 4", xyChainMap20);
  };

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

    // newBoard = deepCopyBoard(mockBoard);

    // updateBoard(newBoard, "生成新棋盘");
    updateBoard(convertToBoard(23), "生成新棋盘");

    // 生成解决方案
    const solvedBoard = newBoard.map((row) => row.map((cell) => ({ ...cell })));
    // solve(solvedBoard);
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
      if (answerBoard[row][col].value == selectedNumber) {
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
        clearHistory();
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
    const startTime = performance.now();
    const solvedBoard = solve3(deepCopyBoard(board));
    const dlx = new DLX();
    const boardString = board
      .map((row) => row.map((cell) => cell.value ?? 0).join(""))
      .join("");
    // const solutions = dlx.solveSudoku(boardString);
    if (solvedBoard && solve(solvedBoard)) {
      updateBoard(solvedBoard, "求解数独");
    }
    // message.info(`解的情况: ${checkSolutionStatus(deepCopyBoard(board))}`);
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

  const applyHintHighlight = useCallback(
    (
      board: CellData[][],
      result: Result,
      type: "position" | "prompt" | "both"
    ) => {
      const { position, target, prompt, highlightPromts } = result;
      const newBoard = deepCopyBoard(board);

      if (type === "position" || type === "both") {
        position.forEach(({ row, col }: Position) => {
          newBoard[row][col].highlights = newBoard[row][col].highlights || [];
          newBoard[row][col].highlights.push("positionHighlight");
          newBoard[row][col].highlightCandidates = target;
        });
      }
      if (highlightPromts) {
        highlightPromts.forEach(
          ({
            row,
            col,
            values,
          }: {
            row: number;
            col: number;
            values: number[];
          }) => {
            newBoard[row][col].highlights = newBoard[row][col].highlights || [];
            newBoard[row][col].highlights.push("promptHighlight");
            newBoard[row][col].promptCandidates = values;
          }
        );
        return newBoard;
      }
      if (type === "prompt" || type === "both") {
        prompt.forEach(({ row, col }: Position) => {
          newBoard[row][col].highlights = newBoard[row][col].highlights || [];
          newBoard[row][col].highlights.push("promptHighlight");
          newBoard[row][col].highlightCandidates = target;
        });
      }

      return newBoard;
    },
    []
  );

  const removeHintHighlight = (board: CellData[][]) => {
    const updatedBoard = deepCopyBoard(board);
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        delete updatedBoard[row][col].highlights;
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
      skyscraper,
      skyscraper2,
      combinationChain,
      swordfish,
      Loop,
      uniqueRectangle,
      XYChain,
      jellyfish,
      BinaryUniversalGrave,
      trialAndErrorDIY,
    ];
    let result = null;

    for (const solveFunction of solveFunctions) {
      result = solveFunction(board, candidateMap, graph);
      if (result) {
        setResult(result);
        setSelectedNumber(null);
        console.log(result);
        setHintMethod(result.method);
        setHintContent(handleHintContent(result));
        setHintDrawerVisible(true);
        break;
      }
    }
  };

  const handleHintContent = (result: Result): string => {
    const {
      position,
      target,
      method,
      prompt,
      isFill,
      isWeakLink,
      chainStructure,
    } = result;
    let posStr = "";
    let posStr1 = "";
    let posStr2 = "";
    let posStr3 = "";
    let posStr4 = "";
    let posStr5 = "";
    let posStr6 = "";
    let candStr = "";
    let deleteStr = "";
    let promptCandidates = [];
    let uniquePromptCandidates = [];
    let boardWithHighlight = null;
    let hintContent = "";
    if (isFill) {
      setPrompts(target);
      switch (method) {
        case SOLUTION_METHODS.SINGLE_CANDIDATE:
          boardWithHighlight = applyHintHighlight(board, result, "prompt");
          hintContent = `注意到单元格R${position[0].row + 1}C${
            position[0].col + 1
          }只剩${target.join(
            ", "
          )}一个候选数，所以可以确定该单元格的值为${target.join(", ")}`;
          break;
        case SOLUTION_METHODS.HIDDEN_SINGLE_ROW:
          setSelectedNumber(target[0]);
          boardWithHighlight = applyHintHighlight(board, result, "prompt");
          hintContent = `候选数${target.join(",")}在第${
            position[0].row + 1
          }行中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
          break;
        case SOLUTION_METHODS.HIDDEN_SINGLE_COLUMN:
          setSelectedNumber(target[0]);
          boardWithHighlight = applyHintHighlight(board, result, "prompt");
          hintContent = `候选数${target.join(",")}在第${
            position[0].col + 1
          }列中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
          break;
        case SOLUTION_METHODS.HIDDEN_SINGLE_BOX:
          setSelectedNumber(target[0]);
          boardWithHighlight = applyHintHighlight(board, result, "prompt");
          hintContent = `候选数${target.join(",")}在第${
            Math.floor(position[0].row / 3) * 3 +
            Math.floor(position[0].col / 3) +
            1
          }宫中，只有一个候选方格，所以可以确定该单元格的值为${target.join(
            ", "
          )}`;
          break;
        case SOLUTION_METHODS.TRIAL_AND_ERROR:
          boardWithHighlight = applyHintHighlight(board, result, "prompt");
          hintContent = `尝试向拥有最少候选数的方格内填入${target[0]}，若后续无解，说明填入${target[0]}是错误的，则尝试其他候选数`;
          break;
        case SOLUTION_METHODS.BINARY_UNIVERSAL_GRAVE:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;

        case SOLUTION_METHODS.LOOP:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
      }
    } else {
      setPositions(target);
      switch (method) {
        case SOLUTION_METHODS.BLOCK_ELIMINATION_ROW:
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，候选数${target.join(
            ","
          )}只存在${posStr}中，无论存在哪个方格中，这一行上的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
          break;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_COLUMN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，候选数${target.join(
            ","
          )}只存在${posStr}中，无论存在哪个方格中，这一列上的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
          break;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_ROW:
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          hintContent = `在第${prompt[0].row + 1}行中，候选数${target.join(
            ","
          )}只存在${posStr}中，无论存在哪个方格中，这一宫中的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
          break;
        case SOLUTION_METHODS.BLOCK_ELIMINATION_BOX_COLUMN:
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          if (prompt.length == 2) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}`;
          } else if (prompt.length == 3) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          }
          hintContent = `在第${prompt[0].col + 1}列中，候选数${target.join(
            ","
          )}只存在${posStr}中，无论存在哪个方格中，这一宫中的其他位置都不应出现此候选数${target.join(
            ","
          )}`;
          break;
        case SOLUTION_METHODS.NAKED_PAIR_ROW:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此行其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_PAIR_COLUMN:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此列其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_PAIR_BOX:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只能出现在${posStr}这两个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_ROW1:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此行其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_COLUMN1:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此列其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_BOX1:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_ROW2:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此行其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_COLUMN2:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此列其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.NAKED_TRIPLE_BOX2:
          setPrompts(target);
          setPositions(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只能出现在${posStr}这三个方格中，所以此宫其他位置都不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.HIDDEN_PAIR_ROW:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          candStr = [...new Set(prompts)].join(",");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_PAIR_COLUMN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          setPositions(target);
          candStr = [...new Set(prompts)].join(",");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_PAIR_BOX:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          setPositions(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只出现在${posStr}这两个方格中，因此这两个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_ROW1:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          setPositions(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN1:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          setPositions(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_BOX1:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_ROW2:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_COLUMN2:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.HIDDEN_TRIPLE_BOX2:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          promptCandidates = [
            ...new Set(
              prompt.flatMap((p) => board[p.row]?.[p.col]?.draft ?? [])
            ),
          ];
          uniquePromptCandidates = promptCandidates.filter(
            (cand) => !target.includes(cand)
          );
          setPrompts(uniquePromptCandidates);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = [...new Set(prompts)].join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只出现在${posStr}这三个方格中，因此这三个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_ROW:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          hintContent = `在第${
            position[0].row + 1
          }行中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_COLUMN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          hintContent = `在第${
            position[0].col + 1
          }列中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.NAKED_QUADRUPLE_BOX:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = [...new Set(target)].join(",");
          hintContent = `在第${
            Math.floor(prompt[0].row / 3) * 3 +
            Math.floor(prompt[0].col / 3) +
            1
          }宫中，因为候选数${candStr}只出现在${posStr}这四个方格中，因此这四个方格不应出现其他候选数`;
          break;
        case SOLUTION_METHODS.X_WING_ROW:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = target.join(",");
          hintContent = `在${prompt[0].row + 1}、${
            prompt[2].row + 1
          }两行中，候选数${candStr}每行都有两个候选方格且他们的列号相同，在这四个候选方格内无论哪两个取值，都会导致这两列其他位置不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.X_WING_COLUMN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}`;
          candStr = target.join(",");
          hintContent = `在${prompt[0].row + 1}、${
            prompt[2].col + 1
          }两列中，候选数${candStr}每列都有两个候选方格且他们的行号相同，在这四个候选方格内无论哪两个取值，都会导致这两行其他位置不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.X_WING_VARIENT_COLUMN:
        case SOLUTION_METHODS.X_WING_VARIENT_ROW:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          if (prompt.length === 5) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}`;
          } else if (prompt.length === 6) {
            posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${prompt[5].col + 1}`;
          }
          candStr = target.join(",");
          setPrompts(target);
          hintContent = `在${posStr}这${
            prompt.length
          }个候选方格内无论哪两个取${candStr}，都会导致R${
            position[0].row + 1
          }C${position[0].col + 1}内不应出现候选数${candStr}`;
          break;
        case SOLUTION_METHODS.XY_WING:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          if (position.length === 1) {
            hintContent = `无论${posStr}这三个候选方格内如何取值，R${
              position[0].row + 1
            }C${position[0].col + 1}内都不能出现候选数${target[0]}`;
          }
          if (position.length === 1) {
            hintContent = `无论${posStr}这三个候选方格内如何取值，R${
              position[0].row + 1
            }C${position[0].col + 1}内都不能出现候选数${target[0]}`;
          } else if (position.length === 2) {
            hintContent = `无论${posStr}这三个候选方格内如何取值，R${
              position[0].row + 1
            }C${position[0].col + 1}、R${position[1].row + 1}C${
              position[1].col + 1
            }内都不能出现候选数${target[0]}`;
          }
          break;
        case SOLUTION_METHODS.XYZ_WING:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          const candidateCounts = new Map();
          prompt.forEach((cell) => {
            const candidates = board[cell.row][cell.col].draft;
            candidates.forEach((num) => {
              candidateCounts.set(num, (candidateCounts.get(num) || 0) + 1);
            });
          });
          posStr = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}、R${prompt[2].row + 1}C${prompt[2].col + 1}`;
          candStr = target.join(",");
          if (position.length === 1) {
            hintContent = `无论${posStr}这三个候选方格内如何取值，R${
              position[0].row + 1
            }C${position[0].col + 1}内都不能出现候选数${target[0]}`;
          } else if (position.length === 2) {
            hintContent = `无论${posStr}这三个候选方格内如何取值，R${
              position[0].row + 1
            }C${position[0].col + 1}、R${position[1].row + 1}C${
              position[1].col + 1
            }内都不能出现候选数${target[0]}`;
          }
          break;
        case SOLUTION_METHODS.SKYSCRAPER:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          posStr = prompt.map((p) => `R${p.row + 1}C${p.col + 1}`).join("、");
          if (position.length > 0) {
            deleteStr = position
              .map((p) => `R${p.row + 1}C${p.col + 1}`)
              .join("、");
          }
          hintContent = `${posStr}四个方格构成共轭链，无论R${
            prompt[0].row + 1
          }C${prompt[0].col + 1}还是R${prompt[3].row + 1}C${
            prompt[3].col + 1
          }取值为${target[0]}，${deleteStr}内都不能出现候选数${target[0]}`;
          break;
        case SOLUTION_METHODS.SKYSCRAPER2:
          if (position.length === 1) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}`;
          } else if (position.length === 2) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}`;
          } else if (position.length === 3) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}、R${position[2].row + 1}C${
              position[2].col + 1
            }`;
          } else if (position.length === 4) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}、R${position[2].row + 1}C${
              position[2].col + 1
            }、R${position[3].row + 1}C${position[3].col + 1}`;
          }
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPrompts(target);
          setPositions(target);
          hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
            prompt[1].row + 1
          }C${prompt[1].col + 1}与R${prompt[2].row + 1}C${
            prompt[2].col + 1
          }、R${prompt[3].row + 1}C${
            prompt[3].col + 1
          }分别构成两个强链，它们通过R${prompt[1].row + 1}C${
            prompt[1].col + 1
          }、R${prompt[3].row + 1}C${prompt[3].col + 1}构成的弱链相连，假设R${
            prompt[0].row + 1
          }C${prompt[0].col + 1}为真
          ，则R${position[0].row + 1}C${position[0].col + 1}为假，假设R${
            prompt[0].row + 1
          }C${prompt[0].col + 1}为假，则会导致R${prompt[3].row + 1}C${
            prompt[3].col + 1
          }为真，R${position[0].row + 1}C${
            position[0].col + 1
          }依旧为假，无论如何，${posStr}内都不应出现候选数${target[0]}`;
          break;
        case SOLUTION_METHODS.COMBINATION_CHAIN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          if (position.length === 1) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}`;
          } else if (position.length === 2) {
            posStr = `R${position[0].row + 1}C${position[0].col + 1}、R${
              position[1].row + 1
            }C${position[1].col + 1}`;
          }
          if (!isWeakLink && chainStructure === "3-2-1") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}构成强链，无论R${prompt[0].row + 1}C${
              prompt[0].col + 1
            }、R${prompt[1].row + 1}C${prompt[1].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}谁为真，${posStr}内都不能出现候选数${
              target[0]
            }`;
          } else if (isWeakLink && chainStructure === "3-2-1") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }构成强链，R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}两个方格构成强链，这两条强链通过R${
              prompt[2].row + 1
            }C${prompt[2].col + 1}、R${prompt[3].row + 1}C${
              prompt[3].col + 1
            }构成的弱链相连，无论R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}、R${prompt[4].row + 1}C${
              prompt[4].col + 1
            }谁为真，${posStr}内都不能出现候选数${target[0]}`;
          } else if (isWeakLink && chainStructure === "3-2-2") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }构成强链，R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}两个方格构成强链，这两条强链通过R${
              prompt[3].row + 1
            }C${prompt[3].col + 1}与R${prompt[0].row + 1}C${
              prompt[0].col + 1
            }、R${prompt[1].row + 1}C${
              prompt[1].col + 1
            }两方格的整体构成的弱链相连，无论R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[4].row + 1}C${
              prompt[4].col + 1
            }谁为真，${posStr}内都不能出现候选数${target[0]}`;
          } else if (!isWeakLink && chainStructure === "3-2-2") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }构成强链，R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}两个方格构成强链，这两条强链通过R${
              prompt[3].row + 1
            }C${prompt[3].col + 1}与R${prompt[0].row + 1}C${
              prompt[0].col + 1
            }、R${prompt[1].row + 1}C${
              prompt[1].col + 1
            }两方格的整体构成的强链相连，无论R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[4].row + 1}C${
              prompt[4].col + 1
            }谁为真，${posStr}内都不能出现候选数${target[0]}`;
          } else if (!isWeakLink && chainStructure === "3-4-1") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${prompt[6].col + 1}构成强链，无论R${
              prompt[0].row + 1
            }C${prompt[0].col + 1}、R${prompt[1].row + 1}C${
              prompt[1].col + 1
            }、R${prompt[6].row + 1}C${
              prompt[6].col + 1
            }谁为真，${posStr}内都不能出现候选数${prompt[4].row + 1}C${
              prompt[4].col + 1
            }谁为真，${posStr}内都不能出现候选数${target[0]}`;
          } else if (isWeakLink && chainStructure === "3-4-1") {
            hintContent = `R${prompt[0].row + 1}C${prompt[0].col + 1}、R${
              prompt[1].row + 1
            }C${prompt[1].col + 1}两个方格的组合与R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }构成强链，R${prompt[3].row + 1}C${prompt[3].col + 1}、R${
              prompt[4].row + 1
            }C${prompt[4].col + 1}、R${prompt[5].row + 1}C${
              prompt[5].col + 1
            }、R${prompt[6].row + 1}C${
              prompt[6].col + 1
            }四个方格构成强链，这两条强链通过R${prompt[2].row + 1}C${
              prompt[2].col + 1
            }、R${prompt[3].row + 1}C${prompt[3].col + 1}构成的弱链相连，无论R${
              prompt[0].row + 1
            }C${prompt[0].col + 1}、R${prompt[1].row + 1}C${
              prompt[1].col + 1
            }、R${prompt[4].row + 1}C${
              prompt[4].col + 1
            }谁为真，${posStr}内都不能出现候选数${target[0]}`;
          }
          break;
        case SOLUTION_METHODS.SWORDFISH_ROW:
          setPositions(target);
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
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
          hintContent = `无论${posStr}这${prompt.length}个候选方格哪三个取${
            target[0]
          }，第${columns.join("、")}列内都不能出现候选数${target[0]}`;
          break;
        case SOLUTION_METHODS.SWORDFISH_COLUMN:
          setPositions(target);
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
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
          hintContent = `无论${posStr}这${prompt.length}个候选方格哪三个取${
            target[0]
          }，第${rows.join("、")}行内都不能出现候选数${target[0]}`;
          break;
        case SOLUTION_METHODS.XY_CHAIN:
          setPositions([target[target.length - 1]]);
          setPrompts(target);
          boardWithHighlight = applyHintHighlight(board, result, "both");
          deleteStr = position.join("、");
          switch (result.label) {
            case "双双双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_sss', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   target4: target[3],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              // });
              break;
            case "双双双双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_ssss', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   target4: target[3],
              //   target5: target[4],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              // });
              break;
            case "弱强双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              // hintContent = t("hints.XY_CHAIN_rqs", {
              //   target1: target[0],
              //   target2: target[1],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              // });
              break;
            case "弱强强":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqq', {
              //   target1: target[0],
              //   target2: target[1],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              // });
              break;
            case "弱强强强":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqqq', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              // });
              break;
            case "弱强强双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqqs', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              // });
              break;
            case "弱强强强强":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              posStr6 = `R${prompt[5].row + 1}C${prompt[5].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqqqq', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   target4: target[3],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              //   posStr6,
              // });
              break;
            case "弱强强强双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              posStr6 = `R${prompt[5].row + 1}C${prompt[5].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqqqs', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   target4: target[3],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              //   posStr6,
              // });
              break;
            case "弱强双双":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_rqss', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              // });
              break;
            case "双双强强":
              posStr1 = `R${prompt[0].row + 1}C${prompt[0].col + 1}`;
              posStr2 = `R${prompt[1].row + 1}C${prompt[1].col + 1}`;
              posStr3 = `R${prompt[2].row + 1}C${prompt[2].col + 1}`;
              posStr4 = `R${prompt[3].row + 1}C${prompt[3].col + 1}`;
              posStr5 = `R${prompt[4].row + 1}C${prompt[4].col + 1}`;
              // hintContent = t('hints.XY_CHAIN_ssqq', {
              //   target1: target[0],
              //   target2: target[1],
              //   target3: target[2],
              //   target4: target[3],
              //   target5: target[4],
              //   deleteStr,
              //   posStr1,
              //   posStr2,
              //   posStr3,
              //   posStr4,
              //   posStr5,
              // });
              break;
          }
          break;
        case SOLUTION_METHODS.UNIQUE_RECTANGLE:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
        case SOLUTION_METHODS.JELLYFISH_ROW:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
        case SOLUTION_METHODS.JELLYFISH_COLUMN:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
        case SOLUTION_METHODS.LOOP:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
        case SOLUTION_METHODS.WXYZ_WING:
          boardWithHighlight = applyHintHighlight(board, result, "both");
          setPositions(target);
          setPrompts(target);
          break;
      }
    }
    updateBoard(
      boardWithHighlight!,
      `提示：${result.method}`,
      [],
      false,
      false
    );

    return hintContent;
  };

  const handleApplyHint = () => {
    if (result) {
      const { position, target, isFill } = result;
      let targetValues = [...target];

      if (result.method === SOLUTION_METHODS.XY_CHAIN) {
        targetValues = [targetValues[targetValues.length - 1]];
      }
      const newBoard = deepCopyBoard(board);

      position.forEach(({ row, col }) => {
        if (isFill) {
          newBoard[row][col].value = targetValues[0];
          newBoard[row][col].draft = [];

          // 更新受影响的单元格
          const affectedCells = updateRelatedCellsDraft(
            newBoard,
            [{ row, col }],
            targetValues[0],
            getCandidates
          );

          // 将受影响的单元格合并到 position 中
          position.push(...affectedCells);
        } else {
          newBoard[row][col].draft =
            newBoard[row][col].draft?.filter((num) => !targetValues.includes(num)) ??
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
      clearHistory();
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

  const handleIsUnitStrongLink = () => {
    const arr = inputValue.split(" ");
    const [row1, col1] = arr[0].split("");
    const [row2, col2] = arr[1].split("");
    console.log(
      isUnitStrongLink(
        board,
        { row: parseInt(row1), col: parseInt(col1) },
        { row: parseInt(row2), col: parseInt(col2) },
        parseInt(arr[2]),
        candidateMap
      )
    );
  };

  const handleGraphNodePaths = () => {
    console.log(
      getGraphNodePaths(
        getGraphNode({ row: 0, col: 2 }, 4, graph),
        getGraphNode({ row: 7, col: 1 }, 4, graph)
      )
    );
  };

  const handleTest = () => {
    testExtreme();
  };

  const handleTest2 = () => {
    // for(let i = 0; i < extreme.length; i++) {
      for(let i = 17; i < 18; i++) {
      const result = new SudokuSolver().solve(extreme[i].puzzle)
      console.log(result);
    }
  };

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
                ${cell.highlights?.join(" ") || ""}
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
                              prompts.includes(num) &&
                              cell?.highlightCandidates?.length &&
                              board[rowIndex][colIndex].highlights?.includes(
                                "promptHighlight"
                              )
                                ? "candidateHighlightHint"
                                : ""
                            } ${
                              positions.includes(num) &&
                              cell?.highlightCandidates?.length &&
                              board[rowIndex][colIndex].highlights?.includes(
                                "positionHighlight"
                              )
                                ? "candidateHighlightDelete"
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
        <Button onClick={handleGraphNodePaths}>打印路径</Button>
        <Button onClick={handleTest}>测试</Button>
        <Button onClick={handleTest2}>测试2</Button>
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
        styles={{
          body: {
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
          },
          header: { borderBottom: "none" },
        }}
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
      <div
        style={{
          position: "fixed",
          right: "20px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1000,
        }}
      >
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="请输入内容"
          onPressEnter={handleIsUnitStrongLink}
        />
      </div>
    </Card>
  );
};

export default Sudoku;
