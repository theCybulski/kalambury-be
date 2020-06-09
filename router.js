const express = require("express");
const router = express.Router();

const {
  getAllRooms,
  createRoom,
  getRoom,
  setRoomAdmin,
  addPlayer
} = require("./rooms");
const { keyWords, getKeyWords } = require("./keyWords");

router.get("/api/v1/", (req, res) => {
  res.send("Server is up and running");
});

router.get("/api/v1/rooms", (req, res) => {
  const rooms = getAllRooms();

  res.send(rooms);
});

router.get("/api/v1/players", (req, res) => {
  let players = [];
  getAllRooms().map(room => (players = [...players, ...room.players]));

  res.send(players);
});

router.get("/api/v1/keywords", (req, res) => {
  const kw = [...getKeyWords()];

  console.log(kw);
  const words = kw.map(index => ({ word: keyWords[index], index }));
  res.send(words);
});

router.get("/api/v1/create_room", (req, res) => {
  const roomAdminName = req.query.adminName;
  const socketId = req.query.socketId;
  let roomNo;
  const min = 100000;
  const max = 999999;

  if (!roomAdminName || !socketId) {
    return res.status(400).send({
      error: "Insufficient data provided"
    });
  }

  // create room
  while (!roomNo) {
    const randomNo = (
      Math.floor(Math.random() * (max - min + 1)) + min
    ).toString();
    const roomExists = !!getRoom(randomNo);

    if (!roomExists) roomNo = randomNo;
  }

  const { error, room } = createRoom(roomNo);
  if (error) return res.send(error);

  // set room admin
  const { player: admin } = addPlayer(roomNo, roomAdminName, socketId);

  setRoomAdmin(roomNo, admin.id);

  res.send({
    room,
    player: admin
  });
});

router.get("/api/v1/join_room", (req, res) => {
  const playerName = req.query.playerName;
  const socketId = req.query.socketId;
  const roomNo = req.query.roomNo;
  const roomExists = !!getRoom(roomNo);

  console.log(playerName, socketId, roomNo);

  if (!playerName || !socketId || !roomNo) {
    return res.status(400).send({
      error: "Insufficient data provided"
    });
  }

  const { error: playerError, player } = addPlayer(
    roomNo,
    playerName,
    socketId
  );

  if (playerError) {
    return res.send({
      status: 403,
      error: playerError
    });
  }

  if (roomExists)
    res.status(200).send({ player: player, room: getRoom(roomNo) });
});

module.exports = router;
