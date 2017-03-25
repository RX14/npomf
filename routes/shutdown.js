var express = require('express');
var config  = require('../config/core');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('shutdown', { title: config.SITE_NAME + ' · Shutting Down', config: config, noNav: true });
});

module.exports = router;
