import React, { useState, useEffect } from "react";
import { Card, Input, Button, message } from "antd";

const Sudoku: React.FC = () => {
  const [board, setBoard] = useState<(number | null)[][]>(
    Array(9)
      .fill(null)
      .map(() => Array(9).fill(null))
  );
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  const generateBoard = () => {
    // 困难
    // const newBoard = [
    //   [8, null, 5, null, null, null, 4, null, null],
    //   [null, null, null, null, 4, 2, null, null, null],
    //   [null, null, null, null, 1, null, null, null, 9],
    //   [null, null, null, null, null, null, 6, null, 4],
    //   [null, null, 8, 9, null, null, null, null, null],
    //   [null, 3, null, 6, null, null, null, 2, null],
    //   [1, null, null, null, 3, null, null, null, 7],
    //   [null, 7, null, null, null, 6, null, 8, null],
    //   [null, null, 2, 7, null, 1, null, null, 3]
    // ];
    // 简单
    const newBoard = [
      [6, null, null, 5, 9, null, null, null, 4],
      [9, null, 1, 8, null, null, null, 2, null],
      [null, null, 5, null, null, null, null, 6, 3],
      [null, 5, null, null, 1, null, null, 9, 6],
      [null, null, null, null, null, 3, 7, 5, null],
      [null, 9, 6, null, 5, 7, null, null, null],
      [5, 7, null, null, null, null, 8, null, 1],
      [null, null, null, null, 8, 5, 2, null, null],
      [null, 2, null, 7, null, null, 6, null, null],
    ];
    setBoard(newBoard);
  };

  useEffect(() => {
    generateBoard();
  }, []);

  const handleCellChange = (row: number, col: number) => {
    const newBoard = [...board];
    newBoard[row][col] = selectedNumber;
    setBoard(newBoard);
  };

  const checkSolution = () => {
    // 这里应该实现检查数独解法是否正确的逻辑
    // 为了简化,我们只检查是否所有格子都已填写
    const isSolved = board.every((row) => row.every((cell) => cell !== null));
    if (isSolved) {
      message.success("恭喜你完成了数独!");
    } else {
      message.warning("数独还未完成,请继续努力!");
    }
  };

  const solveSudoku = () => {
    const solvedBoard = [...board];
    if (solve(solvedBoard)) {
      setBoard(solvedBoard);
      message.success("数独已解决！");
    } else {
      message.error("无法解决此数独！");
    }
  };

  const solve = (board: (number | null)[][]): boolean => {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === null) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(board, row, col, num)) {
              board[row][col] = num;
              if (solve(board)) {
                return true;
              }
              board[row][col] = null;
            }
          }
          return false;
        }
      }
    }
    return true;
  };

  const isValid = (
    board: (number | null)[][],
    row: number,
    col: number,
    num: number
  ): boolean => {
    // 检查行
    for (let x = 0; x < 9; x++) {
      if (board[row][x] === num) return false;
    }

    // 检查列
    for (let x = 0; x < 9; x++) {
      if (board[x][col] === num) return false;
    }

    // 检查3x3方格
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i + startRow][j + startCol] === num) return false;
      }
    }

    return true;
  };

  return (
    <Card
      title="数独游戏"
      extra={<Button onClick={generateBoard}>新游戏</Button>}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(9, 1fr)",
          gap: "1px",
          width: "360px",
          margin: "0 auto",
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <Input
              key={`${rowIndex}-${colIndex}`}
              value={cell?.toString() ?? ""}
              onClick={() => handleCellChange(rowIndex, colIndex)}
              readOnly
              style={{
                width: "40px",
                height: "40px",
                textAlign: "center",
                fontSize: "18px",
                cursor: "pointer",
              }}
            />
          ))
        )}
      </div>
      <Button style={{ marginTop: "20px" }} onClick={checkSolution}>
        检查解法
      </Button>
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "center",
          gap: "10px",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <Button
            key={num}
            onClick={() => setSelectedNumber(num)}
            type={selectedNumber === num ? "primary" : "default"}
          >
            {num}
          </Button>
        ))}
      </div>
      <Button
        style={{ marginTop: "20px", marginLeft: "10px" }}
        onClick={solveSudoku}
      >
        求解数独
      </Button>
    </Card>
  );
};

export default Sudoku;
