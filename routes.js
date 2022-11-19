"use strict";
const express = require("express");
const router = express.Router();

router.all("/", (req, res) =>
  res.status(200).json({ status: true, msg: "welcom to zembed.xyz" })
);

router.get("/run", require("./controllers/run"));
router.get("/dl/run", require("./controllers/dl.run"));

router.all("/rename", require("./controllers/rename"));

router.get("/start", require("./controllers/dlv2.start"));
router.get("/data", require("./controllers/dlv2.data"));
router.get("/status", require("./controllers/dlv2.status"));
router.get("/backup", require("./controllers/dlv2.backup"));
router.get("/done", require("./controllers/dlv2.done"));
router.get("/error", require("./controllers/dlv2.error"));

//add token gdrive
router.get("/gdrive/token", require("./controllers/gdrive.token"));

//server
router.get("/server/create", require("./controllers/server.create"));
//gdrive info
router.get("/gdrive/info", require("./controllers/gdrive.info"));

router.all("*", function (req, res) {
  res.status(404).json({ status: false, msg: "page not found" });
});
module.exports = router;
