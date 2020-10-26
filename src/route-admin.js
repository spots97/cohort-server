// Copyright Jacob Niedzwiecki, 2019
// Released under the MIT License (see /LICENSE)

const express = require('express')
const router = express.Router()

// For web client to open up in browser "audience" device on the admin site
router.get('/join/occasions/:occasionId',(req, res) => {
  res.redirect(302,`/admin?join&occasions=${req.params.occasionId}`);
})

module.exports = router