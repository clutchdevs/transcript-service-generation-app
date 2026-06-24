import {
  cloneTranscriptResults,
  composeTranscriptFromResults,
  insertResultAfter,
  restoreResult,
  serializeTranscriptResults,
  softDeleteResult,
  updateResultContent,
} from './transcript-editor';
import { TranscriptResult } from '../../services/transcriptions/transcriptions.types';

describe('transcript editor utilities', () => {
  const baseResults: TranscriptResult[] = [
    {
      alternatives: [{ content: 'Hello', confidence: 0.98, language: 'en', speaker: 'S1' }],
      start_time: 0,
      end_time: 0.5,
      type: 'word',
    },
    {
      alternatives: [{ content: 'world', confidence: 0.8, language: 'en', speaker: 'S1' }],
      start_time: 0.6,
      end_time: 1,
      type: 'word',
    },
    {
      alternatives: [{ content: '.', confidence: 1, language: 'en', speaker: 'S1' }],
      start_time: 1,
      end_time: 1,
      type: 'punctuation',
      attaches_to: 'previous',
    },
  ];

  it('should compose text preserving punctuation attachment', () => {
    expect(composeTranscriptFromResults(baseResults)).toBe('Hello world.');
  });

  it('should mark edited tokens without losing timestamps', () => {
    const edited = updateResultContent(cloneTranscriptResults(baseResults), 1, 'there');

    expect(edited[1].alternatives[0].content).toBe('there');
    expect(edited[1].start_time).toBe(0.6);
    expect(edited[1].edit?.status).toBe('modified');
    expect(edited[1].edit?.originalContent).toBe('world');
    expect(edited[1].edit?.confidenceSource).toBe('invalidated');
  });

  it('should insert tokens with interpolated timing metadata', () => {
    const edited = insertResultAfter(cloneTranscriptResults(baseResults), 0, 'beautiful');

    expect(composeTranscriptFromResults(edited)).toBe('Hello beautiful world.');
    expect(edited[1].edit?.status).toBe('inserted');
    expect(edited[1].edit?.timingSource).toBe('interpolated');
  });

  it('should soft-delete and restore tokens', () => {
    const deleted = softDeleteResult(cloneTranscriptResults(baseResults), 1);

    expect(composeTranscriptFromResults(deleted)).toBe('Hello.');
    expect(deleted[1].edit?.status).toBe('deleted');

    const restored = restoreResult(deleted, 1);
    expect(composeTranscriptFromResults(restored)).toBe('Hello world.');
    expect(restored[1].edit).toBeUndefined();
  });

  it('should remove inserted tokens when restored', () => {
    const inserted = insertResultAfter(cloneTranscriptResults(baseResults), 0, 'new');
    const restored = restoreResult(inserted, 1);

    expect(composeTranscriptFromResults(restored)).toBe('Hello world.');
    expect(restored.length).toBe(baseResults.length);
  });

  it('should serialize edited transcript deterministically', () => {
    const cloned = cloneTranscriptResults(baseResults);

    expect(serializeTranscriptResults(cloned)).toBe(JSON.stringify(baseResults));
  });
});
