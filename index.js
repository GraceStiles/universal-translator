// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//var io = require('../..')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  // TODO: Next step: Add the senders 'lang' to the message that is returned to the clients.
  // TODO: ex: "hello" turns into "hello:en"
  // TODO: Only have to modify line 33 to do. Once you have that working, check it in and remove these comments.
  // TODO: This is a temp step to prove to yourself that the data is being flowed into the server and back out
  //
  // TODO: The folling step will be return an additional key:value to the emit that contains fake translations for each lang you support as an hash
  // TODO: But don't worry about that yet. Once you get that far, we change the main.js to read that instead. Getting closer
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    var return_message;
    if( typeof data == 'string'){
      return_message = data;
    } else {
      return_message = data.message;
    }
    
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: return_message
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
