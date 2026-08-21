import 'package:flutter/material.dart';
import '../utils/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';

class PinLoginScreen extends StatefulWidget {
  const PinLoginScreen({super.key});

  @override
  State<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends State<PinLoginScreen> {
  String _pin = '';
  bool _loading = false;
  String? _error;

  void _addDigit(String digit) {
    if (_pin.length < 4) setState(() => _pin += digit);
  }

  void _deleteDigit() {
    if (_pin.isNotEmpty) {
      setState(() => _pin = _pin.substring(0, _pin.length - 1));
    }
  }

  Future<void> _login() async {
    if (_pin.length != 4) {
      setState(() => _error = 'กรุณากรอก PIN 4 หลัก');
      return;
    }
    final phone = ModalRoute.of(context)!.settings.arguments as String;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ApiService.login(phone, _pin);
      if (result['success'] != true) {
        setState(() => _error = result['message'] ?? 'PIN ไม่ถูกต้อง');
        return;
      }
      await SecureStorage.saveTokens(
        accessToken: result['accessToken'],
        refreshToken: result['refreshToken'],
      );
      await SecureStorage.saveUser(
        id: result['user']['id'].toString(),
        name: result['user']['name'],
        role: result['user']['role'],
        phone: result['user']['phone'],
      );
      if (!mounted) return;
      final route = result['user']['role'] == 'caregiver'
          ? '/caregiver-home'
          : '/home';
      Navigator.pushNamedAndRemoveUntil(context, route, (_) => false);
    } catch (_) {
      setState(() => _error = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = ModalRoute.of(context)!.settings.arguments as String? ?? '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(28),
            child: Column(
              children: [
                const SizedBox(height: 50),
                const Icon(Icons.lock_rounded, size: 72, color: Colors.white),
                const SizedBox(height: 16),
                const Text(
                  'เข้าสู่ระบบอีกครั้ง',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  phone,
                  style: const TextStyle(fontSize: 16, color: Colors.white70),
                ),
                const SizedBox(height: 28),
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: List.generate(
                            4,
                            (index) => Container(
                              margin: const EdgeInsets.symmetric(horizontal: 8),
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: index < _pin.length
                                    ? AppTheme.primaryBlue
                                    : Colors.grey.shade300,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        GridView.count(
                          crossAxisCount: 3,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          childAspectRatio: 1.6,
                          children: keys.map((key) {
                            if (key.isEmpty) return const SizedBox();
                            return InkWell(
                              onTap: () =>
                                  key == '⌫' ? _deleteDigit() : _addDigit(key),
                              child: Center(
                                child: Text(
                                  key,
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        if (_error != null)
                          Text(
                            _error!,
                            style: const TextStyle(
                              color: AppTheme.sosRed,
                              fontSize: 16,
                            ),
                          ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loading ? null : _login,
                          child: _loading
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                )
                              : const Text('เข้าสู่ระบบ'),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
