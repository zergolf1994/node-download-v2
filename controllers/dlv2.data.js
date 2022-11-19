"use strict";

const fs = require("fs-extra");
const path = require("path");
const shell = require("shelljs");

const { Servers, Progress, Files } = require("../modules/db");
const { Sequelize, Op } = require("sequelize");
const {
  Settings,
  GetIP,
  WriteLog,
  DownloadTimeOut,
  TimeSleep,
  GoogleDriveSource,
} = require("../modules/utils");

module.exports = async (req, res) => {
  const sv_ip = await GetIP();
  const { slug } = req.query;

  try {
    if (!slug) return res.json({ status: false, msg: "not_slug_file" });

    const pc = await Progress.findOne({
      raw: true,
      where: {
        type: "dlv2",
        slug: slug,
      },
    });

    if (!pc) return res.json({ status: false, msg: "not_process_data" });

    const file = await Files.findOne({
      raw: true,
      where: { slug: slug },
    });

    if (!file) return res.json({ status: false, msg: "not_file_data" });

    const sv = await Servers.findOne({
      raw: true,
      attributes: ["folder", "sv_ip"],
      where: { id: pc?.sid },
    });

    if (!sv?.folder) return res.json({ status: false, msg: "not_conf_folder" });

    if (sv?.sv_ip != sv_ip)
      return res.json({ status: false, msg: "sv_ip_not_match" });

    if (file?.type == "gdrive") {
      let gSource = await GoogleDriveSource(file);
      if (gSource?.status == "ok") {
        gSource.status = true;
        gSource.ext = "mp4";
        gSource.speed = 30;
        switch (pc?.quality) {
          case "1080":
            delete gSource.file_720;
            delete gSource.file_480;
            delete gSource.file_360;
            break;
          case "720":
            delete gSource.file_1080;
            delete gSource.file_480;
            delete gSource.file_360;
            break;
          case "480":
            delete gSource.file_1080;
            delete gSource.file_720;
            delete gSource.file_360;
            break;
          case "360":
            delete gSource.file_1080;
            delete gSource.file_720;
            delete gSource.file_480;
            break;

          default:
            break;
        }
        if (gSource?.cookie) {
          gSource.cookie = gSource?.cookie
            .replace('","', ";")
            .replace('["', "")
            .replace('"]', "");
        }
        return res.json({ ...gSource, ...sv, dir: global.dir });
      } else {
        return res.json({
          status: false,
          msg: "gdrive_not_data",
          gSource,
        });
      }
    } else {
      let data = {};
      data.status = true;
      data.title = "default";
      data.ext = "mp4";
      data.speed = 30;
      data.file_default = file?.source;
      return res.json({ ...data, ...sv, dir: global.dir });
    }
  } catch (error) {
    await WriteLog(error);
    return res.json({ status: false, msg: `error` });
  }
};
