function searchUser() {
    const query = document.getElementById("search-input").value;
    const type = document.getElementById("user-type").value;

    if (!query) {
        alert("Please enter a valid search query.");
        return;
    }

    fetch(`/admin/search-user/query?query=${query}&type=${type}`)
        .then(response => response.json())
        .then(data => {
            displayResults(data, type);
        })
        .catch(err => console.error("Error fetching search results:", err));
}

function displayResults(data, type) {
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "";

    if (data.error) {
        resultsDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
        return;
    }

    if (data.message) {
        resultsDiv.innerHTML = `<p>${data.message}</p>`;
        return;
    }

    let table = `<table border="1"><tr>`;

    if (type === "student") {
        table += `<th>Student ID</th><th>First Name</th><th>Last Name</th><th>MIS Number</th>
                  <th>Email</th><th>Contact</th><th>Degree</th><th>Branch</th><th>Semester</th>
                  <th>Status</th><th>Group ID</th><th>Edit Info</th><th>Manage Group</th></tr>`;
        data.forEach(user => {
            table += `<tr>
                <td>${user.student_id}</td>
                <td>${user.first_name}</td>
                <td>${user.last_name}</td>
                <td>${user.mis_number || "N/A"}</td>
                <td>${user.email}</td>
                <td>${user.contact_number}</td>
                <td>${user.degree || "N/A"}</td>
                <td>${user.branch || "N/A"}</td>
                <td>${user.semester || "N/A"}</td>
                <td>${user.status}</td>
                <td>${user.group_id || "N/A"}</td>
                <td>
                    <a href="/admin/edit/student/${user.student_id}">
                        <button>Edit</button>
                    </a>
                </td>
                <td>
                    <a href="/admin/change-password/student/${user.student_id}">
                            <button>Change Password</button>
                    </a>
                </td>
            </tr>`;
        });
    } 
    else if (type === "faculty") {
        table += `<th>Faculty ID</th><th>First Name</th><th>Last Name</th><th>Email</th>
                  <th>Contact</th><th>Department</th><th>Specialization</th><th>Availability</th><th>Edit Info</th><th>Manage Group</th></tr>`;
        data.forEach(user => {
            table += `<tr>
                <td>${user.faculty_id}</td>
                <td>${user.first_name}</td>
                <td>${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.phone_number}</td>
                <td>${user.department}</td>
                <td>${user.specialization}</td>
                <td>${user.availability_status}</td>
                <td>
                    <a href="/admin/edit/faculty/${user.faculty_id}">
                        <button>Edit</button>
                    </a>
                </td>
                <td>
                    <a href="/admin/change-password/faculty/${user.faculty_id}">
                        <button>Change Password</button>
                    </a>
                </td>
            </tr>`;
        });
    } 
    else if (type === "staff") {
        table += `<th>Staff ID</th><th>First Name</th><th>Last Name</th><th>MIS Number</th>
                  <th>Email</th><th>Contact</th><th>Assisting Faculty ID</th><th>Edit Info</th><th>Manage Group</th></tr>`;
        data.forEach(user => {
            table += `<tr>
                <td>${user.staff_id}</td>
                <td>${user.first_name}</td>
                <td>${user.last_name}</td>
                <td>${user.mis_number || "N/A"}</td>
                <td>${user.email}</td>
                <td>${user.contact_number}</td>
                <td>${user.assisting_faculty_id || "N/A"}</td>
                <td>
                    <a href="/admin/edit/staff/${user.staff_id}">
                        <button>Edit</button>
                    </a>
                </td>
                <td>
                    <a href="/admin/change-password/staff/${user.staff_id}">
                        <button>Change Password</button>
                    </a>
                </td>
            </tr>`;
        });
    }

    table += `</table>`;
    resultsDiv.innerHTML = table;
}

function updatePlaceholder() {
    const userType = document.getElementById("user-type").value;
    const infoText = document.getElementById("infoText");

    if (userType === "student") {
        infoText.innerText = "Enter Student ID, MIS Number, Phone Number, or Email.";
    } else if (userType === "staff") {
        infoText.innerText = "Enter Staff ID, MIS Number, Phone Number, or Email.";
    } else {
        infoText.innerText = "Enter Faculty ID, Phone Number, or Email.";
    }
}

// Placeholder Update on Page Load
window.onload = updatePlaceholder;
