export function getCurrentGame() {
  let gameID = Session.get("gameID");

  if (gameID) {
    return Games.findOne(gameID);
  }
}

export function getAccessLink() {
  let game = getCurrentGame();

  if (!game) {
    return;
  }

  return game.accessCode + "/";
}

export function getCurrentPlayer() {
  let playerID = Session.get("playerID");

  if (playerID) {
    return Players.findOne(playerID);
  }
}

export function generateAccessCode() {
  let accessCodeLength = 5;
  let accessCode = "";

  for (var i = 0; i < accessCodeLength; i++) {
    let randomDigit = Math.floor(Math.random() * 10);
    accessCode = accessCode + randomDigit;
  }

  return accessCode;
}

export function generateNewGame() {
  let game = {
    accessCode: generateAccessCode(),
    state: "waitingForPlayers",
    word: null,
    lengthInMinutes: 1,
    endTime: null,
    paused: false,
    pausedTime: null,
  };

  let gameID = Games.insert(game);
  game = Games.findOne(gameID);

  return game;
}

export function generateNewPlayer(game, name) {
  let player = {
    gameID: game._id,
    name: name,
    category: null,
    isQuestionMaster: false,
    isFakeArtist: false,
    isFirstPlayer: false,
    clue: null,
  };

  let playerID = Players.insert(player);

  return Players.findOne(playerID);
}

export function resetUserState() {
  let player = getCurrentPlayer();

  if (player) {
    Players.remove(player._id);
  }

  Session.set("gameID", null);
  Session.set("playerID", null);
}

export function leaveGame() {
  let player = getCurrentPlayer();

  let game = getCurrentGame();
  let currentTimeRemaining = getTimeRemaining();
  let players = Array.from(Players.find({ gameID: game._id }));

  let gameAnalytics = {
    gameID: game._id,
    playerCount: players.length,
    timeLeft: currentTimeRemaining / 1000 / 60,
    status: "left game",
  };

  Analytics.insert(gameAnalytics);

  Session.set("currentView", "startMenu");
  Players.remove(player._id);

  Session.set("playerID", null);

  window.history.pushState("lobby", "Left Game", "/");
}

export function trackGameState() {
  let gameID = Session.get("gameID");
  let playerID = Session.get("playerID");

  if (!gameID || !playerID) {
    return;
  }

  let game = Games.findOne(gameID);
  let player = Players.findOne(playerID);

  if (!game || !player) {
    Session.set("gameID", null);
    Session.set("playerID", null);
    Session.set("currentView", "startMenu");
    return;
  }

  if (game.state === "inProgress") {
    Session.set("currentView", "gameView");
  } else if (game.state === "waitingForPlayers") {
    Session.set("currentView", "lobby");
  } else if (game.state === "voting") {
    Session.set("currentView", "voting");
  }
}

export function getTimeRemaining() {
  let game = getCurrentGame();
  let localEndTime = game.endTime - TimeSync.serverOffset();
  let timeRemaining;
  if (game.paused) {
    let localPausedTime = game.pausedTime - TimeSync.serverOffset();
    timeRemaining = localEndTime - localPausedTime;
  } else {
    timeRemaining = localEndTime - Session.get("time");
  }

  if (timeRemaining < 0) {
    timeRemaining = 0;
  }

  return timeRemaining;
}
