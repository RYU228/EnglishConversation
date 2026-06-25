import React, { useState } from 'react';
import { Smartphone, Code, BookOpen, Copy, Check, ExternalLink, Sparkles, AlertCircle, Play, CheckCircle } from 'lucide-react';
import HomeScreenSim from './components/HomeScreenSim';
import SettingsScreenSim from './components/SettingsScreenSim';
import StudyScreenSim from './components/StudyScreenSim';
import { flutterCodeMap } from './data/flutterCodeMap';
import { ScreenType } from './types';

export default function App() {
  // Mobile Simulator Routing
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('HOME');
  const [selectedTopicKey, setSelectedTopicKey] = useState<string>('daily');
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string>('일상 회화');
  
  // Persisted state simulation using LocalStorage (matching SettingsProvider)
  const [repeatCount, setRepeatCountState] = useState<number>(() => {
    const saved = localStorage.getItem('repeat_count');
    return saved ? parseInt(saved, 10) : 3;
  });
  const [autoProceed, setAutoProceedState] = useState<boolean>(() => {
    const saved = localStorage.getItem('auto_proceed');
    return saved === 'true';
  });
  const [randomPlay, setRandomPlayState] = useState<boolean>(() => {
    const saved = localStorage.getItem('random_play');
    return saved === 'true';
  });

  // State handlers that auto-save to localStorage
  const setRepeatCount = (count: number) => {
    setRepeatCountState(count);
    localStorage.setItem('repeat_count', count.toString());
  };
  const setAutoProceed = (enabled: boolean) => {
    setAutoProceedState(enabled);
    localStorage.setItem('auto_proceed', enabled ? 'true' : 'false');
  };
  const setRandomPlay = (enabled: boolean) => {
    setRandomPlayState(enabled);
    localStorage.setItem('random_play', enabled ? 'true' : 'false');
  };

  // Code Explorer Workspace Tabs
  const [activeTab, setActiveTab] = useState<'CODE' | 'GUIDE'>('CODE');
  const [selectedFileKey, setSelectedFileKey] = useState<string>('main');
  const [copiedFile, setCopiedFile] = useState<boolean>(false);

  const handleCopyCode = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  const handleSelectTopic = (key: string, title: string) => {
    setSelectedTopicKey(key);
    setSelectedTopicTitle(title);
    setCurrentScreen('STUDY');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* 1. Header Banner */}
      <header className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-xl">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base md:text-lg tracking-tight text-white">영어 회화 반복 학습기 (Echo Learning)</h1>
              <span className="bg-teal-500/15 border border-teal-500/30 text-teal-400 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide">Flutter Mobile & Web</span>
            </div>
            <p className="text-[11px] text-slate-400">시니어 Flutter 개발자 명세 기준 • 100% 동작하는 실제 코드 및 양방향 웹 에뮬레이터</p>
          </div>
        </div>
        
        {/* Quick actions info */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Dual Workspace Mode</span>
          </div>
        </div>
      </header>

      {/* 2. Main Dual Columns Area */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 min-h-0 bg-radial-at-t from-slate-900 via-slate-950 to-slate-950">
        
        {/* COLUMN 1: Flutter Phone Simulator (Occupies 5 columns on desktop) */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center min-h-0 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-350 bg-slate-900 border border-slate-800/80 px-3 py-1.5 rounded-full shadow-2xs">
            <Smartphone size={14} className="text-teal-400" />
            <span>Interactive Mobile Simulator (M3 Style)</span>
          </div>

          {/* High-fidelity Phone Frame Wrapper */}
          <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-slate-950 border-4 border-slate-800 rounded-[38px] p-2.5 shadow-2xl ring-12 ring-slate-900/80 flex flex-col justify-stretch overflow-hidden">
            
            {/* Top Speaker Notch Block */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-5.5 bg-slate-950 rounded-b-2xl z-50 flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-800 rounded-full mb-1" />
              <div className="w-2.5 h-2.5 bg-slate-900 border border-slate-850 rounded-full ml-2 mb-1" />
            </div>

            {/* Simulated Mobile Header Stats */}
            <div className="h-6 bg-white shrink-0 flex items-center justify-between px-6 text-[10px] font-bold text-slate-700 z-40 select-none">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                {/* Visual state icon badges */}
                <span className="text-[9px] tracking-widest">LTE</span>
                <div className="w-4 h-2 border.5 border-slate-650 rounded-xs p-0.5 flex items-center">
                  <div className="w-full h-full bg-slate-700 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* Embedded Screen Content */}
            <div className="flex-1 rounded-b-[26px] overflow-hidden bg-white text-slate-900 relative">
              {currentScreen === 'HOME' && (
                <HomeScreenSim
                  onSelectTopic={handleSelectTopic}
                  onGoToSettings={() => setCurrentScreen('SETTINGS')}
                />
              )}
              {currentScreen === 'SETTINGS' && (
                <SettingsScreenSim
                  repeatCount={repeatCount}
                  setRepeatCount={setRepeatCount}
                  autoProceed={autoProceed}
                  setAutoProceed={setAutoProceed}
                  randomPlay={randomPlay}
                  setRandomPlay={setRandomPlay}
                  onBack={() => setCurrentScreen('HOME')}
                />
              )}
              {currentScreen === 'STUDY' && (
                <StudyScreenSim
                  topicKey={selectedTopicKey}
                  topicTitle={selectedTopicTitle}
                  targetRepeatCount={repeatCount}
                  autoProceed={autoProceed}
                  randomPlay={randomPlay}
                  onBack={() => setCurrentScreen('HOME')}
                />
              )}
            </div>

            {/* Simulated Phone Home Bar indicator */}
            <div className="h-3 bg-white shrink-0 flex items-center justify-center select-none shrink-0 border-t border-slate-100 z-40">
              <div className="w-24 h-1 bg-slate-300 rounded-full mb-0.5" />
            </div>
          </div>

          {/* Quick simulator operations guide */}
          <div className="text-center text-[10px] text-slate-500 max-w-[280px]">
            * 시뮬레이터에서는 Web SpeechSynthesis를 통해 설정한 속도 0.45와 반복 횟수 규칙대로 실제 한글 및 영어 음성 플레이를 모사합니다.
          </div>
        </section>

        {/* COLUMN 2: Flutter Project Specs & File Explorer (Occupies 7 columns on desktop) */}
        <section className="lg:col-span-7 flex flex-col min-h-0 bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          
          {/* Workspace Tabs Header */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 h-14 shrink-0">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('CODE')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === 'CODE'
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code size={14} />
                <span>Flutter Source Explorer</span>
              </button>
              <button
                onClick={() => setActiveTab('GUIDE')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  activeTab === 'GUIDE'
                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen size={14} />
                <span>Architecture Layout</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 py-1 px-2.5 rounded-lg">
              Workspace Scope: Production Ready
            </div>
          </div>

          {/* Tab Content 1: Code Explorer */}
          {activeTab === 'CODE' && (
            <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
              {/* Sidebar file tree */}
              <div className="w-full md:w-64 bg-slate-950/40 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 space-y-3 overflow-y-auto shrink-0 select-none">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block px-1">PROJECT DIRECTORIES</span>
                
                <div className="space-y-1 text-xs">
                  {/* Root Configs */}
                  <div className="font-bold text-slate-400 py-1 px-1 flex items-center gap-1.5">
                    ⚙️ <span className="text-[11px]">Config files</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('pubspec')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'pubspec' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    📃 pubspec.yaml
                  </button>

                  {/* Lib Bootloader */}
                  <div className="font-bold text-slate-400 py-1 px-1 mt-3 flex items-center gap-1.5">
                    🚀 <span className="text-[11px]">lib/ (Root)</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('main')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'main' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 main.dart
                  </button>

                  {/* Models folder */}
                  <div className="font-bold text-slate-400 py-1.5 px-1 mt-3 flex items-center gap-1.5">
                    📦 <span className="text-[11px]">lib/models/</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('dialog_item')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'dialog_item' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 dialog_item.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('conversation')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'conversation' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 conversation.dart
                  </button>

                  {/* Providers folder */}
                  <div className="font-bold text-slate-400 py-1.5 px-1 mt-3 flex items-center gap-1.5">
                    ⚙️ <span className="text-[11px]">lib/providers/</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('settings_provider')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'settings_provider' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 settings_provider.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('study_provider')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'study_provider' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 study_provider.dart
                  </button>

                  {/* Services */}
                  <div className="font-bold text-slate-400 py-1.5 px-1 mt-3 flex items-center gap-1.5">
                    🔌 <span className="text-[11px]">lib/services/</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('tts_service')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'tts_service' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 tts_service.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('conversation_service')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'conversation_service' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 conversation_service.dart
                  </button>

                  {/* Screens */}
                  <div className="font-bold text-slate-400 py-1.5 px-1 mt-3 flex items-center gap-1.5">
                    🖥️ <span className="text-[11px]">lib/screens/</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('home_screen')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'home_screen' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 home_screen.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('settings_screen')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'settings_screen' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 settings_screen.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('study_screen')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'study_screen' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 study_screen.dart
                  </button>

                  {/* Widgets */}
                  <div className="font-bold text-slate-400 py-1.5 px-1 mt-3 flex items-center gap-1.5">
                    🧩 <span className="text-[11px]">lib/widgets/</span>
                  </div>
                  <button
                    onClick={() => setSelectedFileKey('conversation_card')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'conversation_card' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 conversation_card.dart
                  </button>
                  <button
                    onClick={() => setSelectedFileKey('player_controls')}
                    className={`w-full text-left py-1.5 pl-6 pr-2 rounded-lg truncate transition-all cursor-pointer font-mono ${
                      selectedFileKey === 'player_controls' ? 'bg-slate-800 text-teal-400 font-bold' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    🔷 player_controls.dart
                  </button>
                </div>
              </div>

              {/* Code viewer viewport */}
              <div className="flex-1 flex flex-col min-h-0 bg-[#0f172a] p-4 relative">
                {/* Filepath breadcrumb bar */}
                <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-xl mb-3 h-10 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-mono font-medium text-slate-350">
                    <span className="text-teal-400">📂 english_conversation_study/</span>
                    <span className="text-white font-semibold">{flutterCodeMap[selectedFileKey]?.path}</span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(flutterCodeMap[selectedFileKey]?.content)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 border border-slate-750 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-2xs font-extrabold tracking-wide cursor-pointer transition-colors uppercase select-none h-7"
                    title="코드 복사"
                  >
                    {copiedFile ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedFile ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>

                {/* Actual code display area */}
                <div className="flex-1 overflow-auto bg-[#0b0f19] border border-slate-900/90 rounded-2xl p-4 font-mono text-xs text-slate-350 leading-relaxed scrollbar-thin">
                  <pre className="whitespace-pre">{flutterCodeMap[selectedFileKey]?.content}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content 2: Architecture Layout & Guides */}
          {activeTab === 'GUIDE' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 select-none leading-relaxed">
              {/* Box 1: Core Design Overview */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="font-extrabold text-teal-400 text-sm md:text-base flex items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Flutter MVVM 상태관리 구조 설계</span>
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed font-normal">
                  본 프로젝트는 수능, 어학, 일상영어 회화 등을 반복 훈련할 수 있는 최적화된 Flutter 정본 소스 코드입니다.
                  유지보수와 향후 AI 대본 생성 등 확장이 손쉽도록 명징한 관심사 분리(Separation of Concerns) 아키텍처가 정립되어 있습니다.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 py-1">
                  <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-xl space-y-1">
                    <h4 className="font-bold text-xs text-slate-200">1. Models (데이터 구조)</h4>
                    <p className="text-[10px] text-slate-400 leading-normal font-normal">
                      대화 아이템과 주제 세트를 분리하고, JSON 파싱 역직렬화(<code className="text-xs text-teal-400">fromJson</code>) 처리를 완비했습니다.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-xl space-y-1">
                    <h4 className="font-bold text-xs text-slate-200">2. Providers (비즈니스 기저)</h4>
                    <p className="text-[10px] text-slate-400 leading-normal font-normal">
                      Provider를 사용하여 학습 핵심 루프, 반복 카운팅, 오토 체크인, SharedPreferences 연동 세팅값을 제어합니다.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-3.5 border border-slate-800/80 rounded-xl space-y-1">
                    <h4 className="font-bold text-xs text-slate-200">3. Services (인프라 채널)</h4>
                    <p className="text-[10px] text-slate-400 leading-normal font-normal">
                      TTS 음향 합성 서비스(<code className="text-xs text-indigo-400">flutter_tts</code>) 및 원거리 AI 대본 소스 데이터 수집 구조를 독립 관리합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Box 2: SharedPreferences details */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  🔑 <span>설정 영구 보존(SharedPreferences) 및 쉐도잉 대기 메커니즘</span>
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed font-normal">
                  - <strong>반복 횟수(1~20회) 및 옵션 저장</strong>: SharedPreferences를 사용하여 설정 변경 즉시 비동기로 단말에 보존하며, 앱 재기동 시점에 초기화 주입되어 안전하게 유지됩니다.<br />
                  - <strong>청취 중심 자각 메커니즘</strong>: 지정 반복 횟수를 청취하기 전에는 문장 원문과 한글 번역이 절대 공개되지 않아 순수 리스닝과 쉐도잉에 고도로 집중할 수 있는 주도면밀함을 보장합니다.<br />
                  - <strong>1초 및 2초 정밀 타이밍</strong>: 영어 한 문장이 발화된 후 1초 대기하며, 대화 한 세트가 끝날 때마다 2초의 브레이크 타임을 두어 학습자의 따라하기 시간을 정밀 보장합니다.
                </p>
              </div>

              {/* Box 3: Future extensibility (Generative AI) */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  🤖 <span>생성형 AI 대본 제작 확장 대응 설계 (Mock완비)</span>
                </h3>
                <p className="text-xs text-slate-350 leading-relaxed font-normal">
                  인터페이스 기반 소스 로더 구조인 <code className="text-xs text-teal-400 bg-slate-950 px-1 py-0.5 rounded">ConversationSource</code>를 선언하여 확장성을 구축했습니다.
                  현재 기본인 로컬 JSON 리스트 로딩(<code className="text-xs text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">LocalJsonSource</code>) 외에도 추후 OpenAI 나 Gemini API를 도입해 '공항', '법원' 등의 토픽 대본을 스마트 생성할 수 있는 <code className="text-xs text-teal-400 bg-slate-950 px-1 py-0.5 rounded">AiConversationSource</code> 구현 공간을 명쾌하게 확보해 두었습니다.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* 3. Status Bar Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs gap-3 shrink-0 select-none">
        <div className="flex items-center gap-2 font-medium">
          <span>Target Platform:</span>
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-bold">Android (Kotlin/Java)</span>
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-slate-300 font-bold">iOS (Swift/ObjC)</span>
        </div>
        <div className="text-center md:text-right font-normal">
          영어 회화 학습기 쉐도잉 소스 코드 패키지 • Designed carefully using Material Design 3.
        </div>
      </footer>
    </div>
  );
}
