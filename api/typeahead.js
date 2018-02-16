const config = require("../utils/config");
const sync = require("synchronize");
const request = require("request");
const _ = require("underscore");
const Jimp = require("jimp");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const Memcached = require("memcached");

const CACHE_EXPIRATION_TIME = 1800; // 30 min

// TODO Make sure we get this memcached connection!!! We kinda need caching for performance and to keep within limits
// TODO Handle cache retrieval/setting failure
// TODO Let someone know when we hit a query limit so we can perhaps upgrade to paid service?
// TODO Keep track of how many unique users/total usage (will require persistant storage)
// TODO Look into potential pre-compile Handlebars optimizations

// So we don't hit the various API query limits!
const cache = new Memcached(config.memcached);

// A list of ISO 3166-1 Alpha-2 country codes - https://datahub.io/core/country-list
const countries = JSON.parse(fs.readFileSync(path.join(__dirname, "../utils/ISO-3166-1-Alpha-2.json")));

// The Type Ahead API that returns suggestions.
module.exports = (req, res) => {
  // format: <country>: <location search term>
  const searchTerm = req.query.text;

  // If a user has selected a valid country, then it will be the prefix of the search string
  const selectedCountry = _.find(_.keys(countries), (key) => {
    return searchTerm.indexOf(key + ": ") === 0; // Search prefix.
  });

  // If the user doesn't have a valid country selected, then assume they're still searching countries.
  if (!selectedCountry) {
    res.json(getCountrySuggestions(searchTerm));
    return; // We only hit the APIs when we have a more defined context (we're searching a particular country)
  }

  const countryCode = countries[selectedCountry];

  // The location search term is the remaining string after the country and the delimiter.
  const locationSearchTerm = searchTerm.slice((selectedCountry + ": ").length) || "a";

  // Create the cache key for this search
  // We replace spaces (which are invalid for keys) with a character that is not likely to provide meaning to search
  const cacheKey = countryCode + ":" + locationSearchTerm.replace(/ /,"#");

  // Search suggestions
  let suggestions;

  // Check memcached for all the hard work we've already done - at this point primarily to cache the default test case
  // NOTE: We could try out other caching heuristics like caching each place by place id or place id by search etc.
  const cachedSuggestions = sync.await(cache.get(cacheKey, sync.defer())); // Don't care about failure for now

  if (cachedSuggestions !== undefined) {
    suggestions = JSON.parse(cachedSuggestions);
    console.log("Fetched " + cacheKey + " from memcached");
    // Refresh the cache timeout
    sync.await(cache.touch(cacheKey, CACHE_EXPIRATION_TIME, sync.defer())); // Don't care about failure for now
  } else {
    suggestions = getSuggestions(countryCode, locationSearchTerm);
    sync.await(cache.set(cacheKey, JSON.stringify(suggestions), CACHE_EXPIRATION_TIME, sync.defer())); // Don't care about failure for now
    console.log("Saved suggestions for " + cacheKey + " to memcached");
  }

  // Given the suggestion data, generate and return the corresponding HTML tabs for display
  res.json(getTabs(suggestions));
}

/**
 * Given complete suggestion data we simply create the corresponding HTML tabs for display
 **/
const getTabs = (suggestions) => {
  // We use Handlebars to compile the tabs
  const locationSource = fs.readFileSync(path.join(__dirname, "../templates/location-template.html")).toString();
  const locationTemplate = Handlebars.compile(locationSource);

  if (suggestions.length === 0) {
   return [{
      title: "<i>(location not found)</i>",
      text: ""
    }];
  } else {
    // Compile the actual HTML we display along with the coordinates of the location
    return suggestions.map((data) => {
      return {
        title: locationTemplate(data),
        text: JSON.stringify(data) // For use with the Dark Sky API
      };
    });
  }
}

/**
 * The first part of the search process is identifying the user country of interest. This is done to narrow scope
 * in the autocomplete phase to make everything else that much more effective/efficient. We simply perform search
 * operations on a statically defined list
 **/
