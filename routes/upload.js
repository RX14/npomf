var express = require('express');
var multer  = require('multer');
var mkdirp  = require('mkdirp');
var cors    = require('cors');
var config  = require('../config/core');
var util    = require('../util/core');

var db = util.getDatabase();
var router = express.Router();

mkdirp(config.UPLOAD_DIRECTORY);

db.run('CREATE TABLE IF NOT EXISTS files (id integer primary key, filename text unique, originalname text, size number, created datetime)', function() {
  db.all("PRAGMA table_info('files')", function(err, rows) {
    if (rows !== undefined && rows !== null) {
      var createdExists = false;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].name === 'created')
          createdExists = true;
      }
      if (!createdExists) {
        // Add creation date if we are at version 0, version 0 shouldn't have it.
        db.exec('ALTER TABLE files ADD COLUMN created datetime');
      }
    }
  });
});

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_DIRECTORY);
  },
  filename: function (req, file, cb) {
    util.generate_name(file, db, function(name){
      cb(null, name);
    });
  }
});

var upload = multer({ storage: storage, limits: {fileSize: config.MAX_UPLOAD_SIZE}, fileFilter: util.fileFilter });


/* Handle CORS pre-flight requests */
router.options('/', cors());

const ipMap = {}

/* POST upload page. */
router.post('/', cors(), upload.array('files[]', config.MAX_UPLOAD_COUNT), function(req, res, next) {
  var auth_status = config.UPLOAD_TOKENS.includes(req.query.token)

  var reqNo = ipMap[req.ip] || 0
  ipMap[req.ip] = reqNo + 1

  var doRedirect = (reqNo == 0 || reqNo == 10)

  var files = [];
  req.files.forEach(function(file) {
    db.run('UPDATE files SET size = ? WHERE filename = ?', [file.size, file.filename]);
    files.push({
      "name": file.originalname,
      "url": doRedirect ? "shutdown" : file.filename,
      "fullurl": doRedirect ? (config.URL + "/shutdown") : (config.FILE_URL + '/' + file.filename),
      "size": file.size,
      "authenticated": auth_status
    });
  });

  if (req.query.output == "gyazo") {
    res.status(200).send(files[0].fullurl);
  } else {
    res.status(200).json({ 'success': true, 'files': files });
  }
});

module.exports = router;
