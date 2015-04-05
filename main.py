#!/usr/bin/env python

import webapp2
import os
from urlparse import parse_qs

import json

import datetime
from google.appengine.ext import db

from cgi import escape

views_dir = os.path.join(os.path.dirname(__file__), 'views')

"""
The datastore object that we're using. Stores the author and the recipient of the message,
as well as the timestamp so that we can sort the messages by when they were recieved.
"""
class Message(db.Model):
  author = db.StringProperty(required=True)
  recipient = db.StringProperty(required=True)
  content = db.StringProperty(required=True)
  timestamp = db.DateTimeProperty(required=True)

class Handler(webapp2.RequestHandler):
  def render(self, filename):
    f = open(views_dir + '/' + filename)
    self.response.write(f.read())
    f.close()

class HomePage(Handler):
  def get(self):
    self.render('index.html')

# fix for serializing datetime objects as ISODate JSON:
# http://stackoverflow.com/questions/455580/json-datetime-between-python-and-javascript
class myEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, datetime.datetime):
      return obj.isoformat()
    else:
      return super(myEncoder, self).default(obj)

class api(Handler):
  def get(self):
    # Parse the query string and get the relevant parts out of it.
    parsed = parse_qs(self.request.query_string, True)
    user = parsed['user'][0]
    chatWith = parsed['chatWith'][0]

    result = {'friends': [], 'messages': []}

    # Get all the messages between these two (find any message where either of them were the recipient)
    # AND one of them was the author
    q1 = db.GqlQuery("SELECT * FROM Message WHERE author IN :1 AND recipient IN :1 ORDER BY timestamp ASC", 
      [user, chatWith])
    for m in q1.run():
      result['messages'].append({"author": m.author, "content": m.content, "timestamp": m.timestamp})
    
    # Since GQL doesn't have an OR operator, I have to do a kind of union of two queries,
    # One checking for when the user was the author, and logging the recipient, and vice versa for the other.
    friendAdded = {}
    q2 = db.GqlQuery("SELECT recipient,timestamp FROM Message WHERE author=:1 ORDER BY timestamp DESC", user)
    for m in q2.run():
      # only add to the list if they're not represented already, going to be > 1 msg per user.
      if m.recipient not in friendAdded and m.recipient: 
        result['friends'].append({"username": m.recipient, "timestamp": m.timestamp})
        friendAdded[m.recipient] = True
    q3 = db.GqlQuery("SELECT author,timestamp FROM Message WHERE recipient=:1 ORDER BY timestamp DESC", user)
    for m in q3.run():
      if m.author not in friendAdded and m.author:
          result['friends'].append({"username": m.author, "timestamp": m.timestamp})
          friendAdded[m.author] = True

    # now I have to sort the list so that, whether the user was the last to recieve or to send a message
    # in the convo, their friends show up in order of the most recent correspondence.
    result['friends'] = sorted(result['friends'], key=lambda m: m['timestamp'], reverse=True)

    toSend = myEncoder().encode(result)
    self.response.write(toSend)

  def post(self):
    parsed = parse_qs(self.request.body, True)
    # protect against XSS! everything that's sent from the webpage is escaped using cgi.escape
    m = Message(author=escape(parsed['userFrom'][0]),
                    recipient=escape(parsed['userTo'][0]),
                    content=escape(parsed['message'][0]),
                    timestamp=datetime.datetime.now())
    m.put()
    self.response.write("success");

app = webapp2.WSGIApplication([
  ('/', HomePage),
  ('/chat', api)
], debug=True)
