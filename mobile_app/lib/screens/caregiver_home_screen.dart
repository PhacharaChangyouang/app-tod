import 'package:flutter/material.dart';
import 'dart:async';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';
import '../utils/api_service.dart';
import '../widgets/medication_alert_dialog.dart';

class CaregiverHomeScreen extends StatefulWidget {
  const CaregiverHomeScreen({super.key});

  @override
  State<CaregiverHomeScreen> createState() => _CaregiverHomeScreenState();
}

class _CaregiverHomeScreenState extends State<CaregiverHomeScreen> {
  String _name = '';
  Timer? _notificationTimer;
  final Set<String> _knownNotificationIds = {};
  bool _alertVisible = false;
  bool _checkingNotifications = false;

  @override
  void initState() {
    super.initState();
    _load();
    _notificationTimer = Timer.periodic(
      const Duration(seconds: 1),
      (_) => _checkMedicationNotifications(),
    );
    _checkMedicationNotifications();
  }

  Future<void> _load() async {
    final user = await SecureStorage.getUser();
    setState(() => _name = user['name'] ?? 'ผู้ดูแล');
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkMedicationNotifications() async {
    if (_checkingNotifications) return;
    _checkingNotifications = true;
    try {
      final notifications = await ApiService.getNotifications();
      if (!mounted) return;
      if (_knownNotificationIds.isEmpty) {
        _knownNotificationIds.addAll(
          notifications.map((item) => item['id'].toString()),
        );
        return;
      }
      for (final item in notifications.reversed) {
        final id = item['id'].toString();
        if (_knownNotificationIds.contains(id)) continue;
        _knownNotificationIds.add(id);
        if (item['type'] != 'reminder' || _alertVisible) continue;
        _alertVisible = true;
        await showMedicationAlert(
          context,
          title: item['title'] ?? 'ได้เวลาทานยาแล้ว',
          message: item['message'] ?? 'กรุณาทานยาตามเวลาที่ตั้งไว้',
        );
        _alertVisible = false;
        break;
      }
    } catch (_) {
      // Notification polling should never block the caregiver screen.
    } finally {
      _checkingNotifications = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Top bar
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 16,
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.favorite_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'AHA',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(
                        Icons.account_circle_outlined,
                        color: Colors.white,
                        size: 32,
                      ),
                      onPressed: () => Navigator.pushNamed(context, '/profile'),
                    ),
                  ],
                ),
              ),

              // Welcome header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white30),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(
                            Icons.waving_hand_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'สวัสดี $_name',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'ระบบผู้ดูแล — ตรวจสอบสถานะผู้สูงอายุในความดูแล',
                        style: TextStyle(fontSize: 15, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Content
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'เมนูหลัก',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _MenuCard(
                                icon: Icons.medication_rounded,
                                label: 'จัดการนัดและยา',
                                color: AppTheme.primaryBlue,
                                onTap: () =>
                                    Navigator.pushNamed(context, '/reminders'),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: _MenuCard(
                                icon: Icons.notifications_active_rounded,
                                label: 'การแจ้งเตือน',
                                color: AppTheme.accentTeal,
                                onTap: () =>
                                    Navigator.pushNamed(context, '/history'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: [
                            Expanded(
                              child: _MenuCard(
                                icon: Icons.group_rounded,
                                label: 'ผู้สูงอายุในดูแล',
                                color: AppTheme.primaryBlueDark,
                                onTap: () =>
                                    Navigator.pushNamed(context, '/family'),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: _MenuCard(
                                icon: Icons.history_rounded,
                                label: 'ประวัติ',
                                color: Colors.indigo,
                                onTap: () =>
                                    Navigator.pushNamed(context, '/history'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 28),
                        const Text(
                          'สัญญาณ SOS',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.textDark,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: AppTheme.sosRed.withOpacity(0.08),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: AppTheme.sosRed.withOpacity(0.3),
                            ),
                          ),
                          child: const Row(
                            children: [
                              Icon(
                                Icons.check_circle_rounded,
                                color: AppTheme.successGreen,
                                size: 32,
                              ),
                              SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'ไม่มีสัญญาณฉุกเฉิน',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: AppTheme.successGreen,
                                      ),
                                    ),
                                    Text(
                                      'ระบบพร้อมรับสัญญาณ SOS ตลอด 24 ชม.',
                                      style: TextStyle(
                                        fontSize: 14,
                                        color: AppTheme.textGrey,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _MenuCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [color, color.withOpacity(0.7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 40),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
