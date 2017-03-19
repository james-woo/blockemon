# blockemon
A card game built on top of the blockchain for learning purposes. A light weight blockchain with rudimentary Proof of Work (POW). This is not a secure implementation and not meant for the public. It is merely a simple implementation that allows you to enter data into blocks. This project was based on [Naivechain](https://github.com/lhartikk/naivechain)

```bash
# Get the latest snapshot
$ git clone https://github.com/james-woo/blockemon.git
$ cd blockemon
$ git remote rm origin

# OPTIONAL: Start the client side
$ cd blockemon-client
$ npm install
$ HTTP_PORT=3001 P2P_PORT=6001 npm start

# Start your node and connect to a client
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
**GET** ```HTTP_PORT/api/blocks``` returns the block chain as json

```curl HTTP_URL/api/blocks```

**GET** ```HTTP_URL/api/nodes``` returns a list of nodes known to you

```curl HTTP_URL/api/nodes```

**POST** ```HTTP_URL/api/mine``` node will mine the block

```curl -H "Content-type:application/json" -d '{"data" : "I am data"}' HTTP_URL/api/mine```

**POST** ```HTTP_URL/api/addNode``` add node to list of nodes that you know

```curl -H "Content-Type: application/json" -X POST -d '{"node": "P2P_ADDRESS_OF_OTHER_NODE"}' HTTP_URL/api/addNode```
