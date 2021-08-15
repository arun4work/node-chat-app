const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const {generateMessage, generateLocationMessage} = require('./utils/messages');
const {addUser, getUser, removeUser, getUsersInRoom} = require('./utils/users');
//Create the express application
const app = express();

//Create the HTTP server using the Express app, If not explicitly created, Express does this behind the scene
const server = http.createServer(app);

//Connect socket.io to the HTTP server
const io = socketio(server);

const port = process.env.PORT || 3000;

//Setup for public directory path for the Express app
const publidDirPath = path.join(__dirname, '../public');
app.use(express.static(publidDirPath));

/**
 * socket.emit --> Emits an event to a connected client
 * io.emit --> Emits an event to all the connected client
 * socket.broadcast.emit --> Emits an event to all the connected client except the sender
 * io.to.emit --> Emits an event to all the users in a specific room
 * socket.broadcast.to.emit --> Emits an event to all the users in a spceific room except the sender
 */

//Listen for new websocket connections to Socket.io
//i.e run some code when a given client is connected
io.on('connection', (socket) => {
    console.log('New Websocket connection');

    //Recieves a message when an user joins
    socket.on('join', ({username, room}, callback) => {
        const {error, user} = addUser({id: socket.id, username, room});

        if (error) {
            return callback(error);
        }

        //Join the room
        socket.join(user.room);

        //Emits message to the connected client
        socket.emit('message', generateMessage('Admin', 'Welcome!'));

        //Broadcast a message to everyone in a specific room when new user joins
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`));

        //Emits room name and users list to everyone in that room
        io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});

        callback();
    });

    //Broadcast a message to all other client except the newly connected one
    //socket.broadcast.emit('message', generateMessage('A new user has joined!'));

    //Recieves a message from one of the connected client and emits the message to all the connected clients
    socket.on('sendMessage', (message, callback) => {
        //Check for profanity of a received message
        const filter = new Filter();
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!');
        }

        const user = getUser(socket.id);
        if (user) {
            //Emits the recieved message to all connected clients
            io.to(user.room).emit('message', generateMessage(user.username, message));
        }

        callback();
    });

    //Emits the location information to all the connected client
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        if (user) {
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));
        }

        callback();
    });

    //Emits this message when a connection is disconnected
    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            //Emits a message "user has left" to everyone in that room
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`));

            //Emits room name and users list to everyone in that room
            io.to(user.room).emit('roomData', {room: user.room, users: getUsersInRoom(user.room)});
        }
    });
});

server.listen(port, () => {
    console.log(`Server is up and running on port ${port}!`);
});
