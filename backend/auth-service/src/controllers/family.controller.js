const pool = require('../config/db');

async function listConnections(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT fc.id, fc.status, fc.created_at, fc.updated_at,
             fc.requester_id, fc.requested_id,
             CASE WHEN fc.requester_id = $1 THEN requested.id ELSE requester.id END AS user_id,
             CASE WHEN fc.requester_id = $1 THEN requested.phone ELSE requester.phone END AS phone,
             CASE WHEN fc.requester_id = $1 THEN requested.name ELSE requester.name END AS name,
             CASE WHEN fc.requester_id = $1 THEN requested.role ELSE requester.role END AS role,
             CASE WHEN fc.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction
      FROM family_connections fc
      JOIN users requester ON requester.id = fc.requester_id
      JOIN users requested ON requested.id = fc.requested_id
      WHERE fc.requester_id = $1 OR fc.requested_id = $1
      ORDER BY fc.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
}

async function createConnection(req, res, next) {
  try {
    const phone = String(req.body.phone || '').replace(/\D/g, '');
    if (!/^0\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกเบอร์โทร 10 หลัก' });
    }

    const [meResult, targetResult] = await Promise.all([
      pool.query('SELECT id, name, role FROM users WHERE id = $1', [req.user.id]),
      pool.query('SELECT id, phone, name, role FROM users WHERE phone = $1', [phone]),
    ]);
    const me = meResult.rows[0];
    const target = targetResult.rows[0];

    if (!target) return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้งานเบอร์นี้' });
    if (!me || me.id === target.id) return res.status(400).json({ success: false, message: 'ไม่สามารถเชื่อมกับตัวเองได้' });
    if (me.role === target.role) {
      return res.status(400).json({ success: false, message: 'AHA เชื่อมต่อได้ระหว่างผู้สูงอายุกับผู้ดูแลเท่านั้น' });
    }

    const existing = await pool.query(`
      SELECT id, requester_id, requested_id, status
      FROM family_connections
      WHERE (requester_id = $1 AND requested_id = $2)
         OR (requester_id = $2 AND requested_id = $1)
      ORDER BY created_at DESC LIMIT 1
    `, [me.id, target.id]);

    if (existing.rowCount) {
      const row = existing.rows[0];
      if (row.status === 'accepted') return res.status(409).json({ success: false, message: 'เชื่อมต่อกันอยู่แล้ว', data: row });
      if (row.status === 'pending') {
        return res.status(409).json({
          success: false,
          code: row.requester_id === me.id ? 'OUTGOING_REQUEST_EXISTS' : 'INCOMING_REQUEST_EXISTS',
          message: row.requester_id === me.id ? 'ส่งคำขอเชื่อมต่อไปแล้ว' : 'ผู้ใช้นี้ส่งคำขอเชื่อมต่อมาหาคุณแล้ว กรุณากดยอมรับคำขอ',
          data: row,
        });
      }

      const updated = await pool.query(`
        UPDATE family_connections
        SET requester_id = $1, requested_id = $2, status = 'pending', updated_at = now()
        WHERE id = $3
        RETURNING id, requester_id, requested_id, status
      `, [me.id, target.id, row.id]);
      return res.status(201).json({ success: true, data: updated.rows[0] });
    }

    const result = await pool.query(`
      INSERT INTO family_connections (requester_id, requested_id)
      VALUES ($1, $2)
      RETURNING id, requester_id, requested_id, status
    `, [me.id, target.id]);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
}

async function updateConnection(req, res, next) {
  try {
    const status = req.body.status;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }

    const result = await pool.query(`
      UPDATE family_connections
      SET status = $1, updated_at = now()
      WHERE id = $2 AND requested_id = $3 AND status = 'pending'
      RETURNING id, requester_id, requested_id, status
    `, [status, req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({ success: false, message: 'ไม่พบคำขอที่รอการยืนยัน หรือคุณไม่มีสิทธิ์ดำเนินการ' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
}

async function deleteConnection(req, res, next) {
  try {
    const result = await pool.query(`
      DELETE FROM family_connections
      WHERE id = $1
        AND (requester_id = $2 OR requested_id = $2)
      RETURNING id, requester_id, requested_id, status
    `, [req.params.id, req.user.id]);

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบการเชื่อมต่อ หรือคุณไม่มีสิทธิ์ลบการเชื่อมต่อนี้',
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) { return next(error); }
}

async function listRecipientIds(req, res, next) {
  try {
    const targetUserId = req.user?.role === 'system' ? req.params.userId : req.user.id;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'userId is required' });

    // Return only the OTHER accepted family members.
    // The caller already knows the sender id; including it here caused SOS
    // notifications to be delivered back to the person who pressed SOS.
    const result = await pool.query(`
      SELECT requester_id AS user_id FROM family_connections
      WHERE requested_id = $1 AND status = 'accepted'
      UNION
      SELECT requested_id AS user_id FROM family_connections
      WHERE requester_id = $1 AND status = 'accepted'
    `, [targetUserId]);
    res.json({ success: true, data: result.rows.map((row) => row.user_id) });
  } catch (error) { next(error); }
}

async function listLinkedElderly(req, res, next) {
  try {
    const caregiverId = req.user?.role === 'system' ? req.params.userId : req.user.id;
    const result = await pool.query(`
      SELECT u.id AS user_id, u.name, u.phone, u.age
      FROM family_connections fc
      JOIN users u ON u.id = CASE
        WHEN fc.requester_id = $1 THEN fc.requested_id
        ELSE fc.requester_id
      END
      WHERE fc.status = 'accepted'
        AND (fc.requester_id = $1 OR fc.requested_id = $1)
        AND u.role = 'elderly'
      ORDER BY u.name NULLS LAST, u.created_at
    `, [caregiverId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
}

module.exports = { listConnections, createConnection, updateConnection, deleteConnection, listRecipientIds, listLinkedElderly };
