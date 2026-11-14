import test from 'node:test';
import assert from 'node:assert/strict';
import type { MCQQuestion, MockExamQuestion, Unit } from '../types/deco.ts';
import {
  calculateAnalyticsSummary,
  calculateOverallProgress,
  calculateUnitProgress,
  scoreMockExam,
  scoreQuizAttempt,
  searchWorkspace,
} from './progress.ts';

function makeUnit(unitNumber: 1 | 2 | 3 | 4 | 5, statuses: ('not_started' | 'in_progress' | 'completed')[]): Unit {
  return {
    unitNumber,
    title: `Unit ${unitNumber}`,
    overview: 'Overview',
    learningObjectives: [],
    revisionSummary: '',
    sourceDocs: [],
    topics: statuses.map((status, idx) => ({
      id: `u${unitNumber}_t${idx}`,
      unitNumber,
      title: `Topic ${unitNumber}.${idx + 1}`,
      description: 'Topic description',
      status,
      sourceRefs: [],
      definitions: [],
      formulas: [],
      diagrams: [],
      workedExamples: [],
      revisionCount: status === 'completed' ? 2 : 0,
    })),
  };
}

test('progress starts at 0 for empty or not_started units and updates accurately', () => {
  const emptyOverall = calculateOverallProgress([]);
  assert.equal(emptyOverall.percentage, 0);
  assert.equal(emptyOverall.completedTopics, 0);

  const unit1 = makeUnit(1, ['completed', 'in_progress', 'not_started', 'not_started']);
  assert.equal(calculateUnitProgress(unit1).percentage, 25);

  const unit2 = makeUnit(2, ['completed', 'completed']);
  const overall = calculateOverallProgress([unit1, unit2]);
  assert.equal(overall.totalTopics, 6);
  assert.equal(overall.completedTopics, 3);
  assert.equal(overall.percentage, 50);
});

test('scoreQuizAttempt grades answers and detects weak topics', () => {
  const questions: MCQQuestion[] = [
    {
      id: 'q1',
      unitNumber: 1,
      topicTitle: 'Boolean Algebra',
      question: 'De Morgan theorem?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 1,
      explanation: 'B is right',
      sourceRef: 'Unit1.pdf, p. 2',
    },
    {
      id: 'q2',
      unitNumber: 2,
      topicTitle: 'Flip-Flops',
      question: 'JK race around?',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 2,
      explanation: 'C is right',
      sourceRef: 'Unit2.pdf, p. 5',
    },
  ];

  const attempt = scoreQuizAttempt({
    id: 'attempt_1',
    mode: 'unit',
    questions,
    selections: { q1: 1, q2: 0 },
    timeTakenSeconds: 45,
  });

  assert.equal(attempt.correctCount, 1);
  assert.equal(attempt.scorePercent, 50);
  assert.deepEqual(attempt.weakTopics, ['Flip-Flops']);

  const analytics = calculateAnalyticsSummary([makeUnit(1, ['completed'])], [attempt], []);
  assert.equal(analytics.totalQuestionsAttempted, 2);
  assert.equal(analytics.averageQuizScore, 50);
  assert.equal(analytics.weakTopics[0].topicTitle, 'Flip-Flops');
});

test('scoreMockExam computes MCQ and subjective keyword scores with unit breakdown', () => {
  const questions: MockExamQuestion[] = [
    {
      id: 'm1',
      unitNumber: 1,
      topicTitle: 'K-Maps',
      category: '2-mark',
      marks: 2,
      question: 'Define minterm.',
      options: ['Sum term', 'Product term', 'Constant', 'Gate'],
      correctOptionIndex: 1,
      modelAnswer: 'Product term containing all variables.',
      keywords: ['product', 'variables'],
      sourceRef: 'Unit1.pdf, p. 4',
    },
    {
      id: 'm2',
      unitNumber: 3,
      topicTitle: 'Pipelining',
      category: '5-mark',
      marks: 5,
      question: 'Explain structural and data hazards.',
      modelAnswer: 'Structural hazards occur due to resource conflicts...',
      keywords: ['structural', 'data', 'stall', 'forwarding'],
      sourceRef: 'Unit3.pdf, p. 9',
    },
  ];

  const result = scoreMockExam({
    id: 'mock_1',
    config: {
      scope: 'full',
      durationMinutes: 30,
      totalMarks: 7,
      questionCount: 2,
      categories: ['2-mark', '5-mark'],
    },
    questions,
    userResponses: {
      m1: { selectedOption: 1 },
      m2: { textAnswer: 'Structural hazards happen on resource conflict and data hazards use forwarding or stall.' },
    },
    startedAt: '2026-11-13T10:00:00Z',
    timeSpentSeconds: 600,
  });

  assert.equal(result.totalMarks, 7);
  assert.ok(result.scoreObtained >= 5);
  assert.equal(result.unitBreakdown.length, 2);
});

test('searchWorkspace finds matching topics and document pages', () => {
  const units = [makeUnit(1, ['not_started'])];
  units[0].topics[0].title = 'Booth Multiplication Algorithm';
  const results = searchWorkspace({
    query: 'Booth',
    units,
    documents: [],
    importantQuestions: [],
    flashcards: [],
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].type, 'topic');
});
