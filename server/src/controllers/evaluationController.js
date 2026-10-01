import Joi from 'joi';
import { Evaluation } from '../models/Evaluation.js';

const createSchema = Joi.object({
  seminarCode: Joi.string().trim().required(),
  score: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow('').optional(),
  evaluatedBy: Joi.alternatives()
    .try(
      Joi.string().hex().length(24),
      Joi.object()
    )
    .optional()
});

// GET /api/evaluations
export async function getAllEvaluations(req, res, next) {
  try {
    const evaluations = await Evaluation.find().sort({ createdAt: -1 }).lean();
    res.json({ evaluations });
  } catch (err) { next(err); }
}

// GET /api/evaluations/:id
export async function getEvaluation(req, res, next) {
  try {
    const evaluation = await Evaluation.findById(req.params.id).lean();
    if (!evaluation) {
      return res.status(404).json({ message: 'Evaluation not found' });
    }

    res.json({ evaluation });
  } catch (err) { next(err); }
}

// POST /api/evaluations
export async function createEvaluation(req, res, next) {
  try {
    const { value, error } = createSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    const evaluation = await Evaluation.create(value);
    res.status(201).json({ evaluation: evaluation.toObject() });
  } catch (err) { next(err); }
}

// GET /api/evaluations/summary?seminarCode=SM101
export async function getEvaluationSummary(req, res, next) {
  try {
    const seminarCode = Array.isArray(req.query.seminarCode)
      ? req.query.seminarCode[0]
      : req.query.seminarCode;

    if (!seminarCode) {
      return res.status(400).json({ message: 'seminarCode is required' });
    }

    const summary = await Evaluation.aggregate([
      { $match: { seminarCode } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$score' },
          evaluationCount: { $sum: 1 }
        }
      }
    ]);

    if (!summary.length) {
      return res.json({ seminarCode, averageScore: 0, evaluationCount: 0 });
    }

    const row = summary[0];
    res.json({
      seminarCode,
      averageScore: Number(row.averageScore ?? 0),
      evaluationCount: Number(row.evaluationCount ?? 0)
    });
  } catch (err) { next(err); }
}
