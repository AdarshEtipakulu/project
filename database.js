const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./attendance.db');

db.serialize(() => {
  // Students table
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    student_id TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attendance table
  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time_in TEXT NOT NULL,
    status TEXT DEFAULT 'Present',
    FOREIGN KEY (student_id) REFERENCES students (student_id)
  )`);
});

async function addStudent(name, email, studentId) {
  const hashedEmail = await bcrypt.hash(email, 10);
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO students (name, email, student_id) VALUES (?, ?, ?)',
      [name, hashedEmail, studentId],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function markAttendance(studentId, date, time) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO attendance (student_id, date, time_in) VALUES (?, ?, ?)',
      [studentId, date, time],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function getAttendanceReport(date) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT s.name, s.student_id, a.time_in 
       FROM attendance a 
       JOIN students s ON a.student_id = s.student_id 
       WHERE a.date = ? 
       ORDER BY a.time_in`,
      [date],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

async function verifyStudent(email, inputEmail) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM students WHERE email = ?',
      [inputEmail],
      async (err, row) => {
        if (err) reject(err);
        else if (row && await bcrypt.compare(inputEmail, row.email)) {
          resolve({ id: row.id, name: row.name, studentId: row.student_id });
        } else {
          resolve(null);
        }
      }
    );
  });
}

module.exports = { addStudent, markAttendance, getAttendanceReport, verifyStudent };
