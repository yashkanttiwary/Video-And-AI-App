/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

interface Mode {
  emoji: string;
  description: string;
  prompt: string | ((input: string) => string);
  isList?: boolean;
  subModes?: Record<string, string>;
}

const modes: Record<string, Mode> = {
  'A/V captions': {
    emoji: '👀',
    description:
      'Generate detailed, time-stamped captions for every scene, including dialogue and visual descriptions.',
    prompt: `You are an expert video analyst. Your task is to generate precise, structured captions for the provided video.

**CRITICAL INSTRUCTIONS:**
1.  **GRANULARITY REQUIREMENT:** You MUST break the video down into very short, time-stamped segments. A new caption entry MUST be created every 5-10 seconds, WITHOUT FAIL. Also create a new entry for any significant visual change or new line of dialogue, even if it is less than 5 seconds. DO NOT group long periods of time into a single entry. This is a strict requirement.
2.  **CONTENT:** For each segment, provide a concise description of the visuals AND transcribe any spoken dialogue verbatim.
3.  **FUNCTION CALL:** Call the 'set_timecodes' function **only once** with a single array containing all the generated timecode objects.

**Example of the required granular output:**
[
  { "time": "00:00:02", "text": "A shot of a sunlit kitchen counter." },
  { "time": "00:00:06", "text": "A person's hands are chopping vegetables." },
  { "time": "00:00:10", "text": "Dialogue: 'Is everything ready for dinner?'" },
  { "time": "00:00:14", "text": "Another person walks into the frame. Dialogue: 'Almost!'" }
]`,
    isList: true,
  },

  'Simple Captions': {
    emoji: '💬',
    description:
      'Get a simple, time-stamped transcript of all spoken dialogue in the original language.',
    prompt: `You are a transcription specialist. Your task is to accurately transcribe all spoken dialogue from the provided media file.

**CRITICAL INSTRUCTIONS:**
1.  **GRANULARITY REQUIREMENT:** You MUST break the transcription into short, easy-to-read lines. A new caption MUST be created for each individual sentence. If a sentence is long, you MUST break it at a natural pause (like a comma or a breath). DO NOT group multiple sentences under a single timestamp. This is a strict requirement.
2.  **ACCURACY:** Transcribe the speech verbatim. Do not add descriptions. If speech is unclear, use "[inaudible]".
3.  **FUNCTION CALL:** Call the 'set_timecodes' function **only once** with a single array of all the transcription objects.

**Example of the required granular output:**
[
  { "time": "00:02:10", "text": "This is the first sentence that was spoken." },
  { "time": "00:02:13", "text": "And this is the very next one," },
  { "time": "00:02:15", "text": "even if it's part of the same thought." },
  { "time": "00:02:18", "text": "It's important to keep them separate." }
]`,
    isList: true,
  },

  Paragraph: {
    emoji: '📝',
    description:
      'Summarize the entire content into a single, concise paragraph.',
    prompt: `Generate a paragraph that summarizes this video. Keep it to 3 to 5 \
sentences. Place each sentence of the summary into an object sent to \
set_timecodes with the timecode of the sentence in the video.`,
  },

  'Key moments': {
    emoji: '🔑',
    description:
      'Identify and list the most important moments as a bulleted list.',
    prompt: `Generate bullet points for the video. Place each bullet point into an \
object sent to set_timecodes with the timecode of the bullet point in the video.`,
    isList: true,
  },

  'AI Cut': {
    emoji: '✂️',
    description:
      'Analyzes your media for filler words, awkward pauses, and repetition, providing a time-stamped list of suggested cuts to tighten your edit.',
    prompt: `You are an expert video editor's assistant. Your task is to analyze the provided media file and identify opportunities to tighten the edit.

**CRITICAL INSTRUCTIONS:**
1.  **IDENTIFY IMPERFECTIONS:** Scrutinize the audio track for filler words (e.g., "um", "uh", "like", "you know"), awkward or overly long pauses, and repeated words or phrases.
2.  **PROVIDE ACTIONABLE SUGGESTIONS:** For each identified imperfection, provide a clear, concise editing suggestion with a precise timestamp. The text should clearly state the issue and the suggested action (e.g., "Filler word 'um', suggest cutting.", "Long pause, suggest trimming.", "Repetitive phrase 'and so', suggest removing second instance.").
3.  **FUNCTION CALL:** Call the 'set_timecodes' function **only once** with a single array containing all the suggested edits as timecode objects. For example, an entry might have a time of "00:00:21" and text of "Filler word: 'um'. Suggest cutting."`,
    isList: true,
  },

  'B-Roll Ideas': {
    emoji: '🎬',
    description:
      'Get a creative partner that analyzes your content and suggests relevant B-roll shots to enhance your visual storytelling.',
    prompt: `You are a creative video director. Your task is to analyze the content of the provided media and suggest relevant B-roll shots to enhance the storytelling.

**CRITICAL INSTRUCTIONS:**
1.  **CONTEXTUAL RELEVANCE:** Base your suggestions on the spoken dialogue and visual context at specific moments in the video.
2.  **ACTIONABLE IDEAS:** Provide concrete, visual ideas for B-roll footage. For example, instead of "show something about coffee", suggest "Close-up of steam rising from a coffee mug."
3.  **FORMAT:** Each suggestion must be a separate item with a precise timestamp corresponding to the moment it should illustrate.
4.  **FUNCTION CALL:** Call the 'set_timecodes' function **only once** with a single array containing all the B-roll suggestions as timecode objects. For example, an entry might have a time of "00:01:15" and text of "B-roll suggestion: Close-up of hands typing on a keyboard."`,
    isList: true,
  },

  'Sound Cues': {
    emoji: '🎵',
    description:
      'Get time-stamped suggestions for where to add music or sound effects to enhance the emotional impact of your edit.',
    prompt: `You are an expert sound designer for film. Your task is to analyze the provided media file and suggest audio cues to enhance the emotional impact.

**CRITICAL INSTRUCTIONS:**
1.  **IDENTIFY KEY MOMENTS:** Listen for emotional shifts, dramatic reveals, key actions, or transitions that could be heightened with audio.
2.  **SUGGEST CUES:** For each moment, suggest either a type of music (e.g., "Subtle, hopeful music begins") or a specific sound effect (e.g., "Add a 'whoosh' sound effect").
3.  **FORMAT:** Each suggestion must be a separate item with a precise timestamp where the audio cue should begin.
4.  **FUNCTION CALL:** Call the 'set_timecodes' function **only once** with a single array containing all the sound cue suggestions as timecode objects. For example, an entry might have a time of "00:00:45" and text of "Sound Cue: Add a 'whoosh' sound effect as the car passes."`,
    isList: true,
  },
  Table: {
    emoji: '🗓️',
    description:
      'List all objects detected in the video, with timestamps and descriptions, in a table format.',
    prompt: `You are an expert video analyst. Your task is to identify all significant objects that appear in the video.

**CRITICAL INSTRUCTIONS:**
1.  **IDENTIFY OBJECTS:** For various points in time, list the prominent objects visible.
2.  **CONTEXT:** Briefly describe the scene or context where the objects appear.
3.  **FUNCTION CALL:** Call the 'set_timecodes_with_objects' function **only once** with a single array containing all the identified objects and their corresponding timestamps and descriptions.

**Example output:**
[
  { "time": "00:00:05", "text": "A person is preparing a meal.", "objects": ["knife", "cutting board", "tomato"] },
  { "time": "00:00:12", "text": "The camera pans to a dining table.", "objects": ["plate", "fork", "glass of water"] }
]`,
  },
  Chart: {
    emoji: '📈',
    description:
      'Plot a specific metric over time on a chart. You can choose a preset or provide a custom metric.',
    prompt: (input: string) =>
      `You are an expert data analyst. Your task is to analyze the video and extract numeric data for the specified metric over time. The metric to analyze is: "${input}". Sample the video at regular intervals and call the 'set_timecodes_with_numeric_values' function with the resulting data points. The 'value' must be a number.`,
    subModes: {
      Sentiment:
        'Overall emotional sentiment of the dialogue/scene, on a scale from -1 (very negative) to 1 (very positive).',
      'Energy level':
        'The energy level or intensity of action in the scene, on a scale from 1 to 10.',
      'Number of faces': 'The number of human faces visible in the frame.',
      Custom: '',
    },
  },
  Custom: {
    emoji: '✨',
    description:
      'Write your own prompt to analyze the video in any way you want.',
    prompt: (input: string) => `You are a helpful AI assistant. Analyze the video based on the following user instruction and respond by calling the most appropriate function ('set_timecodes', 'set_timecodes_with_objects', 'set_timecodes_with_numeric_values') to structure your output. If none of the functions are suitable, provide a concise text-based answer.

User Instruction: "${input}"`,
  },
};

export default modes;
