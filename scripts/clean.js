"use strict";
const fse = require('fs-extra');
const signale = require('signale');

const {
  pathToBuild,
  pathToStats,
} = require('../etc/paths');

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log("");
    process.exit();
  });
});

fse.removeSync(pathToBuild);
fse.removeSync(pathToStats);
signale.success(`Build and stats directory cleaned successfully!`);