const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/0home.html"));
});

router.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/0home_about.html"));
});

router.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/0home_contact.html"));
});

router.get("/logout", (req, res) => {
  res.redirect("/home");
});

module.exports = router;
