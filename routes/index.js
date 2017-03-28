var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'NLP tester' });
});

/* AIS with ACE */
router.get('/ais_editor', function(req, res, next) {
  res.render('ais_editor', { title: 'AIScript editor' });
});


/* TEST */
router.get('/nlp_editor', function(req, res, next) {
  res.render('nlp_editor', { title: 'NLP editor' });
});

module.exports = router;
