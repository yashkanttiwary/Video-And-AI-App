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
import modes from './modes';

interface SidebarProps {
  showSidebar: boolean;
  mediaType: 'video' | 'audio' | null;
  selectedMode: string;
  setSelectedMode: (mode: string) => void;
  onModeSelect: (mode: string) => void;
  isLoading: boolean;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  chartMode: string;
  setChartMode: (mode: string) => void;
  chartPrompt: string;
  setChartPrompt: (prompt: string) => void;
  isCustomMode: boolean;
  isChartMode: boolean;
  isCustomChartMode: boolean;
  chartModes: string[];
}

export default function Sidebar({
  showSidebar,
  mediaType,
  selectedMode,
  setSelectedMode,
  onModeSelect,
  isLoading,
  customPrompt,
  setCustomPrompt,
  chartMode,
  setChartMode,
  chartPrompt,
  setChartPrompt,
  isCustomMode,
  isChartMode,
  isCustomChartMode,
  chartModes,
}: SidebarProps) {
  const hasSubMode = isCustomMode || isChartMode;

  return (
    <div className={c('modeSelector', {hide: !showSidebar})}>
      {hasSubMode ? (
        <>
          <div>
            {isCustomMode ? (
              <>
                <h2>Custom prompt:</h2>
                <textarea
                  aria-label="Custom prompt for video analysis"
                  placeholder="Type a custom prompt..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onModeSelect(selectedMode);
                    }
                  }}
                  rows={5}
                />
              </>
            ) : (
              <>
                <h2>Chart this video by:</h2>

                <div className="modeList">
                  {chartModes.map((mode) => (
                    <button
                      key={mode}
                      className={c('button', {
                        active: mode === chartMode,
                      })}
                      onClick={() => setChartMode(mode)}>
                      {mode}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label="Custom chart prompt"
                  className={c({active: isCustomChartMode})}
                  placeholder="Or type a custom prompt..."
                  value={chartPrompt}
                  onChange={(e) => setChartPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onModeSelect(selectedMode);
                    }
                  }}
                  onFocus={() => setChartMode('Custom')}
                  rows={2}
                />
              </>
            )}
            <button
              className="button generateButton"
              onClick={() => onModeSelect(selectedMode)}
              disabled={
                isLoading ||
                (isCustomMode && !customPrompt.trim()) ||
                (isChartMode && isCustomChartMode && !chartPrompt.trim())
              }>
              ▶️ Generate
            </button>
          </div>
          <div className="backButton">
            <button onClick={() => setSelectedMode(Object.keys(modes)[0])}>
              <span className="icon">chevron_left</span>
              Back
            </button>
          </div>
        </>
      ) : (
        <>
          <div>
            <h2>Explore this {mediaType} via:</h2>
            <div className="modeList">
              {Object.entries(modes).map(
                ([mode, {emoji, description}]) => (
                  <button
                    key={mode}
                    className={c('button', {
                      active: mode === selectedMode,
                    })}
                    onClick={() => setSelectedMode(mode)}
                    disabled={mediaType === 'audio' && mode === 'Table'}>
                    <span className="emoji">{emoji}</span> {mode}
                    <span className="tooltip">{description}</span>
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <button
              className="button generateButton"
              disabled={isLoading}
              onClick={() => onModeSelect(selectedMode)}>
              ▶️ Generate
            </button>
          </div>
        </>
      )}
    </div>
  );
}
