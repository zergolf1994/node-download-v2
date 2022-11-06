"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Servers = require("../modules/Mysql/Servers");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const {
  SettingValue,
  timeSleep,
  getSourceGdrive,
} = require("../modules/Function");

module.exports = async (req, res) => {
  const { sv_ip, slug } = req.query;
  let no_uid = [];
  try {
    if (!sv_ip) return res.json({ status: false, msg: "no_query_sv_ip" });

    const servers = await Servers.findAll({
      raw: true,
      attributes: ["uid"],
      where: {
        type: { [Op.or]: ["download", "dlv2"] },
      },
    });
    if (servers.length) {
      servers.forEach((el, index) => {
        let { uid } = el;
        if (!no_uid.includes(uid) && uid != 0) {
          no_uid.push(uid);
        }
      });
    }
    // เช็คเซิฟว่าง
    const server = await Servers.findOne({
      raw: true,
      where: {
        sv_ip: sv_ip,
        active: 1,
        work: 0,
      },
    });

    if (!server) return res.json({ status: false, msg: "server_is_busy" });
    if (!server?.folder)
      return res.json({ status: false, msg: "not_conf_folder" });

    let file_where = {};

    if (server?.uid) {
      file_where.uid = server?.uid;
    } else if (!server?.uid && no_uid.length > 0) {
      file_where.uid = { [Op.notIn]: no_uid };
    }

    file_where.status = 0;
    file_where.active = 1;
    file_where.e_code = 0;
    file_where.type = { [Op.or]: ["gdrive", "direct"] };

    let file_limit = servers.length;

    await timeSleep(1);

    const files = await Files.findAll({
      where: file_where,
      order: [["createdAt", "DESC"]],
      limit: file_limit,
    });

    if (!files.length) {
      return res.json({ status: false, msg: `files_not_empty`, e: 1 });
    }

    const number = Math.floor(Math.random() * files.length);
    let file = files[number];

    if (!file?.slug)
      return res.json({ status: false, msg: `files_not_empty`, e: 2 });

    let process_data = {};
    process_data.uid = file?.uid;
    process_data.sid = server?.id;
    process_data.fid = file?.id;
    process_data.type = "dlv2";
    process_data.slug = file?.slug;
    process_data.quality = "all";
    const create = await Progress.create(process_data);

    if (!create?.id) return res.json({ status: false, msg: `db_false` });

    await Servers.update(
      { work: 1 },
      {
        where: { id: process_data.sid },
        silent: true,
      }
    );
    await Files.update(
      { status: 1, e_code: 1 },
      {
        where: { id: process_data.fid },
        silent: true,
      }
    );

    shell.exec(
      `sudo bash ${global.dir}/shell/download.sh ${slug}`,
      { async: false, silent: false },
      function (data) {}
    );

    return res.json({
      status: true,
      msg: "start_download",
      slug: file?.slug,
    });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
