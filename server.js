const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = 3000;

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://szbzpdbmqxyumyxgihnt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_OHGqy7JGLFtR3NOKBX_8FQ_iPJ03Oyl';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 전체 예약 목록 조회 API (관리자용)
app.get('/api/reservations', async (req, res) => {
    try {
        const { data, error } = await supabase.from('reservations').select('*');
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("조회 에러:", err.message);
        res.status(500).json({ success: false, message: '데이터를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 전화번호로 내 예약 검색 API (방문자용)
app.get('/api/reservations/search', async (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ success: false, message: '연락처를 입력해주세요.' });
    }
    try {
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('phone', phone)
            .neq('status', 'cancelled');

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("검색 에러:", err.message);
        res.status(500).json({ success: false, message: '검색 중 오류가 발생했습니다.' });
    }
});

// 예약 신청 API
app.post('/api/reservations', async (req, res) => {
    const { name, phone, department, studentId, enlistmentDate, date, time, reason } = req.body;

    if (!name || !phone || !department || !studentId || !enlistmentDate || !date || !time) {
        return res.status(400).json({ success: false, message: '모든 필수 정보를 입력해주세요.' });
    }

    try {
        const { data: existingData, error: fetchError } = await supabase.from('reservations').select('*');
        if (fetchError) throw fetchError;

        const isAlreadyBookedByPerson = existingData.some(
            item => (item.phone === phone || item.studentId === studentId) && item.status !== 'cancelled'
        );
        if (isAlreadyBookedByPerson) {
            return res.status(400).json({ success: false, message: '이미 해당 연락처나 학번으로 신청된 예약 내역이 존재합니다. (1인 1회)' });
        }

        const isAlreadyBookedTime = existingData.some(
            item => item.date === date && item.time === time && item.status !== 'cancelled'
        );
        if (isAlreadyBookedTime) {
            return res.status(400).json({ success: false, message: '이미 예약된 시간입니다. 다른 시간을 선택해주세요.' });
        }

        const newReservation = { 
            id: Date.now(), 
            name, 
            phone, 
            department, 
            studentId, 
            enlistment_date: enlistmentDate, // DB 컬럼명을 enlistment_date로 매칭
            date, 
            time, 
            reason: reason || '',
            status: 'confirmed'
        };

        const { error: insertError } = await supabase.from('reservations').insert([newReservation]);
        if (insertError) throw insertError;

        res.json({ success: true, message: '예약이 완료되었습니다!' });
    } catch (err) {
        console.error("예약 등록 에러:", err.message);
        res.status(500).json({ success: false, message: '서버 오류로 예약을 완료하지 못했습니다.' });
    }
});

// 예약 취소 API
app.delete('/api/reservations/:id', async (req, res) => {
    const id = Number(req.params.id);
    try {
        const { error } = await supabase
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        res.json({ success: true, message: '예약이 성공적으로 취소되었습니다.' });
    } catch (err) {
        console.error("취소 에러:", err.message);
        res.status(500).json({ success: false, message: '예약 취소 중 오류가 발생했습니다.' });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 실행 중입니다: http://localhost:${PORT}`);
});
