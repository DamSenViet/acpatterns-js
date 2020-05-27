"use strict";
const fse = require('fs-extra');
const signale = require('signale');

const { pathToBuild } = require('../etc/paths');

["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, () => {
    console.log("");
    process.exit();
  });
});

fse.removeSync(pathToBuild);
signale.success(`Build directory cleaned successfully!`);