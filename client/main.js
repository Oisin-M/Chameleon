import {
  initUserLanguage,
  getUserLanguage,
  setUserLanguage,
  getLanguageDirection,
  getLanguageList,
} from "./language";
import {
  getCurrentGame,
  getAccessLink,
  getCurrentPlayer,
  generateAccessCode,
  generateNewGame,
  generateNewPlayer,
  leaveGame,
  resetUserState,
  trackGameState,
  getTimeRemaining,
} from "./game";
import { shuffle, shuffleArray, getRandomWords } from "./shuffle";

function hasHistoryApi() {
  return !!(window.history && window.history.pushState);
}

// from here

Handlebars.registerHelper("toCapitalCase", function (str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

initUserLanguage();

Meteor.setInterval(function () {
  Session.set("time", new Date());
}, 1000);

if (hasHistoryApi()) {
  function trackUrlState() {
    let accessCode = null;
    let game = getCurrentGame();

    if (game) {
      accessCode = game.accessCode;
    } else {
      accessCode = Session.get("urlAccessCode");
    }

    let currentURL = "/";
    if (accessCode) {
      currentURL += accessCode + "/";
    }
    window.history.pushState(null, null, currentURL);
  }
  //Tracker.autorun(trackUrlState); //this is called right after anyway, no need to do it twice
}

Tracker.autorun(trackGameState);

FlashMessages.configure({
  autoHide: true,
  autoScroll: false,
});

Template.main.helpers({
  whichView: function () {
    return Session.get("currentView");
  },
  language: function () {
    return getUserLanguage();
  },
  textDirection: function () {
    return getLanguageDirection();
  },
});

Template.footer.helpers({
  languages: getLanguageList,
});

Template.footer.events({
  "click .btn-set-language": function (event) {
    let language = $(event.target).data("language");
    setUserLanguage(language);
  },
  "change .language-select": function (event) {
    let language = event.target.value;
    setUserLanguage(language);
  },
});

Template.startMenu.events({
  "click #btn-new-game": function () {
    Session.set("currentView", "createGame");
    let referrer = document.referrer;
    let referrerAnalytics = {
      cameFrom: referrer,
      action: "New Game",
    };

    Analytics.insert(referrerAnalytics);
  },
  "click #btn-join-game": function () {
    let referrer = document.referrer;
    let referrerAnalytics = {
      cameFrom: referrer,
      action: "Join Game",
    };

    Analytics.insert(referrerAnalytics);

    Session.set("currentView", "joinGame");
  },
});

Template.startMenu.helpers({
  alternativeURL: function () {
    return Meteor.settings.public.alternative;
  },
});

Template.startMenu.rendered = function () {
  let referrer = document.referrer;
  let referrerAnalytics = {
    cameFrom: referrer,
    action: "Start Page",
  };
  Analytics.insert(referrerAnalytics);
  resetUserState();
};

Template.createGame.events({
  "submit #create-game": function (event) {
    let playerName = event.target.playerName.value;

    if (!playerName) {
      return false;
    }

    let game = generateNewGame();
    let player = generateNewPlayer(game, playerName);

    Meteor.subscribe("games", game.accessCode);

    Session.set("loading", true);

    Meteor.subscribe("players", game._id, function onReady() {
      Session.set("loading", false);
      Session.set("language", getUserLanguage());
      Session.set("gameID", game._id);
      Session.set("playerID", player._id);
      Session.set("currentView", "lobby");
    });

    return false;
  },
  "click .btn-back": function () {
    Session.set("currentView", "startMenu");
    return false;
  },
});

Template.createGame.helpers({
  isLoading: function () {
    return Session.get("loading");
  },
});

Template.createGame.rendered = function (event) {
  $("#player-name").focus();
};

Template.joinGame.events({
  "submit #join-game": function (event) {
    let accessCode = event.target.accessCode.value;
    let playerName = event.target.playerName.value;

    if (!playerName) {
      return false;
    }

    accessCode = accessCode.trim();
    accessCode = accessCode.toLowerCase();

    Session.set("loading", true);

    Meteor.subscribe("games", accessCode, function onReady() {
      Session.set("loading", false);

      let game = Games.findOne({
        accessCode: accessCode,
      });

      if (game) {
        Meteor.subscribe("players", game._id);
        let player = generateNewPlayer(game, playerName);

        let referrer = document.referrer;
        let referrerAnalytics = {
          cameFrom: referrer,
          action: "Join Game",
        };

        Analytics.insert(referrerAnalytics);
        Session.set("urlAccessCode", null);
        Session.set("gameID", game._id);
        Session.set("playerID", player._id);
        Session.set("currentView", "lobby");
      } else {
        FlashMessages.sendError(TAPi18n.__("ui.invalid access code"));
      }
    });

    return false;
  },
  "click .btn-back": function () {
    Session.set("urlAccessCode", null);
    Session.set("currentView", "startMenu");
    return false;
  },
});

Template.joinGame.helpers({
  isLoading: function () {
    return Session.get("loading");
  },
});

Template.joinGame.rendered = function (event) {
  resetUserState();

  let referrer = document.referrer;
  let referrerAnalytics = {
    cameFrom: referrer,
    action: "Join Game",
  };

  Analytics.insert(referrerAnalytics);

  let urlAccessCode = Session.get("urlAccessCode");

  if (urlAccessCode) {
    $("#access-code").val(urlAccessCode);
    $("#access-code").hide();
    $("#player-name").focus();
  } else {
    $("#access-code").focus();
  }
};

Template.lobby.helpers({
  game: function () {
    return getCurrentGame();
  },
  accessLink: function () {
    return getAccessLink();
  },
  player: function () {
    return getCurrentPlayer();
  },
  players: function () {
    let game = getCurrentGame();
    let currentPlayer = getCurrentPlayer();

    if (!game) {
      return null;
    }

    let players = Players.find(
      { gameID: game._id },
      { sort: { createdAt: 1 } }
    ).fetch();

    players.forEach(function (player) {
      if (player._id === currentPlayer._id) {
        player.isCurrent = true;
      }
    });

    return players;
  },
});

Template.lobby.events({
  "click .btn-leave": leaveGame,

  // TODO Maybe this can be deleted, not sure if we want to permit user words
  "click .btn-submit-user-word": function (event) {
    let game = getCurrentGame();
    let word = document.getElementById("user-word").value;
    let category = document.getElementById("user-category").value;
    if (word.length == 0 || category.length == 0) {
      return;
    }
    // Track words submittd by users
    let userWord = {
      word: word,
      category: category,
      language: Session.get("language"),
    };

    let questionMasterId = $(event.currentTarget).data("player-id");
    let currentPlayers = Array.from(
      Players.find({ gameID: game._id }, { _id: { $ne: questionMasterId } })
    );
    let regularPlayers = currentPlayers.filter(
      (player) => player._id != questionMasterId
    );

    let localEndTime = moment().add(game.lengthInMinutes, "minutes");
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let fakeArtistIndex = Math.floor(Math.random() * regularPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * regularPlayers.length);

    let turnOrders = [];

    UserWords.insert(userWord);

    regularPlayers.forEach(function (player, index) {
      turnOrders.push(index + 1);
    });

    turnOrders = shuffle(turnOrders);

    regularPlayers.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isQuestionMaster: false,
          isFakeArtist: index === fakeArtistIndex,
          isFirstPlayer: index === firstPlayerIndex,
          turnOrder: turnOrders[index],
        },
      });
    });

    // All Fake Artist Variant
    let shouldPlayAllFakeArtistsVariant = document.getElementById(
      "use-all-fake-artists-variant"
    ).checked;

    let percentEveryoneIsAFakeArtist = 10;
    let isEveryoneAFakeArtist =
      Math.floor(Math.random() * 100) < percentEveryoneIsAFakeArtist;

    let isAllFakeArtistsVariantActive =
      shouldPlayAllFakeArtistsVariant === true &&
      isEveryoneAFakeArtist === true;
    if (isAllFakeArtistsVariantActive) {
      currentPlayers.forEach(function (player) {
        if (player.isQuestionMaster === false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: true,
            },
          });
        }
      });
    }
    // All Fake Artists variant ends

    // No Fake Artist Variant
    let shouldPlayNoFakeArtistsVariant = document.getElementById(
      "use-no-fake-artist-variant"
    ).checked;

    let percentNoFakeArtist = 10;
    let isNoFakeArtist = Math.floor(Math.random() * 100) < percentNoFakeArtist;

    let isNoFakeArtistsVariantActive =
      shouldPlayNoFakeArtistsVariant === true && isNoFakeArtist === true;
    if (isNoFakeArtistsVariantActive) {
      currentPlayers.forEach(function (player) {
        if (player.isQuestionMaster === false) {
          Players.update(player._id, {
            $set: {
              isFakeArtist: false,
            },
          });
        }
      });
    }
    // No Fake Artist Variant ends
    let variantsUsed = [];
    if (shouldPlayNoFakeArtistsVariant === true) {
      variantsUsed.push("no fake-artist");
    }
    if (shouldPlayAllFakeArtistsVariant === true) {
      variantsUsed.push("all fake-artists");
    }

    Players.update(questionMasterId, {
      $set: {
        isQuestionMaster: true,
        isFakeArtist: false,
        isFirstPlayer: false,
      },
    });

    currentPlayers.forEach(function (player) {
      Players.update(player._id, { $set: { category: category } });
    });

    Players.update(questionMasterId, { $set: { category: category } });

    let wordAndCategory = {
      text: word,
      category: category,
    };

    let gameAnalytics = {
      gameID: game._id,
      playerCount: currentPlayers.length,
      gameType: "user-word",
      language: Session.get("language"),
      variants: variantsUsed,
      word: word,
    };

    Analytics.insert(gameAnalytics);

    Games.update(game._id, {
      $set: {
        state: "inProgress",
        word: wordAndCategory,
        endTime: gameEndTime,
        paused: false,
        pausedTime: null,
        usingAllFakeArtistsVariant: shouldPlayNoFakeArtistsVariant,
        usingNoFakeArist: shouldPlayNoFakeArtistsVariant,
      },
    });
  },
  "click .btn-start": function () {
    let game = getCurrentGame();
    let words = getRandomWords();

    let currentPlayers = Array.from(Players.find({ gameID: game._id }));
    let localEndTime = moment().add(game.lengthInMinutes, "minutes");
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let chameleonIndex = Math.floor(Math.random() * currentPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * currentPlayers.length);

    let turnOrders = [];

    let i = 0;
    while (turnOrders.length < currentPlayers.length) {
      turnOrders.push(i);
      i = i + 1;
    }

    turnOrders = shuffle(turnOrders);

    currentPlayers.forEach(function (player, index) {
      Players.update(player._id, {
        $set: {
          isChameleon: index === chameleonIndex,
          isFirstPlayer: index === firstPlayerIndex,
          turnOrder: turnOrders[index] + 1,
        },
      });
    });

    currentPlayers.forEach(function (player) {
      Players.update(player._id, {
        $set: { words: words.texts, secretWord: words.secretWord },
      });
    });

    // Track game analytics
    let gameAnalytics = {
      gameID: game._id,
      playerCount: currentPlayers.length,
      gameType: "game-word",
      language: Session.get("language"),
      languageType: "Chosen",
    };

    Analytics.insert(gameAnalytics);

    Games.update(game._id, {
      $set: {
        state: "inProgress",
        words: words,
        endTime: gameEndTime,
        paused: false,
        pausedTime: null,
      },
    });
  },
  "click #copyAccessLinkImg": function () {
    let accessLink = "https://chameleon.herokuapp.com/" + getAccessLink();

    const textArea = document.createElement("textarea");
    textArea.value = accessLink;
    document.body.appendChild(textArea);
    textArea.select();

    document.execCommand("copy");
    document.body.removeChild(textArea);

    let tooltip = document.getElementById("copyAccessLinkTooltip");

    tooltip.innerHTML = TAPi18n.__("ui.copied");
  },
  "mouseout #copyAccessLinkImg": function () {
    let tooltip = document.getElementById("copyAccessLinkTooltip");

    tooltip.innerHTML = TAPi18n.__("ui.copy access link");
  },
  "click .btn-toggle-qrcode": function () {
    $(".qrcode-container").toggle();
  },
  "click .btn-remove-player": function (event) {
    let playerID = $(event.currentTarget).data("player-id");
    Players.remove(playerID);
  },
  "click .btn-edit-player": function (event) {
    let game = getCurrentGame();
    resetUserState();
    Session.set("urlAccessCode", game.accessCode);
    Session.set("currentView", "joinGame");
  },
  "click .btn-bad-category": function () {
    console.log("got a bad category");
    console.log("game.wordAndCategory.category");
  },
  "click .btn-bad-word": function () {
    console.log("got a bad word");
    console.log("game.wordAndCategory.text");
  },
});

