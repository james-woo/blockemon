var cryptojs   = require("crypto-js");

var exports = module.exports = {};

class Block {
    constructor(index, nonce, previousHash, timestamp, data, hash) {
        this.index        = index;
        this.nonce        = nonce;
        this.previousHash = previousHash.toString();
        this.timestamp    = timestamp;
        this.data         = data;
        this.hash         = hash.toString();
    }
}

var calculateHashForBlock = (block) => {
    return calculateHash(block.index, block.nonce, block.previousHash, block.timestamp, block.data);
};

var calculateHash = (index, nonce, previousHash, timestamp, data) => {
    return cryptojs.SHA256(index + nonce + previousHash + timestamp + data).toString();
};

var genesisData = {
    owner: "blockemon",
    type: "monster",
    card_name: "Genesis",
    card_image: "http://i.imgur.com/9fnb25E.jpg",
    card_description: "The very first card",
    card_attack: "1",
    card_defense: "1"
};

var getGenesisBlock = () => {
    var index = 0;
    var timestamp = 0;
    var nonce = 0;
    var data = genesisData;
    var hash = calculateHash(index, '0', timestamp, data);
    return new Block(index, nonce, '0', timestamp, data, hash);
};

var generateNextBlock = (blockData) => {
    var nonce = 0;
    var previousBlock = getLatestBlock();
    var nextIndex = previousBlock.index + 1;
    var nextTimestamp = new Date().getTime() / 1000;
    var nextHash;

    // The "Proof-of-work"
    // for (nonce = 0; nonce <= Number.MAX_VALUE; nonce++) {
    //     nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData);
    //     if (nextHash.substr(0, 5) === '00000') {
    //         break;
    //     }
    // }
    console.log("Mining block");
    nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData);
    while (!(nextHash.substr(0,5) === '00000')) {
        nonce = Math.floor(Math.random() * 5000000);
        nextHash = calculateHash(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData);
    }

    return new Block(nextIndex, nonce, previousBlock.hash, nextTimestamp, blockData, nextHash);
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

var getLatestBlock = () => blockchain[blockchain.length - 1];

module.exports.calculateHashForBlock = calculateHashForBlock;
module.exports.calculateHash = calculateHash;
module.exports.getGenesisBlock = getGenesisBlock;
module.exports.generateNextBlock = generateNextBlock;
module.exports.addBlock = addBlock;
module.exports.isValidNewBlock = isValidNewBlock;
module.exports.blockchain = blockchain;
module.exports.getBlockChainData = getBlockChainData;
module.exports.getLatestBlock = getLatestBlock;