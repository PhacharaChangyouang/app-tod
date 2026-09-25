import 'dart:async';

import 'package:flutter/material.dart';

import '../utils/api_service.dart';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';

class PasswordLoginScreen extends StatefulWidget {
  const PasswordLoginScreen({super.key});

  @override
  State<PasswordLoginScreen> createState() => _PasswordLoginScreenState();
}

class _PasswordLoginScreenState extends State<PasswordLoginScreen> {
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;
    if (identifier.isEmpty || password.isEmpty) {
      setState(() => _error = 'กรุณากรอกชื่อผู้ใช้/อีเมลและรหัสผ่าน');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await ApiService.loginWithPassword(identifier, password);
      if (result['success'] != true) {
        setState(() => _error = result['message'] ?? 'เข้าสู่ระบบไม่สำเร็จ');
        return;
      }
      await SecureStorage.saveTokens(
        accessToken: result['accessToken'],
        refreshToken: result['refreshToken'],
      );
      await SecureStorage.saveUser(
        id: result['user']['id'].toString(),
        name: result['user']['name'] ?? '',
        role: result['user']['role'],
        phone: result['user']['phone'] ?? '',
      );
      if (!mounted) return;
      final route = result['user']['role'] == 'caregiver'
          ? '/caregiver-home'
          : '/home';
      Navigator.pushNamedAndRemoveUntil(context, route, (_) => false);
    } on TimeoutException {
      setState(() => _error = 'เซิร์ฟเวอร์ใช้เวลานานเกินไป กรุณาลองใหม่');
    } catch (_) {
      setState(() => _error = 'ไม่สามารถเชื่อมต่อระบบได้');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.health_and_safety_rounded,
                        size: 64,
                        color: AppTheme.primaryBlue,
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'เข้าสู่ระบบ AHA',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _identifierController,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.username],
                        decoration: const InputDecoration(
                          labelText: 'ชื่อผู้ใช้หรืออีเมล',
                          prefixIcon: Icon(Icons.person_rounded),
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        autofillHints: const [AutofillHints.password],
                        onSubmitted: (_) => _loading ? null : _login(),
                        decoration: InputDecoration(
                          labelText: 'รหัสผ่าน',
                          prefixIcon: const Icon(Icons.lock_rounded),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_rounded
                                  : Icons.visibility_off_rounded,
                            ),
                          ),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Text(
                          _error!,
                          style: const TextStyle(color: AppTheme.sosRed),
                          textAlign: TextAlign.center,
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _login,
                          child: _loading
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                )
                              : const Text('เข้าสู่ระบบด้วยรหัสผ่าน'),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
