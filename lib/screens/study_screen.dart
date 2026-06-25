import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/settings_provider.dart';
import '../providers/study_provider.dart';
import '../widgets/player_controls.dart';

/// 실제 회화 학습을 수행하는 스터디 보드 화면
class StudyScreen extends StatefulWidget {
  const StudyScreen({super.key});

  @override
  State<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends State<StudyScreen> {
  @override
  void initState() {
    super.initState();
    // 화면에 들어왔을 때 유저 편의를 위해 자동으로 플레이 루프를 걸어줍니다.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _triggerPlay();
    });
  }

  /// 학습 플레이 즉시 트리거 단축 함수
  void _triggerPlay() {
    final study = Provider.of<StudyProvider>(context, listen: false);
    final settings = Provider.of<SettingsProvider>(context, listen: false);
    
    study.startStudy(
      autoProceed: settings.autoProceed,
      randomize: settings.randomPlay,
      onAutoProceeded: () {
        // 자동 넘어갔을 시, 다음 아이템에서도 연속으로 재생을 자동 개시하게 함
        _triggerPlay();
      }
    );
  }

  Widget _buildHintButton(BuildContext context, int level, String label, String desc) {
    final study = Provider.of<StudyProvider>(context);
    final isSelected = study.hintLevel == level;
    final theme = Theme.of(context);
    
    return Expanded(
      child: InkWell(
        onTap: () => study.setHintLevel(level),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? theme.colorScheme.primary : theme.colorScheme.surface,
            border: Border.all(color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                ),
              ),
              Text(
                desc,
                style: TextStyle(
                  fontSize: 8,
                  color: isSelected ? theme.colorScheme.onPrimary.withOpacity(0.8) : theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRatingButton(BuildContext context, int currentIndex, String statusKey, String label, Color color) {
    final study = Provider.of<StudyProvider>(context);
    final isSelected = study.dialogStatus[currentIndex] == statusKey;
    
    return Expanded(
      child: InkWell(
        onTap: () => study.updateDialogStatus(currentIndex, statusKey),
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color : color.withOpacity(0.06),
            border: Border.all(color: isSelected ? color : color.withOpacity(0.3)),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isSelected ? Colors.white : color,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final study = Provider.of<StudyProvider>(context);
    final settings = Provider.of<SettingsProvider>(context);

    final currentDialog = study.currentDialog;
    final totalDialogs = study.dialogs.length;
    final currentIndex = study.currentDialogIndex;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        title: Text(study.currentTopicTitle),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () {
            study.stopStudy();
            Navigator.pop(context);
          },
        ),
      ),
      body: study.isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // 1. 상단 진행율 바 영역
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            "진행도",
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          Text(
                            "${currentIndex + 1} / $totalDialogs",
                            style: theme.textTheme.labelLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6.0),
                      LinearProgressIndicator(
                        value: study.progress,
                        borderRadius: BorderRadius.circular(8.0),
                        minHeight: 8.0,
                        backgroundColor: theme.colorScheme.secondaryContainer.withOpacity(0.3),
                        valueColor: AlwaysStoppedAnimation<Color>(theme.colorScheme.primary),
                      ),
                      const SizedBox(height: 12.0),
                      
                      // 반복 상태 휠(칩) 모양 라벨칩
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ChoiceChip(
                            label: Text(
                              "청취 반복 상태: ${study.currentRepeatIndex} / ${study.targetRepeatCount} 회 완료",
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: study.currentRepeatIndex >= study.targetRepeatCount
                                    ? theme.colorScheme.onPrimary
                                    : theme.colorScheme.onPrimaryContainer
                              ),
                            ),
                            selected: study.currentRepeatIndex >= study.targetRepeatCount,
                            selectedColor: theme.colorScheme.primary,
                            backgroundColor: theme.colorScheme.primaryContainer,
                            onSelected: (_) {},
                            avatar: Icon(
                              Icons.replay_circle_filled_rounded,
                              size: 18,
                              color: study.currentRepeatIndex >= study.targetRepeatCount
                                  ? theme.colorScheme.onPrimary
                                  : theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // 2. 메인 대화 학습 스페이스 (컨텐츠에 따라 실시간 갱신)
                Expanded(
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 4.0),
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(24.0),
                      border: Border.all(
                        color: theme.colorScheme.outlineVariant.withOpacity(0.5),
                        width: 1,
                      ),
                    ),
                    child: currentDialog == null
                        ? const Center(child: Text("학습용 대화 데이터가 비어 있습니다."))
                        : SingleChildScrollView(
                            padding: const EdgeInsets.all(20.0),
                            child: AnimatedSwitcher(
                              duration: const Duration(milliseconds: 400),
                              child: !study.revealTranslation
                                  // [숨겨진 상태] - 반복 음성 청취 안내
                                  ? Column(
                                      key: const ValueKey("hidden_state"),
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        const SizedBox(height: 40),
                                        // 귀 기울여 듣는 리스닝 애니메이션 형상화
                                        Container(
                                          padding: const EdgeInsets.all(28.0),
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.primary.withOpacity(0.08),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            Icons.hearing_rounded,
                                            size: 64,
                                            color: theme.colorScheme.primary,
                                          ),
                                        ),
                                        const SizedBox(height: 32.0),
                                        Text(
                                          "영어 음성에만 귀 기울여보세요!",
                                          style: theme.textTheme.titleMedium?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 12.0),
                                        Text(
                                          "설정하신 목표 반복 회수(${study.targetRepeatCount}번) 동안 문장을 따라 소리 내어 말해 보세요 (쉐도잉).",
                                          style: theme.textTheme.bodyMedium?.copyWith(
                                            color: theme.colorScheme.onSurfaceVariant,
                                            height: 1.5,
                                          ),
                                          textAlign: TextAlign.center,
                                        ),
                                        const SizedBox(height: 24.0),
                                        
                                        // 실시간 진행도 웨이브 바 형태 모사
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: List.generate(5, (index) {
                                            bool isActive = study.isPlaying && !study.isPaused;
                                            return AnimatedContainer(
                                              duration: Duration(milliseconds: 200 + (index * 50)),
                                              margin: const EdgeInsets.symmetric(horizontal: 4.0),
                                              width: 6,
                                              height: isActive ? 24.0 + (index % 2 * 12) : 8.0,
                                              decoration: BoxDecoration(
                                                color: isActive 
                                                    ? theme.colorScheme.primary 
                                                    : theme.colorScheme.outlineVariant,
                                                borderRadius: BorderRadius.circular(4.0),
                                              ),
                                            );
                                          }),
                                        ),
                                        const SizedBox(height: 24),
                                        
                                        // 힌트보기 버튼 (처음 누르면 1단계 힌트로 진입)
                                        ElevatedButton.icon(
                                          onPressed: () {
                                            study.setRevealTranslation(true);
                                            study.setHintLevel(1);
                                          },
                                          icon: const Icon(Icons.remove_red_eye_rounded, size: 16),
                                          label: const Text("힌트보기", style: TextStyle(fontWeight: FontWeight.bold)),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: theme.colorScheme.primaryContainer,
                                            foregroundColor: theme.colorScheme.onPrimaryContainer,
                                            elevation: 0,
                                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(20),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 24),
                                      ],
                                    )
                                  // [공개된 상태] - 영어 대화 대본과 한글 뜻 표출
                                  : Column(
                                      key: const ValueKey("revealed_state"),
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        // 점진적 힌트 단계 선택기 영역
                                        Container(
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.surfaceContainer,
                                            borderRadius: BorderRadius.circular(16),
                                            border: Border.all(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
                                          ),
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.stretch,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  const Text("💡 점진적 힌트 선택", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                    decoration: BoxDecoration(
                                                      color: theme.colorScheme.primaryContainer,
                                                      borderRadius: BorderRadius.circular(6),
                                                    ),
                                                    child: Text(
                                                      study.hintLevel == 1 ? "1단계: 한국어만" :
                                                      study.hintLevel == 2 ? "2단계: 핵심 패턴만" :
                                                      study.hintLevel == 3 ? "3단계: 빈칸 채우기" : "4단계: 전체 대본",
                                                      style: TextStyle(fontSize: 10, color: theme.colorScheme.onPrimaryContainer, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 8),
                                              Row(
                                                children: [
                                                  _buildHintButton(context, 1, "1단계", "한글만"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 2, "2단계", "패턴만"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 3, "3단계", "빈칸채우기"),
                                                  const SizedBox(width: 4),
                                                  _buildHintButton(context, 4, "4단계", "전체공개"),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(height: 16.0),
                                        
                                        // 대화 원문 말풍선식 렌더링
                                        ...List.generate(currentDialog.english.length, (idx) {
                                          bool isA = idx % 2 == 0;
                                          return Container(
                                            margin: const EdgeInsets.symmetric(vertical: 8.0),
                                            padding: const EdgeInsets.all(16.0),
                                            decoration: BoxDecoration(
                                              color: isA 
                                                  ? theme.colorScheme.primary.withOpacity(0.06)
                                                  : theme.colorScheme.secondary.withOpacity(0.06),
                                              borderRadius: BorderRadius.only(
                                                topLeft: const Radius.circular(16.0),
                                                topRight: const Radius.circular(16.0),
                                                bottomLeft: isA ? Radius.zero : const Radius.circular(16.0),
                                                bottomRight: isA ? const Radius.circular(16.0) : Radius.zero,
                                              ),
                                            ),
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                // 화자 표시 (A 또는 B)
                                                Row(
                                                  children: [
                                                    CircleAvatar(
                                                      radius: 12,
                                                      backgroundColor: isA 
                                                          ? theme.colorScheme.primary 
                                                          : theme.colorScheme.secondary,
                                                      child: Text(
                                                        isA ? "A" : "B",
                                                        style: const TextStyle(
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.bold,
                                                          color: Colors.white,
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8.0),
                                                    Text(
                                                      isA ? "Speaker A" : "Speaker B",
                                                      style: theme.textTheme.labelSmall?.copyWith(
                                                        color: theme.colorScheme.onSurfaceVariant,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 8.0),
                                                
                                                // 영어 텍스트 (힌트 레벨 반영)
                                                study.hintLevel == 1
                                                    ? Text(
                                                        "(대본 숨김 처리됨 - 2~4단계를 선택하세요)",
                                                        style: theme.textTheme.bodyMedium?.copyWith(
                                                          color: theme.colorScheme.outline,
                                                          fontStyle: FontStyle.italic,
                                                        ),
                                                      )
                                                    : Text(
                                                        study.getHintedEnglish(currentDialog.english[idx], study.hintLevel),
                                                        style: theme.textTheme.bodyLarge?.copyWith(
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 18,
                                                          color: theme.colorScheme.onSurface,
                                                        ),
                                                      ),
                                                const SizedBox(height: 6.0),
                                                // 한국어 번역 텍스트
                                                Text(
                                                  currentDialog.korean[idx],
                                                  style: theme.textTheme.bodyMedium?.copyWith(
                                                    color: theme.colorScheme.primary,
                                                    fontWeight: FontWeight.w500,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          );
                                        }),
                                        
                                        // 자동이동 진행 중 카운트다운 알림 디스플레이
                                        if (settings.autoProceed && currentIndex < totalDialogs - 1)
                                          Padding(
                                            padding: const EdgeInsets.only(top: 20.0),
                                            child: Text(
                                              "※ 3초 뒤 다음 회화 대화로 자동 넘어갑니다.",
                                              style: theme.textTheme.bodySmall?.copyWith(
                                                color: theme.colorScheme.outline,
                                                fontStyle: FontStyle.italic,
                                              ),
                                              textAlign: TextAlign.center,
                                            ),
                                          ),
                                      ],
                                    ),
                            ),
                          ),
                  ),
                ),

                // 자가평가 평가 패널 (번역/대본이 공개되었을 때만 노출)
                if (study.revealTranslation && currentDialog != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    margin: const EdgeInsets.only(bottom: 4.0),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.3))),
                      color: theme.colorScheme.surface,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              "이 대화 기억난이도 평가 📝",
                              style: theme.textTheme.labelMedium?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (study.dialogStatus[currentIndex] != 'NONE')
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.primaryContainer,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  "등록됨",
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: theme.colorScheme.onPrimaryContainer,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildRatingButton(context, currentIndex, 'KNOW', '알아요 😊', Colors.teal),
                            const SizedBox(width: 8),
                            _buildRatingButton(context, currentIndex, 'CONFUSED', '헷갈려요 🤔', Colors.amber),
                            const SizedBox(width: 8),
                            _buildRatingButton(context, currentIndex, 'WRONG', '몰라요 😭', Colors.redAccent),
                          ],
                        ),
                      ],
                    ),
                  ),

                // 3. 하단 플레이어 제어기 위젯 마운트
                PlayerControls(
                  isPlaying: study.isPlaying,
                  isPaused: study.isPaused,
                  hasPrevious: currentIndex > 0,
                  hasNext: currentIndex < totalDialogs - 1,
                  onPlay: _triggerPlay,
                  onPause: () {
                    study.pauseStudy();
                  },
                  onPrevious: () {
                    study.previousDialog(randomize: settings.randomPlay);
                    // 이전 대화로 갈 때, 자동 재생을 바로 개시해서 몰입감 확보
                    _triggerPlay();
                  },
                  onNext: () {
                    study.nextDialog(randomize: settings.randomPlay);
                    // 다음 대화로 갈 때, 자동 재생을 바로 개시해서 몰입감 확보
                    _triggerPlay();
                  },
                  onReplay: () {
                    study.stopStudy().then((_) {
                      _triggerPlay();
                    });
                  },
                ),
              ],
            ),
    );
  }
}
