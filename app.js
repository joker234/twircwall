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
var config = require('./config.js')
var tweets = [];
var orga_tweets = [];
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
    socket.emit('twitter', tweet, config.twitter.orga_follow);
  });
  orga_tweets.forEach(function(tweet) {
    socket.emit('twitter', tweet, config.twitter.orga_follow);
  });
  ircMessages.forEach(function(ircmessage) {
    socket.emit('irc', ircmessage);
  })
});

events.on('irc', function(data) {
  io.sockets.emit('irc', data);
});
events.on('twitter', function(data) {
  io.sockets.emit('twitter', data, config.twitter.orga_follow);
});

var newTweet = function(data) {
  events.emit('twitter', data, config.twitter.orga_follow);
  if (data.id == config.twitter.orga_follow) {
    orga_tweets.push(data);
    orga_tweets = orga_tweets.slice(orga_tweets.length - 30, orga_tweets.length);
  } else {
    tweets.push(data);
    tweets = tweets.slice(tweets.length - 30, tweets.length);
  }
};

var newIRCMessage = function(data) {
  events.emit('irc', data);
  ircMessages.push(data);
  ircMessages = ircMessages.slice(ircMessages.length - 50, ircMessages.length);
};

var processTweet = function(data) {
      //console.log(data);
      //console.log("---------------------------");
      //console.log(data.entities);
      //console.log("===========================");
      var text = data.text;


      if (data.retweeted_status) {
        text = 'RT @' + data.retweeted_status.user.screen_name + ': ' + data.retweeted_status.text
          for (var i = 0; i < data.retweeted_status.entities.urls.length; i++) {
            var url = data.retweeted_status.entities.urls[i];
            text = text.replace(url.url, '<a href="' + url.expanded_url + '" target="_blank">' + url.display_url +'</a>');
          }
      } else {
        if (data.entities.urls != undefined) {
          for (var i = 0; i < data.entities.urls.length; i++) {
            var url = data.entities.urls[i];
            text = text.replace(url.url, '<a href="' + url.expanded_url + '" target="_blank">' + url.display_url +'</a>');
          }
        }
      }


      if (data.entities.media && data.entities.media[0].type == "photo") {
        text = text.replace(data.entities.media[0].url, '<a href="' + data.entities.media[0].expanded_url + '" target="_blank">' + data.entities.media[0].display_url +'</a>');
        newTweet({
          'name': data.user.name + ' [@' + data.user.screen_name + ']',
          'id': data.user.id_str,
          'text': text,
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
          'id': data.user.id_str,
          'text': text,
          'profile': data.user.profile_image_url,
          'time': data.created_at
        });
      }
};

var t = new twitter(config.twitter.keys);

var recenttwitter = function(t) {
  console.log("Getting recent Twitter Tweets");

  // Orgatweets
  t.get('statuses/user_timeline', {user_id: config.twitter.orga_follow, count: 50}, function(error, tweets, response){
    for (var j = tweets.length-1; j >= 0; j--) {
	  processTweet(tweets[j]);
    }
  });

  // Hashtag-Tweets
  t.get('search/tweets', {q: config.twitter.track, count: 50}, function(error, tweets, response){
    for (var j = tweets.statuses.length-1; j >= 0; j--) {
      processTweet(tweets.statuses[j]);
    }
  });
}

var starttwitter = function(t) {
  console.log("Starting Twitter");


  t.stream('statuses/filter', {
    track: config.twitter.track,
    follow: config.twitter.follow
  }, function(stream) {
    stream.on('data', function(data) {
		processTweet(data);
    });
    stream.on('end', function() {
      starttwitter(t);
    });
  });
};

recenttwitter(t);
starttwitter(t);


var client = new irc.Client(config.irc.net, config.irc.nick, {
  channels: config.irc.channels
});

client.addListener('message', function(from, to, message) {
  newIRCMessage({
    'name': from,
    'text': encoder.htmlEncode(message),
    'date': new Date()
  });
});

server.listen(config.port, config.host);
