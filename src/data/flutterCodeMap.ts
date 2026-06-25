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
import 'dart:io' show Platform;
import 'package:flutter_tts/flutter_tts.dart';

/// TTS (Text-to-Speech) 재생을 관리하는 서비스 클래스
class TtsService {
  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;
  double _currentRate = 0.52; // 기본 원어민 표준 섀도잉 속도 (단어 쪼개짐 차단)

  TtsService() {
    _initTts();
  }

  /// TTS 초기화 설정 (억양 및 음색 최적화)
  Future<void> _initTts() async {
    await _flutterTts.setLanguage("en-US");
    
    // 플랫폼 속성별 보이스 캘리브레이션 (Android 와 iOS의 속도 스케일 보정)
    try {
      if (Platform.isIOS) {
        _currentRate = 0.50; // iOS 기준 유연한 배속
      } else {
        _currentRate = 0.53; // Android 기준 유연한 배속
      }
    } catch (e) {
      _currentRate = 0.52; // 웹 또는 기타 환경 폴백
    }

    await _flutterTts.setSpeechRate(_currentRate);
    await _flutterTts.setVolume(1.0);
    await _flutterTts.setPitch(1.02); // 약간 밝은 톤의 억양으로 원어민 선명도 증가

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

  /// 동적 음성 재생 속도 변경 (설정창 등에서 조절 및 저장 반영 가능)
  Future<void> setSpeechRate(double rate) async {
    _currentRate = rate;
    await _flutterTts.setSpeechRate(rate);
  }

  /// 단일 텍스트 음성 출력 (억양이 유지되는 고품질 발성 수행)
  Future<void> speak(String text) async {
    await _flutterTts.speak(text);
    while (_isSpeaking) {
      await Future.delayed(const Duration(milliseconds: 100));
    }
  }

  /// TTS 재생 전면 일시정지 및 정지
  Future<void> stop() async {
    await _flutterTts.stop();
    _isSpeaking = false;
  }
}`
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
      final String jsonString = await rootBundle.loadString('assets/conversations/$topicKey.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      final List<dynamic> dialogsJson = jsonData['dialogs'] ?? [];
      return dialogsJson.map((item) => DialogItem.fromJson(item)).toList();
    } catch (e) {
      return [
        DialogItem(
          english: ["Failed to load conversation for $topicKey."],
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
          "[AI] Hello! Welcome to the smart AI room for $topicKey.",
          "That sounds amazing! I can talk about $topicKey all day long."
        ],
        korean: [
          "[AI] 안녕하세요! $topicKey를 위한 스마트 AI 공간에 오신것을 환영합니다.",
          "정말 멋지네요! 저는 하루 종일이라도 $topicKey 에 관한 이야기를 나눌 수 있습니다."
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

  int _repeatCount = 3;
  bool _autoProceed = false;
  bool _randomPlay = false;

  SettingsProvider() {
    _loadSettings();
  }

  int get repeatCount => _repeatCount;
  bool get autoProceed => _autoProceed;
  bool get randomPlay => _randomPlay;

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _repeatCount = prefs.getInt(keyRepeatCount) ?? 3;
    _autoProceed = prefs.getBool(keyAutoProceed) ?? false;
    _randomPlay = prefs.getBool(keyRandomPlay) ?? false;
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
}`
  },
  study_provider: {
    path: "lib/providers/study_provider.dart",
    language: "dart",
    content: `import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../models/dialog_item.dart';
import '../services/conversation_service.dart';
import '../services/tts_service.dart';

class StudyProvider with ChangeNotifier {
  final ConversationService _conversationService = ConversationService();
  final TtsService _ttsService = TtsService();

  String _currentTopicTitle = "";
  List<DialogItem> _dialogs = [];
  int _currentDialogIndex = 0;
  bool _isPlaying = false;
  bool _isPaused = false;
  int _currentRepeatIndex = 0;
  int _targetRepeatCount = 3;
  bool _revealTranslation = false;
  bool _isLoading = false;

  Timer? _autoProceedTimer;
  bool _disposed = false;

  String get currentTopicTitle => _currentTopicTitle;
  List<DialogItem> get dialogs => _dialogs;
  int get currentDialogIndex => _currentDialogIndex;
  bool get isPlaying => _isPlaying;
  bool get isPaused => _isPaused;
  int get currentRepeatIndex => _currentRepeatIndex;
  int get targetRepeatCount => _targetRepeatCount;
  bool get revealTranslation => _revealTranslation;
  bool get isLoading => _isLoading;

  double get progress => _dialogs.isEmpty ? 0.0 : (_currentDialogIndex + 1) / _dialogs.length;
  DialogItem? get currentDialog => (_dialogs.isEmpty || _currentDialogIndex >= _dialogs.length) ? null : _dialogs[_currentDialogIndex];

  Future<void> loadTopic(String topicKey, String topicTitle, int targetRepeats, bool randomize) async {
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

    List<DialogItem> loadedDialogs = await _conversationService.fetchDialogs(topicKey);
    if (randomize && loadedDialogs.isNotEmpty) {
      loadedDialogs = List<DialogItem>.from(loadedDialogs)..shuffle(Random());
    }

    _dialogs = loadedDialogs;
    _isLoading = false;
    notifyListeners();
  }

  Future<void> startStudy({required bool autoProceed, required Function onAutoProceeded}) async {
    if (_dialogs.isEmpty) return;
    if (_isPaused) {
      _isPaused = false;
      _isPlaying = true;
      notifyListeners();
      _runStudyLoop(autoProceed: autoProceed, onAutoProceeded: onAutoProceeded);
      return;
    }
    _isPlaying = true;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    notifyListeners();
    _runStudyLoop(autoProceed: autoProceed, onAutoProceeded: onAutoProceeded);
  }

  Future<void> pauseStudy() async {
    _isPlaying = false;
    _isPaused = true;
    notifyListeners();
    await _ttsService.stop();
  }

  Future<void> stopStudy() async {
    _isPlaying = false;
    _isPaused = false;
    _currentRepeatIndex = 0;
    _revealTranslation = false;
    notifyListeners();
    await _ttsService.stop();
    _autoProceedTimer?.cancel();
  }

  void previousDialog() {
    if (_currentDialogIndex > 0) {
      _currentDialogIndex--;
      _currentRepeatIndex = 0;
      _revealTranslation = false;
      notifyListeners();
    }
  }

  void nextDialog() {
    if (_currentDialogIndex < _dialogs.length - 1) {
      _currentDialogIndex++;
      _currentRepeatIndex = 0;
      _revealTranslation = false;
      notifyListeners();
    }
  }

  Future<void> _runStudyLoop({required bool autoProceed, required Function onAutoProceeded}) async {
    while (_isPlaying && !_isPaused && _currentRepeatIndex < _targetRepeatCount) {
      final dialog = currentDialog;
      if (dialog == null) break;

      for (int i = 0; i < dialog.english.length; i++) {
        if (!_isPlaying || _isPaused) return;
        await _ttsService.speak(dialog.english[i]);
        if (i < dialog.english.length - 1) {
          await Future.delayed(const Duration(seconds: 1));
        }
      }

      _currentRepeatIndex++;
      notifyListeners();

      if (_currentRepeatIndex < _targetRepeatCount) {
        await Future.delayed(const Duration(seconds: 2));
      }
    }

    if (_isPlaying && !_isPaused && _currentRepeatIndex >= _targetRepeatCount) {
      _revealTranslation = true;
      _isPlaying = false;
      notifyListeners();

      if (autoProceed) {
        _autoProceedTimer = Timer(const Duration(seconds: 3), () {
          if (_currentDialogIndex < _dialogs.length - 1) {
            nextDialog();
            onAutoProceeded();
          } else {
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
      padding: const EdgeInsets.all(24.0),
      color: theme.colorScheme.surface,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          IconButton.filledTonal(onPressed: onReplay, icon: const Icon(Icons.replay_rounded)),
          IconButton.outlined(onPressed: hasPrevious ? onPrevious : null, icon: const Icon(Icons.skip_previous_rounded)),
          FloatingActionButton.large(
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

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final List<Map<String, dynamic>> topics = [
      {"key": "daily", "title": "일상 회화", "desc": "인사, 안부 묻기, 기본 표현", "icon": Icons.chat_bubble_outline, "color": Colors.indigo},
      {"key": "cafe", "title": "카페", "desc": "커피 주문, 디저트 선택하기", "icon": Icons.local_cafe, "color": Colors.brown},
      {"key": "restaurant", "title": "식당", "desc": "테이블 예약, 스테이크 주문", "icon": Icons.restaurant, "color": Colors.teal},
      {"key": "shopping", "title": "쇼핑", "desc": "사이즈 확인, 결제 및 환불", "icon": Icons.shopping_bag, "color": Colors.purple},
      {"key": "travel", "title": "여행", "desc": "공항 수속 및 호텔 체크인", "icon": Icons.flight_takeoff, "color": Colors.orange},
      {"key": "business", "title": "회사", "desc": "비즈니스 미팅과 슬라이드 보고", "icon": Icons.business_center, "color": Colors.blueGrey}
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text("영어 회화 반복 학습기"),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen())),
          )
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16.0),
        itemCount: topics.length,
        itemBuilder: (context, idx) {
          final t = topics[idx];
          return ConversationCard(
            title: t["title"],
            description: t["desc"],
            icon: t["icon"],
            color: t["color"],
            onTap: () {
              final s = Provider.of<SettingsProvider>(context, listen: false);
              Provider.of<StudyProvider>(context, listen: false).loadTopic(t["key"], t["title"], s.repeatCount, s.randomPlay);
              Navigator.push(context, MaterialPageRoute(builder: (_) => const StudyScreen()));
            },
          );
        },
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

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

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

class StudyScreen extends StatefulWidget {
  const StudyScreen({super.key});
  @override
  State<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends State<StudyScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _triggerPlay());
  }

  void _triggerPlay() {
    final study = Provider.of<StudyProvider>(context, listen: false);
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    study.startStudy(autoProceed: settings.autoProceed, onAutoProceeded: _triggerPlay);
  }

  @override
  Widget build(BuildContext context) {
    final study = Provider.of<StudyProvider>(context);
    final settings = Provider.of<SettingsProvider>(context);
    final currentDialog = study.currentDialog;

    return Scaffold(
      appBar: AppBar(title: Text(study.currentTopicTitle)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(20.0),
            child: LinearProgressIndicator(value: study.progress),
          ),
          Text("강도: \${study.currentRepeatIndex} / \${study.targetRepeatCount} 회 완료"),
          Expanded(
            child: study.revealTranslation 
              ? ListView(
                  children: List.generate(currentDialog!.english.length, (idx) {
                    return ListTile(
                      title: Text(currentDialog.english[idx]),
                      subtitle: Text(currentDialog.korean[idx]),
                    );
                  }),
                )
              : const Center(child: Text("영어 음성을 집중해서 들어보세요.")),
          ),
          PlayerControls(
            isPlaying: study.isPlaying,
            isPaused: study.isPaused,
            hasPrevious: study.currentDialogIndex > 0,
            hasNext: study.currentDialogIndex < study.dialogs.length - 1,
            onPlay: _triggerPlay,
            onPause: () => study.pauseStudy(),
            onPrevious: () { study.previousDialog(); _triggerPlay(); },
            onNext: () { study.nextDialog(); _triggerPlay(); },
            onReplay: () { study.stopStudy().then((_) => _triggerPlay()); },
          )
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
