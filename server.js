const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { faceapi } = require('./faceRecognition');
const db = require('./database');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

// Serve face-api models
app.use('/models', express.static(path.join(__dirname, '../node_modules/face-api.js/weights')));

app.post('/api/register', upload.single('photo'), async (req, res) => {
  try {
    const { name, email, studentId } = req.body;
    const student = await db.addStudent(name, email, studentId);
    
    // Save face descriptor
    if (req.file) {
      const descriptor = await faceapi.getFaceDescriptor(req.file.path);
      // In production, save descriptor to database
    }
    
    res.json({ success: true, studentId: student });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/attendance', upload.single('photo'), async (req, res) => {
  try {
    const { email } = req.body;
    const student = await db.verifyStudent(email);
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString();
    
    await db.markAttendance(student.studentId, date, time);
    res.json({ success: true, message: `Welcome ${student.name}! Attendance marked.` });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/report/:date?', async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    const report = await db.getAttendanceReport(date);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
