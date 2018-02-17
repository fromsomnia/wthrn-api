const config = require("../utils/config");
const sync = require("synchronize");
const request = require("request");
const _ = require("underscore");
const Handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const Memcached = require("memcached");

const CACHE_EXPIRATION_TIME = 900; // 15 min - deeming that the smallest window for noticeable difference

// TODO Make sure we get this memcached connection!!! We kinda need caching for performance and to keep within limits
// TODO Handle cache retrieval/setting failure
// TODO Let someone know when we hit a query limit so we can perhaps upgrade to paid service?
// TODO Keep track of how many unique users/total usage (will require persistant storage)
// TODO Look into potential pre-compile Handlebars optimizations

// So we don't hit the various API query limits!
const cache = new Memcached(config.memcached);

// This associates the Dark Sky icon names with OUR icon URLs
const iconMap = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "utils", "icon-map.json")).toString());

// The API that returns the in-email card.
module.exports = (req, res) => {
  const selection = req.query.text.trim();

  const selectionData = JSON.parse(selection);

  // Create the cache key for this location
  const cacheKey = JSON.stringify(selectionData.coordinates);

  // What we've all been waiting for
  let wthrn;

  // Check the cache for the given location
  const cachedWeather = sync.await(cache.get(cacheKey, sync.defer())); // Don't care about failure for now

  if (cachedWeather !== undefined) {
    wthrn = JSON.parse(cachedWeather);
    console.log("Fetched " + cacheKey + " from memcached");
    // Refresh the cache timeout
    sync.await(cache.touch(cacheKey, CACHE_EXPIRATION_TIME, sync.defer())); // Don't care about failure for now
  } else {
    wthrn = getWthrn(selectionData);
    sync.await(cache.set(cacheKey, JSON.stringify(wthrn), CACHE_EXPIRATION_TIME, sync.defer())); // Don't care about failure for now
    console.log("Saved wthrn for " + cacheKey + " to memcached");
  }

  // Render and return our little HTML card with our wthrn data
  const weatherSource = fs.readFileSync(path.join(__dirname, "../templates/weather-template.html")).toString();
  const weatherTemplate = Handlebars.compile(weatherSource);

  res.json({
    body: weatherTemplate(wthrn)
  });
}

/**
 * Get the data for the weather; right now! Or as close to it as we can...
 **/
const getWthrn = (selectionData) => {
  // Set default values
  const wthrn = {
    title: selectionData.location + ", " + selectionData.context,
    description: "",
    weather: iconMap["default"],
    temperature: "-",
    thermometer: iconMap["thermo"],
    time: (new Date()).toDateString()
  };

  const weatherData = getWeatherData(selectionData.coordinates);

  // Override default values with the actual data we got back
  if (weatherData) {
    // NOTE: Index 1 references the data for the upcoming time period (minute/hour)

    // Define this separately since we'll need to reference it
    const unixTime = weatherData.time || weatherData.data[1].time || null;
    const date = unixTime ? new Date(unixTime * 1000) : null;

    // The icon name provided by Dark Sky
    const darkSkyIcon = weatherData.icon || weatherData.data[1].icon || null;

    // The temperature provided by Dark Sky or our simple default ("-")
    const temperature = weatherData.temperature || weatherData.data[1].temperature || "-";

    // We also check the top level object for the case where we have current data (not divided by time period)
    wthrn.temperature = temperature
    wthrn.description = weatherData.summary;
    wthrn.thermometer = getThermometer(wthrn.temperature);
    wthrn.time = getTimeStamp(date, weatherData.timezone);
    wthrn.icon = getIcon(darkSkyIcon, date, weatherData.timezone);
  }

  return wthrn;
}

/**
 * This function uses the Dark Sky input icon name and the time, using it to determing the time of day to output the correct icon
 **/
const getIcon = (name, time, timezone) => {
  if (name && iconMap[name]) {
    // Depending on the time of day we'll show a "nighttime" icon alternative
    if (time && timezone && !name.includes("day") && !name.includes("night")) {
      const options = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone };
      const localeTimeString = time.toLocaleTimeString("en-US", options);
      const hours = parseInt(localeTimeString.slice(0, localeTimeString.indexOf(":")));

      // Of course we might need location/time of year/daylight savings nuance to determine this
      if (hours <= 5 || hours >= 18) {
        name += "-night";
      }
    }
    return iconMap[name];
  }
    return iconMap.default;
}

/**
 * This function calls out to the Dark Sky API and get's us the weather data for the selection location by coordinates
 **/
const getWeatherData = (coordinates) => {
  let data;

  try {
    data = sync.await(request({
      url: "https://api.darksky.net/forecast/" + config.darksky + "/" + coordinates.lat + "," + coordinates.lng,
      qs: {
        exclude: "hourly,alerts,flags"
      },
      qsStringifyOptions: {
        encode: false, // Prevent URL encoding of ","
      },
      gzip: true,
      json: true,
      timeout: 15 * 1000
    }, sync.defer()));
  } catch (e) {
    return null; // Indicate no results
  }

  if (data.statusCode !== 200 || !data.body) {
    return null; // Indicate no results
  }
  const weatherData = data.body.currently || data.body.minutely || data.body.daily || null;
  weatherData.timezone = data.body.timezone; // Pass this on; we need it
  return weatherData;
}

/**
 * Here we completely arbitrarily establish the ranges associated with each %full thermometer based on temperature
 **/
const getThermometer = (temperature) => {
  if (temperature >= 85) {
    return iconMap["thermo-100"];
  } else if (temperature >= 65) {
    return iconMap["thermo-75"];
  } else if (temperature >= 45) {
    return iconMap["thermo-50"];
  } else if (temperature >= 33) {
    return iconMap["thermo-25"];
  } else {
    return iconMap["thermo-0"];
  }
}

/**
 * Given a date and a timezone, this function returns the corresponding readable timestamp string
 **/
const getTimeStamp = (date, timezone) => {
  if (date && timezone) {
    // Get the readable date
    let options = { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: timezone };
    const localeDateString = date.toLocaleDateString("en-US", options);

    // Get the readable time
    options = { hour: "2-digit", minute: "2-digit", timeZone: timezone };
    const localeTimeString = date.toLocaleTimeString("en-US", options);

    return localeDateString + " @ " + localeTimeString;
  } else {
    return "";
  }
}
