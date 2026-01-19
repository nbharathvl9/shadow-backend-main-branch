const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');


router.post('/mark', async (req, res) => {
    try {
        const { classId, date, periods } = req.body;

        if (!classId || !date || !periods) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        const updatedRecord = await Attendance.findOneAndUpdate(
            { classId: classId, date: date },
            { $set: { periods: periods } },
            { new: true, upsert: true }
        );

        res.json({ message: 'Attendance Saved Successfully!', data: updatedRecord });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});


router.get('/:classId/:date', async (req, res) => {
    try {
        const { classId, date } = req.params;
        const record = await Attendance.findOne({ classId, date });


        res.json(record || null);

    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/attendance/by-date/:classId/:date
// @desc    Get attendance for a specific date
router.get('/by-date/:classId/:date', async (req, res) => {
    try {
        const { classId, date } = req.params;
        const record = await Attendance.findOne({ classId, date });

        if (!record) {
            return res.status(404).json({ error: 'No attendance for this date' });
        }

        res.json(record);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/attendance/dates/:classId
// @desc    Get list of all dates with attendance data
router.get('/dates/:classId', async (req, res) => {
    try {
        const { classId } = req.params;
        const records = await Attendance.find({ classId }).select('date -_id');

        const dates = records.map(r => r.date);

        res.json({ dates });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;