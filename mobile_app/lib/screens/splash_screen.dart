import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200));
    _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeIn);
    _ctrl.forward();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(seconds: 2));
    final token = await SecureStorage.getAccessToken();
    if (!mounted) return;
    if (token != null) {
      final user = await SecureStorage.getUser();
      final route = user['role'] == 'caregiver' ? '/caregiver-home' : '/home';
      Navigator.pushReplacementNamed(context, route);
    } else {
      Navigator.pushReplacementNamed(context, '/otp-request');
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: FadeTransition(
          opacity: _fade,
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 24,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.favorite_rounded,
                      size: 64, color: AppTheme.primaryBlue),
                ),
                const SizedBox(height: 28),
                const Text('AHA',
                    style: TextStyle(
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 4)),
                const Text('AI Health Assistant',
                    style: TextStyle(fontSize: 18, color: Colors.white70)),
                const SizedBox(height: 16),
                const Text('ผู้ช่วยสุขภาพสำหรับผู้สูงอายุ',
                    style: TextStyle(fontSize: 16, color: Colors.white60)),
                const SizedBox(height: 60),
                const CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation(Colors.white70)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
