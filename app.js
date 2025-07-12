const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer'); // ✅ multer added

const User = require('./models/user');

const app = express();

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/skillswap')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// EJS
app.set('view engine', 'ejs');

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Flash
app.use(flash());

// Global flash vars
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Passport config
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  User.findOne({ email: email })
    .then(user => {
      if (!user) return done(null, false, { message: 'That email is not registered' });

      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) throw err;
        if (isMatch) return done(null, user);
        else return done(null, false, { message: 'Password incorrect' });
      });
    })
    .catch(err => console.log(err));
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// ✅ Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });


// Routes
app.use('/', require('./routes/auth'));
const profileRoutes = require('./routes/profile');
app.use('/profile', profileRoutes);

const requestRoutes = require('./routes/request');
app.use('/request', requestRoutes);

// Home route
app.get('/', async (req, res) => {
  const { availability, search } = req.query;
  const page = parseInt(req.query.page) || 1;

  let query = { isPublic: true };

  if (availability) query.availability = availability;

  if (search) {
    query.$or = [
      { skillsOffered: { $regex: search, $options: 'i' } },
      { skillsWanted: { $regex: search, $options: 'i' } }
    ];
  }

  const limit = 8;
  const skip = (page - 1) * limit;

  const total = await User.countDocuments(query);
  const totalPages = Math.ceil(total / limit);
  const users = await User.find(query).skip(skip).limit(limit).lean();

  res.render('home', {
    users,
    user: req.user || null,
    totalPages,
    currentPage: page,
    availability: availability || '',
    search: search || '',
  });
});

// Show dummy user creation form
app.get('/users/new', (req, res) => {
  res.render('new');
});

// ✅ Handle dummy user creation with file upload
app.post('/users', upload.single('profilePhoto'), async (req, res) => {
  const { name, email, skillsOffered, skillsWanted, availability } = req.body;
  const profilePhotoPath = req.file ? '/uploads/' + req.file.filename : '/uploads/default.png';

  const newUser = new User({
    name,
    email,
    profilePhoto: profilePhotoPath,
    skillsOffered: skillsOffered.split(',').map(s => s.trim()),
    skillsWanted: skillsWanted.split(',').map(s => s.trim()),
    availability
  });

  await newUser.save();
  res.redirect('/');
});

// Logout route
app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

const port = 7000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



