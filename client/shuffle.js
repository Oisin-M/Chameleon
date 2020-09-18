import { getWordsProvider } from "./language";

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// TODO check if this is used, or better than Shuffle somehow
export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

export function getRandomWords() {
  let filteredWords = getWordsProvider();
  let wordIndex = Math.floor(Math.random() * filteredWords.length);

  let chosenCategory = filteredWords[wordIndex].category;
  let wordsFromChosenCategory = filteredWords.filter(
    (word) => word.category == chosenCategory
  );

  wordsFromChosenCategory = shuffle(wordsFromChosenCategory);
  let chosenWords = wordsFromChosenCategory.slice(0, 16);
  let words = chosenWords.map((word) => word.text);
  words = Array.from(words);
  let secretWordIndex = Math.floor(Math.random() * words.length);
  let secretWord = words[secretWordIndex];

  let result = {
    texts: words,
    secretWord: secretWord,
  };

  return result;
}
