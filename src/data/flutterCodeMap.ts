export const flutterCodeMap: Record<string, { path: string; language: string; content: string }> = {
  pubspec: {
    path: "pubspec.yaml",
    language: "yaml",
    content: `name: english_conversation_study
description: A Flutter application for English conversation echo learning.

version: 1.0.0+1

environment:
  sdk: ">=3.0.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.2
  flutter_tts: ^4.1.0
  shared_preferences: ^2.2.3
  http: ^1.2.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true

  assets:
    - assets/conversations/daily.json
    - assets/conversations/cafe.json
    - assets/conversations/restaurant.json
    - assets/conversations/shopping.json
    - assets/conversations/travel.json
    - assets/conversations/business.json`
  },
  dialog_item: {
    path: "lib/models/dialog_item.dart",
    language: "dart",
    content: `/// 영어 회화 개별 대화 아이템 모델
class DialogItem {
  final List<String> english;
  final List<String> korean;

  DialogItem({
    required this.english,
    required this.korean,
  });

  /// JSON 데이터로부터 DialogItem 객체 생성
  factory DialogItem.fromJson(Map<String, dynamic> json) {
    return DialogItem(
      english: List<String>.from(json['english'] ?? []),
      korean: List<String>.from(json['korean'] ?? []),
    );
  }

  /// DialogItem 객체를 JSON 형태로 변환
  Map<String, dynamic> toJson() {
    return {
      'english': english,
      'korean': korean,
    };
  }
}`
  },
  conversation: {
    path: "lib/models/conversation.dart",
    language: "dart",
    content: `import 'dialog_item.dart';

/// 영어 회화 주제별 대화 세트 모델
class Conversation {
  final String title;
  final List<DialogItem> dialogs;

  Conversation({
    required this.title,
    required this.dialogs,
  });

  /// JSON 데이터로부터 Conversation 객체 생성
  factory Conversation.fromJson(Map<String, dynamic> json) {
    var dialogsList = json['dialogs'] as List? ?? [];
    List<DialogItem> parsedDialogs = dialogsList
        .map((item) => DialogItem.fromJson(Map<String, dynamic>.from(item)))
        .toList();

    return Conversation(
      title: json['title'] ?? '',
      dialogs: parsedDialogs,
    );
  }

  /// Conversation 객체를 JSON 형태로 변환
  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'dialogs': dialogs.map((d) => d.toJson()).toList(),
    };
  }
}`
  },
  tts_service: {
    path: "lib/services/tts_service.dart",
    language: "dart",
    content: `import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
// ignore: avoid_web_libraries_in_flutter
import 'dart:js' as js;

/// ============================================================
///  ⚠️  보안 주의사항
///  API 키가 클라이언트 번들에 포함됩니다.
///  반드시 Google Cloud Console에서 아래 두 가지를 설정하세요:
///   1. API 키 → "애플리케이션 제한" → HTTP 리퍼러를
///      https://<your-id>.github.io/* 로 제한
///   2. API 키 → "API 제한" → Cloud Text-to-Speech API 만 허용
/// ============================================================
const String _kGoogleTtsApiKey = 'YOUR_GOOGLE_CLOUD_TTS_API_KEY';

/// 화자별 Google Cloud TTS 보이스 설정
/// A: 남성(en-US-Neural2-D), B: 여성(en-US-Neural2-F)
/// Neural2 보이스가 가장 자연스럽고 모바일에서도 안정적으로 재생됩니다.
const Map<String, Map<String, String>> _kVoiceConfig = {
  'A': {
    'languageCode': 'en-US',
    'name': 'en-US-Neural2-D',
    'ssmlGender': 'MALE',
  },
  'B': {
    'languageCode': 'en-US',
    'name': 'en-US-Neural2-F',
    'ssmlGender': 'FEMALE',
  },
};

/// TTS (Text-to-Speech) 재생을 관리하는 서비스 클래스
///
/// 우선순위:
///   1. Google Cloud TTS REST API (Web - 모든 환경, 고품질 Neural2 음성)
///   2. Web Speech API (Web - API 호출 실패 시 폴백)
///   3. flutter_tts (Native Android / iOS)
class TtsService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;

  /// Google Cloud TTS API가 이번 세션에서 완전히 실패했는지 여부
  /// (네트워크 단절, 키 오류 등. 이 경우 Web Speech API로 폴백)
  bool _googleApiUnavailable = false;

  TtsService() {
    _initTts();
  }

  // ──────────────────────────────────────────────
  // 초기화
  // ──────────────────────────────────────────────

  Future<void> _initTts() async {
    // Native 용 flutter_tts 초기 설정
    await _flutterTts.setLanguage('en-US');
    await _flutterTts.setSpeechRate(0.45);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);

    _flutterTts.setStartHandler(() => _isSpeaking = true);
    _flutterTts.setCompletionHandler(() => _isSpeaking = false);
    _flutterTts.setErrorHandler((_) => _isSpeaking = false);
  }

  bool get isSpeaking => _isSpeaking;

  // ──────────────────────────────────────────────
  // 메인 공개 API
  // ──────────────────────────────────────────────

  /// 텍스트를 음성으로 재생합니다.
  ///
  /// [text]    : 읽을 영어 텍스트
  /// [speed]   : 재생 속도 (1.0 = 보통. Google TTS speakingRate 그대로 사용)
  /// [speaker] : 'A' (남성) 또는 'B' (여성)
  /// [lang]    : 언어 코드 (기본 'en-US')
  Future<void> speak(
    String text, {
    double speed = 1.0,
    String speaker = 'A',
    String lang = 'en-US',
  }) async {
    if (text.trim().isEmpty) return;
    _isSpeaking = true;

    if (kIsWeb) {
      // ── 1순위: Google Cloud TTS REST API ──────────────────
      if (!_googleApiUnavailable) {
        final success = await _speakViaGoogleApi(text, speed: speed, speaker: speaker, lang: lang);
        if (success) {
          _isSpeaking = false;
          return;
        }
        // 실패 시 이번 세션 내 폴백 고정
        _googleApiUnavailable = true;
        debugPrint('[TTS] Google API 실패 → Web Speech API 폴백');
      }

      // ── 2순위: Web Speech API (브라우저 내장) ────────────
      await _speakViaWebSpeech(text, speed: speed, lang: lang);
      _isSpeaking = false;
      return;
    }

    // ── 3순위: Native flutter_tts (Android / iOS) ────────────
    await _speakViaNativeTts(text, speed: speed, lang: lang);
  }

  /// TTS 즉시 정지
  Future<void> stop() async {
    _isSpeaking = false;
    await _flutterTts.stop();

    if (kIsWeb) {
      _jsEval('''
        if (window.__fttAudio) {
          try { window.__fttAudio.pause(); } catch(e) {}
        }
        window.__fttPlaying = false;
        if (window.speechSynthesis) {
          try { window.speechSynthesis.cancel(); } catch(e) {}
        }
      ''');
    }
  }

  /// 모바일 웹 브라우저 오디오 잠금 해제 (사용자 제스처 이벤트 핸들러에서 호출)
  ///
  /// iOS Safari / 안드로이드 Chrome은 최초 사용자 인터랙션 없이
  /// Audio.play()를 호출하면 Promise가 reject됩니다.
  /// 버튼 탭 시 이 메서드를 호출하면 이후 자동재생이 허용됩니다.
  void unlockAudioForWeb() {
    if (!kIsWeb) return;
    _jsEval('''
      (function() {
        // 1. HTML5 Audio 잠금 해제 (무음 WAV)
        if (!window.__fttAudio) {
          window.__fttAudio = new Audio();
        }
        var silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAA==";
        window.__fttAudio.src = silentWav;
        window.__fttAudio.play().then(function() {
          window.__fttAudio.pause();
          window.__fttAudio.src = "";
        }).catch(function(e) {
          console.warn("[TTS] Silent audio unlock failed:", e);
        });

        // 2. Web Speech API 잠금 해제
        if (window.speechSynthesis) {
          var u = new SpeechSynthesisUtterance(" ");
          u.volume = 0;
          try { window.speechSynthesis.speak(u); } catch(e) {}
        }
      })();
    ''');
  }

  Future<void> setLanguage(String languageCode) async {
    await _flutterTts.setLanguage(languageCode);
  }

  Future<void> setSpeechRate(double rate) async {
    await _flutterTts.setSpeechRate(_toNativeRate(rate));
  }

  // ──────────────────────────────────────────────
  // 내부 구현
  // ──────────────────────────────────────────────

  /// Google Cloud TTS REST API 직접 호출 (클라이언트 사이드)
  ///
  /// 정적 호스팅(GitHub Pages)에서 서버 없이 고품질 Neural2 음성을 재생하는 핵심 로직.
  /// API 키는 반드시 HTTP 리퍼러 + API 제한을 걸어두세요.
  Future<bool> _speakViaGoogleApi(
    String text, {
    required double speed,
    required String speaker,
    required String lang,
  }) async {
    try {
      final voice = _kVoiceConfig[speaker] ?? _kVoiceConfig['A']!;

      // speakingRate: 0.25 ~ 4.0 (Google Cloud TTS 스펙)
      final double speakingRate = speed.clamp(0.25, 4.0);

      final uri = Uri.parse(
        'https://texttospeech.googleapis.com/v1/text:synthesize?key=\$_kGoogleTtsApiKey',
      );

      final body = jsonEncode({
        'input': {'text': text},
        'voice': {
          'languageCode': lang,
          'name': voice['name'],
          'ssmlGender': voice['ssmlGender'],
        },
        'audioConfig': {
          'audioEncoding': 'MP3',
          'speakingRate': speakingRate,
          'pitch': 0.0,
          'volumeGainDb': 0.0,
        },
      });

      final response = await http
          .post(uri, headers: {'Content-Type': 'application/json'}, body: body)
          .timeout(const Duration(seconds: 8));

      if (response.statusCode != 200) {
        debugPrint('[TTS] Google API HTTP \${response.statusCode}: \${response.body}');
        return false;
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final base64Audio = data['audioContent'] as String?;
      if (base64Audio == null || base64Audio.isEmpty) return false;

      // Base64 MP3를 브라우저 Audio 객체로 재생
      return await _playBase64AudioOnWeb(base64Audio);
    } catch (e) {
      debugPrint('[TTS] Google API 예외: \$e');
      return false;
    }
  }

  /// Base64 MP3를 브라우저 Audio 객체로 재생하고 완료까지 대기
  Future<bool> _playBase64AudioOnWeb(String base64Audio) async {
    // JS 전역에 완료 플래그를 세우고 재생 시작
    _jsEval('''
      (function() {
        window.__fttPlaying = true;
        window.__fttError = false;

        if (!window.__fttAudio) {
          window.__fttAudio = new Audio();
        }
        var audio = window.__fttAudio;
        try { audio.pause(); } catch(e){}

        audio.src = "data:audio/mp3;base64,\$base64Audio";
        audio.onended = function() {
          window.__fttPlaying = false;
        };
        audio.onerror = function(e) {
          console.warn("[TTS] Audio 재생 오류:", e);
          window.__fttPlaying = false;
          window.__fttError = true;
        };

        audio.play().catch(function(err) {
          console.warn("[TTS] Audio.play() 차단됨 (사용자 제스처 필요):", err);
          window.__fttPlaying = false;
          window.__fttError = true;
        });
      })();
    ''');

    // 재생 완료 또는 오류까지 폴링 대기 (최대 30초)
    int elapsed = 0;
    while (elapsed < 30000) {
      await Future.delayed(const Duration(milliseconds: 80));
      elapsed += 80;

      final playing = js.context['__fttPlaying'];
      final error = js.context['__fttError'];

      if (error == true) return false;
      if (playing != true) return true; // 정상 완료
    }

    // 타임아웃
    debugPrint('[TTS] Audio 재생 타임아웃');
    return false;
  }

  /// Web Speech API (브라우저 내장, 폴백)
  Future<void> _speakViaWebSpeech(String text, {required double speed, required String lang}) async {
    // Web Speech API는 율(rate) 0.1 ~ 10 지원
    final double rate = speed.clamp(0.5, 2.0);

    // JS 문자열 이스케이프 처리
    final safeText = text.replaceAll('\\\\', '\\\\\\\\').replaceAll('"', '\\\\"').replaceAll('\\n', ' ');

    _jsEval('''
      (function() {
        if (!window.speechSynthesis) {
          window.__fttPlaying = false;
          return;
        }
        window.speechSynthesis.cancel();
        window.__fttPlaying = true;

        var u = new SpeechSynthesisUtterance("\$safeText");
        u.lang = "\$lang";
        u.rate = \$rate;
        u.pitch = 1.0;
        u.volume = 1.0;

        // 가능하면 고품질 보이스 선택
        var voices = window.speechSynthesis.getVoices();
        var picked = null;
        for (var i = 0; i < voices.length; i++) {
          var v = voices[i];
          var vl = v.lang.toLowerCase().replace("_", "-");
          if (vl === "\${lang.toLowerCase()}") {
            if (!picked) picked = v;
            if (v.name.indexOf("Google") > -1 || v.name.indexOf("Natural") > -1 || v.name.indexOf("Siri") > -1) {
              picked = v;
              break;
            }
          }
        }
        if (picked) u.voice = picked;

        u.onend = function() { window.__fttPlaying = false; };
        u.onerror = function(e) {
          console.warn("[TTS] WebSpeech 오류:", e);
          window.__fttPlaying = false;
        };

        window.speechSynthesis.speak(u);
      })();
    ''');

    int elapsed = 0;
    while (elapsed < 20000) {
      await Future.delayed(const Duration(milliseconds: 80));
      elapsed += 80;
      if (js.context['__fttPlaying'] != true) return;
    }
  }

  /// Native flutter_tts (Android / iOS)
  Future<void> _speakViaNativeTts(String text, {required double speed, required String lang}) async {
    await _flutterTts.setSpeechRate(_toNativeRate(speed));
    await _flutterTts.setLanguage(lang);
    await _flutterTts.speak(text);

    // flutter_tts 완료 핸들러가 _isSpeaking = false 로 설정할 때까지 대기
    int elapsed = 0;
    while (_isSpeaking && elapsed < 30000) {
      await Future.delayed(const Duration(milliseconds: 80));
      elapsed += 80;
    }
  }

  /// web speed(1.0 기준) → flutter_tts native rate(0.35~0.55) 변환
  double _toNativeRate(double speed) {
    if (speed < 0.8) return 0.35;
    if (speed < 1.0) return 0.40;
    if (speed > 1.2) return 0.55;
    return 0.45;
  }

  /// JS eval 헬퍼 (Web 전용)
  void _jsEval(String code) {
    try {
      js.context.callMethod('eval', [code]);
    } catch (e) {
      debugPrint('[TTS] JS eval 오류: \$e');
    }
  }
}
`
  },
  conversation_service: {
    path: "lib/services/conversation_service.dart",
    language: "dart",
    content: `import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import '../models/dialog_item.dart';

/// 대화 데이터 공급을 추상화한 인터페이스 (향후 확장성 확보: 생성형 AI 대응 등)
abstract class ConversationSource {
  Future<List<DialogItem>> getDialogs(String topicKey);
}

/// 1. 로컬 JSON 파일을 읽어 대화를 반환하는 소스 구현체 (현재 메인으로 사용)
class LocalJsonSource implements ConversationSource {
  @override
  Future<List<DialogItem>> getDialogs(String topicKey) async {
    try {
      if (topicKey.startsWith('pattern_')) {
        final List<String> coreTopics = ['daily', 'cafe', 'restaurant', 'shopping', 'travel', 'business'];
        final String patternText = topicKey == 'pattern_doyouhave' ? 'do you have' :
                             topicKey == 'pattern_couldi' ? 'could i' :
                             topicKey == 'pattern_donthaveto' ? "don't have to" :
                             topicKey == 'pattern_howabout' ? 'how about' :
                             topicKey == 'pattern_lookingfor' ? 'looking for' : '';
        
        final List<DialogItem> matched = [];
        for (final topic in coreTopics) {
          try {
            final String jsonString = await rootBundle.loadString('assets/conversations/\$topic.json');
            final Map<String, dynamic> jsonData = json.decode(jsonString);
            final List<dynamic> dialogsJson = jsonData['dialogs'] ?? [];
            final List<DialogItem> dialogs = dialogsJson.map((item) => DialogItem.fromJson(item)).toList();
            for (final dialog in dialogs) {
              final bool hasPattern = dialog.english.any((sentence) => sentence.toLowerCase().contains(patternText));
              if (hasPattern) {
                matched.add(dialog);
              }
            }
          } catch (e) {
            // ignore error
          }
        }
        return matched;
      }

      final String jsonString = await rootBundle.loadString('assets/conversations/\$topicKey.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      final List<dynamic> dialogsJson = jsonData['dialogs'] ?? [];
      return dialogsJson.map((item) => DialogItem.fromJson(item)).toList();
    } catch (e) {
      return [
        DialogItem(
          english: ["Failed to load conversation for \$topicKey."],
          korean: ["공부를 위한 대화 데이터를 불러오는데 실패했습니다."]
        )
      ];
    }
  }
}

/// 2. [향후 확장 영역] 생성형 AI 대화 생성을 시뮬레이션하는 Mock 소스 구현체
class AiConversationSource implements ConversationSource {
  @override
  Future<List<DialogItem>> getDialogs(String topicKey) async {
    await Future.delayed(const Duration(milliseconds: 1500));
    return [
      DialogItem(
        english: [
          "[AI] Hello! Welcome to the smart AI room for \$topicKey.",
          "That sounds amazing! I can talk about \$topicKey all day long."
        ],
        korean: [
          "[AI] 안녕하세요! \$topicKey를 위한 스마트 AI 공간에 오신것을 환영합니다.",
          "정말 멋지네요! 저는 하루 종일이라도 \$topicKey 에 관한 이야기를 나눌 수 있습니다."
        ]
      )
    ];
  }
}

/// 사용자가 선택한 소스에서 대화를 가져올 수 있게 총괄 제어하는 서비스
class ConversationService {
  final ConversationSource _localSource = LocalJsonSource();
  final ConversationSource _aiSource = AiConversationSource();

  Future<List<DialogItem>> fetchDialogs(String topicKey, {bool useAi = false}) async {
    if (useAi) {
      return await _aiSource.getDialogs(topicKey);
    } else {
      return await _localSource.getDialogs(topicKey);
    }
  }
}`
  },
  settings_provider: {
    path: "lib/providers/settings_provider.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsProvider with ChangeNotifier {
  static const String keyRepeatCount = "repeat_count";
  static const String keyAutoProceed = "auto_proceed";
  static const String keyRandomPlay = "random_play";
  static const String keyGoogleTtsApiKey = "google_tts_api_key";

  int _repeatCount = 3;
  bool _autoProceed = false;
  bool _randomPlay = false;
  String _googleTtsApiKey = "";

  SettingsProvider() {
    _loadSettings();
  }

  int get repeatCount => _repeatCount;
  bool get autoProceed => _autoProceed;
  bool get randomPlay => _randomPlay;
  String get googleTtsApiKey => _googleTtsApiKey;

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _repeatCount = prefs.getInt(keyRepeatCount) ?? 3;
    _autoProceed = prefs.getBool(keyAutoProceed) ?? false;
    _randomPlay = prefs.getBool(keyRandomPlay) ?? false;
    _googleTtsApiKey = prefs.getString(keyGoogleTtsApiKey) ?? "";
    notifyListeners();
  }

  Future<void> setRepeatCount(int count) async {
    if (count < 1 || count > 20) return;
    _repeatCount = count;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(keyRepeatCount, count);
  }

  Future<void> setAutoProceed(bool enabled) async {
    _autoProceed = enabled;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(keyAutoProceed, enabled);
  }

  Future<void> setRandomPlay(bool enabled) async {
    _randomPlay = enabled;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(keyRandomPlay, enabled);
  }

  Future<void> setGoogleTtsApiKey(String apiKey) async {
    _googleTtsApiKey = apiKey;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(keyGoogleTtsApiKey, apiKey);
  }
}`
  },
  study_provider: {
    path: "lib/providers/study_provider.dart",
    language: "dart",
    content: `import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/dialog_item.dart';
