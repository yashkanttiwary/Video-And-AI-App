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
import {useEffect, useRef, useState} from 'react';
import type {TextTimecode} from './types';
import {formatCopyToClipboard, generateSrt} from './utils';

interface ActionToolbarProps {
  timecodes: TextTimecode[];
  videoDuration: number;
  activeMode: string | undefined;
}

export default function ActionToolbar({
  timecodes,
  videoDuration,
  activeMode,
}: ActionToolbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState('Copy');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (copyStatus !== 'Copy') {
      const timer = setTimeout(() => setCopyStatus('Copy'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyStatus]);

  const handleDownloadSrt = () => {
    // Sanitize the active mode name to create a user-friendly, valid filename.
    // Defaults to 'captions' if the mode is not set.
    const baseName = activeMode
      ? activeMode
          .toLowerCase()
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric characters
      : 'captions';
    const filename = `${baseName}.srt`;

    const srtContent = generateSrt(timecodes, videoDuration);
    const blob = new Blob([srtContent], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (type: 'timestamps' | 'textOnly') => {
    const textToCopy = formatCopyToClipboard(timecodes, type);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopyStatus('Copied!');
      setIsDropdownOpen(false);
    });
  };

  return (
    <div className="actionToolbar">
      <button className="actionButton" onClick={handleDownloadSrt}>
        <span className="icon">download</span>
        Download SRT
      </button>
      <div className="copyButtonContainer" ref={dropdownRef}>
        <button
          className={c('copyButton', {copied: copyStatus === 'Copied!'})}
          onClick={() => handleCopy('timestamps')}>
          <span className="icon">content_copy</span>
          {copyStatus}
        </button>
        <button
          className="copyDropdownButton"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
          <span className="icon">arrow_drop_down</span>
        </button>
        {isDropdownOpen && (
          <div className="copyDropdown">
            <button onClick={() => handleCopy('timestamps')}>
              Copy with timestamps
            </button>
            <button onClick={() => handleCopy('textOnly')}>
              Copy text only
            </button>
          </div>
        )}
      </div>
    </div>
  );
}