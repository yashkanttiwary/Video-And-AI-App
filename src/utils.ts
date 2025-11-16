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

import {TextTimecode} from './types';

/**
 * Converts a timecode string (e.g., "01:23", "01:23:45", "45") or a number
 * into seconds.
 * @param timecode The timecode string or number of seconds.
 * @returns The total number of seconds.
 */
export const timeToSecs = (timecode: string | number): number => {
  if (typeof timecode === 'number') {
    return timecode;
  }
  if (!timecode.includes(':')) {
    return parseFloat(timecode);
  }

  const split = timecode.split(':').map(parseFloat);

  if (split.some(isNaN)) {
    return 0;
  }

  return split.length === 2
    ? split[0] * 60 + split[1]
    : split[0] * 3600 + split[1] * 60 + split[2];
};

/**
 * Converts seconds into an SRT timestamp format (HH:MM:SS,ms).
 * @param secs The total number of seconds.
 * @returns The formatted SRT timestamp string.
 */
const formatSrtTime = (secs: number): string => {
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = Math.floor(secs % 60);
  const milliseconds = Math.floor((secs - Math.floor(secs)) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`;
};

/**
 * Generates an SRT subtitle string from a list of timecodes.
 * @param timecodes The list of text timecodes.
 * @param totalDuration The total duration of the media file.
 * @returns A string formatted as an SRT file.
 */
export const generateSrt = (
  timecodes: TextTimecode[],
  totalDuration: number,
): string => {
  return timecodes
    .map((item, index) => {
      const startTime = timeToSecs(item.time);
      // Determine the end time. Use the start of the next caption, or the total video duration for the last one.
      const endTime =
        index < timecodes.length - 1
          ? timeToSecs(timecodes[index + 1].time)
          : totalDuration;

      return `${index + 1}\n${formatSrtTime(startTime)} --> ${formatSrtTime(
        endTime,
      )}\n${item.text}\n`;
    })
    .join('\n');
};

/**
 * Formats timecodes for copying to the clipboard.
 * @param timecodes The list of text timecodes.
 * @param type The desired format: 'timestamps' or 'textOnly'.
 * @returns The formatted string for the clipboard.
 */
export const formatCopyToClipboard = (
  timecodes: TextTimecode[],
  type: 'timestamps' | 'textOnly',
): string => {
  if (type === 'textOnly') {
    return timecodes.map((item) => item.text).join('\n');
  } else {
    return timecodes.map((item) => `${item.time} - ${item.text}`).join('\n');
  }
};