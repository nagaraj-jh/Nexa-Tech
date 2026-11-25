
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: Retrieve all prompts and their versions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.created_at,
        p.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id,
              'version', pv.version_number,
              'content', pv.content,
              'createdAt', pv.created_at
            )
            ORDER BY pv.version_number
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'
        ) AS versions
      FROM prompts p
      LEFT JOIN prompt_versions pv ON p.id = pv.prompt_id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      prompts: result.rows,
    });
  } catch (error) {
    console.error('Get prompts error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompts',
    });
  }
});

// POST: Create a new prompt with Version 1
router.post('/', async (req, res) => {
  const { name, content } = req.body;

  if (!name?.trim() || !content?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Prompt name and content are required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const promptResult = await client.query(
      `INSERT INTO prompts (name)
       VALUES ($1)
       RETURNING *`,
      [name.trim()]
    );

    const prompt = promptResult.rows[0];

    const versionResult = await client.query(
      `INSERT INTO prompt_versions
       (prompt_id, version_number, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [prompt.id, 1, content.trim()]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Prompt created successfully',
      prompt: {
        ...prompt,
        versions: [versionResult.rows[0]],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create prompt error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to create prompt',
    });
  } finally {
    client.release();
  }
});

// POST: Add a new version to an existing prompt
router.post('/:id/versions', async (req, res) => {
  const { content } = req.body;
  const promptId = Number(req.params.id);

  if (!Number.isInteger(promptId) || promptId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid prompt ID',
    });
  }

  if (!content?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Prompt content is required',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const promptResult = await client.query(
      'SELECT id FROM prompts WHERE id = $1 FOR UPDATE',
      [promptId]
    );

    if (promptResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Prompt not found',
      });
    }

    const versionResult = await client.query(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM prompt_versions
       WHERE prompt_id = $1`,
      [promptId]
    );

    const nextVersion = Number(
      versionResult.rows[0].next_version
    );

    const newVersion = await client.query(
      `INSERT INTO prompt_versions
       (prompt_id, version_number, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [promptId, nextVersion, content.trim()]
    );

    await client.query(
      'UPDATE prompts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [promptId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'New prompt version created',
      version: newVersion.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create version error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to create prompt version',
    });
  } finally {
    client.release();
  }
});

// DELETE: Delete a prompt and its versions
router.delete('/:id', async (req, res) => {
  const promptId = Number(req.params.id);

  if (!Number.isInteger(promptId) || promptId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid prompt ID',
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM prompts WHERE id = $1 RETURNING id',
      [promptId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found',
      });
    }

    res.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error) {
    console.error('Delete prompt error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to delete prompt',
    });
  }
});

module.exports = router;
