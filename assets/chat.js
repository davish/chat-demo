var chatWith = null;
var username = localStorage.getItem("username");
var timeout = null;

$(document).ready(function() {
  if (!chatWith) {
    $('form#send').hide();
    $('.msgView').hide();
  }

  if (!username) {
    $('#loginModal').modal();
  }

  $('form#login').submit(function(e) {
    username = e.target.username.value;
    localStorage.setItem("username", username);
    $('#loginModal').modal('hide');
    return false;
  });

  $('form#send').submit(function(e) {
    if (username && chatWith) {
      $.ajax('/chat', {
        method: 'POST',
        data: {
          userFrom: username,
          userTo: chatWith,
          message: e.target.message.value
        },
        success: function(data) {
          poll();
        }
      });
    } 
    else if (!username) {
      $('#loginModal').modal();
    }
    return false;
  });
  $('form#newChat').submit(function(e) {
    var friend = e.target.u.value;
    chatWith = friend;
    $('#friends').prepend('<li><a href="#" class="userfriend" id="'+friend+'">'+friend+'</a></li>');
    poll();
    $('form#send').show();
    $('.msgView').show();
    return false;
  });
  $('a').click(function(e) {
    chatWith = e.target.id;
  });

  (function loop() {
    setTimeout(function() {
      console.log("polling...");
      if (username) { // if there is a user, send a request.
        poll(loop);
      } else { // don't send the request, it's wasteful
        loop();
      }
    }, 1000); // poll for new data every 5 seconds.
  })();

})

function renderMessages(messages) {
  $('#messages').html(''); // clear messages
  for (var i=0; i<messages.length;i++) {
    console.log(messages[i]);
    addMessage(messages[i].author, messages[i].content);
  }
}

function renderFriendList(friends) {
  $('#friends').html('');
  for (var i=0; i<friends.length;i++)
    addFriend(friends[i].username);
  $('a').unbind();
  $('a.userfriend').click(function(e) {
    chatWith = e.target.id;
    $('form#send').show();
    $('.msgView').show();
  });
}

function addMessage(user, message) {
  $('#messages').append('<li><span class="user">'+user+'</span>\
    <span class="message">'+message+'</span></li>');
}

function addFriend(friend) {
  $('#friends').append('<li><a href="#" class="userfriend" id="'+friend+'">'+friend+'</a></li>');
}
/**
 * We're going to send one request to the server, with two things: our username,
 * and the person we're talking to. If we're not talking to anyone, chatWith=null.
 * The server sends back an object with two arrays: messages, and friends.
 * 
 * `messages` is an array of the messages sorted in ascending order by timestamp, 
 * so when we loop thru it, the oldest is processed first. This is only populated 
 * if chatWith !== null.
 *
 * `friends` is sorted in descending order by timestamp, so the friend with whom 
 * we had the most recent correspondance with is processed first.
 */


function poll(callback) {
  $.ajax('/chat', { 
    method: "GET",
    data: {
      user: username,
      chatWith: chatWith
    },
    success: function(data){
      console.log(data);
      renderFriendList(data.friends);
      if (data.messages)
        renderMessages(data.messages);
      callback && callback();
    }, 
    dataType: "json"
  });
}