import '../services/conversation_service.dart';
import '../services/tts_service.dart';

/// 회화 학습의 실행 상태(재생 루프, 진행 인덱스)를 전담하는 Provider
class StudyProvider with ChangeNotifier {
  final ConversationService _conversationService = ConversationService();
  final TtsService _ttsService = TtsService();

  // 학습 상태 변수들
  String _currentTopicKey = "";
  String _currentTopicTitle = "";
  List<DialogItem> _dialogs = [];
  int _currentDialogIndex = 0;
  
  bool _isPlaying = false;
  bool _isPaused = false;
  int _currentRepeatIndex = 0; // 현재 진행된 반복 횟수 (0부터 시작)
  int _targetRepeatCount = 3;  // 목표 반복 횟수 (SettingsProvider에서 공급)
  bool _revealTranslation = false; // 문장 및 한글 번역 공개 상태
  bool _isLoading = false;

  // 추가 기능 상태
  Map<int, String> _dialogStatus = {};
  int _hintLevel = 4; // 1: 한글만, 2: 패턴만, 3: 빈칸채우기, 4: 전체대본
  double _speechRate = 1.15;

  Timer? _autoProceedTimer;
  bool _disposed = false;

  // Getters
  String get currentTopicTitle => _currentTopicTitle;
  List<DialogItem> get dialogs => _dialogs;
  int get currentDialogIndex => _currentDialogIndex;
  bool get isPlaying => _isPlaying;
  bool get isPaused => _isPaused;
  int get currentRepeatIndex => _currentRepeatIndex;
  int get targetRepeatCount => _targetRepeatCount;
  bool get revealTranslation => _revealTranslation;
  bool get isLoading => _isLoading;
  Map<int, String> get dialogStatus => _dialogStatus;
  int get hintLevel => _hintLevel;
  double get speechRate => _speechRate;

