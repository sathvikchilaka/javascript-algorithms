class ReverseWords {
  reverseWordsFromString(sentence) {
    let res = '';
    let tempWord = '';

    for (let i = sentence.length - 1; i >= 0; i--) {
      let s = sentence[i];
      if (s === ' ') {
        res += ' ' + tempWord;
        tempWord = '';
        continue;
      } else tempWord = s + tempWord;
    }
    res += ' ' + tempWord;

    return res.trim();
  }
}

const rWords = new ReverseWords();

console.log(rWords.reverseWordsFromString('Hello'));
console.log(rWords.reverseWordsFromString('Hello World'));
console.log(rWords.reverseWordsFromString(' Hello World '));
