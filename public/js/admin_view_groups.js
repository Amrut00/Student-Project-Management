document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("group-details-modal");
    const modalContent = document.getElementById("group-details");
    const closeModal = document.querySelector(".close");

    document.querySelectorAll(".view-details-btn").forEach(button => {
        button.addEventListener("click", function() {
            const groupId = this.getAttribute("data-group-id");

            fetch(`/admin/group-details/${groupId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.group) {
                        const group = data.group;
                        let detailsHtml = `
                            <p><strong>Group ID:</strong> ${group.group_id}</p>
                            <p><strong>Project Title:</strong> ${group.project_title || "Not Assigned"}</p>
                            <p><strong>Status:</strong> ${group.status}</p>
                            <p><strong>Faculty:</strong> ${group.faculty_first_name ? `${group.faculty_first_name} ${group.faculty_last_name}` : "Not Assigned"}</p>
                            <p><strong>Assisting Staff:</strong> ${group.staff_first_name ? `${group.staff_first_name} ${group.staff_last_name}` : "Not Assigned"}</p>
                            <p><strong>Degree:</strong> ${group.degree}</p>
                            <p><strong>Semester:</strong> ${group.semester}</p>
                            <h3>Group Members</h3>
                            <ul>`;
                        
                        data.members.forEach(member => {
                            detailsHtml += `<li>${member.first_name} ${member.last_name} (MIS: ${member.mis_number}, Email: ${member.email})</li>`;
                        });

                        detailsHtml += `</ul>`;
                        modalContent.innerHTML = detailsHtml;
                        modal.style.display = "block";
                    }
                });
        });
    });

    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
});
