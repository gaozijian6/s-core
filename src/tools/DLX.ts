interface Plan {
  i: number
  j: number
  val: number
}

class DLX {
  private maxn = 20010
  private L: number[]
  private R: number[]
  private D: number[]
  private U: number[]
  private Row: number[]
  private C: number[]
  private S: number[]
  private m: number
  private id: number
  private rowid: number
  private ans: number[]
  private cnt: number
  private mul: number
  private res: number[][]
  private p: Plan[]

  constructor() {
    this.L = new Array(this.maxn)
    this.R = new Array(this.maxn)
    this.D = new Array(this.maxn)
    this.U = new Array(this.maxn)
    this.Row = new Array(this.maxn)
    this.C = new Array(this.maxn)
    this.S = new Array(this.maxn)
    this.ans = new Array(this.maxn)
    this.cnt = 0
    this.mul = 0
    this.res = Array.from({length: 20}, () => new Array(20))
    this.p = new Array(5010)
  }

  init(m: number): void {
    this.m = m
    this.mul = 0
    
    for (let i = 0; i <= m; i++) {
      this.D[i] = this.U[i] = i
      this.S[i] = 0
      this.L[i] = i - 1
      this.R[i] = i + 1
    }
    
    this.L[0] = m
    this.R[m] = 0
    this.id = m + 1
    this.cnt = this.rowid = 0
  }

  insert(arr: number[], len: number): void {
    for (let i = 0; i < len; i++, this.id++) {
      const x = arr[i]
      this.C[this.id] = x
      this.Row[this.id] = this.rowid
      this.S[x]++
      this.D[this.id] = x
      this.U[this.id] = this.U[x]
      this.D[this.U[x]] = this.id
      this.U[x] = this.id
      
      if (i === 0) {
        this.L[this.id] = this.R[this.id] = this.id
      } else {
        this.L[this.id] = this.id - 1
        this.R[this.id] = this.id - i
        this.L[this.id - i] = this.id
        this.R[this.id - 1] = this.id
      }
    }
    this.rowid++
  }

  private remove(c: number): void {
    this.L[this.R[c]] = this.L[c]
    this.R[this.L[c]] = this.R[c]
    
    for (let i = this.D[c]; i !== c; i = this.D[i]) {
      for (let j = this.R[i]; j !== i; j = this.R[j]) {
        this.S[this.C[j]]--
        this.U[this.D[j]] = this.U[j]
        this.D[this.U[j]] = this.D[j]
      }
    }
  }

  private resume(c: number): void {
    for (let i = this.U[c]; i !== c; i = this.U[i]) {
      for (let j = this.L[i]; j !== i; j = this.L[j]) {
        this.S[this.C[j]]++
        this.U[this.D[j]] = j
        this.D[this.U[j]] = j
      }
    }
    this.L[this.R[c]] = c
    this.R[this.L[c]] = c
  }

  dance(): boolean {
    if (this.R[0] === 0) {
      if (++this.mul > 1) return true
      for (let i = 0; i < this.cnt; i++) {
        const plan = this.p[this.ans[i]]
        this.res[plan.i][plan.j] = plan.val
      }
      return false
    }

    let c = this.R[0]
    for (let i = this.R[0]; i !== 0; i = this.R[i]) {
      if (this.S[i] < this.S[c]) c = i
    }

    this.remove(c)
    for (let i = this.D[c]; i !== c; i = this.D[i]) {
      this.ans[this.cnt++] = this.Row[i]
      for (let j = this.R[i]; j !== i; j = this.R[j]) {
        this.remove(this.C[j])
      }
      if (this.dance()) return true
      for (let j = this.L[i]; j !== i; j = this.L[j]) {
        this.resume(this.C[j])
      }
      this.cnt--
    }
    this.resume(c)
    return false
  }

  getResult(): number[][] {
    return this.res
  }

  getMul(): number {
    return this.mul
  }

  setPlan(index: number, plan: Plan): void {
    this.p[index] = plan
  }
}

export class SudokuSolver {
  private dlx: DLX
  private m: number // 小方格大小 (3 for 9x9 sudoku)
  private size: number // 整个数独大小 (9 for 9x9 sudoku)
  private map: number[][]
  private hash: Map<string, number>
  private rehash: string[]

  constructor() {
    this.dlx = new DLX()
    this.m = 3
    this.size = this.m * this.m
    this.map = Array.from({length: 20}, () => new Array(20).fill(0))
    
    // 初始化数字映射
    this.hash = new Map()
    this.rehash = ['0','1','2','3','4','5','6','7','8','9']
    for (let i = 0; i <= 9; i++) {
      this.hash.set(i.toString(), i)
    }
  }

  solve(input: string): string | undefined {
    // 将输入字符串转换为二维数组
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const val = input[i * this.size + j]
        this.map[i + 1][j + 1] = parseInt(val)
      }
    }

    const M = this.size
    this.dlx.init(M * M * 4)
    let idx = 0
    
    // 构建精确覆盖问题
    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= M; j++) {
        if (this.map[i][j] !== 0) {
          // 已填数字只添加一种可能
          const k = this.map[i][j]
          const arr = [
            (i - 1) * M + k,              // 行约束
            M * M + (j - 1) * M + k,      // 列约束
            M * M * 2 + (this.grid(i, j) - 1) * M + k,  // 宫约束
            M * M * 3 + (i - 1) * M + j   // 单元格约束
          ]
          this.dlx.insert(arr, 4)
          this.dlx.setPlan(idx++, {i, j, val: k})
        } else {
          // 空格添加1-9所有可能
          for (let k = 1; k <= M; k++) {
            const arr = [
              (i - 1) * M + k,
              M * M + (j - 1) * M + k,
              M * M * 2 + (this.grid(i, j) - 1) * M + k,
              M * M * 3 + (i - 1) * M + j
            ]
            this.dlx.insert(arr, 4)
            this.dlx.setPlan(idx++, {i, j, val: k})
          }
        }
      }
    }

    // 如果dance()返回true，说明有多个解或无解
    if (this.dlx.dance()) {
      return undefined
    }

    const result = this.dlx.getResult()
    
    // 检查结果是否有效
    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= M; j++) {
        if (!result[i] || !result[i][j]) {
          return undefined
        }
      }
    }
    
    // 将结果转换为字符串
    let output = ''
    for (let i = 1; i <= M; i++) {
      for (let j = 1; j <= M; j++) {
        output += result[i][j].toString()
      }
    }
    return output
  }

  private grid(i: number, j: number): number {
    return Math.floor((i - 1) / this.m) * this.m + Math.floor((j - 1) / this.m) + 1
  }
}

// 使用示例
const solver = new SudokuSolver()
// const input = "700030090500600000100000000007400105060800000000000200070900030000341000000275000"
const input = "000000000000000000000000000000000000000000000000000000000000000000000000000000000"
const result = solver.solve(input)

console.log(result)

export default DLX
