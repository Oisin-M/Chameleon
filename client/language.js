export function initUserLanguage() {
  let language = amplify.store("language");

  if (language) {
    Session.set("language", language);
  }
  let userLanguage = getUserLanguage();
  setUserLanguage(userLanguage);
}

export function getUserLanguage() {
  let language = Session.get("language");

  if (language) {
    return language;
  } else {
    return "en";
  }
}

export function setUserLanguage(language) {
  TAPi18n.setLanguage(language).done(function () {
    Session.set("language", language);
    amplify.store("language", language);
  });
}

export function getLanguageDirection() {
  let language = getUserLanguage();
  let rtlLanguages = ["he", "ar"];

  if ($.inArray(language, rtlLanguages) !== -1) {
    return "rtl";
  } else {
    return "ltr";
  }
}

export function getLanguageList() {
  let languages = TAPi18n.getLanguages();
  let languageList = _.map(languages, function (value, key) {
    let selected = "";

    if (key == getUserLanguage()) {
      selected = "selected";
    }

    // Gujarati isn't handled automatically by tap-i18n,
    // so we need to set the language name manually
    if (value.name == "gu") {
      value.name = "ગુજરાતી";
    }

    return {
      code: key,
      selected: selected,
      languageDetails: value,
    };
  });

  if (languageList.length <= 1) {
    return null;
  }

  return languageList;
}

export function getWordsProvider() {
  let words = [];

  switch (getUserLanguage()) {
    case "he":
      words = words_he;
      break;
    case "en":
      words = words_en;
      break;
    default:
      words = words_en;
      break;
  }

  let minimumWordsInCategory = 16;

  let excludedCategories = [];

  let filteredWords = words.filter(
    (word) => !excludedCategories.includes(word.category.toLowerCase())
  );

  let categoryToOccurences = {};

  filteredWords.forEach((word) => {
    let wordOccurence = categoryToOccurences[word.category];
    if (wordOccurence === undefined) {
      wordOccurence = 1;
    } else {
      wordOccurence = wordOccurence + 1;
    }
    categoryToOccurences[word.category] = wordOccurence;
  });

  filteredWords = filteredWords.filter(
    (word) => categoryToOccurences[word.category] >= minimumWordsInCategory
  );

  return filteredWords;
}