  /// 현재 진행 상태를 나타내는 진행율 (0.0 ~ 1.0)
  double get progress {
    if (_dialogs.isEmpty) return 0.0;
    return (_currentDialogIndex + 1) / _dialogs.length;
  }

  /// 현재 활성화된 대화 아이템 반환
  DialogItem? get currentDialog {
    if (_dialogs.isEmpty || _currentDialogIndex >= _dialogs.length) return null;
    return _dialogs[_currentDialogIndex];
  }

  void setHintLevel(int level) {
    _hintLevel = level;
    notifyListeners();
  }

  void setRevealTranslation(bool reveal) {
    _revealTranslation = reveal;
    notifyListeners();
  }

  Future<void> setSpeechRate(double rate) async {
    _speechRate = rate;
    notifyListeners();
    await _ttsService.setSpeechRate(rate);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setDouble('speech_rate', rate);
  }

  /// 자가 학습 피드백 상태 업데이트
  Future<void> updateDialogStatus(int index, String status) async {
    _dialogStatus[index] = status;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dialog_status_\${_currentTopicKey}_\$index', status);
  }

  @override
  void dispose() {
    _disposed = true;
    _ttsService.stop();
    _autoProceedTimer?.cancel();
    super.dispose();
  }

  @override
  void notifyListeners() {
    if (!_disposed) {
      super.notifyListeners();
    }
  }

