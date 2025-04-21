import { CellData, HyperGraph, HyperGraphNode, Position } from ".";

import { CandidateMap } from ".";

import { Graph } from ".";
import { Result } from "./solution";
import { SOLUTION_METHODS } from "../constans";
import { areCellsInSameUnit } from ".";

class Node {
    cells: Position[] = [];
    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null; // 尝试向当前方格填入的值
    noValue: number[]; // 当前方格不能填入的值
    sons1: Node[] = []; // 双数置换的下一方格
    sons2: Node[] = []; // 被消除候选数的方格
    sons3: Node[] = []; // 强链关系导致填入候选数的方格
    father: Node | null = null;
    depth: number;
    label: "双" | "弱" | "强" | "";
  
    constructor(
      row: number,
      col: number,
      value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null,
      depth: number,
      father: Node | null = null,
      noValue: number[] = [],
      label: "双" | "弱" | "强" | "" = ""
    ) {
      this.row = row;
      this.col = col;
      this.value = value;
      this.depth = depth;
      this.father = father;
      this.noValue = noValue;
      this.label = label;
    }
  }
// 获取单一候选数的节点列表
const getSingleCandidateNodes = (
  hyperGraph: HyperGraph,
  num: number,
  board: CellData[][]
): HyperGraphNode[] => {
  const singleNodes: HyperGraphNode[] = [];

  // 遍历超图中的所有根节点
  for (const rootNode of hyperGraph[num] || []) {
    const queue: HyperGraphNode[] = [rootNode];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      const nodeKey = currentNode.cells
        .map((cell) => `${cell.row},${cell.col}`)
        .sort()
        .join("|");

      if (visited.has(nodeKey)) continue;
      visited.add(nodeKey);

      // 检查是否为单一候选数节点（单元格只有一个）
      if (currentNode.cells.length === 1) {
        const { row, col } = currentNode.cells[0];
        // 确认单元格有两个候选数
        if (board[row][col].draft.length === 2) {
          singleNodes.push(currentNode);
        }
      }

      // 添加所有相邻节点
      for (const nextNode of currentNode.next) {
        const nextKey = nextNode.cells
          .map((cell) => `${cell.row},${cell.col}`)
          .sort()
          .join("|");

        if (!visited.has(nextKey)) {
          queue.push(nextNode);
        }
      }
    }
  }

  return singleNodes;
};

// 找到受两个节点共同影响的单元格
const findCommonAffectedPositions = (
  node1: HyperGraphNode,
  node2: HyperGraphNode,
  board: CellData[][],
  num: number
): Position[] => {
  const affectedPositions: Position[] = [];

  // 生成两个节点包含的所有位置
  const node1Positions = node1.cells.map((cell) => ({
    row: cell.row,
    col: cell.col,
  }));
  const node2Positions = node2.cells.map((cell) => ({
    row: cell.row,
    col: cell.col,
  }));

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // 跳过属于两个节点的位置
      if (
        node1Positions.some((pos) => pos.row === row && pos.col === col) ||
        node2Positions.some((pos) => pos.row === row && pos.col === col)
      ) {
        continue;
      }

      const cell = board[row]?.[col];
      if (cell?.value === null && cell.draft?.includes(num)) {
        // 检查是否同时被两个节点的至少一个单元格影响
        let affectedByNode1 = false;
        let affectedByNode2 = false;

        for (const pos1 of node1Positions) {
          if (areCellsInSameUnit({ row, col }, pos1)) {
            affectedByNode1 = true;
            break;
          }
        }

        for (const pos2 of node2Positions) {
          if (areCellsInSameUnit({ row, col }, pos2)) {
            affectedByNode2 = true;
            break;
          }
        }

        if (affectedByNode1 && affectedByNode2) {
          affectedPositions.push({ row, col });
        }
      }
    }
  }

  return affectedPositions;
};

