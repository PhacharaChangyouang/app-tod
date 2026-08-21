import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';
import '../utils/api_service.dart';
import 'dart:async';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _userName = 'คุณยาย';
  String _timeStr = '';
  String _dateStr = '';
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _loadUser();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
  }

  Future<void> _loadUser() async {
    final user = await SecureStorage.getUser();
    if (mounted) setState(() => _userName = user['name'] ?? 'คุณ');
  }

  void _updateTime() {
    final now = DateTime.now();
    final days = [
      'อาทิตย์',
      'จันทร์',
      'อังคาร',
      'พุธ',
      'พฤหัสบดี',
      'ศุกร์',
      'เสาร์',
    ];
    final months = [
      '',
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    if (!mounted) return;
    setState(() {
      _timeStr =
          '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} น.';
      _dateStr =
          'วัน${days[now.weekday % 7]}ที่ ${now.day} ${months[now.month]}';
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _triggerSos() async {
    final confirm = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          '🚨 ขอความช่วยเหลือ?',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        content: const Text(
          'ระบบจะส่งสัญญาณฉุกเฉินไปยังผู้ดูแลของคุณทันที',
          style: TextStyle(fontSize: 18),
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.spaceEvenly,
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text(
              'ยกเลิก',
              style: TextStyle(fontSize: 20, color: Colors.grey),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.sosRed),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('ส่งสัญญาณ SOS', style: TextStyle(fontSize: 20)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      Navigator.pushNamed(context, '/sos');
      await ApiService.sendSos();
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
                  vertical: 12,
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

              // Welcome + time card
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(
                    vertical: 24,
                    horizontal: 24,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white30),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'สวัสดี $_userName',
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _dateStr,
                        style: const TextStyle(
                          fontSize: 16,
                          color: Colors.white70,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _timeStr,
                        style: const TextStyle(
                          fontSize: 48,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // White content area
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Voice Assistant button
                        _BigButton(
                          icon: Icons.mic_rounded,
                          label: 'พูดกับผู้ช่วย',
                          color: AppTheme.primaryBlue,
                          onTap: () {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('กำลังฟัง... พูดได้เลย'),
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 16),

                        // Reminders button
                        _BigButton(
                          icon: Icons.calendar_month_rounded,
                          label: 'นัดและยาของฉัน',
                          color: AppTheme.primaryBlueMid,
                          onTap: () =>
                              Navigator.pushNamed(context, '/reminders'),
                        ),
                        const SizedBox(height: 16),

                        // SOS button
                        _BigButton(
                          icon: Icons.sos_rounded,
                          label: 'ไม่สบาย ฉุกเฉิน',
                          color: AppTheme.sosRed,
                          onTap: _triggerSos,
                          isLarge: true,
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

class _BigButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool isLarge;

  const _BigButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.isLarge = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        height: isLarge ? 90 : 78,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.4),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: isLarge ? 36 : 30),
            const SizedBox(width: 12),
            Text(
              label,
              style: TextStyle(
                color: Colors.white,
                fontSize: isLarge ? 24 : 22,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
