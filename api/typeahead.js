var key = require('../utils/key');
var sync = require('synchronize');
var request = require('request');
var createTemplate = require('../utils/template.js').typeahead;
var _ = require('underscore');

// A list of SoundCloud genres sourced from their website.
var genres = {
  // user-friendly name => key used to identify using the API
  "Alternative": "alternativerock",
  "Ambient": "ambient",
  "Classical": "classical",
  "Country": "country",
  "Dance": "danceedm",
  "Dancehall": "dancehall",
  "Disco": "disco",
  "Dubstep": "dubstep",
  "Electronic": "electronic",
  "Folk": "folksingersongwriter",
  "Hip-hop & Rap": "hiphoprap",
  "House": "house",
  "Indie": "indie",
  "Jazz": "jazzblues",
  "Latin": "latin",
  "Metal": "metal",
  "Piano": "piano",
  "Pop": "pop",
  "R&B": "rbsoul",
  "Reggae": "reggae",
  "Reggaeton": "reggaeton",
  "Rock": "rock",
  "Soundtrack": "soundtrack",
  "Techno": "techno",
  "Trance": "trance",
  "Trap": "trap",
  "Triphop": "triphop",
  "World": "world"
};

// The Type Ahead API.
module.exports = function(req, res) {
  // The idea here is to take the search string (provided in req.query.text) and provide helpful
  // contextual feedback as the user is typing. For this particular command, we're going to have the
  // user search the Soundcloud genre first, then the name of the track. So our search string is the
  // format:
  //    <genre search word>: <track search term>

  var searchTerm = req.query.text;

  // If a user has selected a valid genre, then it will be the prefix of the search string
  var selectedGenre = _.find(_.keys(genres), function(key) {
    return searchTerm.indexOf(key + ': ') === 0; // Search prefix.
  });

  // If the user doesn't have a valid genre selected, then assume they're still searching genres.
  if (!selectedGenre) {
    var matchingGenres = _.filter(_.keys(genres), function(genre) {
      // Show all genres if there is no search string
      if (searchTerm.trim() === '') return true;

      return genre.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
    });

    if (matchingGenres.length === 0) {
      res.json([{
        title: '<i>(no genres found)</i>',
        text: ''
      }]);
    } else {
      res.json(matchingGenres.map(function(genre) {
        return {
          title: genre,
          text: genre + ': ',
          resolve: false // Don't automatically resolve and remove the text (keep searching instead).
        };
      }));
    }
    return;
  }

  var genreAPIName = genres[selectedGenre];
  // The track search term is the remaining string after the genre and the delimiter.
  var trackSearchTerm = searchTerm.slice((selectedGenre + ': ').length);

  var response;
  try {
    response = sync.await(request({
      // https://developers.soundcloud.com/docs/api/reference#tracks
      url: 'http://api.soundcloud.com/tracks',
      qs: {
        genre: genreAPIName,
        q: trackSearchTerm,
        limit: 20,
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
    .reject(function(data) {
      // Filter out results without artwork.
      return !data.artwork_url;
    })
    .map(function(data) {
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