# AttendEase — Attendance Management System

A beginner-friendly college project built with HTML, CSS, JavaScript, Node.js, Express, Mongoose and MongoDB.

## Features
- Add and delete students (roll number, name, class, email)
- Add and delete subjects (code, name, faculty)
- Mark a student Present, Absent or On leave for a subject/date
- Update an existing attendance entry by saving the same student + subject + date again
- Dashboard statistics and recent attendance
- Attendance percentage report and CSV export
- Search students

## Requirements
- Node.js (LTS)
- VS Code
- MongoDB Atlas account (recommended) or a running local MongoDB Server

> `mongosh` is a MongoDB shell; it does not by itself mean the MongoDB database server (`mongod`) is installed. Atlas avoids needing a local server.

## Setup in VS Code (Windows PowerShell)
1. Extract the ZIP and open the `attendance-management-system` folder in VS Code.
2. Open Terminal → New Terminal.
3. Check Node.js and npm:
   ```powershell
   node --version
   npm --version
   ```
   If either command is not found, install the Node.js LTS release from https://nodejs.org/ and reopen VS Code.
4. In MongoDB Atlas, create a free database deployment, create a database user, and add your current IP address under Network Access. Copy the application's connection string. Replace the username/password placeholders. If your password contains special characters, URL-encode them.
5. Copy `.env.example` to a new file named `.env`. Put the connection string on the `MONGODB_URI=` line. Keep `.env private; do not upload it to GitHub.
6. Install dependencies:
   ```powershell
   npm install
   ```
7. Start the app:
   ```powershell
   npm start
   ```
8. Open http://localhost:3000 in your browser.

## Mac terminal
The same commands work on macOS, using Terminal in VS Code. Install Node.js LTS first if `node --version` or `npm --version` fails.

## MongoDB collections
Mongoose creates these collections in `attendanceDB`:
- `students`
- `subjects`
- `attendances`

## Test the project
1. Add two students.
2. Add two subjects.
3. Open Mark attendance, choose a student and subject, select a date and status, then save.
4. Mark a second student's attendance.
5. Open Reports and verify counts/percentages.
6. Click Export CSV to download a report.

## API endpoints
- `GET /api/health` — connection status
- `GET /api/students`, `POST /api/students`, `DELETE /api/students/:id`
- `GET /api/subjects`, `POST /api/subjects`, `DELETE /api/subjects/:id`
- `GET /api/attendance`, `POST /api/attendance`
- `GET /api/reports`

## Important notes
- This is an academic starter project, not a production-ready student information system.
- Add authentication/authorization before deploying it publicly.
- Deleting a student or subject also deletes its attendance records.
- The percentage is calculated as Present records divided by all recorded attendance records (Present + Absent + Leave). Confirm your institution's policy if leave should be treated differently.
