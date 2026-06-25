/// 영어 회화 개별 대화 아이템 모델
class DialogItem {
  final List<String> english;
  final List<String> korean;
  final String? pattern;
  final String? difficulty;

  DialogItem({
    required this.english,
    required this.korean,
    this.pattern,
    this.difficulty,
  });

  /// JSON 데이터로부터 DialogItem 객체 생성
  factory DialogItem.fromJson(Map<String, dynamic> json) {
    return DialogItem(
      english: List<String>.from(json['english'] ?? []),
      korean: List<String>.from(json['korean'] ?? []),
      pattern: json['pattern'] as String?,
      difficulty: json['difficulty'] as String?,
    );
  }

  /// DialogItem 객체를 JSON 형태로 변환
  Map<String, dynamic> toJson() {
    return {
      'english': english,
      'korean': korean,
      'pattern': pattern,
      'difficulty': difficulty,
    };
  }
}
