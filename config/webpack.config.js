"use strict";
const TerserPlugin = require('terser-webpack-plugin');
const {
  pathToBuild,
  pathToBuildCJS,
  pathToBuildUMD,
  pathToNodeModules,
  pathToSrcIndex,
  pathToTestsSystem,
} = require('../etc/paths');
const {
  babelDevConfig,
  babelProdConfig
} = require('./babel.config');


const entry = pathToSrcIndex;

const output = {
  path: pathToBuild,
  filename: "index.js",
};

// for node environments
const outputCJS = {
  ...output,
  libraryTarget: "commonjs",
  path: pathToBuildCJS,
};

// for browser environments
const outputUMD = {
  ...output,
  // global name in browser
  library: "acpatterns",
  libraryTarget: "umd",
  path: pathToBuildUMD,
  umdNamedDefine: true,
  globalObject: `(typeof self !== 'undefined' ? self : this)`,
};

// for system testing
const outputUMDTest = {
  ...outputUMD,
  path: pathToTestsSystem,
};

const babelLoaderDev = {
  loader: 'babel-loader',
  options: babelDevConfig
};


const babelLoaderProd = {
  ...babelLoaderDev,
  options: babelProdConfig
};


const jsRuleDev = {
  test: /\.tsx?$/i,
  use: [
    babelLoaderDev,
    'ts-loader',
  ],
  exclude: pathToNodeModules,
};


const jsRuleProd = {
  ...jsRuleDev,
  use: [
    babelLoaderProd,
    'ts-loader',
  ],
};


const rulesDev = [
  jsRuleDev,
];


const rulesProd = [
  jsRuleProd,
];


const resolve = {
  extensions: [".ts", ".js"],
};


const optimizationProd = {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      test: /\.js(\?.*)?$/i,
      parallel: true,
      terserOptions: {
        mangle: true,
        ie8: false,
      },
      extractComments: true,
    }),
  ]
};

const externals = {
  "babylonjs": "BABYLON",
  "babylonjs-loaders": "BABYLON",
};


const webpackDevConfigCJS = {
  target: "node",
  mode: "development",
  devtool: "source-map",
  entry,
  output: outputCJS,
  module: {
    rules: rulesDev
  },
  resolve,
  performance: false,
};

const webpackProdConfigCJS = {
  target: "node",
  mode: "production",
  devtool: false,
  entry,
  output: outputCJS,
  module: {
    rules: rulesProd
  },
  resolve,
  performance: false,
};

const webpackDevConfigUMD = {
  ...webpackDevConfigCJS,
  target: "web",
  output: outputUMD,
  externals,
};

const webpackProdConfigUMD = {
  ...webpackProdConfigCJS,
  target: "web",
  output: outputUMD,
  optimization: optimizationProd,
  externals,
};

const webpackDevConfigUMDTest = {
  ...webpackDevConfigUMD,
  output: outputUMDTest,  
};

const webpackProdConfigUMDTest = {
  ...webpackProdConfigUMD,
  output: outputUMDTest,
};


module.exports = {
  webpackDevConfigCJS,
  webpackProdConfigCJS,
  webpackDevConfigUMD,
  webpackProdConfigUMD,
  webpackDevConfigUMDTest,
  webpackProdConfigUMDTest,
};