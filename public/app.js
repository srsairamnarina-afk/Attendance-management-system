const $ = (id) => document.getElementById(id);
let students = [], subjects = [], reports = [];

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
$("attendance-date").value = today();

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
function showNotice(message, error = false) {
  const notice = $("notice");
  notice.textContent = message;
  notice.className = error ? "notice error" : "notice";
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => notice.classList.add("hidden"), 4500);
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function emptyRow(cols, text) { return `<tr><td class="empty" colspan="${cols}">${escapeHtml(text)}</td></tr>`; }
function statusPill(status) { return `<span class="status ${escapeHtml(status)}">${status === "Leave" ? "On leave" : escapeHtml(status)}</span>`; }

document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.view)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => showView(btn.dataset.go)));
function showView(view) {
  document.querySelectorAll(".view").forEach(section => section.classList.add("hidden"));
  $("view-" + view).classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  $("page-title").textContent = ({dashboard:"Dashboard",students:"Students",subjects:"Subjects",attendance:"Mark attendance",reports:"Reports"})[view];
  if (view === "attendance") loadAttendance();
  if (view === "reports") loadReports();
}

async function loadStudents() {
  students = await api("/api/students");
  $("student-count-label").textContent = `${students.length} student${students.length === 1 ? "" : "s"}`;
  renderStudents();
  const select = $("attendance-student");
  const selected = select.value;
  select.innerHTML = `<option value="">Choose student</option>` + students.map(s => `<option value="${s._id}">${escapeHtml(s.rollNo)} — ${escapeHtml(s.name)}</option>`).join("");
  if (students.some(s => s._id === selected)) select.value = selected;
}
function renderStudents() {
  const query = ($("student-search").value || "").toLowerCase();
  const filtered = students.filter(s => `${s.rollNo} ${s.name} ${s.className}`.toLowerCase().includes(query));
  $("students-list").innerHTML = filtered.length ? filtered.map(s => `<div class="record"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.rollNo)} · ${escapeHtml(s.className)}${s.email ? " · " + escapeHtml(s.email) : ""}</small></div><button class="delete-btn" data-delete-student="${s._id}">Delete</button></div>`).join("") : `<p class="empty">No students found.</p>`;
  document.querySelectorAll("[data-delete-student]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Delete this student and their attendance records?")) return;
    try { await api("/api/students/" + btn.dataset.deleteStudent, { method: "DELETE" }); await refreshAll(); showNotice("Student deleted."); }
    catch(e) { showNotice(e.message, true); }
  }));
}
$("student-search").addEventListener("input", renderStudents);
$("student-form").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try { await api("/api/students", { method: "POST", body: JSON.stringify(data) }); e.target.reset(); await refreshAll(); showNotice("Student added successfully."); }
  catch(err) { showNotice(err.message, true); }
});

async function loadSubjects() {
  subjects = await api("/api/subjects");
  $("subjects-list").innerHTML = subjects.length ? subjects.map(s => `<div class="record"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.code)}${s.teacher ? " · " + escapeHtml(s.teacher) : ""}</small></div><button class="delete-btn" data-delete-subject="${s._id}">Delete</button></div>`).join("") : `<p class="empty">No subjects added yet.</p>`;
  const select = $("attendance-subject");
  const selected = select.value;
  select.innerHTML = `<option value="">Choose subject</option>` + subjects.map(s => `<option value="${s._id}">${escapeHtml(s.code)} — ${escapeHtml(s.name)}</option>`).join("");
  if (subjects.some(s => s._id === selected)) select.value = selected;
  document.querySelectorAll("[data-delete-subject]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Delete this subject and its attendance records?")) return;
    try { await api("/api/subjects/" + btn.dataset.deleteSubject, { method: "DELETE" }); await refreshAll(); showNotice("Subject deleted."); }
    catch(e) { showNotice(e.message, true); }
  }));
}
$("subject-form").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try { await api("/api/subjects", { method: "POST", body: JSON.stringify(data) }); e.target.reset(); await refreshAll(); showNotice("Subject added successfully."); }
  catch(err) { showNotice(err.message, true); }
});

$("attendance-form").addEventListener("submit", async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    await api("/api/attendance", { method: "POST", body: JSON.stringify(data) });
    await loadAttendance(); await loadReports(); await loadDashboard();
    showNotice("Attendance saved successfully.");
  } catch(err) { showNotice(err.message, true); }
});
$("history-date").addEventListener("change", loadAttendance);
async function loadAttendance() {
  const date = $("history-date").value;
  const records = await api("/api/attendance" + (date ? "?date=" + encodeURIComponent(date) : ""));
  $("attendance-table").innerHTML = records.length ? records.map(a => `<tr><td>${escapeHtml(a.date)}</td><td>${escapeHtml(a.student?.rollNo || "—")}</td><td>${escapeHtml(a.student?.name || "Deleted student")}</td><td>${escapeHtml(a.subject?.code || "—")} · ${escapeHtml(a.subject?.name || "")}</td><td>${statusPill(a.status)}</td></tr>`).join("") : emptyRow(5, "No attendance records for this date.");
}

async function loadReports() {
  const data = await api("/api/reports");
  reports = data.students;
  $("reports-table").innerHTML = reports.length ? reports.map(r => `<tr><td>${escapeHtml(r.rollNo)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.className)}</td><td>${r.present}</td><td>${r.absent}</td><td>${r.leave}</td><td>${r.total}</td><td class="percentage ${r.percentage < 75 ? "low" : "good"}">${r.percentage}%</td></tr>`).join("") : emptyRow(8, "Add students and mark attendance to generate a report.");
}
$("export-csv").addEventListener("click", () => {
  const header = ["Roll No","Student","Class","Present","Absent","Leave","Total","Attendance %"];
  const rows = reports.map(r => [r.rollNo,r.name,r.className,r.present,r.absent,r.leave,r.total,r.percentage]);
  const csv = [header,...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = "attendance-report.csv"; a.click(); URL.revokeObjectURL(url);
});

async function loadDashboard() {
  const data = await api("/api/reports");
  $("stat-students").textContent = data.studentCount;
  $("stat-subjects").textContent = data.subjectCount;
  $("stat-records").textContent = data.attendanceCount;
  const total = data.students.reduce((sum, s) => sum + s.total, 0);
  const present = data.students.reduce((sum, s) => sum + s.present, 0);
  $("stat-average").textContent = total ? `${Math.round(present / total * 100)}%` : "0%";
  const records = await api("/api/attendance");
  $("recent-table").innerHTML = records.length ? records.slice(0,5).map(a => `<tr><td>${escapeHtml(a.student?.name || "Deleted student")}</td><td>${escapeHtml(a.subject?.name || "—")}</td><td>${escapeHtml(a.date)}</td><td>${statusPill(a.status)}</td></tr>`).join("") : emptyRow(4, "No attendance saved yet.");
}
async function refreshAll() {
  await Promise.all([loadStudents(), loadSubjects()]);
  await Promise.all([loadDashboard(), loadAttendance(), loadReports()]);
}
refreshAll().catch(err => showNotice("Could not load data: " + err.message + " Check your MongoDB connection and server terminal.", true));