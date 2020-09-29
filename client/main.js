import {
  getCurrentPlayer,
  getCurrentGame,
  getAccessLink,
  leaveGame,
  resetUserState,
  getTimeRemaining,
} from "./game";
import { shuffle, getRandomWords } from "./shuffle";

Template.lobby.events({
  "click .btn-leave": leaveGame,

  "click .btn-start": function () {
    let game = getCurrentGame();
    let words = getRandomWords();

    let currentPlayers = Array.from(Players.find({ gameID: game._id }));
    let localEndTime = moment().add(game.lengthInMinutes, "minutes");
    let gameEndTime = TimeSync.serverTime(localEndTime);

    let chameleonIndex = Math.floor(Math.random() * currentPlayers.length);
    let firstPlayerIndex = Math.floor(Math.random() * currentPlayers.length);

    //simultaneous turns instead should be implemented
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
    $(".table-content").toggle();
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
  "click #clue-button-submit": function (event) {
    var input = $("#clue-input");
    var inputText = input.val();
    if (inputText.length > 0) {
      $("#clue-submission").hide();
      var player = getCurrentPlayer();

      Players.update(player._id, {
        $set: { clue: inputText },
      });

      var game = getCurrentGame();
      let players = Array.from(Players.find({ gameID: game._id }));

      var allsubmitted = true;
      for (i = 0; i < players.length; i++) {
        if (!players[i].clue) {
          allsubmitted = false;
          break;
        }
      }

      if (allsubmitted) {
        console.log("Everyone submitted a clue");
        Games.update(game._id, {
          $set: {
            state: "voting",
          },
        });
      }
    }
  },
});

Template.voting.events({
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
    $(".table-content").toggle();
  },
  "click .vote-button": function (event) {
    let playerID = $(event.currentTarget).data("id");
    let playerName = $(event.currentTarget).data("name");
    console.log(playerName);
  },
});
