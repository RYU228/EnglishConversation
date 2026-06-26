import 'package:flutter/material.dart';
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
                      
                      // 모바일 웹 브라우저 오디오 언락 수행
                      Provider.of<StudyProvider>(context, listen: false).unlockAudio();

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
        // 모바일 웹 브라우저 오디오 언락 수행
        Provider.of<StudyProvider>(context, listen: false).unlockAudio();

        Provider.of<StudyProvider>(context, listen: false).loadTopic(
          key,
          "패턴: $pattern",
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
}
