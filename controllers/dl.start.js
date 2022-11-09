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
  let in_uid = [];
  try {
    if (!sv_ip) return res.json({ status: false, msg: "no_query_sv_ip" });
    let {
      dl_status,
      dl_dl_by,
      dl_dl_sort,
      dl_auto_cancle,
      dl_focus_uid,
      dl_v2_uid,
    } = await SettingValue(true);

    /*
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
    }*/

    if (dl_v2_uid) {
      in_uid = dl_v2_uid.split(",");
    }

    const count = await Servers.count({
      raw: true,
      attributes: ["uid"],
      where: {
        type: { [Op.or]: ["download", "dlv2"] },
      },
    });
    // เช็คเซิฟว่าง
    const server = await Servers.findOne({
      raw: true,
      where: {
        sv_ip: sv_ip,
        type: "dlv2",
        active: 1,
        work: 0,
      },
    });

    if (!server) {
      //เช็ค process file
      if (dl_auto_cancle) {
        const sv = await Servers.findOne({
          where: { sv_ip: sv_ip, type: "dlv2" },
          raw: true,
          attributes: ["id"],
        });
        if (sv?.id) {
          let ovdl = await Progress.findOne({
            where: {
              sid: sv?.id,
              type: "dlv2",
              [Op.and]: Sequelize.literal(
                `ABS(TIMESTAMPDIFF(SECOND , updatedAt , NOW())) >= ${
                  dl_auto_cancle * 2
                }`
              ),
            },
            raw: true,
          });
          if (ovdl) {
            shell.exec(
              `sudo rm -rf ${global.dir}/public/${ovdl?.slug}/`,
              { async: false, silent: false },
              function (data) {}
            );
            //update files
            await Files.update(
              { status: 0, e_code: 333 },
              {
                where: { id: ovdl.fid },
                silent: true,
              }
            );
            // delete process
            await Progress.destroy({ where: { id: ovdl?.id } });

            await Servers.update(
              { work: 0 },
              {
                where: { id: sv?.id },
                silent: true,
              }
            );
            await timeSleep();

            shell.exec(
              `bash ${global.dir}/shell/run.sh`,
              { async: false, silent: false },
              function (data) {}
            );
          }
        }
      }

      return res.json({ status: false, msg: "server_is_busy" });
    }
    // check status all
    if (dl_status != 1)
      return res.json({ status: false, msg: `status_inactive` });

    if (!server?.folder)
      return res.json({ status: false, msg: "not_conf_folder" });

    let file_where = {};

    if (!server?.uid && in_uid.length > 0) {
      file_where.uid = { [Op.or]: in_uid };
    } else if (server?.uid) {
      file_where.uid = server?.uid;
    } else {
      return res.json({ status: false, msg: "not_uid_v2" });
    }

    file_where.status = 0;
    file_where.active = 1;
    file_where.e_code = 0;
    file_where.type = { [Op.or]: ["gdrive", "direct"] };

    let file_limit = count;

    let set_order = [[Sequelize.literal("RAND()")]];

    if (dl_dl_sort && dl_dl_by) {
      let order_sort = dl_dl_sort == "asc" ? "ASC" : "DESC";
      let order_by = "createdAt";
      switch (dl_dl_by) {
        case "size":
          order_by = "filesize";
          break;
        case "view":
          order_by = "views";
          break;
        case "update":
          order_by = "viewedAt";
          break;
        case "viewat":
          order_by = "updatedAt";
          break;
      }

      set_order = [[order_by, order_sort]];
    }

    //console.log("start", sv_ip);
    await timeSleep(1);

    const files = await Files.findAll({
      where: file_where,
      order: set_order,
      limit: file_limit,
    });

    if (!files.length) {
      console.log(file_where)
      return res.json({ status: false, msg: `files_not_empty`, e: 1 });
    }

    const number = Math.floor(Math.random() * files.length);
    let file = files[number];

    if (!file?.slug)
      return res.json({ status: false, msg: `files_not_empty`, e: 2 });

    //console.log("slug", file?.slug);
    let process_data = {};

    process_data.quality = "default";

    if (file?.type == "gdrive") {
      let source = await getSourceGdrive(file);
      //console.log("source", source);
      if (source?.status == "ok") {
        let allow = ["file_1080", "file_720", "file_480", "file_360"];
        let quality = [];

        for (const key in allow) {
          let q = allow[key];
          if(!quality.length){
            if (source[q] !== undefined) {
              quality.push(q.split("file_")[1]);
            }
          }
        }

        if (quality.length > 0) {
          //console.log(quality)
          process_data.quality = quality.join(",");
        }
      } else {
        return res.json({
          status: false,
          msg: "gdrive not data",
        });
      }
    }

    process_data.uid = file?.uid;
    process_data.sid = server?.id;
    process_data.fid = file?.id;
    process_data.type = "dlv2";
    process_data.slug = file?.slug;
    //return res.json({ status: false, msg: process_data });
    //return res.json({ status: false, msg: `test_done` , uid : file?.uid  });
    const create = await Progress.create(process_data);

    if (!create?.id) return res.json({ status: false, msg: `db_false`});

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
    await timeSleep(2);

    shell.exec(
      `sudo bash ${global.dir}/shell/download.sh ${file?.slug}`,
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
