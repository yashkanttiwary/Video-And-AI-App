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
import {ChangeEvent, useCallback, useEffect, useRef, useState} from 'react';
import type {Timecode, ValueTimecode} from './types';
import {timeToSecs} from './utils';

const formatTime = (t: number) =>
  `${Math.floor(t / 60)}:${Math.floor(t % 60)
    .toString()
    .padStart(2, '0')}`;

interface VideoPlayerProps {
  url: string | null;
  mediaType: 'video' | 'audio' | null;
  timecodeList: Timecode[] | null;
  requestedTimecode: number | null;
  isLoadingVideo: boolean;
  videoError: string | null;
  uploadProgress: number;
  uploadStatus: string;
  jumpToTimecode: (time: number) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDurationChange: (duration: number) => void;
}

export default function VideoPlayer({
  url,
  mediaType,
  timecodeList,
  requestedTimecode,
  isLoadingVideo,
  videoError,
  uploadProgress,
  uploadStatus,
  jumpToTimecode,
  onFileChange,
  onDurationChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [scrubberTime, setScrubberTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentCaption, setCurrentCaption] = useState<string | null>(null);
  const currentSecs = duration * scrubberTime || 0;
  const currentPercent = scrubberTime * 100;

  const setVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
  }, []);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = e.target.valueAsNumber;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (!newMuted && volume === 0) {
      setVolume(1);
      videoRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen().catch((err) => {
        alert(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  const updateDuration = () => {
    const newDuration = videoRef.current?.duration || 0;
    setDuration(newDuration);
    onDurationChange(newDuration);
  };

  const updateTime = () => {
    if (!videoRef.current) return;
    if (!isScrubbing) {
      setScrubberTime(
        videoRef.current.currentTime / videoRef.current.duration || 0,
      );
    }

    if (timecodeList && timecodeList.length > 0) {
      const currentTime = videoRef.current!.currentTime;
      let newCaption: string | null = null;

      // Efficiently find the current caption using binary search.
      let low = 0;
      let high = timecodeList.length - 1;
      let bestIndex = -1;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midTime = timeToSecs(timecodeList[mid].time);
        if (midTime <= currentTime) {
          bestIndex = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (bestIndex !== -1) {
        const current = timecodeList[bestIndex];
        newCaption = 'text' in current ? current.text : null;
      }
      setCurrentCaption(newCaption);
    } else {
      setCurrentCaption(null);
    }
  };

  const onPlay = () => setIsPlaying(true);
  const onPause = () => setIsPlaying(false);

  useEffect(() => {
    setScrubberTime(0);
    setIsPlaying(false);
    setCurrentCaption(null);
  }, [url]);

  useEffect(() => {
    if (videoRef.current && requestedTimecode !== null) {
      videoRef.current.currentTime = requestedTimecode;
    }
  }, [requestedTimecode]);

  useEffect(() => {
    const onKeyPress = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.key === ' '
      ) {
        e.preventDefault();
        togglePlay();
      }
    };

    addEventListener('keypress', onKeyPress);

    return () => {
      removeEventListener('keypress', onKeyPress);
    };
  }, [togglePlay]);

  return (
    <div className="videoPlayer" ref={playerRef}>
      {url && !isLoadingVideo ? (
        <>
          <div className="mediaContainer">
            {mediaType === 'audio' && (
              <div className="audioPlaceholder">
                <span className="icon">music_note</span>
              </div>
            )}
            <video
              src={url}
              ref={setVideo}
              onClick={togglePlay}
              preload="auto"
              crossOrigin="anonymous"
              onDurationChange={updateDuration}
              onTimeUpdate={updateTime}
              onPlay={onPlay}
              onPause={onPause}
            />

            {currentCaption && (
              <div className="videoCaption">{currentCaption}</div>
            )}
          </div>

          <div className="videoControls">
            <div className="videoScrubber">
              <input
                style={{'--pct': `${currentPercent}%`} as React.CSSProperties}
                type="range"
                min="0"
                max="1"
                value={scrubberTime || 0}
                step="0.000001"
                onChange={(e) => {
                  const newScrubberTime = e.target.valueAsNumber;
                  setScrubberTime(newScrubberTime);
                  if (videoRef.current) {
                    videoRef.current.currentTime = newScrubberTime * duration;
                  }
                }}
                onPointerDown={() => setIsScrubbing(true)}
                onPointerUp={() => setIsScrubbing(false)}
              />
            </div>
            <div className="timecodeMarkers">
              {timecodeList?.map((item, i) => {
                const secs = timeToSecs(item.time);
                const pct = (secs / duration) * 100;
                const text = 'text' in item ? item.text : '';
                const value = 'value' in item ? (item as ValueTimecode).value : null;

                return (
                  <div
                    className="timecodeMarker"
                    key={i}
                    style={{left: `${pct}%`}}>
                    <div
                      className="timecodeMarkerTick"
                      onClick={() => jumpToTimecode(secs)}>
                      <div />
                    </div>
                    <div
                      className={c('timecodeMarkerLabel', {right: pct > 50})}>
                      <div>{item.time}</div>
                      <p>{value ?? text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="videoTime">
              <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                <span className="icon">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div className="volumeControls">
                <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  <span className="icon">
                    {isMuted || volume === 0
                      ? 'volume_off'
                      : volume < 0.5
                        ? 'volume_down'
                        : 'volume_up'}
                  </span>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  className="volumeSlider"
                  onChange={handleVolumeChange}
                  aria-label="Volume"
                />
              </div>
              <div className="timeDisplay">
                {formatTime(currentSecs)} / {formatTime(duration)}
              </div>
              <button onClick={toggleFullscreen} aria-label="Fullscreen">
                <span className="icon">fullscreen</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="emptyVideo">
          {isLoadingVideo ? (
            <div className="uploadProgress">
              <p>{uploadStatus}</p>
              <div className="progressBar">
                <div
                  className="progressFill"
                  style={{width: `${uploadProgress}%`}}
                />
              </div>
              <p>{uploadProgress}% complete</p>
            </div>
          ) : (
            <>
              <input
                type="file"
                id="fileUpload"
                accept="video/*,audio/*"
                onChange={onFileChange}
                style={{display: 'none'}}
                aria-hidden="true"
                tabIndex={-1}
              />
              <label htmlFor="fileUpload" className="uploadLabel">
                <span className="icon">upload</span>
                <p className={c({error: videoError})}>
                  {videoError
                    ? videoError
                    : 'Drag and drop a video or audio file here, or click to browse.'}
                </p>
              </label>
            </>
          )}
        </div>
      )}
    </div>
  );
}