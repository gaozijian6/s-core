import { CandidateMap, Graph, HyperGraph, HyperGraphNode, Position } from ".";

import { CellData } from ".";
import { SOLUTION_METHODS } from "../constans";
import { Result } from "./solution";

export const getNodesArray = (
  hyperGraphNode: HyperGraphNode
): HyperGraphNode[] => {
  const nodesArray: HyperGraphNode[] = [];
  const visited = new Set<string>();
  const queue: HyperGraphNode[] = [hyperGraphNode];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = current.cells
      .map((cell) => `${cell.row}-${cell.col}`)
      .join("|");

    visited.add(key);
    nodesArray.push(current);

    // 将所有相邻节点加入队列
    current.next?.forEach((nextNode) => {
      const nextKey = nextNode.cells
        .map((cell) => `${cell.row}-${cell.col}`)
        .join("|");
      if (!visited.has(nextKey)) {
        queue.push(nextNode);
      }
    });
  }

  return nodesArray;
};

export const getAffectedCells = (
  node: HyperGraphNode,
  candidateMap: CandidateMap,
  num: number
): Position[] => {
  let affectedCells: Position[] = [];
  const visited = new Set<string>();
  if (node.cells.length === 1) {
    const { row, col } = node.cells[0];
    affectedCells = [
      ...candidateMap[num].row.get(row)!.positions,
      ...candidateMap[num].col.get(col)!.positions,
      ...candidateMap[num].box.get(
        Math.floor(row / 3) * 3 + Math.floor(col / 3)
      )!.positions,
    ];
    affectedCells = affectedCells.filter(
      (cell) => cell.row !== row && cell.col !== col
    );
  } else {
    if (node.cells[0].row === node.cells[1].row) {
      const row = node.cells[0].row;
      affectedCells = [...candidateMap[num].row.get(row)!.positions];
    } else {
      const col = node.cells[0].col;
      affectedCells = [...candidateMap[num].col.get(col)!.positions];
    }
    affectedCells = [
      ...candidateMap[num].box.get(
        Math.floor(node.cells[0].row / 3) * 3 +
          Math.floor(node.cells[0].col / 3)
      )!.positions,
    ];
    affectedCells = affectedCells.filter(
      (cell) =>
        cell.row !== node.cells[0].row && cell.col !== node.cells[0].col
    );
    affectedCells = affectedCells.filter(
      (cell) =>
        cell.row !== node.cells[1].row && cell.col !== node.cells[1].col
    );
    if (node.cells.length === 3) {
      affectedCells = affectedCells.filter(
        (cell) =>
          cell.row !== node.cells[2].row && cell.col !== node.cells[2].col
      );
    }
  }
  return affectedCells;
};

export function combinationChain(
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  hyperGraph: HyperGraph,
  globalNodeMap: Map<string, HyperGraphNode>
): Result | null {
  const dfs = (
    path: HyperGraphNode[],
    depth: number,
    type1Array: string[],
    type2Array: string[]
  ): Result | null => {
    const node = path[path.length - 1];
    const result: Result[] = [];
    for (const nextNode of node.next) {
      if (nextNode.cells.length >= 2) {
        const result = dfs(
          [...path, nextNode],
          depth + 1,
          [...type1Array, "多"],
          [...type2Array]
        );
      } else {
        const result = dfs(
          [...path, nextNode],
          depth + 1,
          [...type1Array, "单"],
          [...type2Array]
        );
      }
      if (depth === 2) {
      }
      if (depth === 4) {
      }
    }
  };

  for (let num = 0; num < 9; num++) {
    const hyperNodeRoots = hyperGraph[num];
    for (const rootNode of hyperNodeRoots) {
      const nodesArray = getNodesArray(rootNode);
      for (const node of nodesArray) {
        if (node.cells.length === 2) continue;
        const result = dfs([node], 1, ["单"], []);
      }
    }
  }
  return null;
}
