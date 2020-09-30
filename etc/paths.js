"use strict";
const path = require('path');

// parent folder of paths.js, not exported
const parent = path.resolve(__dirname);

// path to directories
const pathToRoot = path.resolve(parent, "..");
const pathToConfig = path.resolve(pathToRoot, "config");
const pathToEtc = path.resolve(pathToRoot, "etc");
const pathToSrc = path.resolve(pathToRoot, "src");
const pathToBuild = path.resolve(pathToRoot, "build");
const pathToBuildCJS = path.resolve(pathToBuild, "cjs");
const pathToBuildES6 = path.resolve(pathToBuild, "es6");
const pathToBuildUMD = path.resolve(pathToBuild, "umd");
const pathToStats = path.resolve(pathToRoot, "stats");
const pathToNodeModules = path.resolve(pathToRoot, "node_modules");

// paths to specific files
const pathToEnv = path.resolve(pathToRoot, ".env");
const pathToBabelConfig = path.resolve(pathToConfig, "babel.config.js");
const pathToEnvConfig = path.resolve(pathToConfig, "env.config.js");
const pathToWebpackConfig = path.resolve(pathToConfig, "webpack.config.js");
const pathToSrcIndex = path.resolve(pathToSrc, "index.ts")
const pathToPathsJs = path.resolve(pathToEtc, "paths.js");
const pathToBundleStats = path.resolve(pathToStats, "bundle.html");

// paths to tests
const pathToTests = path.resolve(pathToRoot, "tests");
const pathToTestsSystem = path.resolve(pathToTests, "system");

module.exports = {
  pathToRoot,
  pathToConfig,
  pathToEtc,
  pathToSrc,
  pathToBuild,
  pathToBuildCJS,
  pathToBuildES6,
  pathToBuildUMD,
  pathToStats,
  pathToNodeModules,

  pathToEnv,
  pathToBabelConfig,
  pathToEnvConfig,
  pathToWebpackConfig,
  pathToSrcIndex,
  pathToPathsJs,
  pathToBundleStats,
  
  pathToTests,
  pathToTestsSystem,
};