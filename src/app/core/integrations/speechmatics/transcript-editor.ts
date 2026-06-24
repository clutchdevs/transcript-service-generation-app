import { TranscriptResult } from '../../services/transcriptions/transcriptions.types';

export type EditableTranscriptStatus = 'original' | 'modified' | 'inserted' | 'deleted';

export interface EditableTranscriptEditMetadata {
  status: EditableTranscriptStatus;
  originalContent?: string;
  timingSource?: 'speechmatics' | 'interpolated';
  confidenceSource?: 'speechmatics' | 'invalidated';
  updatedAt?: string;
}

export interface EditableTranscriptResult extends TranscriptResult {
  edit?: EditableTranscriptEditMetadata;
}

type TranscriptResultLike = Pick<TranscriptResult, 'type' | 'alternatives'> & Partial<Pick<TranscriptResult, 'attaches_to'>>;

export function cloneTranscriptResults(results: TranscriptResult[]): EditableTranscriptResult[] {
  return JSON.parse(JSON.stringify(results)) as EditableTranscriptResult[];
}

export function composeTranscriptFromResults(results: TranscriptResultLike[]): string {
  let text = '';

  for (const result of results) {
    if (isDeletedResult(result)) {
      continue;
    }

    const content = getResultContent(result);
    if (!content) {
      continue;
    }

    if (result.type === 'punctuation' && result.attaches_to === 'previous') {
      text += content;
      continue;
    }

    if (text.length > 0 && !text.endsWith(' ')) {
      text += ' ';
    }
    text += content;
  }

  return text.trim();
}

export function getResultContent(result: TranscriptResultLike): string {
  return result.alternatives?.[0]?.content ?? '';
}

export function updateResultContent(
  results: EditableTranscriptResult[],
  index: number,
  nextContent: string,
): EditableTranscriptResult[] {
  const updatedResults = cloneTranscriptResults(results);
  const result = updatedResults[index];

  if (!result?.alternatives?.[0]) {
    return results;
  }

  const originalContent = result.edit?.originalContent ?? result.alternatives[0].content;
  result.alternatives[0].content = nextContent;
  result.edit = {
    ...result.edit,
    status: result.edit?.status === 'inserted' ? 'inserted' : nextContent === originalContent ? 'original' : 'modified',
    originalContent,
    confidenceSource: nextContent === originalContent ? 'speechmatics' : 'invalidated',
    timingSource: result.edit?.timingSource ?? 'speechmatics',
    updatedAt: new Date().toISOString(),
  };

  if (result.edit.status === 'original') {
    delete result.edit;
  }

  return updatedResults;
}

export function insertResultAfter(
  results: EditableTranscriptResult[],
  index: number,
  content: string,
): EditableTranscriptResult[] {
  const updatedResults = cloneTranscriptResults(results);
  const previous = updatedResults[index];
  const next = updatedResults[index + 1];
  const startTime = previous?.end_time ?? previous?.start_time ?? 0;
  const endTime = next?.start_time && next.start_time > startTime
    ? next.start_time
    : startTime + 0.01;
  const language = previous?.alternatives?.[0]?.language ?? next?.alternatives?.[0]?.language;
  const speaker = previous?.alternatives?.[0]?.speaker ?? next?.alternatives?.[0]?.speaker;

  const inserted: EditableTranscriptResult = {
    alternatives: [
      {
        content,
        confidence: null,
        ...(language ? { language } : {}),
        ...(speaker ? { speaker } : {}),
      },
    ],
    start_time: startTime,
    end_time: endTime,
    type: 'word',
    edit: {
      status: 'inserted',
      timingSource: 'interpolated',
      confidenceSource: 'invalidated',
      updatedAt: new Date().toISOString(),
    },
  };

  updatedResults.splice(index + 1, 0, inserted);
  return updatedResults;
}

export function softDeleteResult(results: EditableTranscriptResult[], index: number): EditableTranscriptResult[] {
  const updatedResults = cloneTranscriptResults(results);
  const result = updatedResults[index];

  if (!result) {
    return results;
  }

  result.edit = {
    ...result.edit,
    status: 'deleted',
    originalContent: result.edit?.originalContent ?? getResultContent(result),
    timingSource: result.edit?.timingSource ?? 'speechmatics',
    confidenceSource: result.edit?.confidenceSource ?? 'speechmatics',
    updatedAt: new Date().toISOString(),
  };

  return updatedResults;
}

export function restoreResult(results: EditableTranscriptResult[], index: number): EditableTranscriptResult[] {
  const updatedResults = cloneTranscriptResults(results);
  const result = updatedResults[index];

  if (!result) {
    return results;
  }

  if (result.edit?.status === 'inserted') {
    updatedResults.splice(index, 1);
    return updatedResults;
  }

  if (result.edit?.originalContent && result.alternatives?.[0]) {
    result.alternatives[0].content = result.edit.originalContent;
  }
  delete result.edit;

  return updatedResults;
}

export function isDeletedResult(result: TranscriptResultLike): boolean {
  return (result as EditableTranscriptResult).edit?.status === 'deleted';
}

export function serializeTranscriptResults(results: EditableTranscriptResult[]): string {
  return JSON.stringify(results);
}
