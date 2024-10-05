const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let rooms = {}; // Store rooms and their users

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('join-room', (roomName) => {
        socket.join(roomName);
        if (!rooms[roomName]) {
            rooms[roomName] = []; // Initialize the room
        }
        rooms[roomName].push(socket.id);
        console.log(`User joined room: ${roomName}`);
        io.to(roomName).emit('user-connected', socket.id);
    });
    

    socket.on('leave-room', (roomName) => {
        socket.leave(roomName);
        
        // Check if the room exists
        if (rooms[roomName]) {
            rooms[roomName] = rooms[roomName].filter(id => id !== socket.id);
            // If the room is empty, delete it
            if (rooms[roomName].length === 0) {
                delete rooms[roomName];
            }
            console.log(`User left room: ${roomName}`);
            io.to(roomName).emit('disconnect-users');
        }
    });
    

    socket.on('disconnect', () => {
        console.log('user disconnected');
        for (let roomName in rooms) {
            rooms[roomName] = rooms[roomName].filter(id => id !== socket.id);
            if (rooms[roomName].length === 0) delete rooms[roomName]; // Delete empty room
        }
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});