"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Servers = require("../modules/Mysql/Servers");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const { SettingValue, timeSleep } = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip } = req.query;
  try {
    await timeSleep();

    
    return res.json({ status: true });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
