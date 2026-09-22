const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'reservations.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 💡 [안전장치 함수] Render 환경에서 파일이 비거나 깨지는 현상을 방지하는 함수
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify([]));
            return [];
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        if (!fileContent.trim()) {
            return [];
        }
        return JSON.parse(fileContent);
    } catch (error) {
        console.error("DB 읽기 에러:", error);
        return [];
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("DB 쓰기 에러:", error);
    }
}

// 초기 DB 파일 생성 확인
if (!fs.existsSync(DB_FILE)) {
    writeDB([]);
}

// 전체 예약 목록 조회 API (관리자용)
app.get('/api/reservations', (req, res) => {
    const data = readDB();
    res.json(data);
});

// 전화번호로 내 예약 검색 API (방문자용)
app.get('/api/reservations/search', (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: '연락처를 입력해주세요.' });
    }
    const data = readDB();
    const userReservations = data.filter(item => item.phone === phone && item.status !== 'cancelled');
    res.json(userReservations);
});

// 예약 신청 API
app.post('/api/reservations', (req, res) => {
    const { name, phone, department, studentId, enlistmentDate, date, time, reason } = req.body;

    // 필수 입력값 검증
    if (!name || !phone || !department || !studentId || !enlistmentDate || !date || !time) {
        return res.status(400).json({ success: false, message: '모든 필수 정보를 입력해주세요.' });
    }

    const data = readDB();

    // 1. 동일한 사람(연락처 또는 학번)의 중복 예약 차단 (취소된 건 제외)
    const isAlreadyBookedByPerson = data.some(
        item => (item.phone === phone || item.studentId === studentId) && item.status !== 'cancelled'
    );
    if (isAlreadyBookedByPerson) {
        return res.status(400).json({ success: false, message: '이미 해당 연락처나 학번으로 신청된 예약 내역이 존재합니다. (1인 1회)' });
    }

    // 2. 동일한 시간대 중복 예약 차단 (취소된 건 제외)
    const isAlreadyBookedTime = data.some(
        item => item.date === date && item.time === time && item.status !== 'cancelled'
    );
    if (isAlreadyBookedTime) {
        return res.status(400).json({ success: false, message: '이미 예약된 시간입니다. 다른 시간을 선택해주세요.' });
    }

    // 새 예약 추가
    const newReservation = { 
        id: Date.now(), 
        name, 
        phone, 
        department, 
        studentId, 
        enlistmentDate, 
        date, 
        time, 
        reason: reason || '',
        status: 'confirmed', // 'confirmed'(예약완료), 'cancelled'(취소됨)
        createdAt: new Date().toISOString()
    };

    data.push(newReservation);
    writeDB(data);

    res.json({ success: true, message: '예약이 완료되었습니다!' });
});

// 예약 취소 API (데이터를 지우지 않고 상태를 'cancelled'로 변경)
app.delete('/api/reservations/:id', (req, res) => {
    const id = Number(req.params.id);
    let data = readDB();
    
    const target = data.find(item => item.id === id);

    if (!target) {
        return res.status(404).json({ success: false, message: '해당 예약을 찾을 수 없습니다.' });
    }

    target.status = 'cancelled';
    writeDB(data);
    
    res.json({ success: true, message: '예약이 성공적으로 취소되었습니다.' });
});

app.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});