Template.lobby.rendered = function (event) {
  let url = getAccessLink();
  url = "https://chameleon.herokuapp.com/" + url;
  let qrcodesvg = new Qrcodesvg(url, "qrcode", 250);
  qrcodesvg.draw();
};

Template.gameView.helpers({
  game: getCurrentGame,
  player: getCurrentPlayer,
  players: function () {
    let game = getCurrentGame();

    if (!game) {
      return null;
    }

    let players = Players.find({
      gameID: game._id,
    });

    return players;
  },
  words: function () {
    return words_en;
  },
  gameFinished: function () {
    let timeRemaining = getTimeRemaining();

    return timeRemaining === 0;
  },
  timeRemaining: function () {
    let timeRemaining = getTimeRemaining();

    return moment(timeRemaining).format("mm[<span>:</span>]ss");
  },
});

Template.gameView.events({
  "click .btn-leave": leaveGame,
  "click .btn-end": function () {
    let game = getCurrentGame();
    Games.update(game._id, { $set: { state: "waitingForPlayers" } });

    let currentTimeRemaining = getTimeRemaining();

    let players = Array.from(Players.find({ gameID: game._id }));

    let gameAnalytics = {
      gameID: game._id,
      playerCount: players.length,
      timeLeft: currentTimeRemaining / 1000 / 60,
      status: "game ended",
    };

    Analytics.insert(gameAnalytics);
  },
  "click .btn-toggle-status": function () {
    $(".status-container-content").toggle();
  },
  "click .game-countdown": function () {
    let game = getCurrentGame();
    let currentServerTime = TimeSync.serverTime(moment());

    if (game.paused) {
      let newEndTime = game.endTime - game.pausedTime + currentServerTime;
      Games.update(game._id, {
        $set: { paused: false, pausedTime: null, endTime: newEndTime },
      });
    } else {
      Games.update(game._id, {
        $set: { paused: true, pausedTime: currentServerTime },
      });
    }
  },
});
