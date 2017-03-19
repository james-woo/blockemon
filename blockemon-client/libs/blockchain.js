var cryptojs   = require("crypto-js");

var exports = module.exports = {};

class Block {
    constructor(index, nonce, previousHash, timestamp, data, hash, relayed, reward) {
        this.index        = index;
        this.nonce        = nonce;
        this.previousHash = previousHash.toString();
        this.timestamp    = timestamp;
        this.data         = data;
        this.hash         = hash.toString();
        this.relayed      = relayed;
        this.reward       = reward;
    }
}

var calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.nonce, block.previousHash, block.timestamp, block.data, block.relayed, block.reward);
};

var calculateHash = (index, nonce, previousHash, timestamp, data, relayed, reward) => {
    return cryptojs.SHA256(index + nonce + previousHash + timestamp + data + relayed + reward).toString();
};

var genesisData = {
    card: {
        owner: "blockemon",
        type: "monster",
        card_name: "Genesis",
        card_image: "http://i.imgur.com/9fnb25E.jpg",
        card_description: "The very first card",
        card_attack: "1",
        card_defense: "1"
    },
    relayed: "base",
    reward: 50,
    transaction: {
        from: "base",
        to: "blockemon",
        value: 50
    }
};

var getGenesisBlock = () => {
    var index = 0;
    var timestamp = 0;
    var nonce = 0;
    var data = genesisData;
    var hash = calculateHash(index, '0', timestamp, data);
    return new Block(index, nonce, '0', timestamp, data, hash, genesisData.relayed, genesisData.reward);
};

var generateNextBlock = (blockData, email) => {
    var nonce = 0;
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash;
    var relayed = email;
    var reward = 50;

    // The "Proof-of-work"
    // for (nonce = 0; nonce <= Number.MAX_VALUE; nonce++) {
    //     nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData);
    //     if (nextHash.substr(0, 5) === '00000') {
    //         break;
    //     }
    // }
    console.log("Mining block");
    nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData, relayed, reward);
    while (!(nextHash.substr(0,4) === '0000')) {
        nonce = Math.floor(Math.random() * 5000000);
        nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData, relayed, reward);
    }

    return new Block(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData, nextHash, relayed, reward);
};

var addBlock = (newBlock) => {
    if (isValidNewBlock(newBlock, getLatestBlock())) {
        blockchain.unshift(newBlock);
    }
};

var isValidNewBlock = (newBlock, previousBlock) => {
    if (previousBlock.index + 1 !== newBlock.index) {
        console.log('invalid index');
        return false;
    } else if (previousBlock.hash !== newBlock.previousHash) {
        console.log('invalid previoushash');
        return false;
    } else if (calculateHashForBlock(newBlock) !== newBlock.hash) {
        console.log(typeof (newBlock.hash) + ' ' + typeof calculateHashForBlock(newBlock));
        console.log('invalid hash: ' + calculateHashForBlock(newBlock) + ' ' + newBlock.hash);
        return false;
    }
    return true;
};

var blockchain = [getGenesisBlock()];

var getBlockChainData = () => {
    var data = [];
    blockchain.forEach(function(block) {
        data.push(block.data);
    });
    return data;
};

var getLatestBlock = () => blockchain[0];

var calculateWorth = (email) => {
  var worth = 0;
  blockchain.forEach((b) => {
    console.log(b)
    if (b.data.relayed == email) {
      worth += b.data.reward
    }
    if (b.data.transaction.from == email) {
      worth -= b.data.transaction.value;
    }
    if (b.data.transaction.to == email) {
      worth += b.data.transaction.value;
    }
  });
  return worth;
}

module.exports.calculateHashForBlock = calculateHashForBlock;
module.exports.calculateHash = calculateHash;
module.exports.getGenesisBlock = getGenesisBlock;
module.exports.generateNextBlock = generateNextBlock;
module.exports.addBlock = addBlock;
module.exports.isValidNewBlock = isValidNewBlock;
module.exports.blockchain = blockchain;
module.exports.getBlockChainData = getBlockChainData;
module.exports.getLatestBlock = getLatestBlock;
module.exports.calculateWorth = calculateWorth;