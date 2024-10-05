const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

let rooms = {};

// Handle socket connections
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('create-room', (data) => {
        const room = data.room;
        rooms.push(room);
        io.emit('new-room', { room });
    });

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);

        if (!rooms[room]) {
            rooms[room] = [];
        }
        rooms[room].push(socket.id);

        // Notify other users in the room
        socket.to(room).emit('user-joined', socket.id);
    });

    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', { offer: data.offer, id: socket.id });
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', { answer: data.answer, id: socket.id });
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', { candidate: data.candidate, id: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Remove the user from their room
        for (let room in rooms) {
            if (rooms[room].includes(socket.id)) {
                rooms[room] = rooms[room].filter(id => id !== socket.id);
                socket.to(room).emit('user-left', socket.id);
            }
        }
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
