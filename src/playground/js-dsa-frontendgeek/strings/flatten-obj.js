function flattenObj(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [key, val]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null) {
      acc = { ...acc, ...flattenObj(val, path) };
    } else {
      acc[path] = val;
    }
    return acc;
  }, {});
}

console.log(flattenObj({ a: { b: 1, c: { d: 2, e: [4, 5] } }, f: 3 }));

// Ques:
// {
//     "a": {
//         "b": 1,
//         "c": {
//             "d": 2,
//             "e": [
//                 4,
//                 5
//             ]
//         }
//     },
//     "f": 3
// }

// Ans:
// {
//     "a.b": 1,
//     "a.c.d": 2,
//     "a.c.e.0": 4,
//     "a.c.e.1": 5,
//     "f": 3
// }
