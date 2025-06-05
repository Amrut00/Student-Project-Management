document.getElementById("limitsForm").addEventListener("submit", function(e) {
    const degreeCheckboxes = document.querySelectorAll('input[name="degree[]"]');
    const semesterCheckboxes = document.querySelectorAll('input[name="semester[]"]');
    degreeCheckboxes.forEach(cb => cb.removeAttribute("name"));
    semesterCheckboxes.forEach(cb => cb.removeAttribute("name"));
  });

function updateDegreeOptions() {
    const allDegreesCheckbox = document.getElementById('all-degrees-checkbox');
    const degreeCheckboxes = document.querySelectorAll('input[name="degree[]"]:not(#all-degrees-checkbox)');
    const hiddenDegrees = document.getElementById('hidden-degrees');
    const selectedDegrees = Array.from(document.querySelectorAll('input[name="degree[]"]:checked'));
    
    if (allDegreesCheckbox.checked) {
        hiddenDegrees.value = "All Degrees";
        degreeCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.disabled = true;
        });
    } else {
        hiddenDegrees.value = selectedDegrees.map(degree => degree.value).join(',');
        degreeCheckboxes.forEach(checkbox => {
            checkbox.disabled = false;
        });
    }
    
    updateSemesterOptions();
}

function updateSemesterOptions() {
    const semesterContainer = document.getElementById('semester-checkboxes');
    const hiddenSemesters = document.getElementById('hidden-semesters');
    const hiddenDegrees = document.getElementById('hidden-degrees');
    // Get selected degrees from the hidden field (split by comma)
    const selectedDegrees = hiddenDegrees.value ? hiddenDegrees.value.split(',') : [];
    
    semesterContainer.innerHTML = '';
    hiddenSemesters.value = '';

     // If no degrees are selected, display a message
     if (selectedDegrees.length === 0) {
        document.getElementById('degree-message').innerHTML = '<strong style="color: red;">Please select at least one degree first.</strong>';
    } else {
        document.getElementById('degree-message').innerHTML = '';
    }

    // If PhD or All Degrees is selected, set semester to -1 (All Semesters)
    if (selectedDegrees.includes("PhD") || selectedDegrees.includes("All Degrees")) {
        hiddenSemesters.value = "-1";
        semesterContainer.innerHTML = `
            <label>
                <input type="checkbox" value="-1" checked disabled> All Semesters
            </label>
        `;
        return;
    }
    
    // If multiple degrees are selected, also force All Semesters
    if (selectedDegrees.length > 1) {
        hiddenSemesters.value = "-1";
        semesterContainer.innerHTML = `
            <label>
                <input type="checkbox" value="-1" checked disabled> All Semesters
            </label>
        `;
        return;
    }
    
    // If a single degree is selected, show individual semester options
    if (selectedDegrees.length === 1) {
        const degree = selectedDegrees[0];
        let semestersCount = 0;
        if (degree === 'BTech') {
            semestersCount = 8;
        } else if (degree === 'MTech') {
            semestersCount = 4;
        }
        
        // Create an "All Semesters" checkbox that allows toggling all individual semesters
        semesterContainer.innerHTML = `
            <label>
                <input type="checkbox" id="select-all-semesters" onchange="toggleSemesters(this)"> All Semesters
            </label><br>
        `;
        
        // Create individual semester checkboxes
        for (let i = 1; i <= semestersCount; i++) {
            semesterContainer.innerHTML += `
                <label>
                    <input type="checkbox" class="semester-check" value="${i}" onchange="updateHiddenSemesters()"> Semester ${i}
                </label><br>
            `;
        }
        
        // Update hidden semester field based on currently checked checkboxes
        updateHiddenSemesters();
    }
}

function toggleSemesters(checkbox) {
    const semesterChecks = document.querySelectorAll('.semester-check');
    semesterChecks.forEach(cb => {
        cb.checked = checkbox.checked;
        // Optionally disable individual checkboxes when "All Semesters" is checked
        cb.disabled = checkbox.checked;
    });
    updateHiddenSemesters();
}

function updateHiddenSemesters() {
    const hiddenSemesters = document.getElementById('hidden-semesters');
    const semesterChecks = document.querySelectorAll('.semester-check');
    let selected = [];
    semesterChecks.forEach(cb => {
        if (cb.checked) {
            selected.push(cb.value);
        }
    });
    // If all individual semesters are checked, use -1 to indicate "All Semesters"
    if (selected.length > 0 && selected.length === semesterChecks.length) {
        hiddenSemesters.value = "-1";
    } else {
        hiddenSemesters.value = selected.join(',');
    }
}

// Initialize on page load
window.onload = function() {
    updateDegreeOptions();
    updateSemesterOptions();
};
