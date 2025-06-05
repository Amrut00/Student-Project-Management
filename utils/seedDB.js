const db = require("./db");

// Insert dummy data into tables
const insertDummyData = () => {
    const queries = [
        // Insert dummy students
        // `INSERT INTO Student (first_name, last_name, mis_number, contact_number, email, password, status) 
        //  VALUES 
        //     ('Amrut', 'Pathane', '112215132', '8600947050', '112215132@cse.iiitp.ac.in', 'Amrut@123', 'Pending'),
        //     ('Anurag', 'Kawade', '112215087', '7276570717', '112215087@cse.iiitp.ac.in', 'Anurag@123', 'Pending'),
        //     ('Omkar', 'Dhumal', '112216017', '9665773021', '112216017@ece.iiitp.ac.in', 'Omkar@123', 'Pending'),
        //     ('Samar', 'Mohd', '112215112', '9621972940', '112215112@cse.iiitp.ac.in', 'Samar@123', 'Pending')
        //  ON DUPLICATE KEY UPDATE student_id=student_id;`,

        // Insert dummy faculty
        // `INSERT INTO \`Faculty\` (first_name, last_name, email, phone_number, department, specialization, password) 
        //  VALUES 
        //     ('Ritu', 'Tiwari', 'ritu@iiitp.ac.in', '0000000001', 'Computer Science & Engineering', 'Robotics, Artificial Intelligence, Soft Computing and Applications', 'Ritu@123'),
        //     ('Bhupendra', 'Singh', 'bhupendra@iiitp.ac.in', '9673095708', 'Computer Science & Engineering', 'Digital forensics, Windows forensics, database forensics, and Cyber Security Technologies', 'Bhupendra@123'),
        //     ('Sanjeev', 'Sharma', 'sanjeevsharma@iiitp.ac.in', '6260427101', 'Computer Science & Engineering', 'Soft Computing, Robotics, Biometrics and Nature Inspired Algorithms and Deep Learning', 'Sanjeev@123'),
        //     ('Nagendra', 'Kushwaha', 'nagendra@iiitp.ac.in', '9881457120', 'Electronics and Communication Engineering', 'Internet of Things (IoT), IoT security, Advance wireless communication, and Antennas', 'Sanjeev@123'),
        //     ('Sushant', 'Kumar', 'sushant@iiitp.ac.in', '8292305145', 'Electronics and Communication Engineering', 'Wireless Communication, Synchronization Parameters Estimation, Modulation', 'Sushant@123'),
        //     ('Anagha', 'Khiste', 'anaghakhiste@iiitp.ac.in', '8698242522', 'Applied Mathematics and Data Science', 'Algebra, Discrete Mathematics, Lattice theory, Order structure, Graph theory', 'Anagha@123'),
        //     ('Jatin', 'Majithia', 'jatinmajithia@iiitp.ac.in', '9403650522', 'Applied Mathematics and Data Science', 'Commutative Algebra, Graph theory, Lattice theory, Fractional Differential equations', 'Jatin@123'),
        //     ('Chandrakant', 'Guled', 'chandrakantguled@iiitp.ac.in', '9860361146', 'Applied Mathematics and Data Science', 'Applied Mathematics, Computational dynamics, Optimization', 'Chandrakant@123'),
        //     ('Vagisha', 'Mishra', 'drvagisha@iiitp.ac.in', '7974165720', 'Humanities, Social Sciences and Management', 'British Literature, Modern and Contemporary Literature, Womens Studies, and Literature', 'Vagisha@123'),
        //     ('Amruta', 'Lipare', 'amruta@iiitp.ac.in', '8390322057', 'Computer Science & Engineering', 'Soft Computing, Wireless Sensor Networks, Data Mining and Neural Networks', 'Amruta@123'),
        //     ('Mahendra', 'Yadav', 'mahendra@iiitp.ac.in', '9125933765', 'Computer Science & Engineering', 'Cloud Computing, Machine Learning, AI, Data Mining, Software Engineering and Formal Methods', 'Mahendra@123'),
        //     ('Shrikant', 'Salve', 'shrikant@iiitp.ac.in', '0000000002', 'Computer Science & Engineering', 'Human-Computer Interaction and Usability Engineering, Augmented Reality and Deep Learning', 'Shrikant@123'),
        //     ('Sonam', 'Maurya', 'sonam.m@iiitp.ac.in', '0000000003', 'Computer Science & Engineering', 'Wireless Sensor Network (WSN), Internet of Things (IoT), Vehicular Adhoc Network (VANET), Mobile and Wireless Networks, Machine Learning, Deep Learning and Image Processing', 'Sonam@123'),
        //     ('Meenakshi', 'Choudhary', 'meenakshi@iiitp.ac.in', '0000000004', 'Computer Science & Engineering', 'Biometrics with Deep Learning, Iris Recognition and Verification, Image Processing, Machine Learning, Computer Vision, Presentation Attack Detection, Crowd behaviors, Analysis', 'Meenakshi@123'),
        //     ('Priyank', 'Jain', 'priyank@iiitp.ac.in', '0000000005', 'Computer Science & Engineering', 'Data Science, Data Privacy and security, and Machine Learning', 'Priyank@123'),
        //     ('Dheeraj', 'Dubey', 'dheeraj@iiitp.ac.in', '0000000006', 'Computer Science & Engineering', '5G and Beyond, Free Space Optics, Machine Learning, Under Water Communication', 'Dheeraj@123'),
        //     ('Sumit', 'Gupta', 'sumitgupta@iiitp.ac.in', '9981036049', 'Computer Science & Engineering', 'Community Detection Algorithms, Graph Algorithms, Social Network Analysis, Data Science, Artificial Intelligence and Machine Learning', 'Sumit@123'),
        //     ('Kaptan', 'Kaptan', 'kaptansingh@iiitp.ac.in', '9826524212', 'Computer Science & Engineering', 'Web of Things, Cyber Security, Algorithms, and Theoretical Computer Science', 'Kaptan@123'),
        //     ('Shubham', 'Shukla', 'shubhamshukla@iiitp.ac.in', '0000000007', 'Electronics and Communication Engineering ', 'Robot Path Planning , Nature Inspired Optimisation technique,Microcontrollers and Embedded Systems & Design', 'Shubham@123'),
        //     ('Dipen', 'Bepari', 'dipen@iiitp.ac.in', '0000000008', 'Computer Science & Engineering', 'Cognitive Radio, NOMA, IRS, Energy Harvesting, 5G and beyond communications', 'Dipen@123'),
        //     ('Shivangi', 'Shukla', 'shivangi@iiitp.ac.in', '9451180932', 'Computer Science & Engineering', 'Information Security and Privacy, Cloud Computing Security and Security and Privacy in Internet of Things', 'Shivangi@123'),
        //     ('Divya', 'Chaturvedi', 'divya@iiitp.ac.in', '0000000009', 'Electronics and Communication Engineering', 'SIW based Cavity-backed Multi-band Antennas with Intrinsically Isolated Ports and Smart Antenna Design with IoT enabled devices', 'Divya@123'),
        //     ('Habila', 'Basumatary', 'habila@iiitp.ac.in', '8133911040', 'Computer Science & Engineering', 'Cyber Security in IoT, Smart Micro-Grids, EV Charging and Energy Efficiency in WSN', 'Habila@123'),
        //     ('Sanga', 'Chaki', 'sanga@iiitp.ac.in', '0000000010', 'Computer Science & Engineering', 'Explainable Machine Learning, Deep Learning, Affective Computing, Sound and Music Computing, and Trustworthy AI', 'Sanga@123'),
        //     ('Mahesh', 'Joshi', 'mahesh.joshi@iiitp.ac.in', '8886844737', 'Computer Science & Engineering', 'Biometric Authentication, Partial fingerprint identification, Biometric security, Internet-of-Things (IoT) Security', 'Mahesh@123'),
        //     ('Prateek', '', 'ritu@iiitp.ac.in', '0000000001', 'Electronics and Communication Engineering', 'Physical layer issues in localization, Acoustic sensor networks, Cellular networks, soft computing techniques', 'Prateek@123'),
        //     ('Rahman', 'Mohammad', 'rahman@iiitp.ac.in', '0000000011', 'Electronics and Communication Engineering', 'Medical Image Processing', 'Rahman@123'),
        //     ('Sakshi', 'Semwal', 'sakshi.semwal@iiitp.ac.in', '0000000012', 'Applied Sciences and Humanities', 'Magical Realism in South Asian literature. Postcolonial Studies, Gender Studies, Anglophone Literature', 'Sakshi@123'),
        //     ('Anu Priya', '', 'apriya@iiitp.ac.in', '0000000013', 'Computer Science & Engineering', 'Image Processing, Computer Vision, Deep Learning, Deep Reinforcement Learning, Robot Path Planning', 'apriya@123'),
        //     ('Priyanka', 'Joshi', 'priyanka@iiitp.ac.in', '8886846338', 'Computer Science & Engineering', 'Hardware security, Cyber security, Internet-of-Things (IoT) security, and Multi-agent security', 'Priyanka@123'),
        //     ('Mayank', 'Lovanshi', 'mlovanshi@iiitp.ac.in', '9425909227', 'Computer Science & Engineering', 'Computer Vision, Human-Computer Interaction, Deep Learning, Machine Learning', 'Mayank@123'),
        //     ('Shamal', 'Kashid', 'shamalkashid@iiitp.ac.in', '8605298915', 'Computer Science & Engineering', 'Machine Learning, Deep Learning, Multimedia Security, Multimedia Summarization', 'Shamal@123'),
        //     ('Anupama', 'Arun', 'anupama@iiitp.ac.in', '9893096267', 'Computer Science & Engineering', 'Machine Learning and Deep Learning', 'Anupama@123')
        //  ON DUPLICATE KEY UPDATE faculty_id=faculty_id;`,

        // Insert dummy staff
        // `INSERT INTO \`Staff\` (first_name, last_name, mis_number, contact_number, email, password) 
        //  VALUES ('Mark', 'Brown', '543216789', '9123456789', 'mark.brown@example.com', 'hashed_password')
        //  ON DUPLICATE KEY UPDATE staff_id=staff_id;`,

        // Insert dummy group
        // `INSERT INTO \`Group\` (leader_id, status, allocated_faculty_id, project_title) 
        //  VALUES (1, 'Pending', NULL, 'AI-based Student Management System')
        //  ON DUPLICATE KEY UPDATE group_id=group_id;`,

        // Insert dummy admin
        // `INSERT INTO \`Admin\` (first_name, last_name, email, contact_number, password, role) 
        //  VALUES 
        //  ('Amrut', 'Pathane', 'pathaneamrut@gmail.com', '8600947050', 'Amrut@123', 'Super Admin'),
        //  ('Anurag', 'Kawade', 'anurag.workzone@gmail.com', '7276570717', 'Anurag@123', 'Super Admin'),
        //  ('Omkar', 'Dhumal', ' omkardhumal267@gmail.com', '9665773021', 'Omkar@123', 'Super Admin'),
        //  ('Samar', 'Mohd', 'mohdsamarbinmehtab0786@gmail.com', '9621972940', 'Samar@123', 'Super Admin')
        //  ON DUPLICATE KEY UPDATE admin_id=admin_id;`
    ];

    queries.forEach((query, index) => {
        db.query(query, (err, result) => {
            if (err) {
                console.error(`Error in query ${index + 1}:`, err);  // Log the specific query error
            } else {
                console.log(`Dummy data inserted successfully for query ${index + 1}`);
            }
        });
    });
};

// Export the function
module.exports = insertDummyData;
