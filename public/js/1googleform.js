function toggleCustomDomain() {
    var domainSelect = document.getElementById("projectDomain");
    var customDomainContainer = document.getElementById("customDomainContainer");
    var customDomainInput = document.getElementById("customDomain");

    if (domainSelect.value === "Other") {
      customDomainContainer.style.display = "block";
      customDomainInput.required = true;
    } else {
      customDomainContainer.style.display = "none";
      customDomainInput.required = false;
    }
  }
  
  const selects = document.querySelectorAll(".faculty-select");

  selects.forEach(select => {
    select.addEventListener("change", () => {
      const selectedValues = Array.from(selects).map(s => s.value);

      selects.forEach(s => {
        Array.from(s.options).forEach(option => {
          if (option.value !== "" && selectedValues.includes(option.value)) {
            if (s.value !== option.value) {
              option.disabled = true;
            }
          } else {
            option.disabled = false;
          }
        });
      });
    });
  });