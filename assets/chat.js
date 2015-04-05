var chatWith = null;
var username = localStorage.getItem("username"); // get the username from localStorage.
var timeout = null;
var converter = new Showdown.converter()
$(document).ready(function() {
  if (!chatWith) { // if there's no chat window open, hide the chat form and message box.
    $('form#send').hide();
    $('.msgView').hide();
  }

  if (!username) { // if a username hasn't been set, open up the loginmodal.
    $('#loginModal').modal();
    $('#logout').hide();
  } else {
    $('#nickname').text(username); // otherwise, set put the username in the navbar.
  }

  // listen for when someone tries to send a message, and POST to the server about it.
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
          poll(); // once we know it worked, let's query the server for new data.
          // an improvement would be sending back the data in the same request.
        }
      });
      e.target.message.value = "";
    } 
    else if (!username) {
      $('#loginModal').modal();
    }
    return false;
  });
  // http://techoctave.com/c7/posts/60-simple-long-polling-example-with-javascript-and-jquery
  (function loop() {
    setTimeout(function() {
      if (username) { // if there is a user, send a request.
        poll(loop);
      } else { // don't send the request, it's wasteful
        loop();
      }
    }, 1000); // poll for new data every 5 seconds.
  })();

  $('form#login').submit(function(e) {
    // get username from form and save it.
    username = e.target.username.value; 
    localStorage.setItem("username", username);
    $('#loginModal').modal('hide'); // hide the modal
    $('#logout').show();
    $('#nickname').text(username);
    return false; // loop() function will automatically start querying the server once username is set.
  });

  $('form#newChat').submit(function(e) {
    chatWith = e.target.u.value;
    poll(); // check for new msgs right away
    $('form#send').show(); // show boxes
    $('.msgView').show();
    e.target.u.value = "";
    return false;
  });
  $('a').click(function(e) {
    chatWith = e.target.id;
    poll();
  });
});

function renderMessages(messages) {
  if (chatWith)
    $('.msgheading').text("Chat with " + chatWith)
  $('#messages').html(''); // clear messages
  for (var i=0; i<messages.length;i++) {
    addMessage(messages[i].author, messages[i].content);
  }
}

function renderFriendList(friends) {
  $('#friends').html('');
  for (var i=0; i<friends.length;i++)
    addFriend(friends[i].username);
  // rebind the listener since we put in new elements.
  $('a').unbind();
  $('a.userfriend').click(function(e) {
    chatWith = e.target.id;
    $('form#send').show();
    $('.msgView').show();
  });
}

// append a message to the queue
function addMessage(user, message) {
  var additionalClass=""
  if (user !== username) {
    additionalClass="them"
  } else {
    additionalClass="me"
  }
  var h = converter.makeHtml(message);
  $('#messages').append('<li class='+additionalClass+'><span class='+additionalClass+'><span class="user">'+user+'</span>\
    <span class="message">'+h.slice(3, h.length-4)+'</span></span></li>');
}
// append message to the queue
function addFriend(friend) {
  $('#friends').append('<li><a href="#" class="userfriend" id="'+friend+'">'+friend+'</a></li>');
}

function logOut() { // workaround for the #logout click listener not working for some reason
  localStorage.setItem("username", "");
  location.reload();
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
      renderFriendList(data.friends);
      if (data.messages)
        renderMessages(data.messages);
      callback && callback();
    }, 
    dataType: "json"
  });
}