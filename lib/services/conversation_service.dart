import 'dart:convert';
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
      // assets/conversations/{topicKey}.json 경로에서 에셋 읽기
      final String jsonString = await rootBundle.loadString('assets/conversations/$topicKey.json');
      final Map<String, dynamic> jsonData = json.decode(jsonString);
      
      final List<dynamic> dialogsJson = jsonData['dialogs'] ?? [];
      return dialogsJson.map((item) => DialogItem.fromJson(item)).toList();
    } catch (e) {
      // 로컬 파일 읽기 실패 시 빈 배열 또는 기본 안내 대입
      return [
        DialogItem(
          english: ["Failed to load conversation for $topicKey.", "Please check the asset path in pubspec.yaml."],
          korean: ["$topicKey 대화 데이터를 불러오는데 실패했습니다.", "pubspec.yaml의 에셋 경로를 확인해주세요."]
        )
      ];
    }
  }
}

/// 2. [향후 확장 영역] 생성형 AI 대화 생성을 시뮬레이션하는 Mock 소스 구현체
class AiConversationSource implements ConversationSource {
  @override
  Future<List<DialogItem>> getDialogs(String topicKey) async {
    // API 네트워크 호출을 가정하여 1.5초 딜레이
    await Future.delayed(const Duration(milliseconds: 1500));
    
    // AI가 생성한 가상의 대본 반환
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

  /// 지정한 토픽과 소스 타입('local' or 'ai')에 따라 대화 아이템 리스트를 가져온다.
  Future<List<DialogItem>> fetchDialogs(String topicKey, {bool useAi = false}) async {
    if (useAi) {
      return await _aiSource.getDialogs(topicKey);
    } else {
      return await _localSource.getDialogs(topicKey);
    }
  }
}
