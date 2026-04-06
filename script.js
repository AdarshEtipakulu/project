let video, canvas, ctx;
let isCameraActive = false;

async function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Load face-api models
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
    ]);
    
    console.log('Face-api models loaded');
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 400, height: 300 } 
        });
        video.srcObject = stream;
        video.play();
        isCameraActive = true;
        document.getElementById('status').textContent = 'Camera ready! Click Mark Attendance';
        document.getElementById('markAttendanceBtn').disabled = false;
        
        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        });
    } catch (err) {
        document.getElementById('status').textContent = 'Error accessing camera: ' + err.message;
        document.getElementById('status').className = 'status error';
    }
}

async function markAttendance() {
    if (!isCameraActive) {
        alert('Please start camera first');
        return;
    }

    const email = document.getElementById('markEmail').value;
    if (!email) {
        alert('Please enter email');
        return;
    }

    // Capture photo
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('photo', blob, 'selfie.jpg');
        formData.append('email', email);

        try {
            document.getElementById('status').textContent = 'Processing face recognition...';
            document.getElementById('status').className = 'status';
            
            const response = await fetch('http://localhost:5000/api/attendance', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                document.getElementById('status').textContent = result.message;
                document.getElementById('status').className = 'status success';
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            document.getElementById('status').textContent = 'Error: ' + error.message;
            document.getElementById('status').className = 'status error';
        }
    }, 'image/jpeg');
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', document.getElementById('name').value);
    formData.append('email', document.getElementById('regEmail').value);
    formData.append('studentId', document.getElementById('studentId').value);
    formData.append('photo', document.getElementById('photo').files[0]);

    try {
        const response = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        
        if (result.success) {
            alert('Student registered successfully!');
            document.getElementById('registerForm').reset();
        }
    } catch (error) {
        alert('Registration failed: ' + error.message);
    }
});

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'mark') {
        if (!isCameraActive) startCamera();
    }
}

async function loadReport() {
    const date = document.getElementById('reportDate').value;
    if (!date) {
        alert('Please select a date');
        return;
    }

    try {
        const response = await fetch(`http://localhost:5000/api/report/${date}`);
        const report = await response.json();
        
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Student ID</th>
                        <th>Time In</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        report.forEach(student => {
            html += `
                <tr>
                    <td>${student.name}</td>
                    <td>${student.student_id}</td>
                    <td>${student.time_in}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('reportTable').innerHTML = html;
    } catch (error) {
        alert('Error loading report: ' + error.message);
    }
}

// Initialize
init();
document.getElementById('reportDate').value = new Date().toISOString().split('T')[0];
