"use strict";

const path = require("path");
const fs = require("fs");
const Files = require("../modules/Mysql/Files");
const Servers = require("../modules/Mysql/Servers");
const Progress = require("../modules/Mysql/Progress");
const { Sequelize, Op } = require("sequelize");
const shell = require("shelljs");
const { SettingValue, getSourceGdrive } = require("../modules/Function");

module.exports = async (req, res) => {
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
      attributes: ["folder"],
      where: { id: pc?.sid },
    });

    if (file?.type == "gdrive") {
      let source = await getSourceGdrive(file?.source);
      if (source?.status == "ok") {
        source.status = true;
        source.ext = "mp4";
        source.speed = 30;
        if (source?.cookie) {
          source.cookie = source?.cookie
            .replace('","', ";")
            .replace('["', "")
            .replace('"]', "");
        }
        return res.json({ ...source, ...sv });
      } else {
        return res.json({
          status: false,
          msg: "gdrive_not_data",
        });
      }
    } else if (file?.type == "direct") {
      let data = {};
      data.status = true;
      data.title = "default";
      data.ext = "mp4";
      data.speed = 30;
      data.file_default = file?.source;
      return res.json({ ...data, ...sv });
    }

    console.log("slug", slug);
    /* let source = await getSourceGdrive(file?.source);
    if (source?.status == "ok") {
      if (source?.cookie) {
        source.cookie = source?.cookie
          .replace('","', ";")
          .replace('["', "")
          .replace('"]', "");
      }
      let allow = ["file_1080", "file_720", "file_480", "file_360"];

      for (const key in allow) {
        let q = allow[key];
        if (source[q] != "" || source[q] != null || source[q] != undefined) {
          let code = `axel -H "Cookie: ${source.cookie}" -n 30 -o "${global.dir}/${file?.slug}_${q}.mp4" "${source[q]}"`;
          shell.exec(code, { async: false, silent: false }, function (data) {
            console.log(data);
          });
        }
      }

      return res.json(source);
    } else {
      return res.json({
        status: false,
        msg: "file_not_date",
        source,
        gid: file?.source,
      });
    }*/
    return res.json({
      status: true,
      file,
    });
  } catch (error) {
    console.log(error);
    return res.json({ status: false, msg: error.name });
  }
};
