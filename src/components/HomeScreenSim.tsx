import React from 'react';
import { Settings, Sparkles, MessageSquare, Coffee, Utensils, ShoppingBag, Plane, Briefcase, ChevronRight } from 'lucide-react';
import { TopicInfo } from '../types';

interface HomeScreenSimProps {
  onSelectTopic: (topicKey: string, topicTitle: string) => void;
  onGoToSettings: () => void;
}

export const topics: TopicInfo[] = [
  {
    key: 'daily',
    title: '일상 회화',
    desc: '인사, 안부 묻기, 가벼운 대화 등 일상의 기본 대화',
    icon: 'MessageSquare',
    color: 'indigo',
  },
  {
    key: 'cafe',
    title: '카페',
    desc: '커피 주문, 자리 잡기, 디저트 추가 시 유용한 단골 표현',
    icon: 'Coffee',
    color: 'amber',
  },
  {
    key: 'restaurant',
    title: '식당',
    desc: '예약 확인, 주문 및 서빙 요청, 편리한 계산대 소통',
    icon: 'Utensils',
    color: 'teal',
  },
  {
    key: 'shopping',
    title: '쇼핑',
    desc: '사이즈 확인, 단추 및 소재 피니싱, 교환/반품 질문 정복',
    icon: 'ShoppingBag',
    color: 'purple',
  },
  {
    key: 'travel',
    title: '여행',
    desc: '인천공항, 해외 수속, 호텔 체크인 & 길찾기 대화',
    icon: 'Plane',
    color: 'orange',
  },
  {
    key: 'business',
    title: '회사',
    desc: '업무 회의, 보고서 상신, 세일즈 및 비즈니스 매너',
    icon: 'Briefcase',
    color: 'slate',
  },
];

// Helper to get matching lucide icon
export const getIcon = (name: string, className: string) => {
  switch (name) {
    case 'MessageSquare': return <MessageSquare className={className} />;
    case 'Coffee': return <Coffee className={className} />;
    case 'Utensils': return <Utensils className={className} />;
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    case 'Plane': return <Plane className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    default: return <MessageSquare className={className} />;
  }
};

export const getIconColorClass = (color: string) => {
  switch (color) {
    case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case 'amber': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'teal': return 'bg-teal-50 text-teal-600 border-teal-100';
    case 'purple': return 'bg-purple-50 text-purple-600 border-purple-100';
    case 'orange': return 'bg-orange-50 text-orange-650 border-orange-100';
    case 'slate': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
  }
};

export const getCardHoverClass = (color: string) => {
  switch (color) {
    case 'indigo': return 'hover:bg-indigo-50/40 active:bg-indigo-50/60 hover:border-indigo-200';
    case 'amber': return 'hover:bg-amber-50/40 active:bg-amber-50/60 hover:border-amber-200';
    case 'teal': return 'hover:bg-teal-50/40 active:bg-teal-50/60 hover:border-teal-200';
    case 'purple': return 'hover:bg-purple-50/40 active:bg-purple-50/60 hover:border-purple-200';
    case 'orange': return 'hover:bg-orange-50/40 active:bg-orange-50/60 hover:border-orange-200';
    case 'slate': return 'hover:bg-slate-100/40 active:bg-slate-100/60 hover:border-slate-300';
    default: return 'hover:bg-indigo-50/40 active:bg-indigo-50/60 hover:border-indigo-300';
  }
};

export const patternsList = [
  { key: 'pattern_doyouhave', pattern: 'Do you have ~', desc: '~ 있나요?', badge: '소유/유무', color: 'indigo' },
  { key: 'pattern_couldi', pattern: 'Could I ~', desc: '~ 할 수 있을까요?', badge: '정중한 부탁', color: 'teal' },
  { key: 'pattern_donthaveto', pattern: "I don't have to ~", desc: '~ 하지 않아도 돼요', badge: '의무 해제', color: 'purple' },
  { key: 'pattern_howabout', pattern: 'How about ~', desc: '~ 는 어때요?', badge: '의견 제안', color: 'orange' },
  { key: 'pattern_lookingfor', pattern: "I'm looking for ~", desc: '~ 를 찾고 있어요', badge: '목적/탐색', color: 'rose' },
];

