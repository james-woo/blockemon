# blockemon
A card game built on top of the blockchain for learning purposes (the blockchain serves as a simple database for cards and transactions). A light weight blockchain with rudimentary Proof of Work (POW). This is not a secure implementation and not meant for the public. It is merely a simple implementation that allows you to enter data into blocks. This project was based on [Naivechain](https://github.com/lhartikk/naivechain)

# Features
Ensure you are signed in for everything!

When you sign up, you are awarded 5 ecoins to freely create cards as you please. If you successfully mine the next block, you are awarded 50 ecoins. If you create a card, you spend 1 ecoin. 

Creating cards is simple, head over to the create a card page, fill out the form and press create. The server will broadcast a message to all the nodes connected and will attempt to mine the next block. The block contains data such as the card information, and any transactions made.

You can also view all the nodes connected, however, this is a manual process. All nodes must connect to one main client in order for this to work properly. Additionally, you can view the mined blocks on the home page, which shows the blockchain details.

As a visual aid, you can view the cards that exist on the blockchain on the cards page. This visual representation of the blockchain is a fun way to learn how the blockchain gets created.

# Idea
Mainly, this was developed for learning purposes, however, you could imagine a system where people want to develop a card game that is decentralized and crowd sourced. There could be a review process for cards to become created, and a store to use the currency.

```bash
# Get the latest snapshot
$ git clone https://github.com/james-woo/blockemon.git
$ cd blockemon
$ git remote rm origin

# Start the client side
$ cd blockemon-client
$ npm install
$ HTTP_PORT=3001 P2P_PORT=6001 npm start

# OPTIONAL: Start your node and connect to a client
$ cd blockemon-node
$ npm install
$ HTTP_PORT=3002 P2P_PORT=6002 npm start 
```

# Architecture
![Architecture](/architecture.png?raw=true "Architecture")

# API
ngrok will provide two links to use, one will be for the http port, one is for the p2p port:

e.g.

```
listening to p2p on port: 6001
Listening to port: 3001
p2p_tunnel: https://cfbdafb8.ngrok.io
http_tunnel: https://a088cc73.ngrok.io
```

# API For node
**GET** ```HTTP_PORT/api/cards``` returns the block chain as json

```curl HTTP_URL/api/cards```

**GET** ```HTTP_URL/api/nodes``` returns a list of nodes known to you

```curl HTTP_URL/api/nodes```

**POST** ```HTTP_URL/api/card/create``` node will mine the block

```curl -H "Content-type:application/json" -d '{"data" : "I am data"}' HTTP_URL/api/mine```

**POST** ```HTTP_URL/api/node/add``` add node to list of nodes that you know

```curl -H "Content-Type: application/json" -X POST -d '{"node": "P2P_ADDRESS_OF_OTHER_NODE"}' HTTP_URL/api/node/add```

**POST** ```HTTP_URL/api/data/add``` add node to list of nodes that you know

```curl -H "Content-Type: application/json" -X POST -d '{"data": "DATA"}' HTTP_URL/api/data/add```
