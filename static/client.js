var socket = io.connect(window.location.href);

moment.lang('de');

var renderTweet = function(data,orga_follow) {
	var tweets = $('.twitter');
	var tweets2 = $('.twitter2');
	var tweet = $('<div>').addClass('tweet');

	tweet.append($('<img>').addClass('profile').attr('src', data.profile));
	tweet.append($('<div>').addClass('name').html(data.name));
	tweet.append($('<div>').addClass('text').html(data.text));
	tweet.append($('<div>').addClass('time').html(moment(data.time).format('HH:mm')));

	if (data.image) {
		tweet.append($('<img>').addClass('image').attr('src', data.image.url).css({
			'width': data.image.width,
			'height': data.image.height
		}));
	}

	if (data.id == orga_follow) {
		tweets2.prepend(tweet);
		//console.log("1: "+data.id);
	}
	else {
		tweets.prepend(tweet);
		//console.log("2: "+data.id);
	}

	for (var i = 30; i <= $(".tweet").length; i++) {
		var item = $(".tweet:nth-child(" + i + ")");
		item.remove();
	}
};

var renderIRCMessage = function(data) {
	var ircMessages = $('.irc');
	var string = '[' + moment(data.date).format('HH:mm') + '] ' + '&lt;' + data.name + '&gt; ' + data.text;
	var message = $('<div>').addClass('ircmessage').html(string);

	//message.append($(' < div > ').addClass('name ').html(data.name));
	//message.append($(' < div > ').addClass('message ').html(data.text));

	ircMessages.prepend(message);

	for (var i = 100; i <= $(".ircmessage").length; i++) {
		var item = $(".ircmessage:nth-child(" + i + ")");
		item.remove();
	}
};

setInterval(function() {
	var m = moment();
	$('.clock .time').html(m.format('HH:mm:ss'));
	$('.clock .day').html(m.format('dddd'));
}, 1000);

var m = moment();
$('.clock .time').html(m.format('HH:mm:ss'));
$('.clock .day').html(m.format('dddd'));

socket.on('irc', function(data) {
	renderIRCMessage(data);
});

socket.on('twitter', function(data,orga_follow) {
	renderTweet(data,orga_follow);
});
