import 'dart:async';
import 'package:flutter_tts/flutter_tts.dart';

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
  Future<void> speak(String text) async {
    await _flutterTts.speak(text);
    // 재생이 완전히 끝난 것을 대기하기 위한 간단한 폴링 (또는 CompletionHandler 대기)
    while (_isSpeaking) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }

  /// TTS 재생 전면 일시정지 및 정지
  Future<void> stop() async {
    await _flutterTts.stop();
    _isSpeaking = false;
  }

  /// 한국말이나 언어 번용에 사용할 수 있도록 설정 전환 함수 (확장용)
  Future<void> setLanguage(String languageCode) async {
    await _flutterTts.setLanguage(languageCode);
  }

  /// 속도 조절용 함수 (확장용)
  Future<void> setSpeechRate(double rate) async {
    await _flutterTts.setSpeechRate(rate);
  }
}
