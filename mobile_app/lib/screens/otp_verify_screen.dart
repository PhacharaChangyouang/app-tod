import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/app_theme.dart';
import '../utils/api_service.dart';

class OtpVerifyScreen extends StatefulWidget {
  const OtpVerifyScreen({super.key});

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  final _codeCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  Future<void> _verify() async {
    final phone = ModalRoute.of(context)!.settings.arguments as String;
    final code = _codeCtrl.text.trim();
    if (code.length < 4) {
      setState(() => _error = 'กรุณากรอกรหัส OTP ให้ครบ');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiService.verifyOtp(phone, code);
      if (res['success'] == true && res['verified'] == true) {
        if (!mounted) return;
        Navigator.pushNamed(context, '/pin-setup', arguments: phone);
      } else {
        setState(() => _error = res['message'] ?? 'รหัสไม่ถูกต้อง');
      }
    } catch (_) {
      setState(() => _error = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final phone = ModalRoute.of(context)!.settings.arguments as String? ?? '';

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              children: [
                const SizedBox(height: 40),
                Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 28),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Icon(Icons.sms_rounded, size: 80, color: Colors.white),
                const SizedBox(height: 20),
                const Text('ยืนยันรหัส OTP',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 8),
                Text('รหัสถูกส่งไปยัง $phone',
                    style: const TextStyle(fontSize: 16, color: Colors.white70)),
                const SizedBox(height: 40),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  elevation: 8,
                  child: Padding(
                    padding: const EdgeInsets.all(28),
                    child: Column(
                      children: [
                        TextField(
                          controller: _codeCtrl,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold,
                              letterSpacing: 12),
                          decoration: const InputDecoration(hintText: '• • • • • •'),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(_error!,
                              style: const TextStyle(color: AppTheme.sosRed, fontSize: 16)),
                        ],
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: _loading ? null : _verify,
                          child: _loading
                              ? const CircularProgressIndicator(color: Colors.white)
                              : const Text('ยืนยัน'),
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
