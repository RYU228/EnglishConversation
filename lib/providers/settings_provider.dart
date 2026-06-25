import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// 앱의 사용자 가동 설정(반복횟수, 자동진행 여부, 랜덤재생 여부 등)을 관리하는 Provider
class SettingsProvider with ChangeNotifier {
  static const String keyRepeatCount = "repeat_count";
  static const String keyAutoProceed = "auto_proceed";
  static const String keyRandomPlay = "random_play";

  int _repeatCount = 3; // 기본값 3회 (범위: 1~20)
  bool _autoProceed = false; // 자동 진행 여부
  bool _randomPlay = false; // 랜덤 재생 여부

  SettingsProvider() {
    _loadSettings();
  }

  // Getters
  int get repeatCount => _repeatCount;
  bool get autoProceed => _autoProceed;
  bool get randomPlay => _randomPlay;

  /// SharedPreferences에서 설정 로드 및 적용
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _repeatCount = prefs.getInt(keyRepeatCount) ?? 3;
    _autoProceed = prefs.getBool(keyAutoProceed) ?? false;
    _randomPlay = prefs.getBool(keyRandomPlay) ?? false;
    notifyListeners();
  }

  /// 반복 횟수 변경 및 저장 (1 ~ 20 제한)
  Future<void> setRepeatCount(int count) async {
    if (count < 1 || count > 20) return;
    _repeatCount = count;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(keyRepeatCount, count);
  }

  /// 자동 진행 전환 및 저장
  Future<void> setAutoProceed(bool enabled) async {
    _autoProceed = enabled;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(keyAutoProceed, enabled);
  }

  /// 랜덤 재생 방식 설정 변경 및 저장
  Future<void> setRandomPlay(bool enabled) async {
    _randomPlay = enabled;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(keyRandomPlay, enabled);
  }
}
