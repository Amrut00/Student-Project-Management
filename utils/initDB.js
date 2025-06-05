const db = require("./db");

const createTables = () => {
    const queries = [
        `SET FOREIGN_KEY_CHECKS = 0;`,

        `CREATE TABLE IF NOT EXISTS \`Student\` (
            student_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50),
            mis_number CHAR(9) UNIQUE NOT NULL,
            contact_number CHAR(10) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            semester VARCHAR(20) NOT NULL,
            degree VARCHAR(20) NOT NULL,
            branch VARCHAR(20) NOT NULL,
            status ENUM('Pending', 'Allocated') DEFAULT 'Pending',
            group_id INT,
            FOREIGN KEY (group_id) REFERENCES \`Group\`(group_id) ON DELETE SET NULL
        );`,

        `CREATE TABLE IF NOT EXISTS \`Faculty\` (
            faculty_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50),
            email VARCHAR(100) UNIQUE NOT NULL,
            phone_number CHAR(10) UNIQUE NOT NULL,
            department VARCHAR(100),
            specialization VARCHAR(255) NOT NULL,
            availability_status ENUM('Available', 'Unavailable') DEFAULT 'Available',
            password VARCHAR(255) NOT NULL
        );`,

        `CREATE TABLE IF NOT EXISTS \`Staff\` (
            staff_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50),
            mis_number CHAR(9) UNIQUE NOT NULL,
            contact_number CHAR(10) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            assisting_faculty_id INT,
            password VARCHAR(255) NOT NULL,
            FOREIGN KEY (assisting_faculty_id) REFERENCES \`Faculty\`(faculty_id) ON DELETE SET NULL
        );`,

        `CREATE TABLE IF NOT EXISTS \`Group\` (
            group_id INT AUTO_INCREMENT PRIMARY KEY,
            leader_id INT NOT NULL,
            status ENUM('Pending', 'Allocated') DEFAULT 'Pending',
            allocated_faculty_id INT NULL,
            assisting_staff_id INT NULL,
            project_title VARCHAR(255) NOT NULL,
            FOREIGN KEY (leader_id) REFERENCES Student(student_id),
            FOREIGN KEY (allocated_faculty_id) REFERENCES Faculty(faculty_id) ON DELETE SET NULL,
            FOREIGN KEY (assisting_staff_id) REFERENCES \`Staff\`(staff_id) ON DELETE SET NULL
        );`,

        `CREATE TABLE IF NOT EXISTS \`Group_Faculty_Preferences\` (
            preference_id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,
            faculty_id INT NOT NULL,
            preference_order INT CHECK (preference_order BETWEEN 1 AND 4),
            FOREIGN KEY (group_id) REFERENCES \`Group\`(group_id) ON DELETE CASCADE,
            FOREIGN KEY (faculty_id) REFERENCES \`Faculty\`(faculty_id) ON DELETE CASCADE
        );`,

        `CREATE TABLE IF NOT EXISTS \`Group_Members\` (
            group_id INT,
            student_id INT,
            PRIMARY KEY (group_id, student_id),
            FOREIGN KEY (group_id) REFERENCES \`Group\`(group_id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES \`Student\`(student_id) ON DELETE CASCADE
        );`,

        `CREATE TABLE IF NOT EXISTS \`Admin\` (
            admin_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50),
            email VARCHAR(100) UNIQUE NOT NULL,
            contact_number CHAR(10) NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('Super Admin', 'Sub Admin') DEFAULT 'Sub Admin'
        );`,

        `CREATE TABLE IF NOT EXISTS \`Faculty_Allocation_Limits\` (
            limit_id INT AUTO_INCREMENT PRIMARY KEY,
            degree VARCHAR(255) NOT NULL,
            semester INT DEFAULT NULL,
            limit_count INT DEFAULT 5,
            CONSTRAINT unique_degree_semester_limit UNIQUE (degree, semester)
        );`,

        `CREATE TABLE IF NOT EXISTS \`Panel\` (
            panel_id INT AUTO_INCREMENT PRIMARY KEY,
            degree VARCHAR(100) NOT NULL,
            semester INT NOT NULL,
            max_groups INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );`,

        `CREATE TABLE IF NOT EXISTS \`Panel_Faculty_Members\` (
            panel_id INT,
            faculty_id INT,
            PRIMARY KEY (panel_id, faculty_id),
            FOREIGN KEY (panel_id) REFERENCES \`Panel\`(panel_id),
            FOREIGN KEY (faculty_id) REFERENCES \`Faculty\`(faculty_id)
        );`,

        `CREATE TABLE IF NOT EXISTS \`Panel_Group_Assignments\` (
            panel_id INT,
            group_id INT,
            PRIMARY KEY (panel_id, group_id),
            FOREIGN KEY (panel_id) REFERENCES \`Panel\`(panel_id),
            FOREIGN KEY (group_id) REFERENCES \`Group\`(group_id)
        );`,

        `CREATE TABLE IF NOT EXISTS \`ChatMessage\` (
            message_id INT AUTO_INCREMENT PRIMARY KEY,
            group_id INT NOT NULL,

            sender_student_id INT NULL,
            sender_faculty_id INT NULL,
            sender_staff_id INT NULL,

            message_content TEXT,
            file_path VARCHAR(512) NULL,
            file_original_name VARCHAR(255) NULL,

            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            is_edited BOOLEAN NOT NULL DEFAULT FALSE,
            edited_timestamp TIMESTAMP NULL DEFAULT NULL,

            reply_to_message_id INT NULL DEFAULT NULL,

            is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

            FOREIGN KEY (group_id) REFERENCES \`Group\`(group_id) ON DELETE CASCADE,
            FOREIGN KEY (sender_student_id) REFERENCES \`Student\`(student_id) ON DELETE SET NULL,
            FOREIGN KEY (sender_faculty_id) REFERENCES \`Faculty\`(faculty_id) ON DELETE SET NULL,
            FOREIGN KEY (sender_staff_id) REFERENCES \`Staff\`(staff_id) ON DELETE SET NULL,
            FOREIGN KEY (reply_to_message_id) REFERENCES \`ChatMessage\`(message_id) ON DELETE SET NULL
        );`,

        `CREATE INDEX IF NOT EXISTS idx_chatmessage_pinned ON \`ChatMessage\` (group_id, is_pinned, timestamp);`,
        `CREATE INDEX IF NOT EXISTS idx_chatmessage_reply ON \`ChatMessage\` (reply_to_message_id);`,

        `SET FOREIGN_KEY_CHECKS = 1;`
    ];

    queries.forEach((query, index) => {
        db.query(query, (err, result) => {
            if (err) {
                console.error("Error in query", index + 1, ":", err.sqlMessage || err.message);
            } else {
                console.log("Query", index + 1, "executed successfully.");
            }
        });
    });
};

module.exports = createTables;
