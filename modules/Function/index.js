"use strict";
const request = require("request");
const queryString = require("query-string");
const User = require("../Mysql/Users");
const Files = require("../Mysql/Files");
const UserSettings = require("../Mysql/Users.settings");
const Settings = require("../Mysql/Settings");
const fs = require("fs");

exports.timeSleep = async (sec) => {
  if (!sec) {
    sec = Math.floor(Math.random() * 10);
  }
  return new Promise((rs) => setTimeout(rs, sec * 1000));
};

exports.SettingValue = async (e) => {
  let data = [];
  try {
    const result = await Settings.findAll({
      raw: true,
      attributes: { exclude: ["id", "createdAt", "updatedAt"] },
    });
    return new Promise(function (resolve, reject) {
      if (e) {
        for (var key in result) {
          let name = result[key].name;
          let value = result[key].value;
          data[name] = value;
        }
        resolve(data);
      } else {
        resolve(result);
      }
    });
  } catch (error) {
    data["status"] = false;
    data["msg"] = error.message;
    return data;
  }
};
exports.ExistsUsersName = async (username) => {
  let data = {};
  try {
    const result = await User.findOne({ where: { username: username } });
    if (result) {
      //has users
      data.status = true;
      data.result = result;
    } else {
      data.status = false;
      data.msg = "not found";
    }
  } catch (error) {
    data.status = false;
    data.msg = error.message;
  }
  return data;
};
exports.ExistsEmail = async (email) => {
  let data = {};
  try {
    const result = await User.findOne({ where: { email: email } });
    if (result) {
      //has users
      data.status = true;
      data.result = result;
    } else {
      data.status = false;
      data.msg = "not found";
    }
  } catch (error) {
    data.status = false;
    data.msg = error.message;
  }
  return data;
};
exports.ExistsDir = async (title, uid) => {
  let data = {};
  try {
    const result = await Files.findOne({
      where: { title: title, type: "0f", uid: uid },
    });
    if (result) {
      data.status = true;
      data.result = result;
    } else {
      data.status = false;
      data.msg = "not found";
    }
  } catch (error) {
    data.status = false;
    data.msg = error.message;
  }
  return data;
};

exports.ExistsLinks = async (uid, type, source) => {
  let data = {};
  try {
    const result = await Files.findOne({
      where: { uid: uid, type: type, source: source },
    });
    if (result) {
      data.status = true;
      data.result = result;
    } else {
      data.status = false;
      data.msg = "not found";
    }
  } catch (error) {
    data.status = false;
    data.error = true;
    data.msg = error.message;
  }
  return data;
};
exports.FindDir = async (slug) => {
  let data = {};
  try {
    const result = await Files.findOne({ where: { type: "0f", slug: slug } });
    if (result) {
      data.status = true;
      data.result = result;
    } else {
      data.status = false;
      data.msg = "not found";
    }
  } catch (error) {
    data.status = false;
    data.msg = error.message;
  }
  return data;
};
exports.UserAgent = () => {
  return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.122 Safari/537.36";
};

