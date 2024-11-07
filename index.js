const express = require("express");
const path = require("path");
const app = express();
const port = 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

app.all("*", (req, res) => {
  res.status(404).send("Page not found");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "0home.html"));
});

app.get("/about", (req,res)=>{
  res.sendFile(path.join(__dirname, "views", "0home_about.html"));
});

app.get("/contact", (req,res)=>{
  res.sendFile(path.join(__dirname, "views", "0home_contact.html"));
});

// Student routes ...............................................................

app.get("/student/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "1student_signup.html"));
});

app.get("/student/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "1student_login.html"));
});

app.post("/student/login", (req, res) => {
  res.redirect("/student/form");
});

app.get("/student/form", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "1googleform.html"));
});

app.get("/student/form-submitted", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "1googleform_submitted.html"));
});

app.post("/student/form", (req, res) => {
  let groupDetails = req.body;
  res.redirect("/student/form-submitted");
});

app.get("/student/dashboard/:groupId", (req, res) => {
  let { groupId } = req.params;
  let data = {
    projectTitle: "Student Project Management System",
    faculty: "Dr. Shrikant Salve",
  };
  res.render("1student_dashboard.ejs", { data, groupId });
});

// Staff Routes ...............................................................

app.get("/staff/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "2staff_signup.html"));
});

app.get("/staff/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "2staff_login.html"));
});

app.post("/staff/login", (req, res) => {
  res.redirect("/staff/dashboard");
});

app.get("/staff/dashboard", (req, res) => {
  let staffName = "Mr. Anurag Kawade";
  let data = [
    {
      groupNo: 1,
      projectTitle: "e-Commerce Website",
      studentName: ["Ryan", "Tony", "Paul", "Ben"],
    },
    {
      groupNo: 2,
      projectTitle: "Healthcare Website",
      studentName: ["Adam", "Eve", "Charlie", "Drake"],
    },
    {
      groupNo: 3,
      projectTitle: "Hotel Website",
      studentName: ["John", "Emily", "William", "Hughie"],
    },
    {
      groupNo: 4,
      projectTitle: "Food Delivery App",
      studentName: ["Sarah", "David", "Sophia", "James"],
    },
    {
      groupNo: 5,
      projectTitle: "Social Media Platform",
      studentName: ["Mia", "Lucas", "Isabella", "Elijah"],
    },
    {
      groupNo: 6,
      projectTitle: "Online Learning Platform",
      studentName: ["Anna", "Michael", "Olivia", "Daniel"],
    },
  ];
  res.render("2staff_dashboard.ejs", { data, staffName });
});

app.get("/staff/dashboard/group/:groupId", (req, res) => {
  let { groupId } = req.params;
  let facultyName = "Dr. Shrikant Salve";
  let data = [
    {
      groupNo: 1,
      projectTitle: "e-Commerce Website",
      studentName: ["Ryan", "Tony", "Paul", "Ben"],
    },
    {
      groupNo: 2,
      projectTitle: "Healthcare Website",
      studentName: ["Adam", "Eve", "Charlie", "Drake"],
    },
    {
      groupNo: 3,
      projectTitle: "Hotel Website",
      studentName: ["John", "Emily", "William", "Hughie"],
    },
    {
      groupNo: 4,
      projectTitle: "Food Delivery App",
      studentName: ["Sarah", "David", "Sophia", "James"],
    },
    {
      groupNo: 5,
      projectTitle: "Social Media Platform",
      studentName: ["Mia", "Lucas", "Isabella", "Elijah"],
    },
    {
      groupNo: 6,
      projectTitle: "Online Learning Platform",
      studentName: ["Anna", "Michael", "Olivia", "Daniel"],
    },
  ];
  res.render("2staff_group_dashboard.ejs", { data, groupId, facultyName });
});

// Faculty routes .............................................................

app.get("/faculty/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "3faculty_login.html"));
});

app.post("/faculty/login", (req, res) => {
  res.redirect("/faculty/dashboard/existing");
});

