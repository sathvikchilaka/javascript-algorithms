function flattenArray(arr) {
  return arr.reduce(
    (acc, val) => acc.concat(Array.isArray(val) ? flattenArray(val) : val),
    [],
  );
}

flattenArray([1, [2, 3, [4, [5, 6]], 7]]);

// Output: [1, 2, 3, 4, 5, 6, 7]
