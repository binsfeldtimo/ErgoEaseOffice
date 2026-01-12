// ==============================
// CONFIG — WEB APP ENDPOINT
// ==============================
const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzhLn1Ir4Xz_pwaHZIW3UqksyyGSVIIMEVspEqMS4fFJQsSyFwbZtpS41I3Pg6eRRrF6Q/exec";
// ==============================
// GLOBAL PHOTO STATE (MUST BE FIRST)
// ==============================
let employeePhotoBase64 = null;
/* ============================================================
   DOM HELPER
============================================================ */
function $(id) { return document.getElementById(id); }

// ==============================
// PHOTO PREVIEW (NO UPLOAD YET)
// ==============================
const photoInput = document.getElementById("photoUpload");
const photoPreview = document.getElementById("photoPreview");

if (photoInput && photoPreview) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      employeePhotoBase64 = e.target.result;   // 🔥 STORE PHOTO
      photoPreview.src = e.target.result;
      photoPreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
   GLOBAL STATE
============================================================ */
let currentIndex = 0;
let answers = [];

let categoryTotals = {};
let categoryScores = {};

let finalPercent = 0;
let finalStatus = "";

let strengthsList = [];
let needsList = [];

let top3Gear = [];
let totalCostEstimate = "$0";









window.employeeOwnedEquipment = [];   // <-- PRE-SCREEN equipment

async function uploadPhotoToServer() {
  if (!employeePhotoBase64) return null;

  const res = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "uploadPhoto",
      filename: `workstation_${Date.now()}.png`,
      base64: employeePhotoBase64
    })
  });

  const json = await res.json();
  return json.photoUrl || null;
}




/* ============================================================
   TOOLTIP TEXT
============================================================ */
const TOOLTIP_TEXT = {
    "Head & Neck": "Neutral head posture means your ears align with your shoulders and you avoid leaning forward.",
    "Mid & Low Back": "Your lower back should maintain its natural curve and be supported by the chair.",
    "Hips & Thighs": "Your thighs should be parallel to the floor with hips fully back in the chair.",
    "Feet & Other": "Feet should rest flat on the floor or a footrest to reduce leg strain.",
    "Wrists & Hands": "Neutral wrist = straight wrists, no bending up/down while typing.",
    "Work Habits": "Regular micro-breaks every 20–30 minutes reduce fatigue and injury risk.",
    "Environment": "Lighting, glare, and reach distance affect ergonomic comfort and productivity."
};


/* ============================================================
   QUESTION SET (NO EQUIPMENT QUESTION)
============================================================ */
const QUESTIONS = [
    { id:"monitor_eye", cat:"Head & Neck", q:"Is the top of your screen at eye level or slightly below (2–3 inches)?", weight:2 },
    { id:"monitor_distance", cat:"Head & Neck", q:"Is your monitor about an arm’s length away?", weight:2 },
    { id:"forward_head", cat:"Head & Neck", q:"Do you avoid leaning your head forward while viewing the screen?", weight:2 },

    { id:"lumbar_support", cat:"Mid & Low Back", q:"Does your chair support your lower back?", weight:2 },
    { id:"back_angle", cat:"Mid & Low Back", q:"Is your backrest reclined slightly (100–110°)?", weight:2 },

    { id:"hips_thighs", cat:"Hips & Thighs", q:"Are your hips fully back with thighs parallel to the floor?", weight:2 },
    { id:"knee_gap", cat:"Hips & Thighs", q:"Do your knees rest comfortably with a 2–3 inch gap from the seat edge?", weight:2 },

    { id:"feet_floor", cat:"Feet & Other", q:"Are your feet flat on the floor or on a footrest?", weight:2 },
    { id:"desk_height", cat:"Feet & Other", q:"Is your desk height set near elbow level when seated?", weight:2 },

    { id:"wrists_neutral", cat:"Wrists & Hands", q:"Are your wrists neutral while typing and using the mouse?", weight:2 },
    { id:"kb_mouse_height", cat:"Wrists & Hands", q:"Is your keyboard/mouse at elbow height?", weight:2 },

    { id:"breaks", cat:"Work Habits", q:"Do you take breaks every 20–30 minutes?", weight:1 },
    { id:"hydration", cat:"Work Habits", q:"Do you stay hydrated throughout the day?", weight:1 },

    { id:"glare", cat:"Environment", q:"Is your screen positioned to avoid glare?", weight:1 },
    { id:"reach_items", cat:"Environment", q:"Are frequently used items within easy reach?", weight:1 },

    { id:"headset", cat:"Head & Neck", q:"Do you use a headset instead of cradling the phone?", weight:1 }
];

