import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
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

      // SharedPreferences에서 저장된 사용자 지정 API 키 읽기
      final prefs = await SharedPreferences.getInstance();
      final userKey = prefs.getString('google_tts_api_key') ?? '';
      final activeKey = userKey.trim().isNotEmpty ? userKey.trim() : _kGoogleTtsApiKey;

      final uri = Uri.parse(
        'https://texttospeech.googleapis.com/v1/text:synthesize?key=$activeKey',
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
        debugPrint('[TTS] Google API HTTP ${response.statusCode}: ${response.body}');
        return false;
      }

      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final base64Audio = data['audioContent'] as String?;
      if (base64Audio == null || base64Audio.isEmpty) return false;

      // Base64 MP3를 브라우저 Audio 객체로 재생
      return await _playBase64AudioOnWeb(base64Audio);
    } catch (e) {
      debugPrint('[TTS] Google API 예외: $e');
      return false;
    }
  }

  /// Base64 인코딩된 MP3를 브라우저 Audio 객체로 재생하고 완료까지 대기
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
        try { audio.pause(); } catch(e) {}

        audio.src = "data:audio/mp3;base64,$base64Audio";
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
    final safeText = text.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', ' ');

    _jsEval('''
      (function() {
        if (!window.speechSynthesis) {
          window.__fttPlaying = false;
          return;
        }
        window.speechSynthesis.cancel();
        window.__fttPlaying = true;

        var u = new SpeechSynthesisUtterance("$safeText");
        u.lang = "$lang";
        u.rate = $rate;
        u.pitch = 1.0;
        u.volume = 1.0;

        // 가능하면 고품질 보이스 선택
        var voices = window.speechSynthesis.getVoices();
        var picked = null;
        for (var i = 0; i < voices.length; i++) {
          var v = voices[i];
          var vl = v.lang.toLowerCase().replace("_", "-");
          if (vl === "${lang.toLowerCase()}") {
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
      debugPrint('[TTS] JS eval 오류: $e');
    }
  }
}
