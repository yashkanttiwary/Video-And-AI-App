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

import {GoogleGenAI} from '@google/genai';
import {File as UploadedFile} from '@google/genai/server';
import functions from './functions';

const systemInstruction = `When given a video and a query, call the relevant \
function only once with the appropriate timecodes and text for the video`;

const client = new GoogleGenAI({apiKey: process.env.API_KEY});

async function generateContent(
  text: string,
  file: UploadedFile,
) {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        {text},
        {
          fileData: {
            mimeType: file.mimeType,
            fileUri: file.uri,
          },
        },
      ],
    },
    config: {
      systemInstruction,
      temperature: 0.5,
      tools: [{functionDeclarations: functions}],
    },
  });

  return response;
}

async function uploadFile(
  file: File,
  onProgress: (progress: number) => void,
  onStatusChange: (status: string) => void,
): Promise<UploadedFile> {
  const blob = new Blob([file], {type: file.type});
  onStatusChange('Uploading file...');
  onProgress(10);
  const uploadedFile = await client.files.upload({
    file: blob,
    config: {
      displayName: file.name,
    },
  });
  onProgress(50);
  onStatusChange('Processing media...');

  let getFile = await client.files.get({
    name: uploadedFile.name,
  });
  let progress = 50;
  while (getFile.state === 'PROCESSING') {
    progress = Math.min(progress + 5, 95);
    onProgress(progress);
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    getFile = await client.files.get({
      name: uploadedFile.name,
    });
  }

  if (getFile.state === 'FAILED') {
    onProgress(0);
    throw new Error('File processing failed.');
  }

  onProgress(100);
  onStatusChange('Processing complete');
  return getFile;
}

export {generateContent, uploadFile};
