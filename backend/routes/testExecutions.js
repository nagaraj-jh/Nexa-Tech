
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: Retrieve all test executions
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        te.*,
        p.name AS prompt_name,
        pv.version_number,
        tc.name AS test_case_name
      FROM test_executions te
      JOIN prompts p ON te.prompt_id = p.id
      JOIN prompt_versions pv ON te.prompt_version_id = pv.id
      JOIN test_cases tc ON te.test_case_id = tc.id
      ORDER BY te.created_at DESC
    `);

    res.json({
      success: true,
      executions: result.rows,
    });
  } catch (error) {
    console.error('Fetch executions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch executions',
    });
  }
});

// POST: Save a test execution result
router.post('/', async (req, res) => {
  try {
    const {
      prompt_id,
      prompt_version_id,
      test_case_id,
      actual_output,
      status,
      execution_time,
    } = req.body;

    if (
      !prompt_id ||
      !prompt_version_id ||
      !test_case_id ||
      actual_output === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: 'Required execution details are missing',
      });
    }

    const result = await pool.query(
      `INSERT INTO test_executions (
        prompt_id,
        prompt_version_id,
        test_case_id,
        actual_output,
        status,
        execution_time
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        prompt_id,
        prompt_version_id,
        test_case_id,
        actual_output,
        status || 'Success',
        execution_time || 0,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Execution result saved successfully',
      execution: result.rows[0],
    });
  } catch (error) {
    console.error('Save execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save execution result',
    });
  }
});

module.exports = router;
