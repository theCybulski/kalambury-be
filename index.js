const express = require("express");
const socket = require("socket.io");
const http = require("http");

const {
  getRoom,
  createRoom,
  startRound,
  endRound,
  setFlipChartData,
  isKeyWord,
  addPlayer,
  removePlayer,
  getPlayer,
  findPlayerInRooms,
  updatePlayer
} = require("./rooms");

const PORT = process.env.PORT || 4000;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socket(server);

io.on("connect", socket => {
  socket.on("createRoom", roomNo => {
    createRoom(roomNo);
  });

  socket.on("joinRoom", (player, callback) => {
    const roomExists = !!getRoom(player.roomNo);

    if (roomExists && player.name && player.roomNo) {
      console.log(`${player.name} entered room ${player.roomNo}, ${socket.id}`);
      socket.join(player.roomNo);
      callback({ player });
    }
  });

  socket.on("leaveRoom", (player, callback) => {
    if (player) {
      const { error } = getPlayer(player.id, player.roomNo);

      if (error) {
        console.log(player);
        callback(error);
        console.log("Leave room error", error);
      } else {
        removePlayer(player.id, player.roomNo, socket);
      }
    }
  });

  socket.on("msgFromClient", ({ message, roomNo }, callback) => {
    const player = getPlayer(socket.id, roomNo);

    if (player && message) {
      const isCorrect = isKeyWord(roomNo, message);

      if (isCorrect) endRound(roomNo, socket);

      io.to(player.roomNo).emit("msgFromServer", {
        id: player.id,
        avatar: "",
        timestamp: new Date().toString(),
        player: player.name,
        message,
        isCorrect
      });
      callback();
    }
  });

  socket.on("joinChat", ({ name, roomNo }, callback) => {
    if (name && roomNo) {
      socket.emit("msgFromServer", {
        id: "admin",
        avatar: "",
        timestamp: new Date().toString(),
        player: "admin",
        message: `${name}, welcome to the room ${roomNo}`,
        isCorrect: false
      });

      socket.broadcast.to(roomNo).emit("msgFromServer", {
        id: "admin",
        avatar: "",
        timestamp: new Date().toString(),
        player: "admin",
        message: `${name}, has joined!`,
        isCorrect: false
      });

      callback();
    } else {
      callback({ error: "Please provide player name and room" });
    }
  });

  socket.on("emitPreviewData", ({ data, roomNo }) => {
    setFlipChartData(data, roomNo, socket);
  });

  socket.on("startRound", ({ roomNo }) => {
    startRound(roomNo, socket);
  });

  socket.on("updatePlayer", player => {
    updatePlayer(player, socket);
  });

  socket.on("disconnect", () => {
    const player = findPlayerInRooms(socket.id);

    console.log("DISCONNECT");

    if (player) {
      const { error } = getPlayer(player.id, player.roomNo);
      if (error) {
        console.log(error);
      } else {
        removePlayer(player.id, player.roomNo, socket);
      }
    }
  });
});

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(router);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
