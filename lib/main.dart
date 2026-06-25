import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/settings_provider.dart';
import 'providers/study_provider.dart';
import 'screens/home_screen.dart';

void main() {
  // Flutter의 바인딩 초기화 보장
  WidgetsFlutterBinding.ensureInitialized();
  
  runApp(
    MultiProvider(
      providers: [
        // 학습 앱 설정 영구 저장을 위한 모델 공급
        ChangeNotifierProvider(create: (_) => SettingsProvider()),
        // 실시간 음성 재생 상태 및 스터디 관리를 위한 핵심 모델 공급
        ChangeNotifierProvider(create: (_) => StudyProvider()),
      ],
      child: const EnglishConversationApp(),
    ),
  );
}

/// 회화 학습기 메인 어플리케이션 선언 클래스
class EnglishConversationApp extends StatelessWidget {
  const EnglishConversationApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '영어 회화 반복 학습기',
      debugShowCheckedModeBanner: false,
      
      // 최신의 Material Design 3 테마 스킴 지정
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.teal,
          brightness: Brightness.light,
          primary: const Color(0xFF006666),
          primaryContainer: const Color(0xFFE0F2F1),
          secondary: const Color(0xFF9E4D00),
          secondaryContainer: const Color(0xFFFFDDBB),
          surface: Colors.white,
          background: const Color(0xFFF9FBFB),
        ),
        
        // 정갈하고 세련된 폰트 테마 규정 적용
        textTheme: const TextTheme(
          titleLarge: TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Color(0xFF1E293B)),
          titleMedium: TextStyle(fontWeight: FontWeight.w600, fontSize: 18, color: Color(0xFF334155)),
          bodyLarge: TextStyle(fontSize: 16, color: Color(0xFF0F172A), height: 1.5),
          bodyMedium: TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.4),
        ),
        
        // 카드 및 앱바의 깔끔한 보더 피팅 조정
        appBarTheme: const AppBarTheme(
          elevation: 0,
          scrolledUnderElevation: 1,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF1E293B),
          centerTitle: true,
        ),
      ),
      
      home: const HomeScreen(),
    );
  }
}
