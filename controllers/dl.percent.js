"use strict";

const path = require("path");
const shell = require("shelljs");
const fs = require("fs");

module.exports = async (req, res) => {
  const { slug, quality } = req.query;

  try {
    if (!slug || !quality)
      return res.json({ status: false, msg: "not_data_backup" });

    // Get backup gid
    let tmp = `${global.dir}/public/${slug}/up_${slug}_file_${quality}.txt`;
    let matchGid = /Uploaded ([\w\-]{28,}) at/i;
    const Read = fs.readFileSync(tmp, "utf8");

    console.log(Read)

    return res.json({ status: true  });
  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
