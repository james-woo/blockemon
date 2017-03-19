/**
 * GET /
 * Home page.
 */

var bc = require('../libs/blockchain.js');

exports.index = (req, res) => {
  res.render('home', {
    title: 'Home',
    blocks: JSON.parse(JSON.stringify(bc.blockchain))
  });
};
