const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const auth = require('../middleware/auth');

// Get all announcements for a class (Public - students need access)
router.get('/:classId', async (req, res) => {
    try {
        const announcements = await Announcement.find({ classId: req.params.classId })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ announcements });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Create new announcement (Protected - admin only)
router.post('/', auth, async (req, res) => {
    try {
        const { classId, type, title, description, subjectId, subjectName, dueDate, priority } = req.body;

        if (!classId || !type || !title) {
            return res.status(400).json({ error: 'classId, type, and title are required' });
        }

        const announcement = new Announcement({
            classId,
            type,
            title: title.trim(),
            description: (description || '').trim(),
            subjectId: subjectId || null,
            subjectName: subjectName || 'General',
            dueDate: dueDate || null,
            priority: priority || 'normal'
        });

        await announcement.save();
        res.status(201).json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Update announcement (Protected - admin only)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { type, title, description, subjectId, subjectName, dueDate, priority } = req.body;

        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

        // Update fields
        if (type) announcement.type = type;
        if (title) announcement.title = title.trim();
        if (description !== undefined) announcement.description = (description || '').trim();
        if (subjectId !== undefined) announcement.subjectId = subjectId || null;
        if (subjectName !== undefined) announcement.subjectName = subjectName || 'General';
        if (dueDate !== undefined) announcement.dueDate = dueDate || null;
        if (priority) announcement.priority = priority;

        await announcement.save();
        res.json(announcement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Delete announcement (Protected - admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Announcement deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
