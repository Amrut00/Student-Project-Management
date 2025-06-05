document.addEventListener("DOMContentLoaded", function () {
    const facultySelect = document.getElementById("faculty-select");
    const groupIdInput = document.getElementById("student-or-group");
    const actionButton = document.getElementById("faculty-action-btn");
    const operationMode = document.getElementById("operation-mode").value; // Get mode

    if (operationMode === "allocate") {
        // Load faculty list dynamically for allocation
        fetch("/admin/faculty-list-allocation")
            .then(response => response.json())
            .then(data => {
                data.forEach(faculty => {
                    const option = document.createElement("option");
                    option.value = faculty.faculty_id;
                    option.textContent = `${faculty.first_name} ${faculty.last_name}`;
                    facultySelect.appendChild(option);
                });
            })
            .catch(error => console.error("Error loading faculty:", error));
    }

    // Handle both Allocate and Deallocate
    actionButton.addEventListener("click", function () {
        const groupId = groupIdInput.value.trim();
        if (!groupId) {
            alert("Please enter a valid Group ID.");
            return;
        }

        if (operationMode === "allocate") {
            const facultyId = facultySelect.value;
            if (!facultyId) {
                alert("Please select a faculty.");
                return;
            }

            // Allocate faculty
            fetch("/admin/allocate-faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ faculty_id: facultyId, group_id: groupId }),
            })
            .then(response => response.json())
            .then(data => alert(data.message))
            .catch(error => console.error("Error allocating faculty:", error));
        } else {
            // Deallocate faculty
            fetch("/admin/deallocate-faculty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_id: groupId }),
            })
            .then(response => response.json())
            .then(data => alert(data.message))
            .catch(error => console.error("Error deallocating faculty:", error));
        }
    });
});
