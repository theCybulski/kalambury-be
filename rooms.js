const { getKeyWords, keyWords } = require("./keyWords");
const { sendToAllInRoom } = require("./utils");

class Room {
  constructor(roomNo, keyWord) {
    this.roomNo = roomNo;
    this.roomAdmin = null;
    this.drawingPlayerId = null;
    this.flipChartData = "";
    this.currRound = {
      isOn: false,
      roundNo: 0,
      roundsQty: 5,
      duration: 5,
      timer: null,
      timerInterval: null,
      keyWord: keyWord || null
    };
    this.players = [];
  }
}

class Player {
  constructor(roomNo, name, id) {
    this.id = id;
    this.name = name;
    this.avatar = null;
    this.roomNo = roomNo;
    this.score = 0;
    this.isReady = false;
  }
}

const rooms = [];

const getRoom = roomNo => rooms.find(room => room.roomNo === roomNo);

const createRoom = roomNo => {
  const roomExists = !!getRoom(roomNo);

  if (roomExists) return { error: "Room with this number already exists" };

  const room = new Room(roomNo, "cobra");

  rooms.push(room);
  return { room };
};

const removeRoom = roomNo => {
  const index = rooms.findIndex(room => room.roomNo === roomNo);

  if (index !== -1) {
    stopTimer(roomNo);
    return rooms.splice(index, 1)[0];
  }
};

const setRoomAdmin = (roomNo, roomAdminId) => {
  const r = getRoom(roomNo);

  if (r) {
    r.roomAdmin = roomAdminId;
  }
};

const setFlipChartData = (data, roomNo, socket) => {
  const r = getRoom(roomNo);

  if (r) {
    r.flipChartData = data;

    socket.broadcast
      .to(r.roomNo)
      .emit("broadcastPreviewData", { data: r.flipChartData });
  }
};

const stopTimer = roomNo => {
  const r = getRoom(roomNo);

  if (r && r.currRound.timerInterval) {
    clearInterval(r.currRound.timerInterval);
  }
};

const endRound = (roomNo, socket) => {
  const r = getRoom(roomNo);

  if (r) {
    stopTimer(roomNo);
    r.currRound.isOn = false;
    r.currRound.keyWord = null;
    sendToAllInRoom(
      roomNo,
      "setRound",
      { isOn: false, roundNo: r.currRound.roundNo },
      socket
    );
  }
};

const startRound = (roomNo, socket) => {
  const r = getRoom(roomNo);

  if (r) {
    if (!r.currRound.isOn) {
      r.currRound.isOn = true;
      r.currRound.timer = r.currRound.duration;
      r.currRound.roundNo += 1;

      // readiness reset
      r.players.forEach(player => {
        updatePlayer({ ...player, isReady: false }, socket);
      });

      sendToAllInRoom(
        roomNo,
        "setRound",
        { isOn: true, roundNo: r.currRound.roundNo },
        socket
      );

      r.currRound.timerInterval = setInterval(() => {
        r.currRound.timer -= 1;

        console.log(r.currRound.timer);

        sendToAllInRoom(
          roomNo,
          "updateTimer",
          { timer: r.currRound.timer },
          socket
        );

        if (r.currRound.timer <= 0) {
          endRound(roomNo, socket);
        }
      }, 1000);
    }
  }
};

const getAllRooms = () =>
  rooms.map(room => ({
    ...room,
    currRound: {
      isOn: room.currRound.isOn,
      roundNo: room.currRound.roundNo,
      roundsQty: room.currRound.roundsQty,
      duration: room.currRound.duration,
      timer: room.currRound.timer,
      keyWord: room.currRound.keyWord
    }
  }));

const setRoomKeyWord = (roomNo, keyWord) => {
  const r = getRoom(roomNo);

  if (r) {
    r.currRound.keyWord = keyWord;
  }
};

const isKeyWord = (roomNo, message) => {
  const r = getRoom(roomNo);

  if (r) {
    const keyWord = r.currRound.keyWord;
    const cleanMessage = message.toLowerCase().replace(/\W/g, "");

    return keyWord === cleanMessage;
  }
};

const addPlayer = (roomNo, name, id) => {
  const r = getRoom(roomNo);
  const player = new Player(roomNo, name, id);

  if (!r) return { error: "Room doesn't exist" };

  const isExistingPlayer = r.players.find(
    _player =>
      _player.name.trim().toLowerCase() === player.name.trim().toLowerCase()
  );
  if (isExistingPlayer) return { error: "Username is taken" };

  r.players.push(player);
  return { player };
};

const removePlayer = (id, roomNo, socket) => {
  const r = getRoom(roomNo);
  const index = r.players.findIndex(player => player.id === id);
  const player = r.players[index];
  const isAdmin = player.id === r.roomAdmin;

  if (!r) return { error: `No such player in room ${roomNo}` };

  if (index !== -1) {
    r.players.splice(index, 1)[0];

    socket.broadcast.to(roomNo).emit("msgFromServer", {
      id: "admin",
      avatar: "",
      timestamp: new Date().toString(),
      player: "admin",
      message: `${player.name}, has left...`,
      isCorrect: false
    });
    console.log(`${player.name} left room ${roomNo}, ${player.id}`);

    // if player is admin, set new admin
    if (isAdmin && r.players.length !== 0)
      setRoomAdmin(roomNo, r.players[0].id);

    // if no more players in room, remove room
    if (r.players.length === 0) removeRoom(roomNo);
  }
};

const getPlayer = (id, roomNo) => {
  if (!id || !roomNo) return { error: "No such player" };

  const r = getRoom(roomNo);

  if (!r) return { error: `No such player in room ${roomNo}` };

  return r.players.find(player => player.id === id);
};

const findPlayerInRooms = id => {
  const player = getAllRooms()
    .map(room => room.players.find(player => player.id === id))
    .find(player => player && player.id === id);

  return player;
};

const readinessCheck = (roomNo, socket) => {
  const r = getRoom(roomNo);
  if (!r) return { error: "Room not found" };

  const isEverybodyReady = !r.players.find(player => player.isReady === false);

  console.log(isEverybodyReady);

  if (isEverybodyReady) {
    sendToAllInRoom(r.roomNo, "readinessCheck", true, socket);
  } else {
    sendToAllInRoom(r.roomNo, "readinessCheck", false, socket);
  }
};

const updatePlayer = (player, socket) => {
  const r = getRoom(player.roomNo);

  if (!r) return { error: `No such player in room ${player.roomNo}` };

  const index = r.players.findIndex(p => p.id === player.id);

  r.players[index] = player;

  readinessCheck(player.roomNo, socket);
};

const getPlayersInRoom = roomNo => {
  const r = getRoom(roomNo);

  if (!r) return { error: `Room ${roomNo} not found` };

  return r.players;
};

module.exports = {
  getRoom,
  getAllRooms,
  createRoom,
  removeRoom,
  startRound,
  endRound,
  setRoomAdmin,
  setFlipChartData,
  setRoomKeyWord,
  isKeyWord,
  addPlayer,
  removePlayer,
  getPlayer,
  findPlayerInRooms,
  readinessCheck,
  updatePlayer,
  getPlayersInRoom
};
