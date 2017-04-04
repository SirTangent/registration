class State {
    public id: string;
    private sectionElement: HTMLElement;

    static hideAll() {
        states.forEach(state => state.hide());
    }

    constructor(id: string) {
        this.id = id;
        let element = document.querySelector(`section#${id}`);
        if (!element) {
            throw new Error("ID does not correspond to an existing <section> element");
        }
        this.sectionElement = element as HTMLElement;
    }
    hide(): void {
        this.sectionElement.style.display = "none";
    }
    show(hideAll: boolean = true): void {
        if (hideAll) State.hideAll();
        this.sectionElement.style.display = "block";
    }
}

const states: State[] = ["statistics", "users", "settings", "applicants"].map(id => new State(id));

// Set the correct state on page load
function readURLHash() {
    let urlState: State | null = null;
    for (let i = 0; i < states.length; i++) {
        if (states[i].id === window.location.hash.substr(1)) {
            urlState = states[i];
            break;
        }
    }
    if (urlState) {
        urlState.show();
    }
    else {
        // Show first section
        states[0].show();
    }
}
readURLHash();
// Load the correct state on button press
window.addEventListener("hashchange", readURLHash);

// Load timezone-correct values for the application open / close time
let timeInputs = document.querySelectorAll('input[type="datetime-local"]') as NodeListOf<HTMLInputElement>;
for (let i = 0; i < timeInputs.length; i++) {
    timeInputs[i].value = moment(new Date(timeInputs[i].dataset.rawValue || "")).format("Y-MM-DDTHH:mm:00");
}

// Settings update
function parseDateTime (dateTime: string) {
    let digits = dateTime.split(/\D+/).map(num => parseInt(num));
    return new Date(digits[0], digits[1] - 1, digits[2], digits[3], digits[4], digits[5] || 0, digits[6] || 0);
}
let settingsUpdateButton = document.querySelector("#settings input[type=submit]") as HTMLInputElement;
let settingsForm = document.querySelector("#settings form") as HTMLFormElement;
settingsUpdateButton.addEventListener("click", e => {
    if (!settingsForm.checkValidity() || !settingsForm.dataset["action"]) {
		return;
	}
    e.preventDefault();
	settingsUpdateButton.disabled = true;

    let applicationAvailabilityData = new FormData();
    applicationAvailabilityData.append("open", parseDateTime((document.getElementById("application-open") as HTMLInputElement).value).toISOString());
    applicationAvailabilityData.append("close", parseDateTime((document.getElementById("application-close") as HTMLInputElement).value).toISOString());
    let teamsEnabledData = new FormData();
    teamsEnabledData.append("enabled", (document.getElementById("teams-enabled") as HTMLInputElement).checked ? "true" : "false");

    fetch("/api/settings/application_availability", {
		credentials: "same-origin",
		method: "PUT",
		body: applicationAvailabilityData
	}).then(checkStatus).then(parseJSON).then(() => {
		return fetch("/api/settings/teams_enabled", {
            credentials: "same-origin",
            method: "PUT",
            body: teamsEnabledData
        });
    }).then(checkStatus).then(parseJSON).then(async () => {
        await sweetAlert("Awesome!", "Settings successfully updated.", "success");
        window.location.reload();
	}).catch(async (err: Error) => {
		await sweetAlert("Oh no!", err.message, "error");
		settingsUpdateButton.disabled = false;
	});
});

let branchFilter = document.getElementById("branchFilter") as HTMLInputElement;
branchFilter.addEventListener("change", e => {
    revealDivByClasses([branchFilter.value, getAcceptedFilterValue()]);
});

function getBranchFilterValue() {
    return branchFilter.value;
}

let acceptedFilter = document.getElementById("acceptedFilter") as HTMLInputElement;
acceptedFilter.addEventListener("change", e => {
    revealDivByClasses([getBranchFilterValue(), acceptedFilter.value]);
});

function getAcceptedFilterValue() {
    return acceptedFilter.value;
}

function updateFilterView() {
    revealDivByClasses([getBranchFilterValue(), getAcceptedFilterValue()]);
}

function revealDivByClasses(classes: string[]) {
    let elements = document.querySelectorAll(".applicantDiv") as NodeListOf<HTMLElement>;
    for (let i = 0; i < elements.length; i++) {
        let element = elements[i];
        let containsClasses: boolean = true;
        for (let j = 0; j < classes.length; j++) {
            let currentClass = classes[j];
            if (currentClass != "*") {
                //if the class is a *, we ignore it, which makes filtering easier
                if (!element.classList.contains(currentClass)) {
                    containsClasses = false;
                }
            }
        }

        if (containsClasses) {
            element.style.display = "";
        }
        else {
            element.style.display = "none";
        }
    }
}

//if an element has a class called accepted-true, for instance, and you want to toggle
//it, you'd call flipClassValue(yourElement, "accepted", true)
function flipClassValue(el: Element, className: string, currentValue: boolean) {
    el.classList.remove(className + "-" + currentValue);
    el.classList.add(className + "-" + !currentValue);
}

let applicationStatusUpdateButtons = document.querySelectorAll(".statusButton") as NodeListOf<HTMLInputElement>;

for (let i = 0; i < applicationStatusUpdateButtons.length; i++) {
    let statusUpdateButton = applicationStatusUpdateButtons[i];

    statusUpdateButton.addEventListener("click", e => {
        let eventTarget = e.target as HTMLInputElement;

        e.preventDefault();
        eventTarget.disabled = true;

        let userId = eventTarget.dataset.user;
        let currentCondition = eventTarget.dataset.accepted === "true";

        var formData = new FormData();
        formData.append("status", !currentCondition);

        fetch(`/api/user/${userId}/status`, {
            credentials: "same-origin",
            method: "POST",
            body: formData
        }).then(checkStatus).then(parseJSON).then(async () => {
            eventTarget.disabled = false;
            if (!currentCondition) {
                // Set to Un-Accept
                flipClassValue(eventTarget, "accepted-btn", false);
                // eventTarget.classList.remove("accepted-btn-false");
                // eventTarget.classList.add("accepted-btn-true");
                eventTarget.dataset.accepted = "true";
                eventTarget.textContent = "Un-Accept";
                flipClassValue(eventTarget!.parentElement!.parentElement!, "accepted", false);
                flipClassValue(eventTarget!.parentElement!.parentElement!.nextElementSibling!, "accepted", false);
                // eventTarget!.parentElement!.parentElement!.classList.remove("accepted-false");
                // eventTarget!.parentElement!.parentElement!.classList.add("accepted-true");
            }
            else {
                // Set to Accept
                flipClassValue(eventTarget, "accepted-btn", true);
                // eventTarget.classList.remove("accepted-btn-true");
                // eventTarget.classList.add("accepted-btn-false");
                eventTarget.dataset.accepted = "false";
                eventTarget.textContent = "Accept";
                // eventTarget!.parentElement!.parentElement!.classList.remove("accepted-true");
                // eventTarget!.parentElement!.parentElement!.classList.add("accepted-false");
                flipClassValue(eventTarget!.parentElement!.parentElement!, "accepted", true);
                flipClassValue(eventTarget!.parentElement!.parentElement!.nextElementSibling!, "accepted", true);
            }

            updateFilterView();
            //because we've added a class that implies the element should be removed, but haven't actually removed the element yet

        }).catch(async (err: Error) => {
            await sweetAlert("Oh no!", err.message, "error");
            eventTarget.disabled = false;
        });
    });
}

updateFilterView();//so whatever the default filter options are set at, it'll show accordingly