import 'dart:async';
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

  /// 자가 학습 피드백 상태 업데이트
  Future<void> updateDialogStatus(int index, String status) async {
    _dialogStatus[index] = status;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dialog_status_${_currentTopicKey}_$index', status);
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
      return "$visiblePart $hiddenPart";
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
          resultWords.add("[${'_' * cleanWord.length}]$punc");
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
      final saved = prefs.getString('dialog_status_${_currentTopicKey}_$i');
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
    for (int i = 0; i < loadedDialogs.length; i++) {
      final saved = prefs.getString('dialog_status_${_currentTopicKey}_$i');
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
}
