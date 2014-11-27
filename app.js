var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var EventEmitter = require('events').EventEmitter;
var events = new EventEmitter();
var twitter = require('twitter');
var irc = require('irc');
var _ = require('underscore');
var Encoder = require('node-html-encoder').Encoder;
var encoder = new Encoder('entity');

var tweets = [];
var ircMessages = [];

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.static(path.join(__dirname, '/static')));

app.get('/', function(req, res) {
  res.render('index');
});

io.set('log level', 1);

io.sockets.on('connection', function(socket) {
  tweets.forEach(function(tweet) {
    socket.emit('twitter', tweet);
  });
  ircMessages.forEach(function(ircmessage) {
    socket.emit('irc', ircmessage);
  })
});

events.on('irc', function(data) {
  io.sockets.emit('irc', data);
});
events.on('twitter', function(data) {
  io.sockets.emit('twitter', data);
});

var newTweet = function(data) {
  events.emit('twitter', data);
  tweets.push(data);
  tweets = tweets.slice(tweets.length - 30, tweets.length);
};

var newIRCMessage = function(data) {
  events.emit('irc', data);
  ircMessages.push(data);
  ircMessages = ircMessages.slice(ircMessages.length - 50, ircMessages.length);
};

var t = new twitter({
  consumer_key: 'hCmZQWXg2AdUK4huoos3VDmPj',
  consumer_secret: 'uLI12R08mbFonPC7yUu5JLCQudTwS9R8jAdF8KyqqkbWZD2Bts',
  access_token_key: '75013164-ZcpGYBhKp9hB0uPZVuyEb3oQbMw8XGEvb4bhMZ5MK',
  access_token_secret: 'bB1BVge6Hstvbi8Hu7ogWLwZMVhY0kFbl1nEaVKro1GZX'
});

var starttwitter = function(t) {
  console.log("Starting Twitter");
  t.stream('filter', {
    track: '#31c3' //,#TeamNiall'
  }, function(stream) {
    stream.on('data', function(data) {
      //console.log(data);
      //console.log("---------------------------")
      //console.log(data.entities);
      if (data.entities.media && data.entities.media[0].type == "photo") {
        newTweet({
          'name': data.user.name + ' [@' + data.user.screen_name + ']',
          'text': data.text,
          'profile': data.user.profile_image_url,
          'time': data.created_at,
          'image': {
            'url': data.entities.media[0].media_url,
            'height': data.entities.media[0].sizes.small.h,
            'width': data.entities.media[0].sizes.small.w
          }
        });
      } else {
        newTweet({
          'name': data.user.name + ' [@' + data.user.screen_name + ']',
          'text': data.text,
          'profile': data.user.profile_image_url,
          'time': data.created_at
        });
      }
    });
    stream.on('end', function() {
      starttwitter(t);
    });
  });
};

starttwitter(t);


var client = new irc.Client('chat.freenode.net', 'twitterwall', {
  channels: ['#31c3']
});

client.addListener('message', function(from, to, message) {
  newIRCMessage({
    'name': from,
    'text': encoder.htmlEncode(message),
    'date': new Date()
  });
});

server.listen(3002);
