let currentMember = 1;
let memberData = [];
let facultyData = [];
const maxMembers = 5;
const maxFacultyPreferences = 4;

function showMemberForm() {
    currentMember = document.getElementById('memberSelect').value;
    document.getElementById('memberForm').reset();
}

function submitMember() {
    const name = document.getElementById('name').value;
    const mis = document.getElementById('mis').value;
    const contact = document.getElementById('contact').value;
    const email = document.getElementById('email').value;

    if (name && mis && contact && email) {
        if (memberData.length < maxMembers) {

            memberData.push({ name, mis, contact, email });

            document.getElementById('noMemberMessage').style.display = 'none';

            const memberIndex = memberData.length - 1;
            const memberInfoDiv = document.getElementById('memberInfo');
            memberInfoDiv.innerHTML += `<div class="info-box" id="member-${memberIndex}">
                <div>
                    <p><strong>Member ${memberData.length}:</strong></p>
                    <p>Name: ${name}</p>
                    <p>MIS: ${mis}</p>
                </div>
                <button class="remove-btn" onclick="removeMember(${memberIndex})">Remove</button>
            </div>`;

            currentMember = memberData.length + 1;
            document.getElementById('memberSelect').value = currentMember;

            if (memberData.length === maxMembers) {
                alert('All 5 members have been added!');
            }
        } else {
            alert('You cannot add more than 5 members.');
        }
    } else {
        alert('Please fill all fields');
    }
}

function removeMember(index) {
    memberData.splice(index, 1);

    const memberInfoDiv = document.getElementById('memberInfo');
    memberInfoDiv.innerHTML = "";
    memberData.forEach((member, i) => {
        memberInfoDiv.innerHTML += `<div class="info-box" id="member-${i}">
            <div>
                <p><strong>Member ${i + 1}:</strong></p>
                <p>Name: ${member.name}</p>
                <p>MIS: ${member.mis}</p>
            </div>
            <button class="remove-btn" onclick="removeMember(${i})">Remove</button>
        </div>`;
    });

    if (memberData.length === 0) {
        document.getElementById('noMemberMessage').style.display = 'block';
    }

    currentMember = memberData.length + 1;
    document.getElementById('memberSelect').value = currentMember;
}

function submitFaculty() {
    const faculty = document.getElementById('facultySelect').value;

    if (facultyData.length < maxFacultyPreferences) {
        facultyData.push(faculty);

        document.getElementById('noFacultyMessage').style.display = 'none';

        const facultyIndex = facultyData.length - 1;
        const facultyInfoDiv = document.getElementById('facultyInfo');
        facultyInfoDiv.innerHTML += `<div class="info-box" id="faculty-${facultyIndex}">
            <div>
                <p><strong>Preference ${facultyData.length}:</strong> ${faculty}</p>
            </div>
            <button class="remove-btn" onclick="removeFaculty(${facultyIndex})">Remove</button>
        </div>`;

        // Disable the dropdown if all 4 preferences are selected
        if (facultyData.length === maxFacultyPreferences) {
            document.getElementById('facultySelect').disabled = true;
            alert('All 4 preferences selected!');
        }
    } else {
        alert('You have already selected 4 preferences.');
    }
}

function removeFaculty(index) {
    facultyData.splice(index, 1);

    const facultyInfoDiv = document.getElementById('facultyInfo');
    facultyInfoDiv.innerHTML = "";
    facultyData.forEach((faculty, i) => {
        facultyInfoDiv.innerHTML += `<div class="info-box" id="faculty-${i}">
            <div>
                <p><strong>Preference ${i + 1}:</strong> ${faculty}</p>
            </div>
            <button class="remove-btn" onclick="removeFaculty(${i})">Remove</button>
        </div>`;
    });

    if (facultyData.length === 0) {
        document.getElementById('noFacultyMessage').style.display = 'block';
    }

    if (facultyData.length < maxFacultyPreferences) {
        document.getElementById('facultySelect').disabled = false;
    }
}
function submitAllData() {
    // Validate and handle form submission logic here if needed

    // Redirect to the form submission confirmation page
    window.location.href = '/student/form-submitted';
}
