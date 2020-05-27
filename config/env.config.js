"use strict";
// list of env strings, and if needed to specify via .env
// available only to the build process
const envConfig = {
  NODE_ENV: false,
};

// list of env variables to loaded as default
// subset of env config keys
const defaultEnv = {
  NODE_ENV: "development",
};

const validateEnv = {
  NODE_ENV: () => {
    const { NODE_ENV } = process.env;
    return ["development", "production"].includes(NODE_ENV);
  }
};

module.exports = {
  envConfig,
  defaultEnv,
  validateEnv,
};