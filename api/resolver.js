var key = require('../utils/key');
var sync = require('synchronize');
var request = require('request');
var _ = require('underscore');
var createTemplate = require('../utils/template.js').resolver;

// The API that returns the in-email representation.
module.exports = function(req, res) {
  var term = req.query.text.trim();
  handleSearchString(term, req, res);
};

function handleSearchString(term, req, res) {
  var response;
  try {
    response = sync.await(request({
      url: 'http://api.soundcloud.com/resolve',
      qs: {
        url: term,
        client_id: key
      },
      gzip: true,
      json: true,
      timeout: 15 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  res.json({
    body: createTemplate(response.body)
  });
}
