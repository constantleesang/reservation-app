const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'reservations.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 초기 DB 파일 생성
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// 전체 예약 목록 조회 API (관리자용)
app.get('/api/reservations', (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    res.json(data);
});

// 전화번호로 내 예약 검색 API (방문자용)
app.get('/api/reservations/search', (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: '연락처를 입력해주세요.' });
    }
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // 취소되지 않은 예약만 조회되도록 필터링
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

    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

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
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    res.json({ success: true, message: '예약이 완료되었습니다!' });
});

// 예약 취소 API (데이터를 지우지 않고 상태를 'cancelled'로 변경하여 취소 현황 유지)
app.delete('/api/reservations/:id', (req, res) => {
    const id = Number(req.params.id);
    let data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    
    const target = data.find(item => item.id === id);

    if (!target) {
        return res.status(404).json({ success: false, message: '해당 예약을 찾을 수 없습니다.' });
    }

    target.status = 'cancelled';
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    
    res.json({ success: true, message: '예약이 성공적으로 취소되었습니다.' });
});

app.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});
