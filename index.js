const express = require("express");
const path = require("path");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = process.env.PORT || 8080;
const flash = require('express-flash');
const session = require("express-session");
const sharedsession = require("express-socket.io-session");

const db = require("./utils/db");

// Session Middleware Setup
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key_longer', // USE A STRONG ENV VARIABLE
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        // sameSite: 'lax'
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
});

app.use(sessionMiddleware);
io.use(sharedsession(sessionMiddleware, { autoSave: true }));

// Standard Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/modules/emoji-picker-element', express.static(path.join(__dirname, 'node_modules/emoji-picker-element')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(flash());

// Setup res.locals
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');

    // Clear previous user type/id
    res.locals.userType = null;
    res.locals.userId = null;
    res.locals.studentUser = null;
    res.locals.facultyUser = null;
    res.locals.staffUser = null; // Add staff user local

    // Set current user details based on session
    if (req.session.student) {
        res.locals.studentUser = req.session.student;
        res.locals.userType = 'student';
        res.locals.userId = req.session.student.student_id;
    } else if (req.session.faculty) {
        res.locals.facultyUser = req.session.faculty;
        res.locals.userType = 'faculty';
        res.locals.userId = req.session.faculty.faculty_id;
    } else if (req.session.staff) {
        res.locals.staffUser = req.session.staff;
        res.locals.userType = 'staff';
        res.locals.userId = req.session.staff.staff_id;
    }
    
    next();
});

// View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Store IO instance
app.locals.io = io;

// Import Routes
const studentRoutes = require("./routes/studentRoutes");
const staffRoutes = require("./routes/staffRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const adminRoutes = require("./routes/adminRoutes");
const generalRoutes = require("./routes/index");
const chatRoutes = require("./routes/chatRoutes");

// Use Routes
app.use("/", generalRoutes);
app.use("/student", studentRoutes);
app.use("/staff", staffRoutes);
app.use("/faculty", facultyRoutes);
app.use("/admin", adminRoutes);
app.use("/chat", chatRoutes);

// Socket.IO Handler
require('./socketHandler')(io, db);

// Centralized Error Handling
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err);
    res.status(err.status || 500).render('shared/error', {
         errorMessage: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message
    });
});

// 404 Handler
app.use((req, res, next) => {
    res.status(404).render('shared/404'); // Create a views/shared/404.ejs file
});

// Start Server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});