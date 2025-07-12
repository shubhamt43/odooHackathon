const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Request = require('../models/request'); // Make sure you have this model!

// ✅ Protect routes
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash('error_msg', 'Please log in to view that resource');
  res.redirect('/login');
}

// ✅ GET request form
router.get('/:id', ensureAuthenticated, async (req, res) => {
  const recipient = await User.findById(req.params.id);
  if (!recipient) {
    req.flash('error_msg', 'User not found.');
    return res.redirect('/');
  }
  res.render('request', { recipient, user: req.user });
});

// ✅ POST request form
router.post('/:id', ensureAuthenticated, async (req, res) => {
  const recipient = await User.findById(req.params.id);
  if (!recipient) {
    req.flash('error_msg', 'User not found.');
    return res.redirect('/');
  }

  const { message } = req.body;

  // Save request
  const newRequest = new Request({
    sender: req.user._id,
    recipient: recipient._id,
    message: message
  });

  await newRequest.save();
  req.flash('success_msg', 'Request sent!');
  res.redirect('/');
});

module.exports = router;
