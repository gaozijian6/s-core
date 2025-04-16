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

export const getAffectedCells_Hyper = (
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
      (cell) => cell.row !== node.cells[0].row && cell.col !== node.cells[0].col
    );
    affectedCells = affectedCells.filter(
      (cell) => cell.row !== node.cells[1].row && cell.col !== node.cells[1].col
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

export const getCommonAffectedCells_Hyper = (
  node1: HyperGraphNode,
  node2: HyperGraphNode,
  candidateMap: CandidateMap,
  num: number
): Position[] => {
  const affectedCells1=getAffectedCells_Hyper(node1,candidateMap,num);
  const affectedCells2=getAffectedCells_Hyper(node2,candidateMap,num);
  const visited = new Set<string>();
  const commonAffectedCells: Position[] = [];
  for (const cell of affectedCells1) {
    visited.add(`${cell.row}-${cell.col}`);
  }
  for (const cell of affectedCells2) {
    if (visited.has(`${cell.row}-${cell.col}`)) {
      commonAffectedCells.push(cell);
    }
  }
  
  return commonAffectedCells;
};

export function combinationChain(
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  hyperGraph: HyperGraph,
  globalNodeMap: Map<string, HyperGraphNode>
): Result | null {
  const dfs = (
    num: number,
    path: HyperGraphNode[],
    depth: number,
    type1Array: string[],
    type2Array: string[]
  ): Result | null => {
    if(depth>6) return null;
    if (depth === 4||depth===6) {
      const affectedCells=getCommonAffectedCells_Hyper(path[0],path[path.length-1],candidateMap,num);
      const prompt=[];
      for(let i=0;i<path.length;i++){
        for(let j=0;j<path[i].cells.length;j++){
          prompt.push({row:path[i].cells[j].row,col:path[i].cells[j].col});
        }
      }
      if (affectedCells.length>0) {
        return {
          label1: type1Array.join(''),
          label2: type2Array.join(''),
          position: affectedCells,
          prompt: prompt,
          method: SOLUTION_METHODS.LOOP,
          isFill: true,
          target: [Number(num)],
        };
      }
    }
    const node = path[path.length - 1];
    let result: Result | null = null;
    for (const nextNode of node.next) {
      if (nextNode.cells.length >= 2) {
        result = dfs(
          num,
          [...path, nextNode],
          depth + 1,
          [...type1Array, "多"],
          [...type2Array, "强"]
        );
        if (result) return result;
      } else {
        result = dfs(
          num,
          [...path, nextNode],
          depth + 1,
          [...type1Array, "单"],
          [...type2Array, "强"]
        );
        if (result) return result;
      }
      if (depth === 2) {
        const affectedCells = getAffectedCells_Hyper(node, candidateMap, num);
        // 找单个方格
        for (const pos of affectedCells) {
          result = dfs(
            num,
            [...path, nextNode],
            depth + 1,
            [...type1Array, "单"],
            [...type2Array, "弱"]
          );
          if (result) return result;
        }
        // 找多格
        if (affectedCells.length > 1) {
          for (let i = 0; i < affectedCells.length; i++) {
            for (let j = i + 1; j < affectedCells.length; j++) {
              const key =
                "num-" +
                [affectedCells[i], affectedCells[j]]
                  .map((c) => `${c.row},${c.col}`)
                  .sort()
                  .join("|");
              if (globalNodeMap.has(key)) {
                result = dfs(
                  num,
                  [...path, globalNodeMap.get(key)!],
                  depth + 1,
                  [...type1Array, "多"],
                  [...type2Array, "弱"]
                );
                if (result) return result;
              }
            }
          }
        }
        if (affectedCells.length > 2) {
          for (let i = 0; i < affectedCells.length; i++) {
            for (let j = i + 1; j < affectedCells.length; j++) {
              for (let k = j + 1; k < affectedCells.length; k++) {
                const key =
                  "num-" +
                  [affectedCells[i], affectedCells[j], affectedCells[k]]
                    .map((c) => `${c.row},${c.col}`)
                    .sort()
                    .join("|");
                if (globalNodeMap.has(key)) {
                  result = dfs(
                    num,
                    [...path, globalNodeMap.get(key)!],
                    depth + 1,
                    [...type1Array, "多"],
                    [...type2Array, "弱"]
                  );
                  if (result) return result;
                }
              }
            }
          }
        }
      }
    }
    return result;
  };
  for (let num = 1; num < 10; num++) {
    const hyperNodeRoots = hyperGraph[num];
    for (const rootNode of hyperNodeRoots) {
      const nodesArray = getNodesArray(rootNode);
      for (const node of nodesArray) {
        if (node.cells.length === 2) continue;
        const result = dfs(num, [node], 1, ["单"], []);
        if (result) return result;
      }
    }
  }
  return null;
}
