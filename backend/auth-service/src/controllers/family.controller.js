const pool = require('../config/db');

async function listConnections(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        fc.id,
        fc.status,
        fc.created_at,
        CASE WHEN fc.requester_id = $1 THEN requested.id ELSE requester.id END AS user_id,
        CASE WHEN fc.requester_id = $1 THEN requested.phone ELSE requester.phone END AS phone,
        CASE WHEN fc.requester_id = $1 THEN requested.name ELSE requester.name END AS name,
        CASE WHEN fc.requester_id = $1 THEN requested.role ELSE requester.role END AS role
      FROM family_connections fc
      JOIN users requester ON requester.id = fc.requester_id
      JOIN users requested ON requested.id = fc.requested_id
      WHERE fc.requester_id = $1 OR fc.requested_id = $1
      ORDER BY fc.created_at DESC
      `,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

async function createConnection(req, res, next) {
  try {
    const phone = String(req.body.phone || '').trim();
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกเบอร์โทร 10 หลัก' });
    }

    const target = await pool.query('SELECT id, phone, name, role FROM users WHERE phone = $1', [phone]);
    if (target.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานเบอร์นี้' });
    }
    if (target.rows[0].id === req.user.id) {
      return res.status(400).json({ success: false, message: 'ไม่สามารถเชื่อมกับตัวเองได้' });
    }

    const result = await pool.query(
      `
      INSERT INTO family_connections (requester_id, requested_id)
      VALUES ($1, $2)
      ON CONFLICT (requester_id, requested_id)
      DO UPDATE SET status = 'pending', updated_at = now()
      RETURNING id, status
      `,
      [req.user.id, target.rows[0].id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateConnection(req, res, next) {
  try {
    const status = req.body.status;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }
    const result = await pool.query(
      `
      UPDATE family_connections
      SET status = $1, updated_at = now()
      WHERE id = $2 AND (requester_id = $3 OR requested_id = $3)
      RETURNING id, status
      `,
      [status, req.params.id, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอเชื่อมต่อ' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}

module.exports = { listConnections, createConnection, updateConnection };
