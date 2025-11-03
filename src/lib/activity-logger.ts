// Activity logging utilities for parent dashboard
// Client-side logger that calls API endpoint

export type ActivityType = 'letter' | 'math' | 'explore' | 'chat';

export interface LogActivityParams {
  profileId: string;
  activityType: ActivityType;
  activityId?: string;
  activityName?: string;
  durationSeconds?: number;
  completed?: boolean;
  score?: number;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const response = await fetch('/api/activity/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.error('Failed to log activity:', response.statusText);
    }
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging shouldn't break the app
  }
}

// Helper functions for common activities
export async function logLetterPractice(
  profileId: string,
  letter: string,
  completed: boolean,
  durationSeconds: number
) {
  return logActivity({
    profileId,
    activityType: 'letter',
    activityId: `letter_${letter.toLowerCase()}`,
    activityName: `Bokstav ${letter}`,
    durationSeconds,
    completed,
  });
}

export async function logMathActivity(
  profileId: string,
  activityId: string,
  activityName: string,
  score: number,
  durationSeconds: number
) {
  return logActivity({
    profileId,
    activityType: 'math',
    activityId,
    activityName,
    durationSeconds,
    completed: true,
    score,
  });
}

export async function logExploreLesson(
  profileId: string,
  topicId: string,
  lessonTitle: string,
  durationSeconds: number
) {
  return logActivity({
    profileId,
    activityType: 'explore',
    activityId: topicId,
    activityName: lessonTitle,
    durationSeconds,
    completed: true,
  });
}

export async function logChatMessage(profileId: string) {
  return logActivity({
    profileId,
    activityType: 'chat',
    activityName: 'Pratat med Sinus',
    durationSeconds: 0,
    completed: true,
  });
}