let facultyName = "Dr. Shrikant Salve";
let data = [
  {
    groupNo: 1,
    projectTitle: "AI-Based Healthcare Assistant",
    studentName: ["Alice", "Bob", "Charlie", "David"],
    sem: "B5",
  },
  {
    groupNo: 2,
    projectTitle: "Smart Traffic Management System",
    studentName: ["Eva", "Fay", "Grace", "Hank"],
    sem: "B5",
  },
  {
    groupNo: 3,
    projectTitle: "IoT Home Automation",
    studentName: ["Mona", "Nina", "Oscar", "Paul"],
    sem: "B5",
  },
  {
    groupNo: 4,
    projectTitle: "Virtual Reality in Education",
    studentName: ["Quinn", "Rita", "Steve", "Tina"],
    sem: "B5",
  },

  {
    groupNo: 5,
    projectTitle: "Voice-Based Personal Assistant",
    studentName: ["Yara", "Zane", "Amira", "Bryan"],
    sem: "B6",
  },
  {
    groupNo: 6,
    projectTitle: "Autonomous Drone Delivery System",
    studentName: ["Clara", "Derek", "Ella", "Finn"],
    sem: "B6",
  },
  {
    groupNo: 7,
    projectTitle: "Smart Agriculture Monitoring System",
    studentName: ["Perry", "Quinn", "Ralph", "Seth"],
    sem: "B6",
  },

  {
    groupNo: 8,
    projectTitle: "AI-Based Financial Forecasting",
    studentName: ["Xander", "Yasmine", "Zack", "Anna"],
    sem: "B7",
  },
  {
    groupNo: 9,
    projectTitle: "Augmented Reality for Shopping",
    studentName: ["Bob", "Chris", "David", "Eva"],
    sem: "B7",
  },

  {
    groupNo: 10,
    projectTitle: "Energy Optimization in Smart Grids",
    studentName: ["Victor", "Wendy", "Xena", "Yasmin"],
    sem: "B8",
  },
  {
    groupNo: 11,
    projectTitle: "AI-Powered Recommendation System",
    studentName: ["Zara", "Aaron", "Bella", "Charlie"],
    sem: "B8",
  },
  {
    groupNo: 12,
    projectTitle: "Facial Recognition Attendance System",
    studentName: ["Hank", "Ivy", "Jackie", "Liam"],
    sem: "B8",
  },
  {
    groupNo: 13,
    projectTitle: "Healthcare Monitoring System",
    studentName: ["Mona", "Nina", "Oscar", "Paul"],
    sem: "B8",
  },

  {
    groupNo: 14,
    projectTitle: "AI for Predictive Analytics in Marketing",
    studentName: ["Yara", "Zane", "Amira", "Bryan"],
    sem: "M3",
  },
  {
    groupNo: 15,
    projectTitle: "Smart Waste Management System",
    studentName: ["Clara", "Derek", "Ella", "Finn"],
    sem: "M3",
  },
  {
    groupNo: 16,
    projectTitle: "Blockchain-Based Voting System",
    studentName: ["George", "Helen", "Isaac", "Jackie"],
    sem: "M3",
  },
];

app.get("/faculty/dashboard/existing", (req, res) => {
  let { groupId } = req.params;
  res.render("3faculty_existing_groups.ejs", { data, groupId, facultyName });
});

app.get("/faculty/dashboard/existing/group/:groupId", (req, res) => {
  let { groupId } = req.params;
  res.render("3faculty_group_dashboard.ejs", { data, groupId, facultyName });
});

app.get("/faculty/dashboard/unallocated", (req, res) => {
    let {groupId} = req.params;
    let data2 = [
        {
          groupNo: 1,
          projectTitle: "AI-Driven Mental Health Analysis",
          studentName: ["Aiden", "Bella", "Connor", "Diana"],
          sem: "B5",
        },
        {
          groupNo: 2,
          projectTitle: "Automated Disaster Response System",
          studentName: ["Ethan", "Fiona", "Gavin", "Holly"],
          sem: "B5",
        },
        {
          groupNo: 3,
          projectTitle: "Smart Water Quality Monitoring",
          studentName: ["Ivy", "Jason", "Kendrick", "Leah"],
          sem: "B6",
        },
        {
          groupNo: 4,
          projectTitle: "AI-Powered Tutoring System",
          studentName: ["Mason", "Nina", "Owen", "Peyton"],
          sem: "B6",
        },
        {
          groupNo: 5,
          projectTitle: "Edge Computing for IoT Devices",
          studentName: ["Quincy", "Rita", "Sean", "Tara"],
          sem: "B7",
        },
        {
          groupNo: 6,
          projectTitle: "Smart Wearables for Health Monitoring",
          studentName: ["Uma", "Vince", "Willow", "Xander"],
          sem: "B7",
        },
        {
          groupNo: 7,
          projectTitle: "AI in Personalized Learning",
          studentName: ["Yara", "Zach", "Aria", "Blake"],
          sem: "M3",
        },
      ];      
  res.render("3faculty_to_be_allocated_groups.ejs", {data2,groupId,facultyName});
});

app.get("/faculty/dashboard/unallocated/group/:groupId", (req, res) => {
  res.render("3faculty_group_details.ejs", { groupId });
});

// Admin Routes ...............................................................

app.get("/admin/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "4admin_login.html"));
});

app.post("/admin/login", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.get("/admin/dashboard", (req, res) => {
  res.render("4admin_dashboard.ejs");
});

app.get("/admin/add_student", (req, res) => {
  res.render("4admin_add_student.ejs");
});

app.get("/admin/add_faculty", (req, res) => {
  res.render("4admin_add_faculty.ejs");
});

app.get("/admin/add_staff", (req, res) => {
  res.render("4admin_add_staff.ejs");
});

app.get("/admin/allocate_faculty", (req, res) => {
  res.render("4admin_allocate_faculty.ejs");
});

app.get("/admin/search", (req, res) => {
  res.render("4admin_search.ejs");
});

// Admin Post requests .........................................................

app.post("/admin/add_student", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.post("/admin/add_faculty", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.post("/admin/add_staff", (req, res) => {
  res.redirect("/admin/dashboard");
});

app.post("/admin/allocate_faculty", (req, res) => {
  res.redirect("/admin/dashboard");
});

// After logout .....................................................................

app.get("/logout", (req, res) => {
  res.redirect("/home");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