exports.GenerateID = (
  length = 6,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
) => {
  var result = "";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

exports.getPagination = (page, totalItem, limitItem = 10) => {
  const currentPage = page ? page : 1;
  const totalPages = Math.ceil(totalItem / limitItem);

  const start_rows = currentPage == 1 ? 0 : (currentPage - 1) * limitItem;
  const end_rows = limitItem;
  return { totalPages, start_rows, end_rows };
};

exports.SourceAllow = async (source) => {
  const matchGoogleDrive =
    /(?:https?:\/\/)?(?:[\w\-]+\.)*(?:drive|docs)\.google\.com\/(?:(?:folderview|open|uc)\?(?:[\w\-\%]+=[\w\-\%]*&)*id=|(?:folder|file|document|presentation)\/d\/|spreadsheet\/ccc\?(?:[\w\-\%]+=[\w\-\%]*&)*key=)([\w\-]{28,})/i;
  const matchMP4 = /([\w\-]{1,200})\.(mp4)$/i;
  const setData = {};
  setData.allow = true;

  if (matchGoogleDrive.test(source)) {
    const match = source.match(matchGoogleDrive);
    setData.gid = match[1];
    setData.type = "gdrive";
    setData.source = `${match[1]}`;
  } else if (matchMP4.test(source)) {
    const match = source.match(matchMP4);
    setData.title = match[1];
    setData.type = "direct";
    setData.allow = false;
    setData.source = source;
  } else {
    setData.allow = false;
  }
  return setData;
};

exports.getDatagDrive = async (gid) => {
  const data = {};
  const url = `https://docs.google.com/get_video_info?docid=${gid}`;

  return new Promise(function (resolve, reject) {
    request(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        const parsed = queryString.parse(response.body);
        /*if(parsed?.title){
          data.title = parsed?.title
        }
        if(parsed?.public){
          data.public = parsed?.public
        }*/
        resolve(parsed);
      } else {
        reject();
      }
    });
  });
};
exports.GoogleAuth = async () => {
  const data_reload = {
    client_id:
      "140306668241-aqpt35s7vnu1s7enoachnetl534qa06i.apps.googleusercontent.com",
    client_secret: "0ttwlBgybdxgn6fAt1DG9-A_",
    refresh_token:
      "1//04J8KtM8B2XIkCgYIARAAGAQSNwF-L9IrvddWNG4K1Kgl_qQ9f5ZXSGIQCOWnI-i6oXTxMVjEDx2nHGGFj-XDZEdpy0j8OkmGfyQ",
    grant_type: "refresh_token",
  };

  let tem_access_token = `${__dirname}/access_token.json`;

  if (fs.existsSync(tem_access_token)) {
    let data_cache = await fs.readFileSync(tem_access_token, "utf8");
    const parsed = JSON.parse(data_cache);
    const datenow = Math.floor(Date.now() / 1000);

    if (datenow - parsed?.date < 3500) {
      return parsed;
    }
  }

  const body = "";
  const url = "https://www.googleapis.com/oauth2/v4/token";
  return new Promise(function (resolve, reject) {
    request.post(url, { form: data_reload }, function (err, response, body) {
      const parsed = JSON.parse(response.body);
      delete parsed.expires_in;
      delete parsed.scope;
      parsed.date = Math.floor(Date.now() / 1000);

      fs.writeFileSync(tem_access_token, JSON.stringify(parsed), "utf8");
      resolve(parsed);
    });
  });
};
exports.getSourceGdrive = async (gid) => {
  const data = {};
  const url = `https://docs.google.com/get_video_info?docid=${gid}`;
  let token = await this.GoogleAuth();

  return new Promise(function (resolve, reject) {
    request(
      {
        url,
        proxy: "http://qjqkvcqd-rotate:72gpvbukvn4v@p.webshare.io:80",
        headers: {
          Authorization: `${token?.token_type} ${token?.access_token}`,
        },
      },
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
          const parsed = queryString.parse(response.body);
          data.status = parsed.status;
          if (parsed.status == "ok") {
            data.title = parsed.title;

            if (parsed.fmt_stream_map) {
              const fmt_stream_map = parsed.fmt_stream_map.split(",");
              fmt_stream_map.forEach((k, i) => {
                const [q, link] = k.split("|");
                const size = q
                  .toString()
                  .replace(37, 1080)
                  .replace(22, 720)
                  .replace(59, 480)
                  .replace(18, 360);
                if (size == 1080) {
                  data.file_1080 = link;
                }
                if (size == 720) {
                  data.file_720 = link;
                }
                if (size == 480) {
                  data.file_480 = link;
                }
                if (size == 360) {
                  data.file_360 = link;
                }
              });
            }
            data.cookie = JSON.stringify(response.headers["set-cookie"]);
            data.date = new Date();
          } else {
            data.error_code = parsed.errorcode;
            data.error_text = parsed.reason;
            //console.log(parsed)
          }
          resolve(data);
        } else {
          data.status = false;
        }
      }
    );
  });

  return data;
};