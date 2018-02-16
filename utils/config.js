const path = require("path");
const fs = require("fs");

// This will house our configuration data
let config;

// In production we have our sensitive data stored as environment variables
if (process.env.NODE_ENV === "production") {
	config = {
		places: process.env.GOOGLE_PLACES_KEY,
		darksky: process.env.DARK_SKY_KEY,
		memcached: process.env.MEMCACHED
	};
} else {
	// In development we draw our configuration data from a local file
	config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")).toString());
}

// Make this configuration data available
module.exports = config;
