const serverless = require("@netlify/functions");
const app = require("../../server/src/app");

exports.handler = serverless.createHandler(app);
