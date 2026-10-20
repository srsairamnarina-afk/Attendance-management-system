require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const studentSchema = new mongoose.Schema({
  rollNo: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  className: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: "" }
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true, unique: true },
  name: { type: String, required: true, trim: true },
  teacher: { type: String, trim: true, default: "" }
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent", "Leave"], required: true }
}, { timestamps: true });

attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });

const Student = mongoose.model("Student", studentSchema);
const Subject = mongoose.model("Subject", subjectSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

app.get("/api/health", (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));

// Students
app.get("/api/students", async (req, res) => {
  try { res.json(await Student.find().sort({ rollNo: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/students", async (req, res) => {
  try {
    const student = await Student.create({
      rollNo: req.body.rollNo, name: req.body.name,
      className: req.body.className, email: req.body.email || ""
    });
    res.status(201).json(student);
  } catch (e) { res.status(400).json({ error: e.code === 11000 ? "That roll number already exists." : e.message }); }
});
app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found." });
    await Attendance.deleteMany({ student: student._id });
    res.json({ message: "Student and related attendance deleted." });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Subjects
app.get("/api/subjects", async (req, res) => {
  try { res.json(await Subject.find().sort({ code: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.post("/api/subjects", async (req, res) => {
  try {
    const subject = await Subject.create({
      code: req.body.code, name: req.body.name, teacher: req.body.teacher || ""
    });
    res.status(201).json(subject);
  } catch (e) { res.status(400).json({ error: e.code === 11000 ? "That subject code already exists." : e.message }); }
});
app.delete("/api/subjects/:id", async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: "Subject not found." });
    await Attendance.deleteMany({ subject: subject._id });
    res.json({ message: "Subject and related attendance deleted." });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Mark or update attendance for a student, subject and date.
app.post("/api/attendance", async (req, res) => {
  try {
    const { student, subject, date, status } = req.body;
    if (!student || !subject || !date || !["Present", "Absent", "Leave"].includes(status)) {
      return res.status(400).json({ error: "Choose a student, subject, date and valid status." });
    }
    const record = await Attendance.findOneAndUpdate(
      { student, subject, date },
      { student, subject, date, status },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.json(record);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get("/api/attendance", async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = req.query.date;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.student) filter.student = req.query.student;
    const records = await Attendance.find(filter)
      .populate("student", "rollNo name className")
      .populate("subject", "code name")
      .sort({ date: -1, createdAt: -1 });
    res.json(records);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/reports", async (req, res) => {
  try {
    const students = await Student.find().sort({ rollNo: 1 });
    const subjects = await Subject.find().sort({ code: 1 });
    const attendance = await Attendance.find();
    const rows = students.map(student => {
      const studentRecords = attendance.filter(a => String(a.student) === String(student._id));
      const total = studentRecords.length;
      const present = studentRecords.filter(a => a.status === "Present").length;
      return {
        _id: student._id, rollNo: student.rollNo, name: student.name,
        className: student.className, total, present,
        absent: studentRecords.filter(a => a.status === "Absent").length,
        leave: studentRecords.filter(a => a.status === "Leave").length,
        percentage: total ? Math.round((present / total) * 1000) / 10 : 0
      };
    });
    res.json({ students: rows, studentCount: students.length, subjectCount: subjects.length, attendanceCount: attendance.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI. Copy .env.example to .env and configure MongoDB.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");
    app.listen(PORT, () => console.log(`Attendance app running at http://localhost:${PORT}`));
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  }
}
start();