module.exports.isFacultyAuthenticated = (req, res, next) => {
  if (req.session && req.session.faculty) {
    // Validate if the facultyId in session matches the one in URL
    if (req.params.facultyId && req.session.faculty.faculty_id == req.params.facultyId) {
      return next();
    } else {
      return res.status(403).send("Unauthorized access.");
    }
  } else {
    return res.redirect("/faculty/login");
  }
};
