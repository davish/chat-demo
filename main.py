#!/usr/bin/env python

import webapp2
import os
from urlparse import parse_qs

import json

import datetime
from google.appengine.ext import db

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

    # TODO: use datastore to get the relevant data.
    """
      messages: this will be easy. all you have to do is query for messages where
      userTo is the user and userFrom is chatWith, and vice versa. 

      friends is harder. you need to find all users that the user has communicated with.
      find all messages where userTo or userFrom is the user, loop through each of them,
      and if `thisUser` not in friends then add it to friends. problem is this is O(n) 
      for how many messages you have in the database.
    """
    q1 = db.GqlQuery("SELECT * FROM Message WHERE author IN :1 AND recipient IN :1 ORDER BY timestamp ASC", [user, chatWith])
    for m in q1.run():
      result['messages'].append({"author": m.author, "content": m.content, "timestamp": m.timestamp})
    toSend = myEncoder().encode(result)
    # print toSend
    self.response.write(toSend)
  def post(self):
    parsed = parse_qs(self.request.body, True)
    m = Message(author=parsed['userFrom'][0],
                    recipient=parsed['userTo'][0],
                    content=parsed['message'][0],
                    timestamp=datetime.datetime.now())
    m.put()

class logIn(Handler):
  def get(self):
    pass
  def post(self):
    pass

app = webapp2.WSGIApplication([
  ('/', HomePage),
  ('/chat', api)
], debug=True)
