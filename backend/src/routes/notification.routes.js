// =============================================================================
// ISKOlarship - Notification Routes
// In-app notification endpoints for students
// =============================================================================

const express = require('express');
const router = express.Router();
const { Notification } = require('../models/Notification.model');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// =============================================================================
// GET /api/notifications — List notifications for the current user
// Query params: ?unreadOnly=true&limit=50&offset=0
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 30, offset = 0 } = req.query;

    const filter = { user: userId };
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        unreadCount,
        hasMore: Number(offset) + notifications.length < total,
      },
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// =============================================================================
// GET /api/notifications/unread-count — Quick badge count
// =============================================================================
router.get('/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user.id, read: false });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch unread count' });
  }
});

// =============================================================================
// PATCH /api/notifications/:id/read — Mark a single notification as read
// =============================================================================
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// =============================================================================
// PATCH /api/notifications/mark-all-read — Mark all notifications as read
// =============================================================================
router.patch('/mark-all-read', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user.id, read: false },
      { read: true }
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    console.error('Error marking all as read:', err);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

// =============================================================================
// DELETE /api/notifications/:id — Delete a single notification
// =============================================================================
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

module.exports = router;
