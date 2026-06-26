import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:http/http.dart' as http;
import 'dart:js' as js;

/// TTS (Text-to-Speech) 재생을 관리하는 서비스 클래스
class TtsService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;

  TtsService() {
    _initTts();
  }

  /// TTS 초기화 설정 (영어 US, 배속 0.45 지정)
  Future<void> _initTts() async {
    await _flutterTts.setLanguage("en-US");
    await _flutterTts.setSpeechRate(0.45);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.0);

    _flutterTts.setStartHandler(() {
      _isSpeaking = true;
    });

    _flutterTts.setCompletionHandler(() {
      _isSpeaking = false;
    });

    _flutterTts.setErrorHandler((msg) {
      _isSpeaking = false;
    });
  }

  /// 현재 말하는 중인지 체크
  bool get isSpeaking => _isSpeaking;

  /// 단일 텍스트 음성 출력
  Future<void> speak(String text, {double speed = 1.15, String speaker = 'A', String lang = 'en-US'}) async {
    _isSpeaking = true;

    if (kIsWeb) {
      try {
        final origin = Uri.base.origin;
        final response = await http.post(
          Uri.parse('$origin/api/tts'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'text': text,
            'lang': lang,
            'speaker': speaker,
            'speed': speed,
          }),
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final base64Audio = data['audioContent'];
          if (base64Audio != null && base64Audio.toString().isNotEmpty) {
            js.context.callMethod('eval', ["""
              (function() {
                window.activeFlutterAudioPlaying = true;
                if (!window.activeFlutterAudio) {
                  window.activeFlutterAudio = new Audio();
                }
                var audio = window.activeFlutterAudio;
                try { audio.pause(); } catch(e){}
                audio.src = "data:audio/mp3;base64," + "${base64Audio.toString()}";
                audio.onended = function() {
                  window.activeFlutterAudioPlaying = false;
                };
                audio.onerror = function() {
                  window.activeFlutterAudioPlaying = false;
                };
                audio.play().catch(function(err) {
                  console.warn("Flutter Web TTS Play blocked/failed on mobile:", err);
                  window.activeFlutterAudioPlaying = false;
                });
              })()
            """]);

            int elapsed = 0;
            while (js.context['activeFlutterAudioPlaying'] == true && elapsed < 12000) {
              await Future.delayed(const Duration(milliseconds: 100));
              elapsed += 100;
            }
            _isSpeaking = false;
            return;
          }
        }
      } catch (e) {
        debugPrint("[TTS API Error] Fallback to offline tts: $e");
      }
    }

    // Fallback: Local offline TTS
    double localRate = 0.45;
    if (speed < 0.8) localRate = 0.35;
    else if (speed < 1.0) localRate = 0.40;
    else if (speed > 1.1) localRate = 0.50;

    await _flutterTts.setSpeechRate(localRate);
    await _flutterTts.speak(text);

    while (_isSpeaking) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }

  /// 모바일 웹 브라우저의 유저 제스처 정책 잠금 해제용 웜업 유틸리티
  void unlockAudioForWeb() {
    if (kIsWeb) {
      try {
        js.context.callMethod('eval', ["""
          (function() {
            if (!window.activeFlutterAudio) {
              window.activeFlutterAudio = new Audio();
            }
            // 1-pixel tiny silent audio
            window.activeFlutterAudio.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";
            window.activeFlutterAudio.play().then(function() {
              window.activeFlutterAudio.pause();
            }).catch(function(e) {
              console.warn("Silent audio warm-up bypassed:", e);
            });
          })()
        """]);
      } catch (e) {
        // ignore
      }
    }
  }

  /// TTS 재생 전면 일시정지 및 정지
  Future<void> stop() async {
    await _flutterTts.stop();
    _isSpeaking = false;
    if (kIsWeb) {
      try {
        js.context.callMethod('eval', ["""
          if (window.activeFlutterAudio) {
            try {
              window.activeFlutterAudio.pause();
            } catch(e){}
          }
          window.activeFlutterAudioPlaying = false;
        """]);
      } catch (e) {
        // ignore
      }
    }
  }

  /// 한국말이나 언어 번용에 사용할 수 있도록 설정 전환 함수 (확장용)
  Future<void> setLanguage(String languageCode) async {
    await _flutterTts.setLanguage(languageCode);
  }

  /// 속도 조절용 함수 (확장용)
  Future<void> setSpeechRate(double rate) async {
    double localRate = 0.45;
    if (rate < 0.8) localRate = 0.35;
    else if (rate < 1.0) localRate = 0.40;
    else if (rate > 1.1) localRate = 0.50;
    await _flutterTts.setSpeechRate(localRate);
  }
}
