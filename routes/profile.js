const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Review = require('../models/review');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// View profile
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  const reviews = await Review.find({ user: req.params.id }).populate('reviewer').lean();

  res.render('profile', {
    profileUser: user,
    reviews: reviews,
    user: req.user || null,
  });
});

// Handle new review
router.post('/:id/review', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  const { content, rating } = req.body;

  const newReview = new Review({
    user: req.params.id,
    reviewer: req.user._id,
    content,
    rating
  });

  await newReview.save();
  res.redirect(`/profile/${req.params.id}`);
});

// ✅ Ensure authenticated middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view that resource');
  res.redirect('/login');
}

router.get('/request/:id', ensureAuthenticated, async (req, res) => {
  const recipient = await User.findById(req.params.id);
  if (!recipient) return res.redirect('/'); // Or show error

  res.render('request-form', { recipient });
});


router.post('/request/:id', ensureAuthenticated, async (req, res) => {
  const { message } = req.body;
  const recipientId = req.params.id;

  // You can create a Request model, but for now just log it:
  console.log(`From: ${req.user.email} to ${recipientId} | Message: ${message}`);

  req.flash('success_msg', 'Request sent!');
  res.redirect('/');
});


// Show the new user form
router.get('/users/new', (req, res) => {
  res.render('new');
});

// Handle dummy user creation
router.post('/users', upload.single('profilePhoto'), async (req, res) => {
  const { name, email, password, skillsOffered, skillsWanted, availability } = req.body;

  // Convert comma-separated skills into arrays
  const newUser = new User({
    name,
    email,
    password,
    skillsOffered: skillsOffered.split(',').map(s => s.trim()),
    skillsWanted: skillsWanted.split(',').map(s => s.trim()),
    availability,
    profilePhoto: req.file ? '/uploads/' + req.file.filename : '/uploads/default.png'
  });

  await newUser.save();
  res.redirect('/');
});




module.exports = router;
