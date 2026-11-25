
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET: Retrieve all test cases
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tc.id,
        tc.prompt_id,
        tc.name,
        tc.input,
        tc.expected_output,
        tc.category,
        tc.created_at,
        tc.updated_at,
        p.name AS prompt_name
      FROM test_cases tc
      JOIN prompts p ON tc.prompt_id = p.id
      ORDER BY tc.created_at DESC
    `);

    res.json({
      success: true,
      testCases: result.rows,
    });
  } catch (error) {
    console.error('Get test cases error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve test cases',
    });
  }
});

// POST: Create a test case
router.post('/', async (req, res) => {
  const {
    prompt_id,
    name,
    input,
    expected_output,
    category,
  } = req.body;

  const promptId = Number(prompt_id);

  if (
    !Number.isInteger(promptId) ||
    promptId <= 0 ||
    !name?.trim() ||
    !input?.trim() ||
    !expected_output?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Prompt, name, input and expected output are required',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO test_cases
       (prompt_id, name, input, expected_output, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        promptId,
        name.trim(),
        input.trim(),
        expected_output.trim(),
        category?.trim() || 'General',
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Test case created successfully',
      testCase: result.rows[0],
    });
  } catch (error) {
    console.error('Create test case error:', error.message);

    if (error.code === '23503') {
      return res.status(404).json({
        success: false,
        message: 'Selected prompt does not exist',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create test case',
    });
  }
});

// PUT: Update a test case
router.put('/:id', async (req, res) => {
  const testCaseId = Number(req.params.id);

  const {
    prompt_id,
    name,
    input,
    expected_output,
    category,
  } = req.body;

  const promptId = Number(prompt_id);

  if (!Number.isInteger(testCaseId) || testCaseId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid test case ID',
    });
  }

  if (
    !Number.isInteger(promptId) ||
    promptId <= 0 ||
    !name?.trim() ||
    !input?.trim() ||
    !expected_output?.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: 'Prompt, name, input and expected output are required',
    });
  }

  try {
    const result = await pool.query(
      `UPDATE test_cases
       SET prompt_id = $1,
           name = $2,
           input = $3,
           expected_output = $4,
           category = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [
        promptId,
        name.trim(),
        input.trim(),
        expected_output.trim(),
        category?.trim() || 'General',
        testCaseId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found',
      });
    }

    res.json({
      success: true,
      message: 'Test case updated successfully',
      testCase: result.rows[0],
    });
  } catch (error) {
    console.error('Update test case error:', error.message);

    if (error.code === '23503') {
      return res.status(404).json({
        success: false,
        message: 'Selected prompt does not exist',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update test case',
    });
  }
});

// DELETE: Delete a test case
router.delete('/:id', async (req, res) => {
  const testCaseId = Number(req.params.id);

  if (!Number.isInteger(testCaseId) || testCaseId <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid test case ID',
    });
  }

  try {
    const result = await pool.query(
      'DELETE FROM test_cases WHERE id = $1 RETURNING id',
      [testCaseId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Test case not found',
      });
    }

    res.json({
      success: true,
      message: 'Test case deleted successfully',
    });
  } catch (error) {
    console.error('Delete test case error:', error.message);

    res.status(500).json({
      success: false,
      message: 'Failed to delete test case',
    });
  }
});

module.exports = router;
