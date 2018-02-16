const express = require("express");
const bodyParser = require("body-parser");
const sync = require("synchronize");
const cors = require("cors");

const app = express();

// Use fibers in all routes so we can use sync.await() to make async code easier to work with.
app.use((req, res, next) => {
  sync.fiber(next);
});

// Since Mixmax calls this API directly from the client-side, it must be whitelisted.
const corsOptions = {
  origin: /^[^.\s]+\.mixmax\.com$/,
  credentials: true
};

app.get("/typeahead", cors(corsOptions), require("./api/typeahead"));
app.get("/resolver", cors(corsOptions), require("./api/resolver"));

if (process.env.NODE_ENV === "production") {
  app.listen(process.env.PORT || 9145);
} else {
  const pem = require("pem");
  const https = require("https");
  pem.createCertificate({ days: 1, selfSigned: true }, (err, keys) => {
    if (err) throw err;

    https.createServer({
      key: keys.serviceKey,
      cert: keys.certificate
    }, app).listen(process.env.PORT || 9145);
  });
}
