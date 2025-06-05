function submitEdit(event, userType, userId) {
    event.preventDefault(); // ✅ Prevent page reload

    console.log("Submit function triggered!"); // ✅ Debugging log

    const form = document.getElementById("edit-form");
    if (!form) {
        console.error("Form not found!");
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    console.log("Submitting Data:", data); // ✅ Debugging log

    fetch(`/admin/edit/${userType}/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        console.log("Response:", result); // ✅ Debugging log
        alert(result.message);
        if (result.success) {
            window.location.href = "/admin/search-user"; // ✅ Redirect on success
        }
    })
    .catch(err => console.error("Error updating user:", err));
}
