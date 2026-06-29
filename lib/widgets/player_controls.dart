import 'package:flutter/material.dart';

/// 재생 제어 및 슬라이더 액션 등의 하단 컨트롤 패널 위젯
class PlayerControls extends StatelessWidget {
  final bool isPlaying;
  final bool isPaused;
  final bool hasPrevious;
  final bool hasNext;
  final VoidCallback onPlay;
  final VoidCallback onPause;
  final VoidCallback onPrevious;
  final VoidCallback onNext;
  final VoidCallback onReplay; // 반복 재생 즉시 트리거 (처음부터 재개)

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
      padding: const EdgeInsets.symmetric(vertical: 12.0, horizontal: 16.0),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(28.0),
          topRight: Radius.circular(28.0),
        ),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.shadow.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 이전, 재생/정지, 다음, 반복 메인 컨트롤 행
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              // 1. 반복재생 버튼 (현재 대화 재생 초기화 및 새로 시작)
              IconButton.filledTonal(
                iconSize: 24,
                onPressed: onReplay,
                tooltip: "처음부터 다시 듣기",
                icon: const Icon(Icons.replay_rounded),
              ),

              // 2. 이전 버튼
              IconButton.outlined(
                iconSize: 28,
                onPressed: hasPrevious ? onPrevious : null,
                tooltip: "이전 대화",
                icon: const Icon(Icons.skip_previous_rounded),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: hasPrevious 
                        ? theme.colorScheme.outline 
                        : theme.colorScheme.outlineVariant.withOpacity(0.3)
                  )
                ),
              ),

              // 3. 중앙 재생/일시정지 메인 액션 버튼 (눈에 띔)
              FloatingActionButton(
                elevation: 2,
                backgroundColor: theme.colorScheme.primaryContainer,
                foregroundColor: theme.colorScheme.onPrimaryContainer,
                onPressed: isPlaying && !isPaused ? onPause : onPlay,
                tooltip: isPlaying && !isPaused ? "일시정지" : "재생 시작",
                child: Icon(
                  isPlaying && !isPaused
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  size: 32,
                ),
              ),

              // 4. 다음 버튼
              IconButton.outlined(
                iconSize: 28,
                onPressed: hasNext ? onNext : null,
                tooltip: "다음 대화",
                icon: const Icon(Icons.skip_next_rounded),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(
                    color: hasNext 
                        ? theme.colorScheme.outline 
                        : theme.colorScheme.outlineVariant.withOpacity(0.3)
                  )
                ),
              ),

              // 5. 우측 정보성 가동 버튼(볼륨/스피커 상태 등 - 아이콘 플레이스홀더 제공)
              IconButton.filledTonal(
                iconSize: 24,
                onPressed: isPlaying && !isPaused ? onPause : onPlay,
                tooltip: isPlaying && !isPaused ? "일시정지" : "재생",
                icon: Icon(
                  isPlaying && !isPaused
                      ? Icons.music_note_rounded
                      : Icons.music_off_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12.0),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                isPlaying && !isPaused ? "음성 청취 및 반복 중..." : "일시정지됨 수동 조작 대기",
                style: theme.textTheme.labelMedium?.copyWith(
                  color: isPlaying && !isPaused
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