document.addEventListener("DOMContentLoaded", () => {
    $("qTotal").textContent = QUESTIONS.length;

   


/* ============================================================
   SECTION CONTROL
============================================================ */
function showSection(id) {
    [
      "heroSection",
      "equipmentSection",
      "screeningSection",
      "photoStep",
      "resultsSection",
      "logView"
    ].forEach(sec => $(sec).classList.add("hidden"));

    $(id).classList.remove("hidden");

    if (id === "resultsSection") $("actionBar").classList.remove("hidden");
    else $("actionBar").classList.add("hidden");
}



/* ============================================================
   START SCREENING FLOW
============================================================ */
$("startBtn").onclick = () => {
    resetState();
    showEquipmentList();
    showSection("equipmentSection");
};

/* ============================================================
   PHOTO STEP → GENERATE RESULTS
============================================================ */
$("generateReportBtn").onclick = () => {
    computeResults();
};
function resetState() {
    currentIndex = 0;
    answers = [];
    categoryTotals = {};
    categoryScores = {};
    totalPossibleWeight = 0;

    QUESTIONS.forEach(q => {
        totalPossibleWeight += q.weight;
        if (!categoryTotals[q.cat]) categoryTotals[q.cat] = 0;
        categoryTotals[q.cat] += q.weight;
    });

    $("progressBarFill").style.width = "0%";
}


/* ============================================================
   EQUIPMENT PRE-SCREEN → Continue Button
============================================================ */
$("continueBtn").onclick = () => {
    window.employeeOwnedEquipment = Array.from(
        document.querySelectorAll(".equip-check:checked")
    ).map(cb => cb.value);

    renderQuestion();
    showSection("screeningSection");
};


/* ============================================================
   BUILD EQUIPMENT CHECKLIST DYNAMICALLY
============================================================ */
function showEquipmentList() {
    const list = $("equipmentList");
    list.innerHTML = "";

    const equipmentItems = [
        "Anti-Glare Screen Filter",
        "Task Lighting (LED)",
        "Adjustable Sit-Stand Desk",
        "Ergo Seat Cushion",
        "Seat Depth Adjustable Chair",
        "Footrest",
        "Premium Foot Platform",
        "Wrist Rest Set"
    ];

    list.innerHTML = equipmentItems.map(item => `
        <label style="display:block; margin:6px 0;">
            <input type="checkbox" class="equip-check" value="${item}">
            ${item}
        </label>
    `).join("");
}


/* ============================================================
   RENDER QUESTIONS
============================================================ */
function renderQuestion() {
    const q = QUESTIONS[currentIndex];

    $("questionText").textContent = q.q;
    $("questionCategoryText").textContent = q.cat;
    $("qNum").textContent = currentIndex + 1;

    injectTooltip(q.cat);

    // Fade animation
    const box = document.querySelector(".question-box");
    box.classList.remove("fade-in");
    setTimeout(() => box.classList.add("fade-in"), 20);

    // Progress bar
    const pct = (currentIndex / QUESTIONS.length) * 100;
    $("progressBarFill").style.width = pct + "%";
}


/* ============================================================
   TOOLTIP
============================================================ */
function injectTooltip(categoryName) {
    $("tooltipSideText").textContent = TOOLTIP_TEXT[categoryName] || "";
}


/* ============================================================
   YES / NO ANSWERS
============================================================ */
$("yesBtn").onclick = () => handleAnswer(true);
$("noBtn").onclick = () => handleAnswer(false);

function handleAnswer(isYes) {
    const q = QUESTIONS[currentIndex];

    const risk = isYes ? 0 : q.weight;

    answers[currentIndex] = risk;

    if (!categoryScores[q.cat]) categoryScores[q.cat] = 0;
    categoryScores[q.cat] += risk;

    currentIndex++;

if (currentIndex >= QUESTIONS.length) {
    showSection("photoStep");   // ⬅ go to photo + instructions first
} else {
    renderQuestion();
}

}
/* ============================================================
   SUBMIT TO GOOGLE SHEET (APPS SCRIPT)
============================================================ */
function submitToGoogleForm(data) {
  const FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLSdd9WtBbdrlvZPQbulharb2lISLVhBfE-cdO47G8eivfKcL1g/formResponse";

  const formData = new URLSearchParams();

  formData.append("entry.234872136", data.When);
  formData.append("entry.533269327", data.EmployeeName);
  formData.append("entry.166788213", data.Discipline);
  formData.append("entry.367440441", data.Score);
  formData.append("entry.1696466260", data.Status);

  // ✅ STRINGS — NO .join()
  formData.append("entry.511386133", data["Safe Items"]);
  formData.append("entry.860043689", data["Flagged Items"]);
  formData.append("entry.1834079892", data["Top Recs"]);

  formData.append("entry.725889293", data.EstCostUSD);
  formData.append("entry.668878912", String(data["Gear Items"]));
  formData.append("entry.1980020103", data.Employer);
  formData.append("entry.1119390341", data["Email Address"]);

  return fetch(FORM_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  });
}






/* ============================================================
   RESULTS
============================================================ */
function computeResults() {

    const totalRisk = answers.reduce((a,b)=>a+b, 0);
    finalPercent = Math.round((totalRisk / totalPossibleWeight) * 100);

    if (finalPercent <= 20) finalStatus = "Low Risk";
    else if (finalPercent <= 40) finalStatus = "Mild Risk";
    else if (finalPercent <= 60) finalStatus = "Moderate Risk";
    else if (finalPercent <= 80) finalStatus = "High Risk";
    else finalStatus = "Severe Risk";

    $("scoreText").textContent = finalPercent + "%";
    $("scoreLabel").textContent = finalStatus;

    // Strengths & Needs
    strengthsList = [];
    needsList = [];

    for (let cat in categoryTotals) {
        const pct = (categoryScores[cat] || 0) / categoryTotals[cat];
        if (pct < 0.5) strengthsList.push(cat);
        else needsList.push(cat);
    }

    $("strengthList").innerHTML = strengthsList.map(s => `<li>${s}</li>`).join("");
    $("needsList").innerHTML = needsList.map(n => `<li>${n}</li>`).join("");

    renderBreakdown();
    computeRecommendations();
    updateGauge(finalPercent);

    showSection("resultsSection");
}


/* ============================================================
   BREAKDOWN BARS
============================================================ */
function renderBreakdown() {
    $("breakdownContainer").innerHTML = "";

    for (let cat in categoryTotals) {
        const risk = categoryScores[cat] || 0;
        const pct = Math.round((risk / categoryTotals[cat]) * 100);

        const color =
            pct > 60 ? "#e74c3c" :
            pct > 30 ? "#f1c40f" :
                        "#5cb85c";

        $("breakdownContainer").innerHTML += `
            <div class="breakRow">
                <div>${cat}</div>
                <div>${pct}%</div>
            </div>
            <div class="barOuter">
                <div class="barFill" style="width:${pct}%; background:${color};"></div>
            </div>
        `;
    }
}


/* ============================================================
   GAUGE
============================================================ */
function updateGauge(percent) {
    const maxArc = 314;
    const fill = (percent / 100) * maxArc;

    $("gaugeFill").style.strokeDasharray = `${fill} ${maxArc}`;

    const angle = -90 + percent * 1.8;
    const rad = angle * Math.PI / 180;

    const cx = 20 + 140 * Math.cos(rad);
    const cy = 160 + 140 * Math.sin(rad);

    $("gaugePtr").setAttribute("cx", cx);
    $("gaugePtr").setAttribute("cy", cy);
}


/* ============================================================
   DEVICE CATALOG
============================================================ */
const GEAR = [
    { item: "Anti-Glare Screen Filter", cat: "Environment", cost: "$15–$30",
      budgetLink: "https://www.amazon.com/s?k=anti+glare+screen+filter",
      premiumLink: "https://www.amazon.com/s?k=premium+anti+glare+filter" },

    { item: "Task Lighting (LED)", cat: "Environment", cost: "$25–$60",
      budgetLink: "https://www.amazon.com/s?k=desk+lamp+led",
      premiumLink: "https://www.amazon.com/s?k=premium+desk+lamp+led" },

    { item: "Adjustable Sit-Stand Desk", cat: "Environment", cost: "$160–$300",
      budgetLink: "https://www.amazon.com/s?k=budget+sit+stand+desk",
      premiumLink: "https://www.amazon.com/s?k=premium+sit+stand+desk" },

    { item: "Ergo Seat Cushion", cat: "Hips & Thighs", cost: "$20–$35",
      budgetLink: "https://www.amazon.com/s?k=seat+cushion",
      premiumLink: "https://www.amazon.com/s?k=memory+foam+seat+cushion" },

    { item: "Seat Depth Adjustable Chair", cat: "Hips & Thighs", cost: "$160–$280",
      budgetLink: "https://www.amazon.com/s?k=ergonomic+chair",
      premiumLink: "https://www.amazon.com/s?k=ergonomic+chair+adjustable+seat+depth" },

    { item: "Footrest", cat: "Feet & Other", cost: "$15–$25",
      budgetLink: "https://www.amazon.com/s?k=footrest",
      premiumLink: "https://www.amazon.com/s?k=premium+footrest" },

    { item: "Premium Foot Platform", cat: "Feet & Other", cost: "$50–$90",
      budgetLink: "https://www.amazon.com/s?k=foot+platform",
      premiumLink: "https://www.amazon.com/s?k=adjustable+foot+platform" },

    { item: "Wrist Rest Set", cat: "Wrists & Hands", cost: "$10–$20",
      budgetLink: "https://www.amazon.com/s?k=wrist+rest+set",
      premiumLink: "https://www.amazon.com/s?k=premium+wrist+rest" }
];


/* ============================================================
   RECOMMENDATION ENGINE
============================================================ */
function computeRecommendations() {

    // 1. Identify high-risk categories
    let highRiskCategories = Object.keys(categoryTotals).filter(cat => {
        const pct = Math.round((categoryScores[cat] || 0) / categoryTotals[cat] * 100);
        return pct >= 50;
    });

    // fallback: top category
    if (highRiskCategories.length === 0) {
        highRiskCategories = [
            Object.keys(categoryTotals).sort((a,b) =>
                (categoryScores[b]||0) - (categoryScores[a]||0)
            )[0]
        ];
    }

    // 2. Collect matching gear
    let allMatches = GEAR.filter(g => highRiskCategories.includes(g.cat));

    // 3. Remove equipment the employee already owns
    if (Array.isArray(window.employeeOwnedEquipment)) {
        allMatches = allMatches.filter(item =>
            !window.employeeOwnedEquipment.includes(item.item)
        );
    }

    // 4. Top 3
    top3Gear = allMatches.slice(0, 3);
const noDevicesMsg = $("noDevicesMsg");

if (top3Gear.length === 0) {
    noDevicesMsg.classList.remove("hidden");
} else {
    noDevicesMsg.classList.add("hidden");
}


    // 5. Render top 3
    $("topRecsContainer").innerHTML = top3Gear.map(g => `
        <div class="topRecItem">
            <strong>${g.item}</strong><br>
            <span>${g.cat}</span><br>
            <span>${g.cost}</span><br>
            <a href="${g.budgetLink}" target="_blank">Budget Option</a><br>
            <a href="${g.premiumLink}" target="_blank">Premium Option</a>
        </div>
    `).join("");

    // 6. Render all devices
    $("allDevicesContainer").innerHTML = allMatches.map(g => `
        <div class="allDeviceCard">
            <strong>${g.item}</strong><br>
            <span>${g.cat}</span><br>
            <span>${g.cost}</span><br>
            <a href="${g.budgetLink}" target="_blank">Budget Option</a><br>
            <a href="${g.premiumLink}" target="_blank">Premium Option</a>
        </div>
    `).join("");

    // 7. Cost estimate
    let low = 0, high = 0;
    top3Gear.forEach(i => {
        const parts = i.cost.replace(/\$/g,"").split("–");
        low += parseInt(parts[0]);
        high += parseInt(parts[1]);
    });

    totalCostEstimate = `$${low}–$${high}`;
    $("estCostText").textContent = "Estimated Cost: " + totalCostEstimate;
}


/* ============================================================
   Toggle device list
============================================================ */
$("toggleAllBtn").onclick = () => {
    const box = $("allDevicesWrapper");
    const hidden = box.classList.contains("hidden");

    if (hidden) {
        box.classList.remove("hidden");
        $("toggleAllBtn").textContent = "Hide All Device Options ▲";
    } else {
        box.classList.add("hidden");
        $("toggleAllBtn").textContent = "Show All Device Options ▼";
    }
};


/* ============================================================
   SAVE / LOG / CSV
============================================================ */

$("saveReportBtn").onclick = () =>
  $("saveModal").classList.remove("hidden");

$("cancelSaveBtn").onclick = () =>
  $("saveModal").classList.add("hidden");

// 🔒 Submission guard scoped ONLY to this button
$("confirmSaveBtn").onclick = async () => {
  const btn = $("confirmSaveBtn");
  btn.textContent = "Saving...";
  btn.disabled = true;

  try {
    // ----------------------------
    // Required fields
    // ----------------------------
    const employee = $("employeeName").value.trim();
    if (!employee) throw new Error("Employee name required");

    const email = $("employeeEmail").value.trim();
    if (!email) throw new Error("Email required");

    const employer = $("employerName").value.trim();

    const notes = $("reportNotes").value.trim();

    // ----------------------------
    // Google Form payload (FINAL)
    // ----------------------------
    const sheetPayload = {
      "When": new Date().toISOString(),
      "EmployeeName": employee,
      "Employer": employer,
      "Discipline": "Office",
      "Score": finalPercent,
      "Status": finalStatus,
      "Safe Items": strengthsList.join(" | "),
      "Flagged Items": needsList.join(" | "),
      "Gear Items": top3Gear.length,
      "Top Recs": top3Gear.map(g => g.item).join(" | "),
      "EstCostUSD": totalCostEstimate,
      "Notes": notes,
      "Email Address": email
    };

    console.log("Submitting payload:", sheetPayload);

    // 🔑 AWAIT submission
    await submitToGoogleForm(sheetPayload);

    // Close modal
    $("saveModal").classList.add("hidden");

    // Redirect
    window.location.href =
      "confirmation.html?email=" +
      encodeURIComponent(email) +
      "&employee=" +
      encodeURIComponent(employee);

  } catch (err) {
    alert("Save failed: " + err.message);
    console.error(err);
  } finally {
    // 🔓 ALWAYS reset button
    btn.textContent = "Save Report";
    btn.disabled = false;
  }
};


// ----------------------------
// View log
// ----------------------------
$("viewLogBtn").onclick = () => {
  renderLogTable();
  showSection("logView");
};


function renderLogTable() {
    const log = JSON.parse(localStorage.getItem("ergoLog") || "[]");

    $("logTableBody").innerHTML = log.map(r => `
        <tr>
            <td>${r.when}</td>
            <td>${r.employeeName}</td>
            <td>${r.discipline}</td>
            <td>${r.score}</td>
            <td>${r.status}</td>
            <td>${r.safeItems}</td>
            <td>${r.flaggedItems}</td>
            <td>${r.gearItems}</td>
            <td>${r.topRecs}</td>
            <td>${r.estCostUSD}</td>
            <td>${r.recTitles}</td>
            <td>${r.evaluatorNotes}</td>
<td>${r.photoIncluded ? "📸 Yes" : "—"}</td>
<td style="text-align:center;">
  ${r.hasPhoto ? "📷 Yes" : "—"}
</td>
        </tr>
    `).join("");
}

$("backBtn").onclick = () => showSection("resultsSection");

$("clearLogBtn").onclick = () => {
    if (confirm("Clear ALL entries?")) {
        localStorage.removeItem("ergoLog");
        renderLogTable();
    }
};

$("csvBtn").onclick = () => {
    const log = JSON.parse(localStorage.getItem("ergoLog") || "[]");
    if (!log.length) return alert("No saved reports.");

    let csv =
"WHEN,EmployeeName,Discipline,Score,Status,SafeItems,FlaggedItems,#Devices,EstCostUSD,TopDevices,RecTitles,EvaluatorNotes\n";

    log.forEach(r => {
        csv += [
            `"${r.when}"`,
            `"${r.employeeName}"`,
            `"${r.discipline}"`,
            `"${r.score}"`,
            `"${r.status}"`,
            `"${r.safeItems}"`,
            `"${r.flaggedItems}"`,
            `"${r.gearItems}"`,
            `"${r.estCostUSD}"`,
            `"${r.topRecs}"`,
            `"${r.recTitles}"`,
            `"${r.evaluatorNotes}"`
        ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ErgoEase_Office_Log.csv";
    link.click();
};


/* ============================================================
   RETAKE
============================================================ */
$("retakeBtn").onclick = () => {
    resetState();
    updateGauge(0);
    renderQuestion();
    showSection("screeningSection");
};
}); // ✅ CLOSE DOMContentLoaded