const getCountrySuggestions = (searchTerm) => {
  const matchingCountries = _.filter(_.keys(countries), (country) => {
    // Show all countries if there is no search string
    if (searchTerm.trim() === "") return true;

    return country.toLowerCase().indexOf(searchTerm.toLowerCase()) >= 0;
  });

  if (matchingCountries.length === 0) {
   return [{
      title: "<i>(country not found)</i>",
      text: ""
    }];
  } else {
    return matchingCountries.map((country) => {
      return {
        title: country,
        text: country + ": ",
        resolve: false // Don't automatically resolve and remove the text (keep searching instead).
      };
    });
  }
  return;
}

/**
 * Given an input country code and search term, we return data representing possible locations
 * the searcher had in mind
 **/
const getSuggestions = (countryCode, searchTerm) => {
  let autocomplete;
  try {
    autocomplete = sync.await(request({
      // https://developers.google.com/places/web-service/autocomplete
      url: "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      qs: {
        components: "country:" + countryCode,
        types: "(cities)",
        input: searchTerm,
        language: "en_US",
        key: config.places
      },
      qsStringifyOptions: {
        encode: false, // Prevent URL encoding of "()" and ":"
        skipNulls: true,
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    return []; // Indicate no results
  }

  if (autocomplete.statusCode !== 200 || !autocomplete.body) {
    return []; // Indicate no results
  }

  // We have autocomplete suggestions for the given search
  // Now we turn this result into suggestions by including more complete information
  return getFullInfo(autocomplete);
}

/**
 * We pass in the response from the autocomplete endpoint and hydrate the stub by pulling in data from further calls
 **/
const getFullInfo = (autocomplete) => {
  // In this case _.chain allows us to return the array we are opperating on (".value()")
  return _.chain(autocomplete.body.predictions).map((data) => {
    const details = getDetails(data);

    if (details && details.body.result) {
      let thumb = "";
      // We assume the api (which it ostensibly does) only returns non-empty photos array
      if (details.body.result.photos) {
        thumb = getThumb(details.body.result.photos[0].photo_reference);
      } else {
        // Set the thumb to the default image
        thumb = "https://assets.wthrn.com/images/Location-Default.png";
      }

      const context = data.terms.length >= 2 ? data.terms[1].value : selectedCountry;
      const coordinates = details.body.result.geometry.location;
      const location = details.body.result.name;

      return { location, context, coordinates, thumb };
    }
  }).value();
}

/**
 * This function takes a single suggestion and hits the google detail api, securing further data
 **/
const getDetails = (data) => {
  let details;
  try {
    details = sync.await(request({
      // https://developers.google.com/places/web-service/details
      url: "https://maps.googleapis.com/maps/api/place/details/json",
      qs: {
        placeid: data.place_id,
        key: config.places
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    return null; // Return nothing
  }

  if (details.statusCode !== 200 || !details.body) {
    return null; // Return nothing
  }

  return details;
}

/**
 * Given a photo reference this function hits the google place photo endpoint and attempts to return
 * the url to the returned image (in order to keep the places access key on the client)
 **/
const getThumb = (photoreference) => {
  // https://developers.google.com/places/web-service/photos
  let image;
  try {
    image = sync.await(request({
      // https://developers.google.com/places/web-service/details
      url: "https://maps.googleapis.com/maps/api/place/photo",
      qs: {
        maxwidth: 40,
        maxheight: 40,
        photoreference,
        key: config.places
      },
      gzip: true,
      json: true,
      timeout: 10 * 1000
    }, sync.defer()));
  } catch (e) {
    // Set the thumb to the default image
    return "https://assets.wthrn.com/images/Location-Default.png";
  }

  // We assign what seems to be the ultimate resource referenced after the preceeding call as the thumb image
  // This acrobatic trick is in order to avoid divulging our places key!
  // NOTE: This is probably unreliable in the long term
  return image.request.uri.href;
}
