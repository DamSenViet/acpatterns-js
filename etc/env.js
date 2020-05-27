"use strict";
const fs = require('fs');
const dotenv = require('dotenv');
const signale = require('signale');
const {
  envConfig,
  defaultEnv,
  validateEnv
} = require('../config/env.config');
const { pathToEnv } = require('./paths');

const envVars = Object.keys(envConfig);
const envReqVars = envVars.filter((key) => { return envConfig[key]; });

const load = () => {
  // dot env skips ones that are already set, use it first
  if (fs.existsSync(pathToEnv))
    dotenv.config({ path: pathToEnv });
  // fill in gaps with default
  for (let [key, value] of Object.entries(defaultEnv))
    if (!(key in process.env)) process.env[key] = value;
};

const correct = () => {
  const {
    NODE_ENV,
  } = process.env;

  if (!["development", "production"].includes(NODE_ENV))
    process.env.NODE_ENV = "development";
};

const check = () => {
  const errorMessages = [];
  if (!fs.existsSync(pathToEnv))
    if (envReqVars.length > 0)
      errorMessages.push(".env could not be found");

  // check for missing env variables
  envReqVars.forEach((envVar) => {
    if (envVar in process.env === false)
      errorMessages.push(`Environment variable: '${envVar}' could not be found.`);
  });

  // validate all included environment variabless
  envVars.forEach((envVar) => {
    if (envVar in validateEnv && !validateEnv[envVar]())
      errorMessages.push(`Environment variable: '${envVar}' was not valid.`);
  });

  // reports all errors collected
  if (errorMessages.length > 0) {
    errorMessages.forEach((message) => {
      signale.error(message);
    });
    process.exit(1);
  }
};



// UTILITIES
const ifDevVal = (devVal, defaultVal) => {
  const { NODE_ENV } = process.env;
  const isDev = NODE_ENV === "development";
  if (isDev) return devVal;
  else return defaultVal;
};

const ifDevExec = (devCallback, defaultCallback) => {
  const { NODE_ENV } = process.env;
  const isDev = NODE_ENV === "development";
  if (isDev) devCallback();
  else if (defaultCallback) defaultCallback();
};


const ifProdVal = (prodVal, defaultVal) => {
  const { NODE_ENV } = process.env;
  const isProd = NODE_ENV === "production";
  if (isProd) return prodVal;
  else return defaultVal;
};

const ifProdExec = (prodCallback, defaultCallback) => {
  const { NODE_ENV } = process.env;
  const isProd = NODE_ENV === "production";
  if (isProd) prodCallback();
  else if (defaultCallback) defaultCallback();
};

module.exports = {
  load,
  correct,
  check,
  ifDevVal,
  ifDevExec,
  ifProdVal,
  ifProdExec
};