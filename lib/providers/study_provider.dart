import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../models/dialog_item.dart';
import '../services/conversation_service.dart';
import '../services/tts_service.dart';

/// 회화 학습의 실행 상태(재생 루프, 진행 인덱스)를 전담하는 Provider
class StudyProvider with ChangeNotifier {
  final ConversationService _conversationService = ConversationService();
  final TtsService _ttsService = TtsService();

  // 학습 상태 변수들
  String _currentTopicTitle = "";
  List<DialogItem> _dialogs = [];
  int _currentDialogIndex = 0;
  
  bool _isPlaying = false;
  bool _isPaused = false;
  int _currentRepeatIndex = 0; // 현재 진행된 반복 횟수 (0부터 시작)
  int _targetRepeatCount = 3;  // 목표 반복 횟수 (SettingsProvider에서 공급)
  bool _revealTranslation = false; // 문장 및 한글 번역 공개 상태
  bool _isLoading = false;

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

  /// 1. 대화 리스트 로드 및 초기화
  Future<void> loadTopic(String topicKey, String topicTitle, int targetRepeats, bool randomize, {bool useAi = false}) async {
    _isLoading = true;
    _isPlaying = false;
    _isPaused = false;
    _currentDialogIndex = 0;
    _currentRepeatIndex = 0;
    _targetRepeatCount = targetRepeats;
    _revealTranslation = false;
    _currentTopicTitle = topicTitle;
    notifyListeners();

    _autoProceedTimer?.cancel();
    await _ttsService.stop();

    // 서비스에서 데이터 로드
    List<DialogItem> loadedDialogs = await _conversationService.fetchDialogs(topicKey, useAi: useAi);

    if (randomize && loadedDialogs.isNotEmpty) {
      final random = Random();
      // 순서를 무작위로 섞음
      loadedDialogs = List<DialogItem>.from(loadedDialogs)..shuffle(random);
    }

    _dialogs = loadedDialogs;
    _isLoading = false;
    notifyListeners();
  }

  /// 2. 학습 재생 제어 루프 시작
  Future<void> startStudy({required bool autoProceed, required Function onAutoProceeded}) async {
    if (_dialogs.isEmpty) return;
    
    if (_isPaused) {
      // 일시정지 상태에서 재개하는 경우
      _isPaused = false;
      _isPlaying = true;
      notifyListeners();
      _runStudyLoop(autoProceed: autoProceed, onAutoProceeded: onAutoProceeded);
      return;
    }

    // 완전히 새로 시작하는 경우
    _isPlaying = true;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    notifyListeners();

    _autoProceedTimer?.cancel();
    _runStudyLoop(autoProceed: autoProceed, onAutoProceeded: onAutoProceeded);
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
  void previousDialog() {
    if (_currentDialogIndex > 0) {
      _currentDialogIndex--;
      _currentRepeatIndex = 0;
      _revealTranslation = false;
      _isPaused = false;
      _isPlaying = false;
      _autoProceedTimer?.cancel();
      _ttsService.stop();
      notifyListeners();
    }
  }

  /// 6. 다음 대화로 이동
  void nextDialog() {
    if (_currentDialogIndex < _dialogs.length - 1) {
      _currentDialogIndex++;
      _currentRepeatIndex = 0;
      _revealTranslation = false;
      _isPaused = false;
      _isPlaying = false;
      _autoProceedTimer?.cancel();
      _ttsService.stop();
      notifyListeners();
    }
  }

  /// 7. 음성 학습 자동-순환 비동기 루프 코어
  Future<void> _runStudyLoop({required bool autoProceed, required Function onAutoProceeded}) async {
    while (_isPlaying && !_isPaused && _currentRepeatIndex < _targetRepeatCount) {
      final dialog = currentDialog;
      if (dialog == null) break;

      // 1회차, 2회차, ... 등 재생
      notifyListeners();

      // 대화 내의 영어 문장들을 순차적으로 재생
      for (int i = 0; i < dialog.english.length; i++) {
        if (!_isPlaying || _isPaused) return;

        // 문장 TTS 재생
        await _ttsService.speak(dialog.english[i]);

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
        _autoProceedTimer = Timer(const Duration(seconds: 3), () {
          if (_currentDialogIndex < _dialogs.length - 1) {
            nextDialog();
            onAutoProceeded(); // 다음 화면에서 재생을 다시 타게 유도
          } else {
            // 끝까지 간 경우 완료 상태로 일시정지 해제
            stopStudy();
          }
        });
      }
    }
  }
}