  /// 점진적 힌트 영어 대본 변환 헬퍼
  String getHintedEnglish(String sentence, int level) {
    if (level == 1) {
      return ""; // 완전히 숨김
    }
    
    if (level == 2) {
      final List<String> patterns = [
        "Do you have", "Could I", "I don't have to", "How about", "I'm looking for", 
        "How have you been", "What are your", "It's really", "Did you have", 
        "What can I", "Would you like", "Can I get", "Are you ready", "How would you", 
        "Excuse me", "Where is", "What time is", "Is there", "Did you", "When is", "Is the"
      ];
      
      final lowerSentence = sentence.toLowerCase().trim();
      for (final pat in patterns) {
        if (lowerSentence.startsWith(pat.toLowerCase())) {
          final int patternLength = pat.length;
          final String patternPart = sentence.substring(0, patternLength);
          final String restPart = sentence.substring(patternLength);
          final String maskedRest = restPart.replaceAll(RegExp(r'[a-zA-Z]'), "•");
          return patternPart + maskedRest;
        }
      }
      
      final words = sentence.split(" ");
      if (words.length <= 2) return sentence;
      final visiblePart = words.sublist(0, 2).join(" ");
      final hiddenPart = words.sublist(2).join(" ").replaceAll(RegExp(r'[a-zA-Z]'), "•");
      return "\$visiblePart \$hiddenPart";
    }
    
    if (level == 3) {
      final List<String> words = sentence.split(" ");
      if (words.length <= 1) return sentence;
      
      // 글자 수 기반 빈칸 대상 단어 추출
      final List<MapEntry<int, int>> candidates = [];
      for (int i = 0; i < words.length; i++) {
        final cleanWord = words[i].replaceAll(RegExp(r'[.,?!]'), "");
        if (cleanWord.length > 2) {
          candidates.add(MapEntry(i, cleanWord.length));
        }
      }
      
      if (candidates.isEmpty) return sentence;
      
      // 긴 단어 위주 정렬
      candidates.sort((a, b) => b.value.compareTo(a.value));
      
      final int countToHide = (words.length / 4).floor().clamp(1, 2);
      final List<int> indicesToHide = candidates.take(countToHide).map((e) => e.key).toList();
      
      final List<String> resultWords = [];
      for (int i = 0; i < words.length; i++) {
        if (indicesToHide.contains(i)) {
          final word = words[i];
          final cleanWord = word.replaceAll(RegExp(r'[.,?!]'), "");
          final String punc = RegExp(r'[.,?!]').allMatches(word).map((m) => m.group(0)).join();
          resultWords.add("[\${\'_\' * cleanWord.length}]\$punc");
        } else {
          resultWords.add(words[i]);
        }
      }
      return resultWords.join(" ");
    }
    
    return sentence; // 4단계: 전체 노출
  }

  /// 상태별 가중치를 활용한 대화 추출 헬퍼
  int getNextWeightedIndex(int currentIdx, int listLength, SharedPreferences prefs) {
    if (listLength <= 1) return 0;
    
    final List<double> weights = List.generate(listLength, (i) {
      final saved = prefs.getString('dialog_status_\${_currentTopicKey}_\$i');
      if (saved == 'WRONG') return 5.0;      // 몰라요(오답): 가중치 5.0
      if (saved == 'CONFUSED') return 3.0;   // 헷갈려요: 가중치 3.0
      if (saved == 'KNOW') return 0.8;       // 알아요(정답): 가중치 0.8
      return 2.0;                             // 기본/미지정: 가중치 2.0
    });

    // 직전 들었던 문장이 연속으로 바로 또 나오는 것 방지
    if (currentIdx >= 0 && currentIdx < listLength) {
      weights[currentIdx] = 0.1;
    }

    final double totalWeight = weights.reduce((sum, w) => sum + w);
    double r = Random().nextDouble() * totalWeight;
    
    for (int i = 0; i < listLength; i++) {
      r -= weights[i];
      if (r <= 0) {
        return i;
      }
    }
    return (currentIdx + 1) % listLength;
  }

