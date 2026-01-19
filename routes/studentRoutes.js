const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');
const Attendance = require('../models/Attendance');


// Get overall attendance report
router.get('/report/:classId/:rollNumber', async (req, res) => {
    try {
        const { classId, rollNumber } = req.params;
        const rollNo = parseInt(rollNumber);


        const classroom = await Classroom.findById(classId);
        if (!classroom) return res.status(404).json({ error: 'Class not found' });


        const allRecords = await Attendance.find({ classId });

        let report = {};


        classroom.subjects.forEach(sub => {
            report[sub._id] = {
                subjectName: sub.name,
                totalClasses: 0,
                attendedClasses: 0,
                status: "Neutral"
            };
        });


        allRecords.forEach(day => {
            day.periods.forEach(p => {
                const subId = p.subjectId;


                if (report[subId]) {
                    report[subId].totalClasses += 1;


                    if (!p.absentRollNumbers.includes(rollNo)) {
                        report[subId].attendedClasses += 1;
                    }
                }
            });
        });


        const finalReport = Object.values(report).map(subject => {
            const { totalClasses, attendedClasses } = subject;


            const percentage = totalClasses === 0 ? 100 : ((attendedClasses / totalClasses) * 100).toFixed(1);


            let bunkMsg = "";

            if (percentage >= 80) {
                const canBunk = Math.floor((attendedClasses / 0.75) - totalClasses);
                bunkMsg = `Safe! You can bunk ${canBunk} more classes.`;
            } else {
                bunkMsg = `Danger! Attend next few classes to recover.`;
            }

            return {
                ...subject,
                percentage: parseFloat(percentage),
                attended: attendedClasses,
                total: totalClasses,
                message: bunkMsg
            };
        });

        res.json({
            studentRoll: rollNo,
            className: classroom.className,
            subjects: finalReport
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get day-specific attendance for a student
router.get('/day-attendance/:classId/:rollNumber/:date', async (req, res) => {
    try {
        const { classId, rollNumber, date } = req.params;
        const rollNo = parseInt(rollNumber);

        const classroom = await Classroom.findById(classId);
        if (!classroom) return res.status(404).json({ error: 'Class not found' });

        // Find attendance record for this date
        const attendanceRecord = await Attendance.findOne({ classId, date: new Date(date) });

        if (!attendanceRecord || !attendanceRecord.periods || attendanceRecord.periods.length === 0) {
            return res.json({ periods: [] });
        }

        // Format periods with present/absent status
        const periodsWithStatus = attendanceRecord.periods.map(period => ({
            periodNum: period.periodNum,
            subjectName: period.subjectName,
            status: period.absentRollNumbers.includes(rollNo) ? 'Absent' : 'Present'
        }));

        res.json({ periods: periodsWithStatus });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Simulate bunk impact for multiple dates
router.post('/simulate-bunk', async (req, res) => {
    try {
        const { classId, rollNumber, dates } = req.body;
        const rollNo = parseInt(rollNumber);

        const classroom = await Classroom.findById(classId);
        if (!classroom) return res.status(404).json({ error: 'Class not found' });

        // Get current attendance
        const allRecords = await Attendance.find({ classId });

        let currentStats = {};
        classroom.subjects.forEach(sub => {
            currentStats[sub._id] = {
                subjectName: sub.name,
                totalClasses: 0,
                attendedClasses: 0
            };
        });

        // Calculate current attendance
        allRecords.forEach(day => {
            day.periods.forEach(p => {
                const subId = p.subjectId;
                if (currentStats[subId]) {
                    currentStats[subId].totalClasses += 1;
                    if (!p.absentRollNumbers.includes(rollNo)) {
                        currentStats[subId].attendedClasses += 1;
                    }
                }
            });
        });

        // Calculate impact for selected dates
        const impacts = [];
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        for (const subject of Object.values(currentStats)) {
            const subjectId = classroom.subjects.find(s => s.name === subject.subjectName)?._id;

            // Count how many classes this subject has on selected dates
            let classesOnSelectedDates = 0;
            dates.forEach(date => {
                const dayOfWeek = days[new Date(date).getDay()];
                const daySchedule = classroom.timetable?.[dayOfWeek] || [];
                const hasClass = daySchedule.some(slot => slot.subjectId === subjectId);
                if (hasClass) classesOnSelectedDates++;
            });

            const currentPercentage = subject.totalClasses === 0
                ? 100
                : (subject.attendedClasses / subject.totalClasses) * 100;

            const afterTotal = subject.totalClasses + classesOnSelectedDates;
            const afterAttended = subject.attendedClasses; // They're bunking, so attended stays same
            const afterPercentage = afterTotal === 0
                ? 100
                : (afterAttended / afterTotal) * 100;

            impacts.push({
                subjectName: subject.subjectName,
                currentPercentage,
                currentAttended: subject.attendedClasses,
                currentTotal: subject.totalClasses,
                afterPercentage,
                afterAttended,
                afterTotal,
                classesOnSelectedDates
            });
        }

        res.json({ impacts });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;