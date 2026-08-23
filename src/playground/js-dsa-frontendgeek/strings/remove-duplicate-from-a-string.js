class RemoveDuplicates {
  removeDuplicatesFromString(sentence) {
    const charSet = new Set();
    let res = '';

    [...sentence].map((s) => {
      if (!charSet.has(s)) {
        charSet.add(s);
        res += s;
      }
    });

    return res;
  }
}
