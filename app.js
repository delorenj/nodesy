
/**
 * Module dependencies.
 */

var express = require('express');
var dashboard = require('./routes/dashboard');
var passport = require('passport');
var util = require('util');
var path = require('path');
var io = require('socket.io');
var mongoose = require('mongoose');
var LocalStrategy = require('passport-local').Strategy;
var Etsy = require('./lib/etsy').Etsy;

var users = [
    { id: 1, username: 'carrie', password: 'fyea', email: 'carrievitale@gmail.com' }
  , { id: 2, username: 'delorenj', password: 'test', email: 'jaradd@gmail.com' }
];

var API_KEY = process.env.OAUTH_CONSUMER_KEY;
var etsy = new Etsy(API_KEY);

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a username and password), and invoke a callback
//   with a user object.  In the real world, this would query a database;
//   however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username.  If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message.  Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unkown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));

var port = process.env.PORT || 5000;
var app = module.exports = express.createServer();
io.listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.set('view options', { layout: false, pretty: true });    
  app.use(express.cookieParser());  
  app.use(express.bodyParser());
  app.use(express.logger());
  app.use(express.session({ secret: 'shoesandboots' }));
  app.use(passport.initialize());
  app.use(passport.session());  
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  mongoose.connect("mongodb://localhost/nodesy");
});

app.configure('production', function(){
  app.use(express.errorHandler());
  mongoose.connect("mongodb://delorenj:" + process.env.DBPASS + "@flame.mongohq.com:27059/app5538702");
});


// Routes

//app.get('/', ensureAuthenticated, dashboard.home);
app.get('/', dashboard.home);

app.get('/test', function(req, res) {
  etsy.findAllListingActive(
    {
      keywords: 'blue shawl',
      limit: 10,
      fields: 'title',
      includes: 'MainImage(url_75x75)'
    },
    function(err, data) {
      if(err)
      {
        throw err;
      }
      console.log(data);
    }
  );
})

app.get('/login', function(req, res){
  res.render('login', { title: "ElleOL Login", user: req.user, message: req.flash('error') });
});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  }
);

app.get('/logout', function(req, res){
  console.log("Logging out")
  req.logout();
  res.redirect('/');
});


app.listen(port, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}


