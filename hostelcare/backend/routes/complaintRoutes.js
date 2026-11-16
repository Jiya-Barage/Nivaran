const express = require('express');
const {
  list,
  create,
  update,
  remove,
  restore,
} = require('../controllers/complaintController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.delete('/:id', remove);
router.post('/:id/restore', restore);

module.exports = router;
