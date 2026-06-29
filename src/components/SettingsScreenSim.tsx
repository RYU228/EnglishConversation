import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Zap, Shuffle, Key } from 'lucide-react';

interface SettingsScreenSimProps {
  repeatCount: number;
  setRepeatCount: (c: number) => void;
  autoProceed: boolean;
  setAutoProceed: (b: boolean) => void;
  randomPlay: boolean;
  setRandomPlay: (b: boolean) => void;
  onBack: () => void;
}

export default function SettingsScreenSim({
  repeatCount,
  setRepeatCount,
  autoProceed,
  setAutoProceed,
  randomPlay,
  setRandomPlay,
  onBack,
}: SettingsScreenSimProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('google_tts_api_key') || '');
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSaveApiKey = () => {
    localStorage.setItem('google_tts_api_key', apiKey.trim());
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans select-none">
      {/* AppBar */}
      <div className="flex items-center px-4 h-14 bg-white border-b border-slate-100 shrink-0 shadow-xs relative">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          id="btn-settings-back"
          title="이전 화면"
        >
          <ArrowLeft size={20} className="text-slate-700" />
        </button>
        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-slate-800 text-base">
          학습 설정
        </span>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card 1: Repeat Counts Slider */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={18} className="text-teal-600 animate-spin-slow" />
              <h3 className="font-bold text-sm text-slate-800">대화 반복 횟수</h3>
            </div>
            <span className="px-3 py-1 bg-teal-50 border border-teal-100 text-teal-700 font-bold text-xs rounded-full">
              {repeatCount}회
            </span>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            한 대화 세트를 완전히 암기하기 위해 연속 재생할 횟수를 지정합니다. (기본값: 3회, 범위: 1~20회)
          </p>

          <div className="space-y-1">
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={repeatCount}
              onChange={(e) => setRepeatCount(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 focus:outline-none"
              id="slider-repeat-count"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
              <span>1회</span>
              <span>10회</span>
              <span>20회</span>
            </div>
          </div>
        </div>

        {/* Card 2: Switch Options */}
        <div className="bg-white rounded-2xl border border-slate-150 shadow-2xs overflow-hidden">
          {/* Tile 1: Auto play */}
          <div className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors">
            <div className="p-2 rounded-full bg-teal-50 border border-teal-100 text-teal-600 shrink-0 mt-0.5">
              <Zap size={18} />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="font-bold text-xs text-slate-800 leading-none">자동으로 다음 대화 넘어가기</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal font-normal">
                지정한 반복 재생을 모두 마치고 대본이 전구식으로 공개된 후, 3초 뒤에 다음 대화로 자동 이동합니다.
              </p>
            </div>
            <button
              onClick={() => setAutoProceed(!autoProceed)}
              className={`w-9 h-5 rounded-full relative transition-colors focus:outline-none cursor-pointer shrink-0 mt-1 ${
                autoProceed ? 'bg-teal-600' : 'bg-slate-200'
              }`}
              id="switch-auto-proceed"
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                  autoProceed ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-slate-100" />

          {/* Tile 2: Random shuffling */}
          <div className="flex items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors">
            <div className="p-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 mt-0.5">
              <Shuffle size={18} />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <h4 className="font-bold text-xs text-slate-800 leading-none">대화 순서 랜덤으로 재생</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal font-normal">
                선택한 주제의 대화 리스트가 불러와질 때 무작위 순서로 섞어서 새로운 무작위 순서로 학습합니다.
              </p>
            </div>
            <button
              onClick={() => setRandomPlay(!randomPlay)}
              className={`w-9 h-5 rounded-full relative transition-colors focus:outline-none cursor-pointer shrink-0 mt-1 ${
                randomPlay ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
              id="switch-random-play"
            >
              <span
                className={`block w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-xs ${
                  randomPlay ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card 3: Google Cloud TTS API Key */}
        <div className="p-4 bg-white rounded-2xl border border-slate-150 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-teal-600" />
            <h3 className="font-bold text-sm text-slate-800">Google Cloud TTS API 키</h3>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            고품질 Neural2 영어 발음을 더 안정적으로 무제한 재생하기 위해 본인의 API 키를 등록할 수 있습니다. 입력하지 않을 시 기본 공용 키로 자동 구동됩니다.
          </p>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy... (선택)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-teal-600 font-mono"
            />
            <button
              onClick={handleSaveApiKey}
              className="px-4 py-1.5 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 active:scale-95 transition-all cursor-pointer shadow-3xs"
            >
              저장
            </button>
          </div>
          {savedMessage && (
            <p className="text-[10px] text-emerald-600 font-bold animate-pulse">
              ✓ API 키가 웹 브라우저 내에 안전하게 저장되었습니다!
            </p>
          )}
        </div>

        {/* SharedPreferences simulation footnote */}
        <div className="p-3">
          <p className="text-[10px] text-slate-400 leading-relaxed font-normal">
            * 설정된 내역은 기기 내의 로컬 저장소(SharedPreferences)에 영구 안전하게 저장되어, 앱을 재실행하더라도 똑같이 유지됩니다. (웹 에뮬레이터에서는 LocalStorage를 사용합니다.)
          </p>
        </div>
      </div>
    </div>
  );
}
