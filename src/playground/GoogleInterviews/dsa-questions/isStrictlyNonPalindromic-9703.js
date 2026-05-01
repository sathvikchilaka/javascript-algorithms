class IsStrictlyNonPalindromic {
  constructor() {
    this.cache = new Map();
  }

  convertToBase(x, base) {
    const digits = [];

    while (x > 0) {
      digits.push(String(x % base));
      x = Math.floor(x / base);
    }

    return digits.reverse().join('');
  }

  isPalindrome(str) {
    let left = 0;
    let right = str.length - 1;

    while (left < right) {
      if (str[left] !== str[right]) return false;
      left++;
      right--;
    }

    return true;
  }

  isStrictlyNonPalindromic(n) {
    for (let base = 2; base <= n - 2; base++) {
      const representation = this.convertToBase(n, base);

      if (this.isPalindrome(representation)) {
        return false;
      }
    }
    return true;
  }
}
