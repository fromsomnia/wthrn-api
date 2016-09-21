var key = require('../utils/key');
var sync = require('synchronize');
var request = require('request');
var createTemplate = require('../utils/template.js').typeahead;
var _ = require('underscore');

// The Type Ahead API.
module.exports = function (req, res) {
  var term = req.query.text.trim();

  if (!term) {
    res.json([{
      title: '<i>(search for tracks)</i>',
      text: ''
    }]);
    return;
  }

  var response;
  try {
    response = sync.await(request({
      url: 'http://api.soundcloud.com/tracks',
      qs: {
        q: term,
        limit: 60,
        client_id: key
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    res.status(500).send('Error');
    return;
  }

  if (response.statusCode !== 200 || !response.body) {
    res.status(500).send('Error');
    return;
  }

  var results = _.chain(response.body)
    .reject(function (data) {
      return !data.artwork_url;
    })
    .map(function (data) {
      return {
        title: createTemplate(data),
        text: data.permalink_url
      };
    })
    .value();

  if (results.length === 0) {
    res.json([{
      title: '<i>(no results)</i>',
      text: ''
    }]);
  } else {
    res.json(results);
  }
};
