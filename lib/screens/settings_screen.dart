import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';

/// 학습 환경 옵션을 정의하는 설정 화면 (M3 컴포넌트 적용 및 데이터 영구 저장 지원)
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late TextEditingController _apiKeyController;

  @override
  void initState() {
    super.initState();
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    _apiKeyController = TextEditingController(text: settings.googleTtsApiKey);
  }

  @override
  void dispose() {
    _apiKeyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final settings = Provider.of<SettingsProvider>(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: const Text("학습 설정"),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
        children: [
          // 1. 반복 횟수 설정 섹션
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16.0),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "대화 반복 횟수",
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 4.0),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(12.0),
                        ),
                        child: Text(
                          "${settings.repeatCount}회",
                          style: TextStyle(
                            color: theme.colorScheme.onPrimaryContainer,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    "한 대화 세트를 완전히 암기하기 위해 연속 재생할 횟수를 지정합니다. (기본값: 3회)",
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16.0),
                  Slider(
                    value: settings.repeatCount.toDouble(),
                    min: 1,
                    max: 20,
                    divisions: 19,
                    label: "${settings.repeatCount}회 반복",
                    onChanged: (double value) {
                      settings.setRepeatCount(value.round());
                    },
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("1회", style: theme.textTheme.labelSmall),
                      Text("10회", style: theme.textTheme.labelSmall),
                      Text("20회", style: theme.textTheme.labelSmall),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16.0),

          // 2. 학습 편의 설정 그룹화 카드
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16.0),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
            ),
            child: Column(
              children: [
                // 2-1. 자동 진행 스위치
                SwitchListTile(
                  secondary: const Icon(Icons.bolt_rounded),
                  title: const Text(
                    "자동으로 다음 대화 넘어가기",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text("지정한 반복 재생을 모두 마치고 정답이 표시된 후, 3초 뒤에 다음 대화로 자동 이동합니다."),
                  value: settings.autoProceed,
                  onChanged: (bool value) {
                    settings.setAutoProceed(value);
                  },
                ),
                const Divider(height: 1),
                
                // 2-2. 랜덤 재생 스위치
                SwitchListTile(
                  secondary: const Icon(Icons.shuffle_rounded),
                  title: const Text(
                    "대화 순서 랜덤으로 재생",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: const Text("선택한 주제의 대화 리스트가 불러와질 때 무작위 순서로 섞어서 학습합니다."),
                  value: settings.randomPlay,
                  onChanged: (bool value) {
                    settings.setRandomPlay(value);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16.0),

          // 3. 구글 Cloud TTS API 키 설정 카드
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16.0),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.vpn_key_rounded, color: theme.colorScheme.primary, size: 20),
                      const SizedBox(width: 8.0),
                      Text(
                        "Google Cloud TTS API 키",
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    "서버가 필요 없는 고품질 Neural2 영어 발음을 안정적으로 재생하기 위해 본인의 API 키를 입력할 수 있습니다. 비어있을 경우 기본 공용 키로 자동 구동됩니다.",
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 16.0),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          obscureText: true,
                          controller: _apiKeyController,
                          decoration: InputDecoration(
                            isDense: true,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12.0),
                            ),
                            labelText: "Google Cloud API Key (선택)",
                            hintText: "AIzaSy...",
                            prefixIcon: const Icon(Icons.password_rounded),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14.0),
                        ),
                        onPressed: () {
                          settings.setGoogleTtsApiKey(_apiKeyController.text.trim());
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text("API 키가 안전하게 저장되었습니다!"),
                              duration: Duration(seconds: 1),
                            ),
                          );
                        },
                        child: const Text("저장"),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24.0),

          // 4. 안내 정보 푸터
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0),
            child: Text(
              "* 설정된 내역은 기기 내의 로컬 저장소(SharedPreferences)에 영구 안전하게 저장되어, 어플리케이션을 종료하고 다시 진입하더라도 똑같이 유지됩니다.",
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
