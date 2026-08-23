class NonExtremeEndpointsSubarray {
  findContiguousSubArray(arr, isDistinct = false) {
    let minPtr = 1,
      maxPtr = arr.length,
      left = 0,
      right = arr.length - 1;

    let sorted = null;

    if (isDistinct) {
      // Generic distinct array: [10, 30, 20, 50]
      sorted = [...arr].sort((a, b) => a - b);
      minPtr = 0;
      maxPtr = n - 1;
    } else {
      // Permutation array: [1, 3, 2, 5, 4]
      minPtr = 1;
      maxPtr = n;
    }

    while (right - left + 1 >= 4) {
      const currentMin = isDistinct ? sorted[minPtr] : minPtr;
      const currentMax = isDistinct ? sorted[maxPtr] : maxPtr;

      if (arr[left] === currentMin) {
        left++;
        currentMin++;
      } else if (arr[right] === currentMin) {
        right--;
        currentMin++;
      } else if (arr[left] === currentMax) {
        left++;
        currentMax--;
      } else if (arr[right] === currentMax) {
        right--;
        currentMax--;
      } else {
        return arr.slice(left, right + 1);
      }
    }

    return arr.slice(left, right + 1);
  }
}