  /// 1. 대화 리스트 로드 및 초기화
  Future<void> loadTopic(String topicKey, String topicTitle, int targetRepeats, bool randomize, {bool useAi = false}) async {
    _isLoading = true;
    _isPlaying = false;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _targetRepeatCount = targetRepeats;
    _revealTranslation = false;
    _hintLevel = 4; // 기본 전체 공개 모드
    _currentTopicKey = topicKey;
    _currentTopicTitle = topicTitle;
    _dialogStatus = {};
    notifyListeners();

    _autoProceedTimer?.cancel();
    await _ttsService.stop();

    // 서비스에서 데이터 로드
    List<DialogItem> loadedDialogs = await _conversationService.fetchDialogs(topicKey, useAi: useAi);
    _dialogs = loadedDialogs;

    // 로컬 저장소로부터 각 대화 상태 복원
    final prefs = await SharedPreferences.getInstance();
    _speechRate = prefs.getDouble('speech_rate') ?? 1.15;
    for (int i = 0; i < loadedDialogs.length; i++) {
      final saved = prefs.getString('dialog_status_\${_currentTopicKey}_\$i');
      _dialogStatus[i] = saved ?? 'NONE';
    }

    // 만약 랜덤 재생이라면, 가중치가 반영된 무작위 인덱스부터 시작합니다.
    int startIndex = 0;
    if (randomize && loadedDialogs.isNotEmpty) {
      startIndex = getNextWeightedIndex(-1, loadedDialogs.length, prefs);
    }
    _currentDialogIndex = startIndex;

    _isLoading = false;
    notifyListeners();
  }

  /// 2. 학습 재생 제어 루프 시작
  Future<void> startStudy({required bool autoProceed, required bool randomize, required Function onAutoProceeded}) async {
    if (_dialogs.isEmpty) return;
    
    if (_isPaused) {
      // 일시정지 상태에서 재개하는 경우
      _isPaused = false;
      _isPlaying = true;
      notifyListeners();
      _runStudyLoop(autoProceed: autoProceed, randomize: randomize, onAutoProceeded: onAutoProceeded);
      return;
    }

    // 완전히 새로 시작하는 경우
    _isPlaying = true;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    notifyListeners();

    _autoProceedTimer?.cancel();
    _runStudyLoop(autoProceed: autoProceed, randomize: randomize, onAutoProceeded: onAutoProceeded);
  }

  /// 3. 정적/동적 일시정지
  Future<void> pauseStudy() async {
    _isPlaying = false;
    _isPaused = true;
    notifyListeners();
    await _ttsService.stop();
    _autoProceedTimer?.cancel();
  }

  /// 4. 완전 중지
  Future<void> stopStudy() async {
    _isPlaying = false;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    notifyListeners();
    await _ttsService.stop();
    _autoProceedTimer?.cancel();
  }

  /// 5. 이전 대화로 이동
  void previousDialog({bool randomize = false}) async {
    if (_dialogs.isEmpty) return;
    
    final prefs = await SharedPreferences.getInstance();
    if (randomize) {
      _currentDialogIndex = getNextWeightedIndex(_currentDialogIndex, _dialogs.length, prefs);
    } else if (_currentDialogIndex > 0) {
      _currentDialogIndex--;
    }
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    _isPaused = false;
    _isPlaying = false;
    _autoProceedTimer?.cancel();
    _ttsService.stop();
    notifyListeners();
  }

