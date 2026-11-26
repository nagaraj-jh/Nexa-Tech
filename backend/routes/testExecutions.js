
const express = require('express');
const router = express.Router();
const pool = require('../db');

const {
  generatePromptResponse,
} = require('../services/geminiService');

// ==========================================
// GET: Retrieve all test executions
// ==========================================

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
      message: error.message,
    });
  }
});

// ==========================================
// POST: FULL REGRESSION TESTING WITH N8N
// ==========================================

router.post('/regression', async (req, res) => {
  const promptId = Number(req.body.prompt_id);
  const versionIds = req.body.prompt_version_ids;

  if (
    !Number.isInteger(promptId) ||
    promptId <= 0 ||
    !Array.isArray(versionIds) ||
    versionIds.length < 2 ||
    versionIds.some(id => !Number.isInteger(Number(id)) || Number(id) <= 0)
  ) {
    return res.status(400).json({
      success: false,
      message: 'A valid prompt ID and at least two prompt versions are required.',
    });
  }

  const selectedIds = versionIds.map(Number);

  if (new Set(selectedIds).size !== selectedIds.length) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate prompt versions are not allowed.',
    });
  }

  const webhookUrl = process.env.N8N_REGRESSION_WEBHOOK_URL;

  if (!webhookUrl) {
    return res.status(500).json({
      success: false,
      message: 'N8N_REGRESSION_WEBHOOK_URL is missing from backend/.env',
    });
  }

  const startTime = Date.now();

  try {
    // 1. Fetch prompt and selected versions.

    const promptResult = await pool.query(
      `SELECT id, name
       FROM prompts
       WHERE id = $1`,
      [promptId]
    );

    if (promptResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt not found.',
      });
    }

    const prompt = promptResult.rows[0];

    const versionsResult = await pool.query(
      `SELECT id, version_number, content
       FROM prompt_versions
       WHERE prompt_id = $1
         AND id = ANY($2::int[])`,
      [promptId, selectedIds]
    );

    if (versionsResult.rows.length !== selectedIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected versions do not belong to this prompt.',
      });
    }

    const versionMap = new Map(
      versionsResult.rows.map(version => [version.id, version])
    );

    const versions = selectedIds.map(id => versionMap.get(id));

    // 2. Load all saved test cases for this prompt.

    const testCasesResult = await pool.query(
      `SELECT
        id,
        name,
        input,
        expected_output,
        category
       FROM test_cases
       WHERE prompt_id = $1
       ORDER BY id ASC`,
      [promptId]
    );

    const testCases = testCasesResult.rows;

    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No saved test cases found for this prompt.',
      });
    }

    // 3. Generate Gemini responses for every version and test case.

    console.log('Starting full regression testing...');
    console.log('Prompt:', prompt.name);
    console.log('Versions:', versions.length);
    console.log('Test cases:', testCases.length);

    const evaluations = await Promise.all(
      versions.flatMap(version =>
        testCases.map(async testCase => {
          const generationStart = Date.now();

          const actualOutput = await generatePromptResponse(
            version.content,
            testCase.input
          );

          return {
            promptId: prompt.id,
            promptName: prompt.name,
            promptVersionId: version.id,
            version: version.version_number,
            testCaseId: testCase.id,
            testCaseName: testCase.name,
            category: testCase.category,
            input: testCase.input,
            expectedOutput: testCase.expected_output,
            actualOutput,
            executionTime: Date.now() - generationStart,
          };
        })
      )
    );

    // 4. Send generated responses to n8n.

    console.log('Sending evaluations to n8n...');

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        evaluations: evaluations.map(item => ({
          promptId: item.promptId,
          promptName: item.promptName,
          version: item.version,
          testCaseId: item.testCaseId,
          testCaseName: item.testCaseName,
          category: item.category,
          input: item.input,
          expectedOutput: item.expectedOutput,
          actualOutput: item.actualOutput,
        })),
      }),
    });

    const responseText = await n8nResponse.text();

    if (!n8nResponse.ok) {
      console.error('n8n error:', responseText);

      return res.status(502).json({
        success: false,
        message: 'n8n AI Judge evaluation failed.',
        upstreamStatus: n8nResponse.status,
      });
    }

    let n8nResult;

    try {
      n8nResult = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        success: false,
        message: 'n8n returned invalid JSON.',
      });
    }

    // 5. Extract AI Judge results.

    let judgeResults =
      n8nResult.evaluation ||
      n8nResult.evaluations ||
      n8nResult;

    if (!Array.isArray(judgeResults)) {
      return res.status(502).json({
        success: false,
        message: 'n8n did not return an evaluation array.',
      });
    }

    if (judgeResults.length !== evaluations.length) {
      return res.status(502).json({
        success: false,
        message: 'The number of AI Judge results does not match the generated responses.',
      });
    }

    // Support common Basic LLM Chain output formats.

    const normalizeResult = item => {
      let result = item.output ?? item;

      if (typeof result === 'string') {
        result = JSON.parse(result);
      }

      if (result && typeof result.text === 'string') {
        result = JSON.parse(result.text);
      }

      return result;
    };

    judgeResults = judgeResults.map(normalizeResult);

    // 6. Validate scores before saving.

    const scoreFields = [
      'accuracy',
      'relevance',
      'clarity',
      'safety',
      'completeness',
      'overallScore',
    ];

    for (const result of judgeResults) {
      for (const field of scoreFields) {
        const score = Number(result[field]);

        if (!Number.isFinite(score) || score < 0 || score > 10) {
          return res.status(502).json({
            success: false,
            message: `Invalid AI Judge score: ${field}`,
          });
        }
      }
    }

    // 7. Calculate regression against the first selected version.
    // A drop of at least 1 point in overall score is flagged.

    const baselineScores = new Map();

    evaluations.forEach((item, index) => {
      if (index < testCases.length) {
        baselineScores.set(
          item.testCaseId,
          Number(judgeResults[index].overallScore)
        );
      }
    });

    const client = await pool.connect();

    const savedExecutions = [];

    try {
      await client.query('BEGIN');

      for (let i = 0; i < evaluations.length; i++) {
        const item = evaluations[i];
        const judge = judgeResults[i];

        const baselineScore = baselineScores.get(item.testCaseId);

        const versionIndex = selectedIds.indexOf(
          item.promptVersionId
        );

        const scoreDrop =
          versionIndex > 0 &&
          baselineScore - Number(judge.overallScore) >= 1;

        const regressionDetected =
          Boolean(judge.regressionDetected) || scoreDrop;

        const saved = await client.query(
          `INSERT INTO test_executions (
            prompt_id,
            prompt_version_id,
            test_case_id,
            actual_output,
            status,
            accuracy_score,
            relevance_score,
            clarity_score,
            completeness_score,
            safety_score,
            overall_score,
            strengths,
            weaknesses,
            recommendations,
            regression_detected,
            execution_time
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16
          )
          RETURNING *`,
          [
            promptId,
            item.promptVersionId,
            item.testCaseId,
            item.actualOutput,
            'Completed',
            judge.accuracy,
            judge.relevance,
            judge.clarity,
            judge.completeness,
            judge.safety,
            judge.overallScore,
            JSON.stringify(judge.strengths || []),
            JSON.stringify(judge.weaknesses || []),
            JSON.stringify(judge.recommendations || []),
            regressionDetected,
            item.executionTime,
          ]
        );

        savedExecutions.push(saved.rows[0]);
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;

    } finally {
      client.release();
    }

    // 8. Return complete regression report.

    return res.status(200).json({
      success: true,
      message: 'Full regression testing completed successfully.',
      prompt: prompt.name,
      totalVersions: versions.length,
      totalTestCases: testCases.length,
      totalEvaluations: savedExecutions.length,
      totalRegressions: savedExecutions.filter(
        item => item.regression_detected
      ).length,
      totalExecutionTime: Date.now() - startTime,
      executions: savedExecutions,
    });

  } catch (error) {
    console.error('Full regression testing error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Full regression testing failed.',
    });
  }
});

