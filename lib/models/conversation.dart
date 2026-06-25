import 'dialog_item.dart';

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
}
