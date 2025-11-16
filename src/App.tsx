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

import c from 'classnames';
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {File as UploadedFile} from '@google/genai/server';
import {generateContent, uploadFile} from './api';
import modes from './modes';
import OutputPanel from './OutputPanel';
import Sidebar from './Sidebar';
import type {Timecode} from './types';
import VideoPlayer from './VideoPlayer';

const chartModes = Object.keys(modes.Chart.subModes!);

export default function App() {
  const [vidUrl, setVidUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | null>(null);
  const [timecodeList, setTimecodeList] = useState<Timecode[] | null>(null);
  const [textResponse, setTextResponse] = useState<string | null>(null);
  const [requestedTimecode, setRequestedTimecode] = useState<number | null>(
    null,
  );
  const [selectedMode, setSelectedMode] = useState<string>(Object.keys(modes)[0]);
  const [activeMode, setActiveMode] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [chartMode, setChartMode] = useState<string>(chartModes[0]);
  const [chartPrompt, setChartPrompt] = useState('');
  const [chartLabel, setChartLabel] = useState('');
  const [theme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const scrollRef = useRef<HTMLElement>(null);
  const latestRequestRef = useRef(0);
  const vidUrlRef = useRef<string | null>(null);
  const isCustomMode = selectedMode === 'Custom';
  const isChartMode = selectedMode === 'Chart';
  const isCustomChartMode = isChartMode && chartMode === 'Custom';

  useEffect(() => {
    // Cleanup for the object URL to prevent memory leaks.
    return () => {
      if (vidUrlRef.current) {
        URL.revokeObjectURL(vidUrlRef.current);
      }
    };
  }, []);

  const setTimecodes = (timecodes: Timecode[]) => {
    const sanitized = timecodes.map((t) =>
      'text' in t ? {...t, text: t.text.replace(/\\'/g, "'")} : t,
    );
    setTimecodeList(sanitized as Timecode[]);
  };

  const onModeSelect = async (mode: string) => {
    if (!file) {
      setApiError('Please upload a video or audio file first.');
      return;
    }

    const requestId = Date.now();
    latestRequestRef.current = requestId;

    setActiveMode(mode);
    setIsLoading(true);
    setTimecodeList(null);
    setTextResponse(null);
    setApiError(null);
    setChartLabel(
      isChartMode
        ? isCustomChartMode
          ? chartPrompt
          : chartMode
        : '',
    );

    try {
      const promptConfig = modes[mode].prompt;
      const prompt =
        isCustomMode && typeof promptConfig === 'function'
          ? promptConfig(customPrompt)
          : isChartMode && typeof promptConfig === 'function'
          ? promptConfig(
              isCustomChartMode
                ? chartPrompt
                : modes[mode].subModes![chartMode],
            )
          : (promptConfig as string);

      let resp;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        // Abort if a new request has started during the await
        if (latestRequestRef.current !== requestId) return;

        resp = await generateContent(prompt, file);

        const hasFunctionCall = resp.functionCalls?.[0];
        const hasText = resp.text;

        if (hasFunctionCall || hasText) {
          break; // Valid response received, exit the loop.
        }

        // If not the last attempt, wait with exponential backoff before retrying.
        if (i < maxRetries - 1) {
          const delay = 1000 * 2 ** i + Math.random() * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (latestRequestRef.current !== requestId) return;

      const call = resp.functionCalls?.[0];

      if (call?.name && call.args) {
        if (call.name.startsWith('set_timecodes')) {
          setTimecodes(call.args.timecodes as Timecode[]);
        }
      } else if (resp.text) {
        // All model output is rendered as text by React, mitigating XSS risks.
        setTextResponse(resp.text);
      } else {
        setApiError(
          "The model didn't return a valid response after multiple attempts. Please try a different prompt.",
        );
      }
    } catch (e) {
      if (latestRequestRef.current === requestId) {
        console.error(e);
        setApiError(e instanceof Error ? e.message : 'An unknown error occurred.');
      }
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsLoading(false);
      }
      scrollRef.current?.scrollTo({top: 0});
    }
  };

  const handleCancel = () => {
    latestRequestRef.current = Date.now(); // Invalidate the ongoing request
    setIsLoading(false);
    setApiError(null);
  };

  const handleFileUpload = async (fileToUpload: File | null | undefined) => {
    if (!fileToUpload) return;

    const isVideo = fileToUpload.type.startsWith('video/');
    const isAudio = fileToUpload.type.startsWith('audio/');

    if (!isVideo && !isAudio) {
      setVideoError('Invalid file type. Please upload a video or audio file.');
      return;
    }

    setIsLoadingVideo(true);
    setVideoError(null);
    setFile(null);
    setTimecodeList(null);
    setTextResponse(null);
    setApiError(null);
    setUploadProgress(0);
    setVideoDuration(0);
    setMediaType(isVideo ? 'video' : 'audio');

    // Revoke the previous object URL if it exists.
    if (vidUrlRef.current) {
      URL.revokeObjectURL(vidUrlRef.current);
    }
    const newUrl = URL.createObjectURL(fileToUpload);
    vidUrlRef.current = newUrl;
    setVidUrl(newUrl);

    try {
      const res = await uploadFile(
        fileToUpload,
        setUploadProgress,
        setUploadStatus,
      );
      setFile(res);
    } catch (e) {
      console.error(e);
      setVideoError(e instanceof Error ? e.message : 'Error processing file.');
    } finally {
      setIsLoadingVideo(false);
      setUploadProgress(0);
    }
  };

  const uploadMedia = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files?.[0]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e.target.files?.[0]);
  };

  return (
    <main
      className={theme}
      onDrop={uploadMedia}
      onDragOver={(e) => e.preventDefault()}>
      <div className="contentWrapper">
        <section className="top">
          {vidUrl && !isLoadingVideo && (
            <>
              <Sidebar
                showSidebar={showSidebar}
                mediaType={mediaType}
                selectedMode={selectedMode}
                setSelectedMode={setSelectedMode}
                onModeSelect={onModeSelect}
                isLoading={isLoading}
                customPrompt={customPrompt}
                setCustomPrompt={setCustomPrompt}
                chartMode={chartMode}
                setChartMode={setChartMode}
                chartPrompt={chartPrompt}
                setChartPrompt={setChartPrompt}
                isCustomMode={isCustomMode}
                isChartMode={isChartMode}
                isCustomChartMode={isCustomChartMode}
                chartModes={chartModes}
              />
              <button
                className="collapseButton"
                onClick={() => setShowSidebar(!showSidebar)}
                aria-label={showSidebar ? 'Collapse sidebar' : 'Expand sidebar'}>
                <span className="icon">
                  {showSidebar ? 'chevron_left' : 'chevron_right'}
                </span>
              </button>
            </>
          )}

          <VideoPlayer
            url={vidUrl}
            mediaType={mediaType}
            requestedTimecode={requestedTimecode}
            timecodeList={timecodeList}
            jumpToTimecode={setRequestedTimecode}
            isLoadingVideo={isLoadingVideo}
            videoError={videoError}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
            onFileChange={handleFileChange}
            onDurationChange={setVideoDuration}
          />
        </section>

        <OutputPanel
          activeMode={activeMode}
          isLoading={isLoading}
          apiError={apiError}
          textResponse={textResponse}
          timecodeList={timecodeList}
          handleCancel={handleCancel}
          scrollRef={scrollRef}
          chartLabel={chartLabel}
          setRequestedTimecode={setRequestedTimecode}
          hasFile={!!vidUrl}
          videoDuration={videoDuration}
        />
      </div>
    </main>
  );
}