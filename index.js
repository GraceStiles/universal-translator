// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
//var io = require('../..')(server);
var port = process.env.PORT || 3000;

const translate = require('google-translate-api');

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
  //
  // TODO: The folling step will be return an additional key:value to the emit that contains fake translations for each lang you support as an hash
  // TODO: But don't worry about that yet. Once you get that far, we change the main.js to read that instead. Getting closer
  socket.on('new message', function (data) {
    var to_lang_array = ['es', 'en', 'fr', 'de'];
    var senders_message;
    var senders_lang;

    // check to see if the data is a hash or just a String. In case the client hasn't updated yet.
    if( typeof data == 'string'){
      senders_message = data;
      senders_lang = 'en';
    } else {
      senders_message = data.message;
      senders_lang = data.language;
    }

    // now we need to have google translate for each lang we care about (hardcoded list for now)
    // result_hash will contain {'en':"English version of the message" , 'es':"Spanish version of the message", ...}
    var result_hash = {};
    var promise_array = [to_lang_array.length];

    // this creating a async promise for each to_lang to all google translate and
    // Once the promise is done, it updates the result_hash key of lang, value of translation
    for (var i = 0; i < to_lang_array.length; ++i) {
      promise_array[i] = translate_aux(senders_message, senders_lang, to_lang_array[i], result_hash);
    }

    // Now, we wait till all Promises are done and then emit to the socket
    // Promise.all forces it to wait for all api's to finish
    Promise.all(promise_array).then(results=>{
      // all debugging code on the console of the server
      console.log('all the translations are complete');
      Object.keys(result_hash).forEach(function (key) {
        console.log("["+key+"] = " + result_hash[key]);
      });

      // Now, send the message back to the client(s)
      socket.broadcast.emit('new message', {
        username: socket.username,         // used to know who said it!
        message_translations: result_hash, // contains key:value pairs of lang:message
        message: senders_message,          // this is the what the sender sent, for debugging. Also also older clients to still use
        original_lang: senders_lang        // this is the senders lang
      });
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

  // helper methods for the translation
  // this is needed to keep track of the src_lang, since the returning object from the translate call doesn't have it!
  // This is thing wrapper to hold the state in the callback
  function translate_aux(src_text, from_lang, to_lang, result_hash){
      return translate(src_text, {
        from: from_lang,
        to: to_lang}
      ).then(res=>
        {result_hash[to_lang]=res.text;}
      );
  }
});
