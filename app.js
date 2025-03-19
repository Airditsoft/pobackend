const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const passport = require("passport");
const passportAzureAd = require("passport-azure-ad");
const globalRoute = require("./Routes/globalRoutes");

const authConfig = require("./authConfig");
const User = require("./models/user");
const Department = require("./models/department");

dotenv.config();
const app = express();

// Middlewares
app.use(morgan("dev"));
// Allow requests from all origins
app.use(cors({ origin: '*' }));

app.get('/', (req, res) => {
    res.send('CORS enabled for all origins');
});
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post("/dep", async (req, res) => {
  const { department } = req.body;
  await Department.insertMany(department);
  res.json({ message: "inserted" });
});

//admin@airdit.com-0
//amiyaairdit@gmail.com-1
//john.doe@example.com-2
//dhinesh@airditsoftware.com-3
//robert.brown@example.com-4
//emily.davis@example.com-5


//krpvnpvn@gmail.com

// Middleware for manual user check
app.use(
  "/api",
  async (req, res, next) => {
    try {
      const user = await User.findOne({ email: "dhinesh454airdit@gmail.com" });
      if (!user) {
        return res.status(401).json({ message: "User not registered" });
      }
      req.authInfo = user;

      next(); // Proceed to the next middleware or route
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
  globalRoute
);

// Azure AD Authentication Strategy
const bearerStrategy = new passportAzureAd.BearerStrategy(
  {
    identityMetadata: `https://${authConfig.metadata.authority}/${authConfig.credentials.tenantID}/${authConfig.metadata.version}/${authConfig.metadata.discovery}`,
    issuer: `https://${authConfig.metadata.authority}/${authConfig.credentials.tenantID}/${authConfig.metadata.version}`,
    clientID: authConfig.credentials.clientID,
    audience: authConfig.credentials.clientID, // audience is this application
    validateIssuer: authConfig.settings.validateIssuer,
    passReqToCallback: authConfig.settings.passReqToCallback,

    scopes: ["openid", "profile", "email"],
  },
  (issuer, sub, profile, accessToken, refreshToken, done) => {
    console.log("----->", issuer, sub, profile, accessToken, refreshToken);
    if (!profile) {
      return done(new Error("No profile found"), null);
    }
    // Optionally, find or create a user in your database here
    return done(null, profile);
  }
);

app.use(passport.initialize());
passport.use(bearerStrategy);

// // Authentication Middleware
// app.use(
//   '/api',
//   (req, res, next) => {
//     passport.authenticate(
//       'oauth-bearer',
//       { session: false },
//       (err, user) => { // Include 'info' parameter
//         if (err || !user) { // Adjust condition as needed
//           console.log('Authentication error:', err);
//           return res.status(401).json({ message: "Unauthorized access" });
//         }
//         console.log('Authentication error:', err, user);
//         req.authInfo = user; // Store user info for further routes
//         next();
//       }
//     )(req, res, next);
//   },
//   globalRoute
// );

module.exports = app;
