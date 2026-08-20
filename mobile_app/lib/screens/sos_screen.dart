import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import 'dart:async';

class SosScreen extends StatefulWidget {
  const SosScreen({super.key});

  @override
  State<SosScreen> createState() => _SosScreenState();
}

class _SosScreenState extends State<SosScreen> with SingleTickerProviderStateMixin {
  late AnimationController _pulseCtrl;
  late Animation<double> _pulse;
  int _countdown = 5;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(seconds: 1))
      ..repeat(reverse: true);
    _pulse = Tween(begin: 0.9, end: 1.1).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdown <= 1) {
        t.cancel();
        if (mounted) setState(() => _countdown = 0);
      } else {
        setState(() => _countdown--);
      }
    });
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        color: AppTheme.sosRed,
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ScaleTransition(
                scale: _pulse,
                child: Container(
                  width: 200, height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.2),
                    border: Border.all(color: Colors.white, width: 4),
                  ),
                  child: const Icon(Icons.sos_rounded, size: 100, color: Colors.white),
                ),
              ),
              const SizedBox(height: 40),
              const Text('ส่งสัญญาณฉุกเฉินแล้ว!',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              const Text('กำลังแจ้งเตือนผู้ดูแลของคุณ...',
                  style: TextStyle(fontSize: 20, color: Colors.white70),
                  textAlign: TextAlign.center),
              const SizedBox(height: 60),
              if (_countdown > 0) ...[
                Text('แจ้งเตือนสำเร็จใน $_countdown วินาที',
                    style: const TextStyle(fontSize: 18, color: Colors.white60)),
              ] else ...[
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 48),
                const SizedBox(height: 8),
                const Text('ส่งสัญญาณเรียบร้อย!',
                    style: TextStyle(fontSize: 22, color: Colors.white, fontWeight: FontWeight.bold)),
              ],
              const SizedBox(height: 40),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppTheme.sosRed,
                    minimumSize: const Size(double.infinity, 60),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('ฉันปลอดภัยแล้ว', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
