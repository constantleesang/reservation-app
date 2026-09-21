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
    const userReservations = data.filter(item => item.phone === phone);
    res.json(userReservations);
});

// 예약 신청 API
app.post('/api/reservations', (req, res) => {
    const { name, phone, date, time } = req.body;

    if (!name || !phone || !date || !time) {
        return res.status(400).json({ success: false, message: '모든 정보를 입력해주세요.' });
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

    // 중복 예약 확인
    const isAlreadyBooked = data.some(item => item.date === date && item.time === time);
    if (isAlreadyBooked) {
        return res.status(400).json({ success: false, message: '이미 예약된 시간입니다. 다른 시간을 선택해주세요.' });
    }

    // 새 예약 추가
    const newReservation = { id: Date.now(), name, phone, date, time };
    data.push(newReservation);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    res.json({ success: true, message: '예약이 완료되었습니다!' });
});

// 예약 취소 API
app.delete('/api/reservations/:id', (req, res) => {
    const id = Number(req.params.id);
    let data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    const initialLength = data.length;
    
    data = data.filter(item => item.id !== id);

    if (data.length === initialLength) {
        return res.status(404).json({ success: false, message: '해당 예약을 찾을 수 없습니다.' });
    }

    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true, message: '예약이 성공적으로 취소되었습니다.' });
});

app.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});