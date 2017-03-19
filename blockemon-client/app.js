/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const sass = require('node-sass-middleware');
const multer = require('multer');

var request = require('request');

// Block chain
var http = require('http');
var webSocket = require('ws');
var ngrok = require('ngrok');
var bc = require('./libs/blockchain.js');

var http_port = process.env.HTTP_PORT || 3001;
var p2p_port = process.env.P2P_PORT  || 6001;
var initialNodes = process.env.NODES ? process.env.NODES.split(',') : [];

var sockets = [];
var nodes = [];

var pepes = [
  'http://i.imgur.com/IUEKLG8.gif', // most rarest
  'http://i.imgur.com/3Z20bhH.gif', // very rare
  'http://i.imgur.com/bCBt6ga.jpg', // pretty rare
  'http://i.imgur.com/GtalSEt.gif', // somewhat rare
  'http://i.imgur.com/0xqJDGG.png', // rare
  'http://i.imgur.com/F3cxtls.jpg', // uncommon
  'http://i.imgur.com/m5dWxy5.png', // less common
  'http://i.imgur.com/0vYlmim.jpg', // common
  'http://i.imgur.com/mpDqrTX.jpg', // very common
];

var MessageType = {
    QUERY_LATEST: 0,
    QUERY_ALL: 1,
    RESPONSE_BLOCKCHAIN: 2,
    REQUEST_CREATE: 3
};

var http_url;
var p2p_url;

ngrok.connect(http_port, function (err, url) {
    // Make api calls here
    http_url = url;
    console.log('http_tunnel: ' + url);
});

ngrok.connect(p2p_port, function (err, url) {
    // Other nodes can connect to you here
    p2p_url = url;
    console.log('p2p_tunnel: ' + url);
});
// Block chain

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.envvars' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();
const server = http.createServer(app);

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);
mongoose.connection.on('error', () => {
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

var initHttpServer = () => {
  /**
   * Express configuration.
   */
  app.set('port', process.env.PORT || 3000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');
  app.use(compression());
  app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
  }));
  app.use(logger('dev'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(expressValidator());
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
      autoReconnect: true
    })
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());
  app.use((req, res, next) => {
    if (req.path.match('/api/*')) {
      next();
    } else {
      lusca.csrf()(req, res, next);
    }
  });
  app.use(lusca.xframe('SAMEORIGIN'));
  app.use(lusca.xssProtection(true));
  app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
  });
  app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
      req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == '/account') {
      req.session.returnTo = req.path;
    }
    next();
  });
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

  /**
   * Primary app routes.
   */
  app.get('/', homeController.index);
  
  app.get('/cards', (req, res) => {
    var cards = getCards(bc.getBlockChainData());
    res.render('cards/cards', {
      title: 'Cards',
      cards: JSON.parse(JSON.stringify(cards))
    });
  });
  
  app.get('/cards/create', (req, res) => {
    if (!req.user) {
      res.redirect('/login');
    }
    var canCreate = (bc.calculateWorth(req.user.email) > 1);
    console.log('worth of ' + req.user.email + ' = ' + bc.calculateWorth(req.user.email));
    res.render('cards/create', {
      title: 'Create Card',
      link: pepes[Math.floor(Math.random() * 9)],
      canCreate: canCreate
    });
  });

  app.post('/cards/create', (req, res) => {
    var type = req.body.cardtype;
    var email = req.user.email;
    var createRequest = {
      index: bc.blockchain.length - 1,
      card: {
        owner: email,
        type: type,
        card_name: req.body.cardname,
        card_image: req.body.cardimage,
        card_description: req.body.carddescription,
        card_attack: Math.floor(Math.random() * 11),
        card_defense: (type=="monster") ? Math.floor(Math.random() * 10) : null
      },
      relayed: email,
      reward: 50,
      transaction: {
        from: email,
        to: "base",
        value: 1
      }
    };

    broadcast(requestCreate(createRequest));
    var newBlock = bc.generateNextBlock(createRequest, email);
    bc.addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log('block added: ' + JSON.stringify(newBlock));

    res.send();
    res.redirect('/cards');
  });

  app.get('/nodes', (req, res) => {
    res.render('nodes/nodes', {
      nodes: nodes
    });
  });

  app.get('/nodes/add', (req, res) => {
    res.render('nodes/add', {
      title: 'Add Node'
    });
  });
  
  app.post('/nodes/add', (req, res) => {
    if (req.body.terminal) {
      var input = req.body.terminal.split(" ");
      var node = {
        user: req.body.email,
        http: input[input.indexOf("http_tunnel:") + 1],
        p2p: input[input.indexOf("p2p_tunnel:") + 1]
      }
    } else {
      var node = {
        user: req.body.email,
        http: req.body.http,
        p2p: req.body.p2p
      };
    }

    connectToNodes([node]);
    res.send();
    res.redirect('/nodes');
  });

  app.post('/data/add', (req, res) => {
    var newBlock = bc.generateNextBlock(req.data, 'blockemon');
    bc.addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log('block added: ' + JSON.stringify(newBlock));

    res.send();
  });

  app.get('/login', userController.getLogin);
  app.post('/login', userController.postLogin);
  app.get('/logout', userController.logout);
  app.get('/forgot', userController.getForgot);
  app.post('/forgot', userController.postForgot);
  app.get('/reset/:token', userController.getReset);
  app.post('/reset/:token', userController.postReset);
  app.get('/signup', userController.getSignup);
  app.post('/signup', userController.postSignup, (req, res) => {
    // Add monies
    var createRequest = {
      index: bc.blockchain.length - 1,
      relayed: 'base',
      reward: 0,
      transaction: {
        from: 'base',
        to: req.body.email,
        value: 5
      }
    };
    var newBlock = bc.generateNextBlock(createRequest, 'base');
    bc.addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log('block added: ' + JSON.stringify(newBlock));

    res.send();
    res.redirect('/');
  });
  app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
  app.post('/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
  app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
  app.post('/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);

  /**
   * Error Handler.
   */
  app.use(errorHandler());

  server.listen(http_port, () => console.log('Listening to port: ' + server.address().port));
};

function getCards(blocks) {
  var cards = [];
  blocks.forEach((b) => {
    if (b.card)
      cards.push(b.card);
  });
  return cards;
}

var initP2PServer = () => {
  var p2pServer = new webSocket.Server({server, port: p2p_port});
  p2pServer.on('connection', ws => initConnection(ws));
  console.log('listening to p2p on port: ' + p2p_port);
};

var initConnection = (ws) => {
  sockets.push(ws);
  initMessageHandler(ws);
  initErrorHandler(ws);
  write(ws, queryChainLengthMsg());
};

var initMessageHandler = (ws) => {
  ws.on('message', (data) => {
    var message = JSON.parse(data);
    console.log('Received message' + JSON.stringify(message));
    switch (message.type) {
      case MessageType.QUERY_LATEST:
        write(ws, responseLatestMsg());
        break;
      case MessageType.QUERY_ALL:
        write(ws, responseChainMsg());
        break;
      case MessageType.RESPONSE_BLOCKCHAIN:
        handleBlockchainResponse(message);
        break;
      case MessageType.REQUEST_CREATE:
        handleDataCreate(message);
        break;
    }
  });
};

var initErrorHandler = (ws) => {
  var closeConnection = (ws) => {
    console.log('connection failed to node: ' + ws.url);
    sockets.splice(sockets.indexOf(ws), 1);
    nodes.splice(nodes.indexOf(ws), 1);
  };
  ws.on('close', () => closeConnection(ws));
  ws.on('error', () => closeConnection(ws));
};

var connectToNodes = (newNodes) => {
  newNodes.forEach((node) => {
    nodes.push(node);
    var ws = new webSocket(node.p2p);
    ws.on('open', () => initConnection(ws));
    ws.on('error', () => {
        console.log('connection failed');
        nodes.pop(node);
    });
  });
};

var handleBlockchainResponse = (message) => {
  var receivedBlocks = JSON.parse(message.data).sort((b1, b2) => (b1.index > b2.index));
  var latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  var latestBlockHeld = bc.getLatestBlock();
  if (latestBlockReceived.index > latestBlockHeld.index) {
    console.log('blockchain possibly behind. We got: ' + latestBlockHeld.index + ' Node got: ' + latestBlockReceived.index);
    console.log(latestBlockHeld.hash + ' ' + latestBlockReceived.previousHash);
    if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
      console.log("We can append the received block to our chain");
      bc.blockchain.push(latestBlockReceived);
      broadcast(responseLatestMsg());
    } else if (receivedBlocks.length === 1) {
      console.log("We have to query the chain from our node");
      broadcast(queryAllMsg());
    } else {
      console.log("Received blockchain is longer than current blockchain");
      replaceChain(receivedBlocks);
    }
  } else {
    console.log('received blockchain is not longer than received blockchain. Do nothing');
  }
};

