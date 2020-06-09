const sendToAllInRoom = (roomNo, event, payload, socket) => {
  socket.broadcast.to(roomNo).emit(event, payload);
  socket.emit(event, payload);
};

module.exports = {
  sendToAllInRoom
};
