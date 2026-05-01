class CountSquareRegionsMatrix {
  constructor() {
    this.result = 0;

    this.dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
  }

  // Base Problem
  countSquareRegions(grid) {
    const rows = grid.length;
    if (rows === 0) return 0;

    const cols = grid[0].length;

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

    const dfs = (color, r, c, info) => {
      visited[r][c] = true;

      info.count++;
      info.minRow = Math.min(info.minRow, r);
      info.maxRow = Math.max(info.maxRow, r);
      info.minCol = Math.min(info.minCol, c);
      info.maxCol = Math.max(info.maxCol, c);

      for (const [dr, dc] of this.dirs) {
        const nr = r + dr;
        const nc = c + dc;

        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !visited[nr][nc] &&
          grid[nr][nc] === color
        )
          dfs(color, nr, nc, info);
      }
    };

    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (visited[r][c]) continue;

        const info = {
          count: 0,
          minRow: r,
          maxRow: r,
          minCol: c,
          maxCol: c,
        };

        dfs(grid[r][c], r, c, info);

        const height = info.maxRow - info.minRow + 1;
        const width = info.maxCol - info.minCol + 1;

        if (height === width && info.count === height * width) this.result++;
      }

    return this.result;
  }

  // FollowUp-1
  countSquareRegionsUniqueColors(grid) {
    const rows = grid.length;
    if (rows === 0) return 0;

    const cols = grid[0].length;
    const map = new Map();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const color = grid[r][c];

        if (!map.has(color)) {
          map.set(color, {
            count: 0,
            minRow: r,
            maxRow: r,
            minCol: c,
            maxCol: c,
          });
        }

        const info = map.get(color);
        info.count++;
        info.minRow = Math.min(info.minRow, r);
        info.maxRow = Math.max(info.maxRow, r);
        info.minCol = Math.min(info.minCol, c);
        info.maxCol = Math.max(info.maxCol, c);
      }
    }

    let result = 0;

    for (const info of map.values()) {
      const height = info.maxRow - info.minRow + 1;
      const width = info.maxCol - info.minCol + 1;

      if (height === width && info.count === height * width) {
        result++;
      }
    }

    return result;
  }

  // FollowUp-2
  countSquareBorderRegions(grid) {
    const rows = grid.length;
    if (rows === 0) return 0;

    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

    const dirs = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];

    let result = 0;

    const dfs = (color, r, c, info) => {
      visited[r][c] = true;

      info.count++;
      info.cells.push([r, c]);

      info.minRow = Math.min(info.minRow, r);
      info.maxRow = Math.max(info.maxRow, r);
      info.minCol = Math.min(info.minCol, c);
      info.maxCol = Math.max(info.maxCol, c);

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;

        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !visited[nr][nc] &&
          grid[nr][nc] === color
        ) {
          dfs(color, nr, nc, info);
        }
      }
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (visited[r][c]) continue;

        const info = {
          count: 0,
          cells: [],
          minRow: r,
          maxRow: r,
          minCol: c,
          maxCol: c,
        };

        dfs(grid[r][c], r, c, info);

        const height = info.maxRow - info.minRow + 1;
        const width = info.maxCol - info.minCol + 1;

        if (height !== width) continue;

        const k = height;
        const expected = k === 1 ? 1 : k === 2 ? 4 : 4 * k - 4;

        if (info.count !== expected) continue;

        let valid = true;

        for (const [x, y] of info.cells) {
          const onBorder =
            x === info.minRow ||
            x === info.maxRow ||
            y === info.minCol ||
            y === info.maxCol;

          if (!onBorder) {
            valid = false;
            break;
          }
        }

        if (valid) result++;
      }
    }

    return result;
  }
}
