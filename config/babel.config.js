"use strict";
const { pathToSrc } = require('../etc/paths');

const babelDevConfig = {
  presets: ['@babel/preset-env'],
  plugins: [
    ['@babel/plugin-transform-runtime', {}],
  ]
};


const babelProdConfig = {
  ...babelDevConfig
};

module.exports = {
  babelDevConfig,
  babelProdConfig
};