// 递归构建节点链条（从起始节点出发，收集所有链接的节点和它们的标记）
const buildChainTree = (
  node: Node,
  board: CellData[][],
  candidateMap: CandidateMap,
  num: number,
  depth: number,
  maxDepth: number,
  globalNodeMap: Map<string, HyperGraphNode>,
  visited: Set<string>
): void => {
  if (depth >= maxDepth) return;

  const nodeKey = node.cells
    .map((cell) => `${cell.row},${cell.col}`)
    .sort()
    .join("|");

  if (visited.has(nodeKey)) return;
  visited.add(nodeKey);

  // 单一单元格节点(单)才处理双数置换和弱链
  if (node.cells.length === 1) {
    const { row, col } = node.cells[0];

    // 1. 处理双数置换 (双)
    // 获取当前单元格的所有候选数
    const cellDraft = board[row][col].draft;
    if (cellDraft.length === 2) {
      // 确定另一个候选数
      const otherNum = cellDraft.find((n) => n !== num);
      if (otherNum) {
        // 获取该单元格在另一个候选数下的节点
        const otherNodeKey = `${otherNum}-${row},${col}`;
        if (globalNodeMap.has(otherNodeKey)) {
          const otherNode = globalNodeMap.get(otherNodeKey)!;
          const otherNodeVisitKey = otherNode.cells
            .map((cell) => `${cell.row},${cell.col}`)
            .sort()
            .join("|");

          if (!visited.has(otherNodeVisitKey)) {

            // 递归探索更深层次的路径
            buildChainTree(
              otherNode,
              board,
              candidateMap,
              otherNum,
              depth + 1,
              maxDepth,
              globalNodeMap,
              new Set(visited)
            );
            
          }
        }
      }
    }

    // 2. 处理弱链/消除候选数 (弱)
    // 获取该节点影响的所有单元格
    const affectedCells = [];

    // 同行
    for (const pos of candidateMap[num].row.get(row)?.positions || []) {
      if (pos.row !== row || pos.col !== col) {
        affectedCells.push(pos);
      }
    }

    // 同列
    for (const pos of candidateMap[num].col.get(col)?.positions || []) {
      if (pos.row !== row || pos.col !== col) {
        const key = `${pos.row}-${pos.col}`;
        const exists = affectedCells.some((p) => `${p.row}-${p.col}` === key);
        if (!exists) {
          affectedCells.push(pos);
        }
      }
    }

    // 同宫
    const boxIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (const pos of candidateMap[num].box.get(boxIndex)?.positions || []) {
      if (pos.row !== row || pos.col !== col) {
        const key = `${pos.row}-${pos.col}`;
        const exists = affectedCells.some((p) => `${p.row}-${p.col}` === key);
        if (!exists) {
          affectedCells.push(pos);
        }
      }
    }

    // 查找这些单元格对应的HyperGraph节点
    for (const pos of affectedCells) {
      // 构造单一单元格节点的键
      const singleNodeKey = `${num}-${pos.row},${pos.col}`;

      if (globalNodeMap.has(singleNodeKey)) {
        const weakNode = globalNodeMap.get(singleNodeKey)!;
        const weakNodeKey = weakNode.cells
          .map((cell) => `${cell.row},${cell.col}`)
          .sort()
          .join("|");

        if (!visited.has(weakNodeKey)) {

          // 递归探索更深层次的路径
          buildChainTree(
            weakNode,
            board,
            candidateMap,
            num,
            depth + 1,
            maxDepth,
            globalNodeMap,
            new Set(visited)
          );
          
          // 恢复路径
          currentPath.length = pathLength;
        }
      }
    }
  }

  // 3. 处理强链关系 (强) - 通过next关系，适用于所有类型节点
  for (const nextNode of node.next) {
    const nextKey = nextNode.cells
      .map((cell) => `${cell.row},${cell.col}`)
      .sort()
      .join("|");

    if (!visited.has(nextKey)) {
      // 记录当前路径
      const pathLength = currentPath.length;
      currentPath.push({ node: nextNode, label: "强" });
      
      // 如果路径长度足够，则记录该路径
      if (currentPath.length >= 2) {
        allChains.push([...currentPath]);
      }

      // 递归探索更深层次的路径
      buildChainTree(
        nextNode,
        board,
        candidateMap,
        num,
        depth + 1,
        maxDepth,
        globalNodeMap,
        new Set(visited)
      );
      
      // 恢复路径
      currentPath.length = pathLength;
    }
  }

  // 从路径中移除当前节点
  currentPath.pop();
};

