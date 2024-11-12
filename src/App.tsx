import { useState } from "react";
import Sudoku from "./views/sudoku";
import { flushSync } from "react-dom";
function App() {

  const fibonacci = (n: number): number => {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  };

  return (
    <>
      <Sudoku />
    </>
  );
}

export default App;