var handleDataCreate = (message) => {
  if (message.index != bc.getLatestBlock().index) {
    var createRequest = {
      index: message.index,
      card: {
        owner: message.owner,
        type: message.type,
        card_name: message.card_name,
        card_image: message.card_image,
        card_description: message.card_description,
        card_attack: message.card_attack,
        card_defense: message.card_defense
      },
      relayed: message.relayed
    };

    var newBlock = bc.generateNextBlock(createRequest, message.relayed);
    bc.addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log('block added: ' + JSON.stringify(newBlock));
  }
};

var replaceChain = (newBlocks) => {
  if (isValidChain(newBlocks) && newBlocks.length > bc.blockchain.length) {
    console.log('Received blockchain is valid. Replacing current blockchain with received blockchain');
    bc.blockchain = newBlocks;
    broadcast(responseLatestMsg());
  } else {
    console.log('Received blockchain invalid');
  }
};

var isValidChain = (blockchainToValidate) => {
  if (JSON.stringify(blockchainToValidate[0]) !== JSON.stringify(bc.getGenesisBlock())) {
    return false;
  }
  var tempBlocks = [blockchainToValidate[0]];
  for (var i = 1; i < blockchainToValidate.length; i++) {
    if (bc.isValidNewBlock(blockchainToValidate[i], tempBlocks[i - 1])) {
      tempBlocks.push(blockchainToValidate[i]);
    } else {
      return false;
    }
  }
  return true;
};

var queryChainLengthMsg = () => ({'type': MessageType.QUERY_LATEST});
var queryAllMsg = () => ({'type': MessageType.QUERY_ALL});
var responseChainMsg = () =>({
  'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(bc.blockchain)
});
var responseLatestMsg = () => ({
  'type': MessageType.RESPONSE_BLOCKCHAIN,
  'data': JSON.stringify([bc.getLatestBlock()])
});
var requestCreate = (data) => ({
    'type': MessageType.REQUEST_CREATE,
    'data': JSON.stringify(data)
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket, message));

connectToNodes(initialNodes);
initHttpServer();
initP2PServer();

module.exports = app;
module.exports.responseLatestMsg = responseLatestMsg;