// 获取节点路径上的所有单元格位置，用于显示提示
const getPromptPositions = (chain: HyperGraphNode[]): Position[] => {
  const positions: Position[] = [];

  for (const node of chain) {
    for (const cell of node.cells) {
      positions.push({ row: cell.row, col: cell.col });
    }
  }

  return positions;
};

// 检查两个节点是否在同一个单元中
const areNodesInSameUnit = (
  node1: HyperGraphNode,
  node2: HyperGraphNode
): boolean => {
  if (node1.cells.length === 0 || node2.cells.length === 0) return false;

  for (const cell1 of node1.cells) {
    for (const cell2 of node2.cells) {
      if (areCellsInSameUnit(cell1, cell2)) {
        return true;
      }
    }
  }

  return false;
};

export const doubleColorChain = (
  board: CellData[][],
  candidateMap: CandidateMap,
  graph: Graph,
  hyperGraph: HyperGraph,
  globalNodeMap: Map<string, HyperGraphNode>
): Result | null => {
  // 遍历每个数字
  for (let num = 1; num <= 9; num++) {
    // 找出候选数为 num 的所有单一候选数节点
    const singleNodes = getSingleCandidateNodes(hyperGraph, num, board);

    // 需要至少有两个节点才能形成颜色链
    if (singleNodes.length < 2) continue;

    // 在每次开始新的链条构建前，重置全局状态
    allChains.length = 0;
    currentPath.length = 0;

    // 对每个节点，构建从该节点出发的链
    for (let i = 0; i < singleNodes.length; i++) {
      const startNode = singleNodes[i];
      // 构建链条
      buildChainTree(
        startNode,
        board,
        candidateMap,
        num,
        0,
        3,
        globalNodeMap,
        new Set<string>()
      );

      // 获取构建好的链条
      const chain1 = allChains;

      // 然后在第二个链条构建前再次重置
      allChains.length = 0;
      currentPath.length = 0;

      // 每个单元格只有两个候选数，所以可以确定另一个候选数
      const { row, col } = startNode.cells[0];
      const otherCandidates = board[row][col].draft.filter((c) => c !== num);

      if (otherCandidates.length !== 1) continue;
      const otherNum = otherCandidates[0];

      // 尝试找出同一单元格中以另一个候选数开始的链
      for (const rootNode of hyperGraph[otherNum] || []) {
        const queue: HyperGraphNode[] = [rootNode];
        const visited = new Set<string>();
        let found = false;
        let startNode2: HyperGraphNode | null = null;

        // BFS搜索同一单元格的起始节点
        while (queue.length > 0 && !found) {
          const currentNode = queue.shift()!;
          const nodeKey = currentNode.cells
            .map((cell) => `${cell.row},${cell.col}`)
            .sort()
            .join("|");

          if (visited.has(nodeKey)) continue;
          visited.add(nodeKey);

          if (
            currentNode.cells.length === 1 &&
            currentNode.cells[0].row === row &&
            currentNode.cells[0].col === col
          ) {
            startNode2 = currentNode;
            found = true;
            break;
          }

          for (const nextNode of currentNode.next) {
            queue.push(nextNode);
          }
        }

        if (startNode2) {
          // 构建第二条链
          buildChainTree(
            startNode2,
            board,
            candidateMap,
            otherNum,
            0,
            3,
            globalNodeMap,
            new Set<string>()
          );

          const chain2 = allChains;

          // 现在我们有了两条从同一单元格出发的链，检查所有可能的交互
          for (const nodeA of chain1) {
            for (const nodeB of chain2) {
              // 情况一：如果两个节点都是单一候选数节点，且候选数相同，检查共同影响区
              if (
                nodeA.cells.length === 1 &&
                nodeB.cells.length === 1 &&
                !(
                  nodeA.cells[0].row === nodeB.cells[0].row &&
                  nodeA.cells[0].col === nodeB.cells[0].col
                )
              ) {
                const commonAffected = findCommonAffectedPositions(
                  nodeA,
                  nodeB,
                  board,
                  num
                );

                if (commonAffected.length > 0) {
                  const promptPositions = [
                    ...getPromptPositions([...nodeA, ...nodeB]),
                  ];
                  const label = "双色链";

                  return {
                    isFill: false,
                    position: commonAffected,
                    target: [num],
                    method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                    prompt: promptPositions,
                    label: `①${label}`,
                    highlightPromts1: getPromptPositions(nodeA),
                    highlightPromts2: getPromptPositions(nodeB),
                    highlightDeletes: commonAffected.map((pos) => ({
                      row: pos.row,
                      col: pos.col,
                      value: [num],
                    })),
                  };
                }
              }

              // 情况二：两个节点在同一单元中，但候选数不同
              if (
                nodeA.cells.length === 1 &&
                nodeB.cells.length === 1 &&
                areNodesInSameUnit(nodeA, nodeB) &&
                !(
                  nodeA.cells[0].row === nodeB.cells[0].row &&
                  nodeA.cells[0].col === nodeB.cells[0].col
                )
              ) {
                const { row: rowA, col: colA } = nodeA.cells[0];

                // 检查 A 位置是否包含 B 的候选数
                if (board[rowA][colA].draft.includes(otherNum)) {
                  return {
                    isFill: false,
                    position: [{ row: rowA, col: colA }],
                    target: [otherNum],
                    method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                    prompt: [...getPromptPositions([...nodeA, ...nodeB])],
                    label: `②双色链`,
                    highlightPromts1: getPromptPositions(nodeA),
                    highlightPromts2: getPromptPositions(nodeB),
                    highlightDeletes: [
                      {
                        row: rowA,
                        col: colA,
                        value: [otherNum],
                      },
                    ],
                  };
                }

                const { row: rowB, col: colB } = nodeB.cells[0];

                // 检查 B 位置是否包含 A 的候选数
                if (board[rowB][colB].draft.includes(num)) {
                  return {
                    isFill: false,
                    position: [{ row: rowB, col: colB }],
                    target: [num],
                    method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                    prompt: [...getPromptPositions([...nodeA, ...nodeB])],
                    label: `③双色链`,
                    highlightPromts1: getPromptPositions(nodeA),
                    highlightPromts2: getPromptPositions(nodeB),
                    highlightDeletes: [
                      {
                        row: rowB,
                        col: colB,
                        value: [num],
                      },
                    ],
                  };
                }
              }

              // 情况三：两个节点是同一个单元格
              if (
                nodeA.cells.length === 1 &&
                nodeB.cells.length === 1 &&
                nodeA.cells[0].row === nodeB.cells[0].row &&
                nodeA.cells[0].col === nodeB.cells[0].col
              ) {
                const cellRow = nodeA.cells[0].row;
                const cellCol = nodeA.cells[0].col;
                const cell = board[cellRow][cellCol];

                // 找出其他可能的候选数（排除num和otherNum）
                const otherCandidates = cell.draft.filter(
                  (value) => value !== num && value !== otherNum
                );

                if (otherCandidates.length > 0) {
                  return {
                    isFill: false,
                    position: [{ row: cellRow, col: cellCol }],
                    target: otherCandidates,
                    method: SOLUTION_METHODS.DOUBLE_COLOR_CHAIN,
                    prompt: [...getPromptPositions([...nodeA, ...nodeB])],
                    label: `④双色链`,
                    highlightPromts1: getPromptPositions(nodeA),
                    highlightPromts2: getPromptPositions(nodeB),
                    highlightDeletes: [
                      {
                        row: cellRow,
                        col: cellCol,
                        value: otherCandidates,
                      },
                    ],
                  };
                }
              }
            }
          }
        }
      }
    }
  }

  return null;
};
