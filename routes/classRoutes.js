const express = require('express');
const router = express.Router();
const Classroom = require('../models/Classroom');

// @route   POST /api/class/create
// @desc    Create a new Classroom
router.post('/create', async (req, res) => {
    try {
        const { className, adminPin, totalStudents, subjects, timetable } = req.body;

        if (!className || !adminPin || !totalStudents) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const newClass = new Classroom({
            className,
            adminPin,
            totalStudents,
            subjects,
            timetable
        });

        const savedClass = await newClass.save();

        res.status(201).json({
            message: 'Class Created!',
            classId: savedClass._id,
            data: savedClass
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/class/:id/add-subject
// @desc    Add a new subject to existing class
router.post('/:id/add-subject', async (req, res) => {
    try {
        const { name } = req.body;
        const classId = req.params.id;

        const classroom = await Classroom.findById(classId);
        if (!classroom) return res.status(404).json({ error: 'Class not found' });

        // Add new subject
        classroom.subjects.push({ name });
        await classroom.save();

        res.json({
            message: 'Subject added successfully!',
            subject: classroom.subjects[classroom.subjects.length - 1]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/class/lookup/:className
// @desc    Find Class ID by Name (Case Insensitive)
router.get('/lookup/:className', async (req, res) => {
    try {
        const classroom = await Classroom.findOne({
            className: { $regex: new RegExp(`^${req.params.className}$`, 'i') }
        });

        if (!classroom) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ classId: classroom._id, className: classroom.className });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   PUT /api/class/update-timetable
// @desc    Update the Weekly Timetable
router.put('/update-timetable', async (req, res) => {
    try {
        const { classId, timetable } = req.body;

        await Classroom.findByIdAndUpdate(classId, { timetable });

        res.json({ message: "Timetable Updated Successfully! 🗓️" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   POST /api/class/admin-login
// @desc    Verify Admin PIN using Class Name
router.post('/admin-login', async (req, res) => {
    try {
        const { className, adminPin } = req.body;

        const classroom = await Classroom.findOne({
            className: { $regex: new RegExp(`^${className}$`, 'i') }
        });

        if (!classroom) {
            return res.status(404).json({ error: 'Class not found' });
        }

        if (classroom.adminPin !== adminPin) {
            return res.status(401).json({ error: 'Invalid PIN' });
        }

        res.json({ message: 'Login successful', classId: classroom._id });
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// @route   GET /api/class/:id
// @desc    Get Class Details
router.get('/:id', async (req, res) => {
    try {
        const classroom = await Classroom.findById(req.params.id);
        if (!classroom) return res.status(404).json({ error: 'Class not found' });
        res.json(classroom);
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;