// ==========================================
// POST: Compare two prompt versions using Gemini
// EXISTING FUNCTIONALITY PRESERVED
// ==========================================

router.post('/compare', async (req, res) => {
  const {
    prompt_version_id_v1,
    prompt_version_id_v2,
    test_case_id,
  } = req.body || {};

  const version1Id = Number(prompt_version_id_v1);
  const version2Id = Number(prompt_version_id_v2);
  const testCaseId = Number(test_case_id);

  if (
    !Number.isInteger(version1Id) ||
    !Number.isInteger(version2Id) ||
    !Number.isInteger(testCaseId) ||
    version1Id <= 0 ||
    version2Id <= 0 ||
    testCaseId <= 0 ||
    version1Id === version2Id
  ) {
    return res.status(400).json({
      success: false,
      message: 'Two different prompt versions and a valid test case are required.',
    });
  }

  const startTime = Date.now();

  try {
    const details = await pool.query(
      `SELECT
        pv1.id AS version1_id,
        pv1.prompt_id,
        pv1.version_number AS version1_number,
        pv1.content AS version1_content,
        pv2.id AS version2_id,
        pv2.version_number AS version2_number,
        pv2.content AS version2_content,
        tc.id AS test_case_id,
        tc.input AS test_input
      FROM prompt_versions pv1
      JOIN prompt_versions pv2
        ON pv1.prompt_id = pv2.prompt_id
      JOIN test_cases tc
        ON tc.prompt_id = pv1.prompt_id
      WHERE pv1.id = $1
        AND pv2.id = $2
        AND tc.id = $3`,
      [version1Id, version2Id, testCaseId]
    );

    if (details.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt versions or test case not found, or they do not belong to the same prompt.',
      });
    }

    const item = details.rows[0];

    const [response_v1, response_v2] = await Promise.all([
      generatePromptResponse(item.version1_content, item.test_input),
      generatePromptResponse(item.version2_content, item.test_input),
    ]);

    const executionTime = Date.now() - startTime;
    const client = await pool.connect();

    let savedExecutions;

    try {
      await client.query('BEGIN');

      const firstExecution = await client.query(
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
          item.prompt_id,
          item.version1_id,
          item.test_case_id,
          response_v1,
          'Completed',
          executionTime,
        ]
      );

      const secondExecution = await client.query(
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
          item.prompt_id,
          item.version2_id,
          item.test_case_id,
          response_v2,
          'Completed',
          executionTime,
        ]
      );

      await client.query('COMMIT');

      savedExecutions = [
        firstExecution.rows[0],
        secondExecution.rows[0],
      ];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;

    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      message: 'Both Gemini responses generated successfully.',
      response_v1,
      response_v2,
      evaluation: null,
      executions: savedExecutions,
      version1_number: item.version1_number,
      version2_number: item.version2_number,
    });

  } catch (error) {
    console.error('Gemini comparison error:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Gemini comparison failed.',
      error: error.message,
    });
  }
});

// ==========================================
// POST: Save an individual test execution
// EXISTING FUNCTIONALITY PRESERVED
// ==========================================

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
      error: error.message,
    });
  }
});

module.exports = router;
