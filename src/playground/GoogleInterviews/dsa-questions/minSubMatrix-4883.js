class MinSubMatrix {
  // TC: O(n^2)
  min3x3Submatrix(matrix, height = 3, width = 3, requireNonZeroes = true) {
    const m = matrix.length;
    const n = matrix[0].length;

    if (m < height || n < width) {
      return null;
    }

    let minSum = Infinity;
    let minSubmatrix = null;

    let prefixSum = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    const zeroCount = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++) {
        prefixSum[i][j] =
          matrix[i - 1][j - 1] +
          prefixSum[i - 1][j] +
          prefixSum[i][j - 1] -
          prefixSum[i - 1][j - 1];

        const isZero = !matrix[i - 1][j - 1] ? 1 : 0;

        zeroCount[i][j] =
          isZero +
          zeroCount[i - 1][j] +
          zeroCount[i][j - 1] -
          zeroCount[i - 1][j - 1];
      }

    for (let i = 0; i <= m - height; i++)
      for (let j = 0; j <= n - width; j++) {
        const r1 = i;
        const c1 = j;
        const r2 = i + height;
        const c2 = j + width;

        const currZeroesCount =
          zeroCount[r2][c2] -
          zeroCount[r2][c1] -
          zeroCount[r1][c2] +
          zeroCount[r1][c1];

        if (currZeroesCount > 0 && requireNonZeroes) continue;

        const currSum =
          prefixSum[r2][c2] -
          prefixSum[r2][c1] -
          prefixSum[r1][c2] +
          prefixSum[r1][c1];

        if (currSum < minSum) {
          minSum = currSum;
          minSubmatrix = [i, j];
        }
      }

    return {
      minSum,
      topLeft: minSubmatrix,
    };
  }
}