  /// 6. 다음 대화로 이동
  void nextDialog({bool randomize = false}) async {
    if (_dialogs.isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    if (randomize) {
      _currentDialogIndex = getNextWeightedIndex(_currentDialogIndex, _dialogs.length, prefs);
    } else if (_currentDialogIndex < _dialogs.length - 1) {
      _currentDialogIndex++;
    }
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    _isPaused = false;
    _isPlaying = false;
    _autoProceedTimer?.cancel();
    _ttsService.stop();
    notifyListeners();
  }

  /// 7. 음성 학습 자동-순환 비동기 루프 코어
  Future<void> _runStudyLoop({required bool autoProceed, required bool randomize, required Function onAutoProceeded}) async {
    while (_isPlaying && !_isPaused && _currentRepeatIndex < _targetRepeatCount) {
      final dialog = currentDialog;
      if (dialog == null) break;

      // 1회차, 2회차, ... 등 재생
      notifyListeners();

      // 대화 내의 영어 문장들을 순차적으로 재생
      for (int i = 0; i < dialog.english.length; i++) {
        if (!_isPlaying || _isPaused) return;

        final speaker = i % 2 == 0 ? 'A' : 'B';
        // 문장 TTS 재생
        await _ttsService.speak(dialog.english[i], speed: _speechRate, speaker: speaker);

        // 문장 사이 1초 대기 (마지막 문장이 아닌 경우에만 진행)
        if (i < dialog.english.length - 1) {
          if (!_isPlaying || _isPaused) return;
          await Future.delayed(const Duration(seconds: 1));
        }
      }

      _currentRepeatIndex++;
      notifyListeners();

      // 한 번의 대화 완료 후 다음 반복 전까지 2초 대기
      if (_currentRepeatIndex < _targetRepeatCount) {
        if (!_isPlaying || _isPaused) return;
        await Future.delayed(const Duration(seconds: 2));
      }
    }

    // 지정 횟수 반복 완료 후 번역 공개
    if (_isPlaying && !_isPaused && _currentRepeatIndex >= _targetRepeatCount) {
      _revealTranslation = true;
      _isPlaying = false;
      notifyListeners();

      // 자동 진행 옵션이 ON인 경우
      if (autoProceed) {
        _autoProceedTimer = Timer(const Duration(seconds: 3), () async {
          final prefs = await SharedPreferences.getInstance();
          if (randomize || _currentDialogIndex < _dialogs.length - 1) {
            _currentDialogIndex = randomize 
                ? getNextWeightedIndex(_currentDialogIndex, _dialogs.length, prefs)
                : _currentDialogIndex + 1;
            _currentRepeatIndex = 0;
            _revealTranslation = false;
            notifyListeners();
            onAutoProceeded(); // 다음 화면에서 재생을 다시 타게 유도
          } else {
            // 끝까지 간 경우 완료 상태로 일시정지 해제
            stopStudy();
          }
        });
      }
    }
  }
}`
  },
  conversation_card: {
    path: "lib/widgets/conversation_card.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';

class ConversationCard extends StatelessWidget {
  final String title;
  final String description;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const ConversationCard({
    super.key,
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16.0),
        side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
      ),
      color: color.withOpacity(0.08),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16.0),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: color.withOpacity(0.15),
                child: Icon(icon, color: color),
              ),
              const SizedBox(width: 16.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4.0),
                    Text(description, style: theme.textTheme.bodyMedium),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14.0),
            ],
          ),
        ),
      ),
    );
  }
}`
  },
  player_controls: {
    path: "lib/widgets/player_controls.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';

class PlayerControls extends StatelessWidget {
  final bool isPlaying;
  final bool isPaused;
  final bool hasPrevious;
  final bool hasNext;
  final VoidCallback onPlay;
  final VoidCallback onPause;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onReplay;

  const PlayerControls({
    super.key,
    required this.isPlaying,
    required this.isPaused,
    required this.hasPrevious,
    required this.hasNext,
    required this.onPlay,
    required this.onPause,
    required this.onPrevious,
    required this.onNext,
    required this.onReplay,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 16.0),
      color: theme.colorScheme.surface,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          IconButton.filledTonal(onPressed: onReplay, icon: const Icon(Icons.replay_rounded)),
          IconButton.outlined(onPressed: hasPrevious ? onPrevious : null, icon: const Icon(Icons.skip_previous_rounded)),
          FloatingActionButton(
            onPressed: isPlaying && !isPaused ? onPause : onPlay,
            child: Icon(isPlaying && !isPaused ? Icons.pause_rounded : Icons.play_arrow_rounded),
          ),
          IconButton.outlined(onPressed: hasNext ? onNext : null, icon: const Icon(Icons.skip_next_rounded)),
          IconButton.filledTonal(onPressed: isPlaying && !isPaused ? onPause : onPlay, icon: const Icon(Icons.volume_up_rounded)),
        ],
      ),
    );
  }
}`
  },
  home_screen: {
    path: "lib/screens/home_screen.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/study_provider.dart';
import '../widgets/conversation_card.dart';
import 'settings_screen.dart';
import 'study_screen.dart';

/// 앱의 엔트리 포인트 홈 화면. 대화 주제가 정갈한 카드 리스트로 나열됩니다.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // 각 주제 카드 정보들 데이터셋 정의
    final List<Map<String, dynamic>> topics = [
      {
        "key": "daily",
        "title": "일상 회화",
        "desc": "인사, 안부 묻기, 가벼운 대화 등 일상의 기본 대화형",
        "icon": Icons.chat_bubble_outline_rounded,
        "color": Colors.indigo,
      },
      {
        "key": "cafe",
        "title": "카페",
        "desc": "커피 주문, 자리 잡기, 디저트 추가 시 유용한 단골 표현",
        "icon": Icons.local_cafe_rounded,
        "color": Colors.brown,
      },
      {
        "key": "restaurant",
        "title": "식당",
        "desc": "예약 확인, 주문 및 서빙 요청, 편리한 계산대 소통법",
        "icon": Icons.restaurant_rounded,
        "color": Colors.teal,
      },
      {
        "key": "shopping",
        "title": "쇼핑",
        "desc": "사이즈 확인, 단추·소재 피니싱, 교환·반품 질문 정복",
        "icon": Icons.shopping_bag_rounded,
        "color": Colors.purple,
      },
      {
        "key": "travel",
        "title": "여행",
        "desc": "인천공항, 해외 수속, 호텔 체크인 & 즐거운 길찾기 대화",
        "icon": Icons.flight_takeoff_rounded,
        "color": Colors.orange,
      },
      {
        "key": "business",
        "title": "회사",
        "desc": "업무 회의, 보고서 상신, 세일즈 마켓 및 비즈니스 매너",
        "icon": Icons.business_center_rounded,
        "color": Colors.blueGrey,
      },
    ];

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text(
          "영어 회화 반복 학습기",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            tooltip: "설정으로 이동",
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 상단 가이드 배너
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      theme.colorScheme.primaryContainer,
                      theme.colorScheme.secondaryContainer.withOpacity(0.5),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "오늘도 10분, 귀를 틔워보세요!",
                      style: theme.textTheme.titleMedium?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8.0),
                    Text(
                      "원하는 회화 주제를 고른 후, 반복되는 영어 음성에 집중하며 쉐도잉해 보세요.",
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSecondaryContainer,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24.0),

              // 오늘의 패턴 테마 학습 타이틀
              Row(
                children: [
                  Text(
                    "오늘의 패턴 테마 학습 💡",
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      "HOT",
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        color: Colors.amber.shade900,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12.0),

              // 패턴 수평 리스트뷰
              SizedBox(
                height: 100,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _buildPatternCard(
                      context,
                      key: 'pattern_doyouhave',
                      pattern: 'Do you have ~',
                      desc: '~ 있나요?',
                      badge: '소유/유무',
                      color: Colors.indigo,
                    ),
                    const SizedBox(width: 10),
                    _buildPatternCard(
                      context,
                      key: 'pattern_couldi',
                      pattern: 'Could I ~',
                      desc: '~ 할 수 있을까요?',
                      badge: '정중한 부탁',
                      color: Colors.teal,
                    ),
                    const SizedBox(width: 10),
                    _buildPatternCard(
                      context,
                      key: 'pattern_donthaveto',
                      pattern: "I don't have to ~",
                      desc: '~ 하지 않아도 돼요',
                      badge: '의무 해제',
                      color: Colors.purple,
                    ),
                    const SizedBox(width: 10),
                    _buildPatternCard(
                      context,
                      key: 'pattern_howabout',
                      pattern: 'How about ~',
                      desc: '~ 는 어때요?',
                      badge: '의견 제안',
                      color: Colors.orange,
                    ),
                    const SizedBox(width: 10),
                    _buildPatternCard(
                      context,
                      key: 'pattern_lookingfor',
                      pattern: "I'm looking for ~",
                      desc: '~ 를 찾고 있어요',
                      badge: '목적/탐색',
                      color: Colors.pink,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28.0),
              
              Text(
                "회화 학습 주제 선택",
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12.0),

              // 주제 카드 그리드 형태 표출을 위한 ListView
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: topics.length,
                separatorBuilder: (context, index) => const SizedBox(height: 12.0),
                itemBuilder: (context, index) {
                  final topic = topics[index];
                  return ConversationCard(
                    title: topic["title"],
                    description: topic["desc"],
                    icon: topic["icon"],
                    color: topic["color"],
                    onTap: () {
                      final settings = Provider.of<SettingsProvider>(context, listen: false);
                      
                      // StudyProvider 초기 가동 설정 세팅하며 로드
                      Provider.of<StudyProvider>(context, listen: false).loadTopic(
                        topic["key"],
                        topic["title"],
                        settings.repeatCount,
                        settings.randomPlay,
                      );

                      // 학습 화면으로 라우팅
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const StudyScreen()),
                      );
                    },
                  );
                },
              ),
              const SizedBox(height: 20.0),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPatternCard(
    BuildContext context, {
    required String key,
    required String pattern,
    required String desc,
    required String badge,
    required Color color,
  }) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: () {
        final settings = Provider.of<SettingsProvider>(context, listen: false);
        Provider.of<StudyProvider>(context, listen: false).loadTopic(
          key,
          "패턴: \$pattern",
          settings.repeatCount,
          settings.randomPlay,
        );
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const StudyScreen()),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: 135,
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color.withOpacity(0.08), color.withOpacity(0.02)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
          border: Border.all(color: color.withOpacity(0.25), width: 1.2),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  badge,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  pattern,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: theme.colorScheme.onSurface,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
            Text(
              desc,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontSize: 10,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}`
  },
  settings_screen: {
    path: "lib/screens/settings_screen.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _apiKeyController;

  @override
  void initState() {
    super.initState();
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    _apiKeyController = TextEditingController(text: settings.googleTtsApiKey);
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = Provider.of<SettingsProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text("학습 설정")),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          ListTile(
            title: Text("대화 반복 횟수 (\${settings.repeatCount}회)", style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Slider(
              value: settings.repeatCount.toDouble(),
              min: 1, max: 20, divisions: 19,
              onChanged: (v) => settings.setRepeatCount(v.round()),
            ),
          ),
          SwitchListTile(
            title: const Text("자동 다음 대화 넘어가기"),
            value: settings.autoProceed,
            onChanged: (v) => settings.setAutoProceed(v),
          ),
          SwitchListTile(
            title: const Text("대화 순서 랜덤 재생"),
            value: settings.randomPlay,
            onChanged: (v) => settings.setRandomPlay(v),
          ),
          const Divider(),
          const SizedBox(height: 12.0),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("Google Cloud TTS API Key (선택)", style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8.0),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        obscureText: true,
                        controller: _apiKeyController,
                        decoration: const InputDecoration(
                          hintText: "AIzaSy...",
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8.0),
                    ElevatedButton(
                      onPressed: () {
                        settings.setGoogleTtsApiKey(_apiKeyController.text.trim());
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("API 키가 안전하게 저장되었습니다!")),
                        );
                      },
                      child: const Text("저장"),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}`
  },
  study_screen: {
    path: "lib/screens/study_screen.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/study_provider.dart';
import '../widgets/player_controls.dart';

/// 실제 회화 학습을 수행하는 스터디 보드 화면
class StudyScreen extends StatefulWidget {
  const StudyScreen({super.key});

  @override
  State<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends State<StudyScreen> {
  @override
  void initState() {
    super.initState();
    // 화면에 들어왔을 때 유저 편의를 위해 자동으로 플레이 루프를 걸어줍니다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _triggerPlay();
    });
  }

  /// 학습 플레이 즉시 트리거 단축 함수
  void _triggerPlay() {
    final study = Provider.of<StudyProvider>(context, listen: false);
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    
    study.startStudy(
      autoProceed: settings.autoProceed,
      randomize: settings.randomPlay,
      onAutoProceeded: () {
        // 자동 넘어갔을 시, 다음 아이템에서도 연속으로 재생을 자동 개시하게 함
        _triggerPlay();
      }
    );
  }

  Widget _buildHintButton(BuildContext context, int level, String label, String desc) {
    final study = Provider.of<StudyProvider>(context);
    final isSelected = study.hintLevel == level;
    final theme = Theme.of(context);
    
    return Expanded(
      child: InkWell(
        onTap: () => study.setHintLevel(level),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? theme.colorScheme.primary : theme.colorScheme.surface,
            border: Border.all(color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                ),
              ),
              Text(
                desc,
                style: TextStyle(
                  fontSize: 8,
                  color: isSelected ? theme.colorScheme.onPrimary.withOpacity(0.8) : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRatingButton(BuildContext context, int currentIndex, String statusKey, String label, Color color) {
    final study = Provider.of<StudyProvider>(context);
    final isSelected = study.dialogStatus[currentIndex] == statusKey;
    
    return Expanded(
      child: InkWell(
        onTap: () => study.updateDialogStatus(currentIndex, statusKey),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : color.withOpacity(0.06),
            border: Border.all(color: isSelected ? color : color.withOpacity(0.3)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : color,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final study = Provider.of<StudyProvider>(context);
    final settings = Provider.of<SettingsProvider>(context);

    final currentDialog = study.currentDialog;
    final totalDialogs = study.dialogs.length;
    final currentIndex = study.currentDialogIndex;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: Text(study.currentTopicTitle),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            study.stopStudy();
            Navigator.pop(context);
          },
        ),
      ),
      body: study.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 1. 상단 진행율 바 영역
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "진행도",
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            "\${currentIndex + 1} / \$totalDialogs",
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6.0),
                      LinearProgressIndicator(
                        value: study.progress,
                        borderRadius: BorderRadius.circular(8.0),
                        minHeight: 8.0,
                        backgroundColor: theme.colorScheme.secondaryContainer.withOpacity(0.3),
                        valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
                      ),
                      const SizedBox(height: 12.0),
                      
                      // 발음 속도 조절 드롭다운
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.speed_rounded,
                            size: 16,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            "발음 속도: ",
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          DropdownButton<double>(
                            value: study.speechRate,
                            elevation: 8,
                            underline: Container(),
                            style: theme.textTheme.bodySmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                            onChanged: (double? newValue) {
                              if (newValue != null) {
                                study.setSpeechRate(newValue);
                              }
                            },
                            items: const [
                              DropdownMenuItem<double>(
                                value: 0.65,
                                child: Text("0.65x (매우 느리게)"),
                              ),
                              DropdownMenuItem<double>(
                                value: 0.85,
                                child: Text("0.85x (부드러운 섀도잉)"),
                              ),
                              DropdownMenuItem<double>(
                                value: 1.0,
                                child: Text("1.00x (보통 속도)"),
                              ),
                              DropdownMenuItem<double>(
                                value: 1.15,
                                child: Text("1.15x (자연스러운 원어민속도)"),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // 2. 메인 대화 학습 스페이스 (컨텐츠에 따라 실시간 갱신)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 4.0),
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(24.0),
                      border: Border.all(
                        color: theme.colorScheme.outlineVariant.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: currentDialog == null
                        ? const Center(child: Text("학습용 대화 데이터가 비어 있습니다."))
                        : SingleChildScrollView(
                            padding: const EdgeInsets.all(20.0),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 400),
                              child: !study.revealTranslation
                                  // [숨겨진 상태] - 반복 음성 청취 안내
                                  ? Column(
                                      key: const ValueKey("hidden_state"),
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        const SizedBox(height: 40),
                                        // 귀 기울여 듣는 리스닝 애니메이션 형상화
                                        Container(
                                          padding: const EdgeInsets.all(28.0),
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.primary.withOpacity(0.08),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            Icons.hearing_rounded,
                                            size: 64,
                                            color: theme.colorScheme.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 32.0),
                                        Text(
                                          "영어 음성에만 귀 기울여보세요!",
                                          style: theme.textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 12.0),
                                        Text(
                                          "설정하신 목표 반복 회수(\${study.targetRepeatCount}번) 동안 문장을 따라 소리 내어 말해 보세요 (쉐도잉).",
                                          style: theme.textTheme.bodyMedium?.copyWith(
                                            color: theme.colorScheme.onSurfaceVariant,
                                            height: 1.5,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 24.0),
                                        
                                        // 실시간 진행도 웨이브 바 형태 모사
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: List.generate(5, (index) {
                                            bool isActive = study.isPlaying && !study.isPaused;
                                            return AnimatedContainer(
                                              duration: Duration(milliseconds: 200 + (index * 50)),
                                              margin: const EdgeInsets.symmetric(horizontal: 4.0),
                                              width: 6,
                                              height: isActive ? 24.0 + (index % 2 * 12) : 8.0,
                                              decoration: BoxDecoration(
                                                color: isActive 
                                                    ? theme.colorScheme.primary 
                                                    : theme.colorScheme.outlineVariant,
                                                borderRadius: BorderRadius.circular(4.0),
                                              ),
                                            );
                                          }),
                                        ),
                                        const SizedBox(height: 24),
                                        
                                        // 힌트보기 버튼 (처음 누르면 1단계 힌트로 진입)
                                        ElevatedButton.icon(
                                          onPressed: () {
                                            study.setRevealTranslation(true);
                                            study.setHintLevel(1);
                                          },
                                          icon: const Icon(Icons.remove_red_eye_rounded, size: 16),
                                          label: const Text("힌트보기", style: TextStyle(fontWeight: FontWeight.bold)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: theme.colorScheme.primaryContainer,
                                            foregroundColor: theme.colorScheme.onPrimaryContainer,
                                            elevation: 0,
                                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 24),
                                      ],
                                    )
                                  // [공개된 상태] - 영어 대화 대본과 한글 뜻 표출
                                  : Column(
                                      key: const ValueKey("revealed_state"),
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        // 점진적 힌트 단계 선택기 영역
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.surfaceContainer,
                                            borderRadius: BorderRadius.circular(16),
                                            border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.stretch,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  const Text("💡 점진적 힌트 선택", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: theme.colorScheme.primaryContainer,
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Text(
                                                      study.hintLevel == 1 ? "1단계: 한국어만" :
                                                      study.hintLevel == 2 ? "2단계: 핵심 패턴만" :
                                                      study.hintLevel == 3 ? "3단계: 빈칸 채우기" : "4단계: 전체 대본",
                                                      style: TextStyle(fontSize: 10, color: theme.colorScheme.onPrimaryContainer, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 8),
                                              Row(
                                                children: [
                                                  _buildHintButton(context, 1, "1단계", "한글만"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 2, "2단계", "패턴만"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 3, "3단계", "빈칸채우기"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 4, "4단계", "전체공개"),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 16.0),
                                        
                                        // 대화 원문 말풍선식 렌더링
                                        ...List.generate(currentDialog.english.length, (idx) {
                                          bool isA = idx % 2 == 0;
                                          return Container(
                                            margin: const EdgeInsets.symmetric(vertical: 8.0),
                                            padding: const EdgeInsets.all(16.0),
                                            decoration: BoxDecoration(
                                              color: isA 
                                                  ? theme.colorScheme.primary.withOpacity(0.06)
                                                  : theme.colorScheme.secondary.withOpacity(0.06),
                                              borderRadius: BorderRadius.only(
                                                topLeft: const Radius.circular(16.0),
                                                topRight: const Radius.circular(16.0),
                                                bottomLeft: isA ? Radius.zero : const Radius.circular(16.0),
                                                bottomRight: isA ? const Radius.circular(16.0) : Radius.zero,
                                              ),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                // 화자 표시 (A 또는 B)
                                                Row(
                                                  children: [
                                                    CircleAvatar(
                                                      radius: 12,
                                                      backgroundColor: isA 
                                                          ? theme.colorScheme.primary 
                                                          : theme.colorScheme.secondary,
                                                      child: Text(
                                                        isA ? "A" : "B",
                                                        style: const TextStyle(
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.bold,
                                                          color: Colors.white,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8.0),
                                                    Text(
                                                      isA ? "Speaker A" : "Speaker B",
                                                      style: theme.textTheme.labelSmall?.copyWith(
                                                        color: theme.colorScheme.onSurfaceVariant,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 8.0),
                                                
                                                // 영어 텍스트 (힌트 레벨 반영)
                                                study.hintLevel == 1
                                                    ? Text(
                                                        "(대본 숨김 처리됨 - 2~4단계를 선택하세요)",
                                                        style: theme.textTheme.bodyMedium?.copyWith(
                                                          color: theme.colorScheme.outline,
                                                          fontStyle: FontStyle.italic,
                                                        ),
                                                      )
                                                    : Text(
                                                        study.getHintedEnglish(currentDialog.english[idx], study.hintLevel),
                                                        style: theme.textTheme.bodyLarge?.copyWith(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 18,
                                                          color: theme.colorScheme.onSurface,
                                                        ),
                                                      ),
                                                const SizedBox(height: 6.0),
                                                // 한국어 번역 텍스트
                                                Text(
                                                  currentDialog.korean[idx],
                                                  style: theme.textTheme.bodyMedium?.copyWith(
                                                    color: theme.colorScheme.primary,
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                        
                                        // 자동이동 진행 중 카운트다운 알림 디스플레이
                                        if (settings.autoProceed && currentIndex < totalDialogs - 1)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 20.0),
                                            child: Text(
                                              "※ 3초 뒤 다음 회화 대화로 자동 넘어갑니다.",
                                              style: theme.textTheme.bodySmall?.copyWith(
                                                color: theme.colorScheme.outline,
                                                fontStyle: FontStyle.italic,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ),
                                      ],
                                    ),
                            ),
                          ),
                  ),
                ),

                // 자가평가 평가 패널 (번역/대본이 공개되었을 때만 노출)
                if (study.revealTranslation && currentDialog != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    margin: const EdgeInsets.only(bottom: 4.0),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.3))),
                      color: theme.colorScheme.surface,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "이 대화 기억난이도 평가 📝",
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (study.dialogStatus[currentIndex] != 'NONE')
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  "등록됨",
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.onPrimaryContainer,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildRatingButton(context, currentIndex, 'KNOW', '알아요 😊', const Color(0xFF10B981)),
                            const SizedBox(width: 8),
                            _buildRatingButton(context, currentIndex, 'CONFUSED', '헷갈려요 🤔', Colors.amber),
                            const SizedBox(width: 8),
                            _buildRatingButton(context, currentIndex, 'WRONG', '몰라요 😭', const Color(0xFFF43F5E)),
                          ],
                        ),
                      ],
                    ),
                  ),

                // 3. 하단 플레이어 제어기 위젯 마운트
                PlayerControls(
                  isPlaying: study.isPlaying,
                  isPaused: study.isPaused,
                  hasPrevious: currentIndex > 0,
                  hasNext: currentIndex < totalDialogs - 1,
                  onPlay: _triggerPlay,
                  onPause: () {
                    study.pauseStudy();
                  },
                  onPrevious: () {
                    study.previousDialog(randomize: settings.randomPlay);
                    // 이전 대화로 갈 때, 자동 재생을 바로 개시해서 몰입감 확보
                    _triggerPlay();
                  },
                  onNext: () {
                    study.nextDialog(randomize: settings.randomPlay);
                    // 다음 대화로 갈 때, 자동 재생을 바로 개시해서 몰입감 확보
                    _triggerPlay();
                  },
                  onReplay: () {
                    study.stopStudy().then((_) {
                      _triggerPlay();
                    });
                  },
                ),
              ],
            ),
    );
  }
}`
  },
  main: {
    path: "lib/main.dart",
    language: "dart",
    content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/settings_provider.dart';
import 'providers/study_provider.dart';
import 'screens/home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        ChangeNotifierProvider(create: (_) => StudyProvider()),
      ],
      child: const EnglishConversationApp(),
    ),
  );
}

class EnglishConversationApp extends StatelessWidget {
  const EnglishConversationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '영어 회화 반복 학습기',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
      ),
      home: const HomeScreen(),
    );
  }
}`
  }
};