export const getPatternColorClasses = (color: string) => {
  switch (color) {
    case 'indigo': return 'from-indigo-50 to-indigo-100/55 text-indigo-700 border-indigo-200/80';
    case 'teal': return 'from-teal-50 to-teal-100/55 text-teal-700 border-teal-200/80';
    case 'purple': return 'from-purple-50 to-purple-100/55 text-purple-700 border-purple-200/80';
    case 'orange': return 'from-orange-50 to-orange-100/55 text-orange-700 border-orange-200/80';
    case 'rose': return 'from-rose-50 to-rose-100/55 text-rose-700 border-rose-200/80';
    default: return 'from-indigo-50 to-indigo-100/55 text-indigo-700 border-indigo-200/80';
  }
};

export default function HomeScreenSim({ onSelectTopic, onGoToSettings }: HomeScreenSimProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden font-sans select-none">
      {/* AppBar */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0 shadow-xs">
        <h1 className="font-bold text-lg text-slate-800 tracking-tight">영어 회화 반복 학습기</h1>
        <button 
          onClick={onGoToSettings}
          className="p-2 rounded-full hover:bg-slate-100 transition-colors tooltip cursor-pointer"
          title="학습 설정 이동"
          id="btn-settings-nav"
        >
          <Settings size={20} className="text-slate-600" />
        </button>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrolling-touch">
        {/* Banner Card */}
        <div className="p-5 bg-gradient-to-br from-teal-600 to-indigo-600 rounded-2xl text-white shadow-sm space-y-2 relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 blur-xs">
            <Sparkles size={120} />
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full w-max text-[11px] font-semibold tracking-wide uppercase">
            <Sparkles size={12} /> Today's Goal
          </div>
          <h2 className="font-bold text-base md:text-lg leading-tight">오늘도 10분, 귀를 틔워보세요!</h2>
          <p className="text-xs text-teal-50/90 leading-relaxed font-normal">
            원하는 회화 주제를 고른 후, 반복되는 영어 음성에 집중하며 쉐도잉해 보세요.
          </p>
        </div>

        {/* 오늘의 패턴 테마 학습 코너 */}
        <div className="space-y-2.5">
          <h3 className="font-bold text-sm text-slate-700 tracking-wide uppercase flex items-center gap-1.5">
            <span>오늘의 패턴 테마 학습 💡</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-sm">HOT</span>
          </h3>
          <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-none scroll-smooth">
            {patternsList.map((p) => {
              const bgGradient = getPatternColorClasses(p.color);
              return (
                <div
                  key={p.key}
                  onClick={() => onSelectTopic(p.key, `패턴: ${p.pattern}`)}
                  className={`min-w-[135px] max-w-[135px] p-3 bg-gradient-to-b ${bgGradient} border rounded-xl cursor-pointer hover:shadow-xs hover:border-slate-300 transition-all active:scale-95 shrink-0 flex flex-col justify-between h-[100px]`}
                >
                  <div>
                    <span className="text-[9px] font-bold tracking-tight opacity-75">{p.badge}</span>
                    <h4 className="font-extrabold text-slate-800 text-[13px] leading-tight mt-0.5 truncate">
                      {p.pattern}
                    </h4>
                  </div>
                  <div className="text-[11px] font-medium text-slate-600 truncate mt-1">
                    {p.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section Title */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-700 tracking-wide uppercase">회화 학습 주제 선택</h3>
          
          {/* Card Collection */}
          <div className="space-y-3">
            {topics.map((topic) => {
              const iconStyleClass = getIconColorClass(topic.color);
              const cardHoverClass = getCardHoverClass(topic.color);
              
              return (
                <div
                  key={topic.key}
                  onClick={() => onSelectTopic(topic.key, topic.title)}
                  className={`flex items-center gap-4 p-4 bg-white border border-slate-150 rounded-2xl transition-all cursor-pointer ${cardHoverClass} group shadow-2xs`}
                  id={`topic-card-${topic.key}`}
                >
                  {/* Icon Frame */}
                  <div className={`p-3 rounded-full border shrink-0 transition-transform group-hover:scale-105 ${iconStyleClass}`}>
                    {getIcon(topic.icon, "w-6 h-6")}
                  </div>

                  {/* Text Descriptors */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-slate-900 leading-snug">
                      {topic.title}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5 leading-normal">
                      {topic.desc}
                    </p>
                  </div>

                  {/* Navigation Arrow */}
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors group-hover:translate-x-0.5" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
