'use strict';
var express    = require("express");
var bodyParser = require('body-parser');
var http       = require('http');
var webSocket  = require("ws");
var ngrok      = require('ngrok');
var path       = require('path');
var bc         = require('./blockchain.js');

const app    = express();
const server = http.createServer(app);

var http_port    = process.env.HTTP_PORT || 3001;
var p2p_port     = process.env.P2P_PORT  || 6001;
var initialNodes = process.env.NODES ? process.env.NODES.split(',') : [];

var sockets = [];
var nodes = [];

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
  console.log('http_tunnel: ' + url);
});

ngrok.connect(p2p_port, function (err, url) {
  // Other nodes can connect to you here
  console.log('p2p_tunnel: ' + url);
});

var initHttpServer = () => {
  app.use(bodyParser.json());

  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res) => res.redirect('index.html'));

  app.get('/cards', (req, res) => res.send(JSON.stringify(bc.blockchain)));
  
  app.post('/cards/create', (req, res) => {
    var createRequest = {
      owner: http_url,
      type: req.body.cardtype,
      card_name: req.body.cardname,
      card_image: req.body.cardimage,
      card_description: req.body.carddescription,
      card_attack: Math.floor(Math.random() * 11),
      card_defense: Math.floor(Math.random() * 10)
    };

    broadcast(requestCreate(createRequest));
    var newBlock = bc.generateNextBlock(createRequest);
    bc.addBlock(newBlock);
    broadcast(responseLatestMsg());
    console.log('block added: ' + JSON.stringify(newBlock));
    res.send();
  });
  
  app.get('/nodes', (req, res) => {
    res.send(nodes);
  });
  
  app.post('/nodes/add', (req, res) => {
    var node = {
      user: req.body.email,
      http: req.body.http,
      p2p: req.body.p2p
    };

    connectToNodes([node]);
    res.send();
  });
  
  server.listen(http_port, () => console.log('Listening to port: ' + server.address().port));
};

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
      console.log('connection failed')
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
      owner: message.owner,
      type: message.type,
      card_name: message.card_name,
      card_image: message.card_image,
      card_description: message.card_description,
      card_attack: message.card_attack,
      card_defense: message.card_defense
    };

    var newBlock = bc.generateNextBlock(createRequest);
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
  'data': data
});

var write = (ws, message) => ws.send(JSON.stringify(message));
var broadcast = (message) => sockets.forEach(socket => write(socket, message));

connectToNodes(initialNodes);
initHttpServer();
initP2PServer();
