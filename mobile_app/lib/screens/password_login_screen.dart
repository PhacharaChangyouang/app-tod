import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  final _phoneController = TextEditingController();
  final _pinController = TextEditingController();
  bool _pinMode = false;
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final identifier = _identifierController.text.trim();
    final password = _passwordController.text;
    final phone = _phoneController.text.trim();
    final pin = _pinController.text;
    if ((!_pinMode && (identifier.isEmpty || password.isEmpty)) ||
        (_pinMode && (!RegExp(r'^0\d{9}$').hasMatch(phone) || !RegExp(r'^\d{4}$').hasMatch(pin)))) {
      setState(() => _error = _pinMode ? 'กรุณากรอกเบอร์โทรศัพท์และ PIN 4 หลักให้ถูกต้อง' : 'กรุณากรอกชื่อผู้ใช้/อีเมลและรหัสผ่าน');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = _pinMode
          ? await ApiService.loginWithPin(phone, pin)
          : await ApiService.loginWithPassword(identifier, password);
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
                      SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment(value: false, label: Text('บัญชี / รหัสผ่าน')),
                          ButtonSegment(value: true, label: Text('เบอร์โทร / PIN')),
                        ],
                        selected: {_pinMode},
                        onSelectionChanged: _loading ? null : (value) => setState(() { _pinMode = value.first; _error = null; }),
                      ),
                      const SizedBox(height: 18),
                      if (!_pinMode) ...[
                        TextField(
                          controller: _identifierController,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.username],
                          decoration: const InputDecoration(labelText: 'ชื่อผู้ใช้หรืออีเมล', prefixIcon: Icon(Icons.person_rounded)),
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
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              icon: Icon(_obscurePassword ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                            ),
                          ),
                        ),
                      ] else ...[
                        TextField(
                          controller: _phoneController,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          maxLength: 10,
                          textInputAction: TextInputAction.next,
                          autofillHints: const [AutofillHints.telephoneNumber],
                          decoration: const InputDecoration(labelText: 'เบอร์โทรศัพท์ที่ใช้สมัคร', prefixIcon: Icon(Icons.phone_rounded), counterText: ''),
                        ),
                        const SizedBox(height: 14),
                        TextField(
                          controller: _pinController,
                          obscureText: true,
                          keyboardType: TextInputType.number,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          maxLength: 4,
                          onSubmitted: (_) => _loading ? null : _login(),
                          decoration: const InputDecoration(labelText: 'PIN 4 หลัก', prefixIcon: Icon(Icons.pin_rounded), counterText: ''),
                        ),
                      ],
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
                              : Text(_pinMode ? 'เข้าสู่ระบบด้วย PIN' : 'เข้าสู่ระบบด้วยรหัสผ่าน'),
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
