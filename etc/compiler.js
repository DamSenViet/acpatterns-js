"use strict";
const signale = require('signale');
const clear = require('clear');
const webpack = require('webpack');
const yargs = require('yargs');
const argv = yargs.parse();
const {
  webpackDevConfigCJS,
  webpackProdConfigCJS,
  webpackDevConfigUMD,
  webpackProdConfigUMD,
  webpackDevConfigUMDTest,
  webpackProdConfigUMDTest,
} = require('../config/webpack.config');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const { pathToBundleStats } = require('../etc/paths');
const webpackFormatMessages = require('webpack-format-messages');
const { ifProdVal } = require('./env');
const { NODE_ENV } = process.env;

let webpackConfig = ifProdVal(
  // use multi configuration, compiles two different sets
  [webpackProdConfigCJS, webpackProdConfigUMD, webpackProdConfigUMDTest],
  [webpackDevConfigCJS, webpackDevConfigUMD, webpackDevConfigUMDTest]
);

const selectedConfigUMD = ifProdVal(webpackProdConfigUMD, webpackDevConfigUMD);
if (argv.analyze) selectedConfigUMD.plugins = [
  new BundleAnalyzerPlugin({
    analyzerMode: "static",
    reportFilename: pathToBundleStats,
    generateStatsFile: false,
    statsOptions: { source: true },
    openAnalyzer: true,
    logLevel: "silent"
  })
];

const compiler = webpack(webpackConfig);

compiler.hooks.watchRun.tap('wow', () => {
  clear();
  signale.watch('Recurisvely watching source directory...');
});

compiler.hooks.done.tap('done', (stats) => {
  const messages = webpackFormatMessages(stats);

  if (!messages.errors.length && !messages.warnings.length) {
    signale.success(`Application compiled in ${NODE_ENV} mode!`);
  }

  if (messages.errors.length) {
    signale.fatal('Application failed to compile.');
    messages.errors.forEach(e => console.log(e));
    return;
  }

  if (messages.warnings.length) {
    signale.warn('Application compiled with warnings.');
    messages.warnings.forEach(w => console.log(w));
  }
});

module.exports = compiler;