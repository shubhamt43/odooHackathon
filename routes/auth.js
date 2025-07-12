const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const User = require('../models/user');
const multer = require('multer');
const path = require('path');

// ✅ Multer config for photo uploads

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
// ✅ Register page
router.get('/register', (req, res) => {
  res.render('register', { errors: [] });
});

// ✅ Login page
router.get('/login', (req, res) => res.render('login'));

// ✅ Register handle
router.post('/register', (req, res) => {
  const { email, password, password2 } = req.body;
  let errors = [];

  if (!email || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('register', { errors, email, password, password2 });
  } else {
    User.findOne({ email: email }).then(user => {
      if (user) {
        errors.push({ msg: 'Email already exists' });
        res.render('register', { errors, email, password, password2 });
      } else {
        const newUser = new User({ email, password });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;

            newUser.password = hash;
            newUser.save()
              .then(() => {
                req.flash('success_msg', 'You are now registered and can log in');
                res.redirect('/login');
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// ✅ Login handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
  })(req, res, next);
});

// ✅ Dashboard (GET)
router.get('/dashboard', ensureAuthenticated, (req, res) => {
  res.render('dashboard', { user: req.user });
});

// ✅ Dashboard (POST) — YOU MUST add this!
router.post('/dashboard', ensureAuthenticated, upload.single('profilePhoto'), async (req, res) => {
  const { name, location, skillsOffered, skillsWanted, availability, isPublic } = req.body;

  const update = {
    name,
    location,
    skillsOffered: skillsOffered.split(',').map(s => s.trim()),
    skillsWanted: skillsWanted.split(',').map(s => s.trim()),
    availability,
    isPublic: isPublic === 'on'
  };

  if (req.file) {
    update.profilePhoto = '/uploads/' + req.file.filename;
  }

  await User.findByIdAndUpdate(req.user._id, update);

  req.flash('success_msg', 'Profile updated!');
  res.redirect('/dashboard');
});

// ✅ Dummy user creation with photo upload
router.post('/new', ensureAuthenticated, upload.single('profilePhoto'), async (req, res) => {
  const { name, email, skillsOffered, skillsWanted, availability, isPublic } = req.body;

  const newUser = new User({
    name,
    email,
    skillsOffered: skillsOffered.split(',').map(s => s.trim()),
    skillsWanted: skillsWanted.split(',').map(s => s.trim()),
    availability,
    isPublic: isPublic === 'on',
    profilePhoto: req.file ? '/uploads/' + req.file.filename : '/uploads/default.png',
    password: 'dummy1234' // Or hash if you want, or skip
  });

  await newUser.save();
  req.flash('success_msg', 'Dummy user created!');
  res.redirect('/');
});

// ✅ Protect routes middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error_msg', 'Please log in to view that resource');
  res.redirect('/login');
}

module.exports = router;
