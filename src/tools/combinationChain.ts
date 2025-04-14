import { CandidateMap, Graph, HyperGraph, HyperGraphNode } from ".";

import { CellData } from ".";
import { Result } from "./solution";

export default function combinationChain(
    board: CellData[][],
    candidateMap: CandidateMap,
    graph: Graph,
    hyperGraph: HyperGraph | null
  ): Result | null => {
    // 避免在hyperGraph为null时继续执行
    if (!hyperGraph) return null;
  
    // 创建节点唯一标识符的辅助函数
    const getNodeKey = (node: HyperGraphNode): string => {
      // 检查cells是否存在
      if (!node || !node.cells || !Array.isArray(node.cells)) {
        return "invalid_node";
      }
      return node.cells.map((cell) => `${cell.row},${cell.col}`).join("|");
    };
  
    // 遍历所有数字
    for (let num = 1; num <= 9; num++) {
      const hyperNodeRoots = hyperGraph[num] || [];
  
      if (hyperNodeRoots.length === 0) continue;
  
      // 用于记录全局已访问的节点
      const globalVisited = new Set<string>();
      // 对每个子图根节点进行BFS，收集节点后立即检测
      for (const rootNode of hyperNodeRoots) {
        const rootNodeKey = getNodeKey(rootNode);
        if (globalVisited.has(rootNodeKey)) continue;
  
        // 收集当前子图的所有节点
        const currentSubgraphNodes: HyperGraphNode[] = [];
        const visited = new Set<string>();
  
        const queue: HyperGraphNode[] = [rootNode];
        visited.add(rootNodeKey);
        globalVisited.add(rootNodeKey);
  
        while (queue.length > 0) {
          const currentNode = queue.shift()!;
          currentSubgraphNodes.push(currentNode);
  
          // 将相邻未访问节点加入队列
          if (currentNode.next) {
            for (const nextNode of currentNode.next) {
              // 跳过无效节点
              if (!nextNode || !nextNode.cells) continue;
  
              const nextNodeKey = getNodeKey(nextNode);
              if (!visited.has(nextNodeKey)) {
                queue.push(nextNode);
                visited.add(nextNodeKey);
                globalVisited.add(nextNodeKey);
              }
            }
          }
        }
  
        // 将节点分类为单节点和多节点
        const multiNodes: HyperGraphNode[] = [];
        const singleNodes: HyperGraphNode[] = [];
  
        for (const node of currentSubgraphNodes) {
          if (node.cells && node.cells.length > 1) {
            multiNodes.push(node);
          } else if (node.cells && node.cells.length === 1) {
            singleNodes.push(node);
          }
        }
  
        // 如果当前子图没有多节点或单节点不足，则跳过此子图
        if (multiNodes.length === 0 || singleNodes.length <= 2) continue;
  
        //======================================================
        // 检测"单单单多"模式
        //======================================================
        for (const startMultiNode of multiNodes) {
          // 记录已访问节点以避免循环
          const patternVisited = new Set<string>();
          patternVisited.add(getNodeKey(startMultiNode));
  
          // 初始化队列，用于BFS
          const patternQueue: {
            node: HyperGraphNode;
            path: HyperGraphNode[];
            distance: number;
          }[] = [{ node: startMultiNode, path: [startMultiNode], distance: 0 }];
  
          while (patternQueue.length > 0) {
            const { node, path, distance } = patternQueue.shift()!;
  
            // 当达到目标距离(3)且节点是单节点时（多单单单模式）
            if (distance === 3 && node.cells && node.cells.length === 1) {
              // 检查路径是否符合"多-单-单-单"模式
              if (path.length !== 4) continue; // 路径应该包含4个节点
  
              // 验证路径是"多单单单"模式
              const isValidPattern =
                path[0].cells.length > 1 &&
                path[1].cells.length === 1 &&
                path[2].cells.length === 1 &&
                path[3].cells.length === 1;
  
              if (!isValidPattern) continue;
  
              // 多单单单的链式结构找到，检查共同影响的区域
              const firstNode = path[0]; // 多节点
              const lastNode = node; // 最后的单节点
              const lastCell = lastNode.cells[0]; // 尾节点单元格
  
              // 收集多节点所影响的所有候选方格
              const firstNodeAffectedPositions: Set<string> = new Set(); // 使用Set避免重复
  
              // 首先确定多节点单元格的特征：是同行、同列还是仅同宫
              const cell1 = firstNode.cells[0];
              const cell2 = firstNode.cells[1]; // 多节点至少有2个单元格
  
              const isSameRow = cell1.row === cell2.row;
              const isSameCol = cell1.col === cell2.col;
  
              // 确定宫的位置
              const boxRow = Math.floor(cell1.row / 3) * 3;
              const boxCol = Math.floor(cell1.col / 3) * 3;
  
              // 如果是同行
              if (isSameRow) {
                const row = cell1.row;
                // 收集该行上的所有候选方格（不包括多节点自身的单元格）
                for (let col = 0; col < 9; col++) {
                  let isInMultiNode = false;
                  for (const cell of firstNode.cells) {
                    if (cell.row === row && cell.col === col) {
                      isInMultiNode = true;
                      break;
                    }
                  }
                  if (
                    !isInMultiNode &&
                    board[row][col].value === null &&
                    board[row][col].draft.includes(num)
                  ) {
                    firstNodeAffectedPositions.add(`${row},${col}`);
                  }
                }
              }
  
              // 如果是同列
              if (isSameCol) {
                const col = cell1.col;
                // 收集该列上的所有候选方格（不包括多节点自身的单元格）
                for (let row = 0; row < 9; row++) {
                  let isInMultiNode = false;
                  for (const cell of firstNode.cells) {
                    if (cell.row === row && cell.col === col) {
                      isInMultiNode = true;
                      break;
                    }
                  }
                  if (
                    !isInMultiNode &&
                    board[row][col].value === null &&
                    board[row][col].draft.includes(num)
                  ) {
                    firstNodeAffectedPositions.add(`${row},${col}`);
                  }
                }
              }
  
              // 收集同宫中的所有候选方格（不包括多节点自身的单元格）
              for (let r = boxRow; r < boxRow + 3; r++) {
                for (let c = boxCol; c < boxCol + 3; c++) {
                  let isInMultiNode = false;
                  for (const cell of firstNode.cells) {
                    if (cell.row === r && cell.col === c) {
                      isInMultiNode = true;
                      break;
                    }
                  }
                  if (
                    !isInMultiNode &&
                    board[r][c].value === null &&
                    board[r][c].draft.includes(num)
                  ) {
                    firstNodeAffectedPositions.add(`${r},${c}`);
                  }
                }
              }
  
              // 在多节点影响的方格中，找出同时被尾节点影响的方格
              const affectedPositions: Position[] = [];
              const lastRow = lastCell.row;
              const lastCol = lastCell.col;
              const lastBoxRow = Math.floor(lastRow / 3) * 3;
              const lastBoxCol = Math.floor(lastCol / 3) * 3;
  
              // 转换Set为位置数组
              for (const posKey of firstNodeAffectedPositions) {
                const [row, col] = posKey.split(",").map(Number);
  
                // 检查是否与尾节点在同一行、列或宫
                const isInSameRow = row === lastRow;
                const isInSameCol = col === lastCol;
                const isInSameBox =
                  row >= lastBoxRow &&
                  row < lastBoxRow + 3 &&
                  col >= lastBoxCol &&
                  col < lastBoxCol + 3;
  
                if (isInSameRow || isInSameCol || isInSameBox) {
                  // 确保该位置不是链中的一部分
                  let isPartOfChain = false;
                  for (const chainNode of path) {
                    for (const nodeCell of chainNode.cells) {
                      if (nodeCell.row === row && nodeCell.col === col) {
                        isPartOfChain = true;
                        break;
                      }
                    }
                    if (isPartOfChain) break;
                  }
  
                  if (!isPartOfChain) {
                    affectedPositions.push({ row, col });
                  }
                }
              }
  
              // 如果有可以删除的候选数，返回结果
              if (affectedPositions.length > 0) {
                // 收集提示位置
                const promptPositions: Position[] = [];
                for (const chainNode of path) {
                  for (const cell of chainNode.cells) {
                    promptPositions.push({ row: cell.row, col: cell.col });
                  }
                }
  
                return {
                  position: affectedPositions,
                  prompt: promptPositions,
                  method: SOLUTION_METHODS.COMBINATION_CHAIN,
                  target: [num],
                  isFill: false,
                  chainStructure: "多单单单-4",
                };
              }
            }
  
            // 如果还没达到距离3，继续BFS
            if (distance < 3 && node.next) {
              for (const nextNode of node.next) {
                // 跳过无效节点
                if (!nextNode || !nextNode.cells) continue;
  
                const nextNodeKey = getNodeKey(nextNode);
  
                // 避免重复访问和自环
                if (patternVisited.has(nextNodeKey)) continue;
  
                // 检查是否已在路径中
                const isInPath = path.some(
                  (pathNode) => getNodeKey(pathNode) === nextNodeKey
                );
                if (isInPath) continue;
  
                // 根据距离确定下一个节点的类型
                if (distance === 0) {
                  // 第一层必须是单节点
                  if (nextNode.cells.length !== 1) continue;
                } else if (distance === 1) {
                  // 第二层必须是单节点
                  if (nextNode.cells.length !== 1) continue;
                } else if (distance === 2) {
                  // 第三层必须是单节点
                  if (nextNode.cells.length !== 1) continue;
                }
  
                // 添加到队列
                patternQueue.push({
                  node: nextNode,
                  path: [...path, nextNode],
                  distance: distance + 1,
                });
                patternVisited.add(nextNodeKey);
              }
            }
          }
        }
      }
    }
  
    return null;
  };