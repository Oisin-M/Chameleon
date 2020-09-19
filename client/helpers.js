import {
  getUserLanguage,
  getLanguageDirection,
  getLanguageList,
} from "./language";
import {
  getCurrentGame,
  getAccessLink,
  getCurrentPlayer,
  getTimeRemaining,
} from "./game";

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

Template.startMenu.helpers({
  alternativeURL: function () {
    return Meteor.settings.public.alternative;
  },
});

Template.createGame.helpers({
  isLoading: function () {
    return Session.get("loading");
  },
});

Template.joinGame.helpers({
  isLoading: function () {
    return Session.get("loading");
  },
});

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
