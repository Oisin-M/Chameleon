import { initUserLanguage, getUserLanguage, setUserLanguage } from "./language";
import {
  getCurrentGame,
  generateNewGame,
  generateNewPlayer,
  resetUserState,
  trackGameState,
} from "./game";
import { hasHistoryApi } from "./extras";

initUserLanguage();

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
}
Tracker.autorun(trackGameState);

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

    window.history.pushState("lobby", "Create Lobby", "/" + game.accessCode);

    return false;
  },
  "click .btn-back": function () {
    Session.set("currentView", "startMenu");
    return false;
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

      window.history.pushState("lobby", "Join Lobby", "/" + game.accessCode);
    });

    return false;
  },
  "click .btn-back": function () {
    Session.set("urlAccessCode", null);
    Session.set("currentView", "startMenu");
    return false;
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
