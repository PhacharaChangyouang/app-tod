import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/api_service.dart';
import '../utils/secure_storage.dart';

class PinSetupScreen extends StatefulWidget {
  const PinSetupScreen({super.key});

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  // Registration form
  final _nameCtrl = TextEditingController();
  String _selectedRole = 'elderly';
  int _age = 18;
  String _pin = '';
  String _pinConfirm = '';
  int _step = 0; // 0=info, 1=pin, 2=confirm

  bool _loading = false;
  String? _error;

  void _addDigit(String d) {
    setState(() {
      if (_step == 1 && _pin.length < 4) _pin += d;
      if (_step == 2 && _pinConfirm.length < 4) _pinConfirm += d;
    });
  }

  void _delDigit() {
    setState(() {
      if (_step == 1 && _pin.isNotEmpty) {
        _pin = _pin.substring(0, _pin.length - 1);
      }
      if (_step == 2 && _pinConfirm.isNotEmpty) {
        _pinConfirm = _pinConfirm.substring(0, _pinConfirm.length - 1);
      }
    });
  }

  Future<void> _submit() async {
    if (_step == 0) {
      if (_nameCtrl.text.trim().isEmpty) {
        setState(() => _error = 'กรุณากรอกชื่อ');
        return;
      }
      setState(() {
        _step = 1;
        _error = null;
      });
      return;
    }
    if (_step == 1) {
      if (_pin.length < 4) {
        setState(() => _error = 'PIN ต้องมี 4 หลัก');
        return;
      }
      setState(() {
        _step = 2;
        _error = null;
      });
      return;
    }
    if (_step == 2) {
      if (_pin != _pinConfirm) {
        setState(() {
          _error = 'PIN ไม่ตรงกัน กรุณาลองใหม่';
          _pin = '';
          _pinConfirm = '';
          _step = 1;
        });
        return;
      }
      // Register
      final phone = ModalRoute.of(context)!.settings.arguments as String;
      setState(() {
        _loading = true;
        _error = null;
      });
      try {
        final res = await ApiService.register(
          phone: phone,
          name: _nameCtrl.text.trim(),
          age: _age,
          role: _selectedRole,
          pin: _pin,
        );
        if (res['success'] == true) {
          await SecureStorage.saveTokens(
            accessToken: res['accessToken'],
            refreshToken: res['refreshToken'],
          );
          await SecureStorage.saveUser(
            id: res['user']['id'].toString(),
            name: res['user']['name'],
            role: res['user']['role'],
            phone: res['user']['phone'],
          );
          if (!mounted) return;
          final route = _selectedRole == 'caregiver'
              ? '/caregiver-home'
              : '/home';
          Navigator.pushNamedAndRemoveUntil(context, route, (_) => false);
        } else {
          setState(() => _error = res['message'] ?? 'เกิดข้อผิดพลาด');
        }
      } catch (_) {
        setState(() => _error = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      } finally {
        setState(() => _loading = false);
      }
    }
  }

  Widget _buildPinDots(String pinVal) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(
        4,
        (i) => Container(
          margin: const EdgeInsets.symmetric(horizontal: 8),
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: i < pinVal.length
                ? AppTheme.primaryBlue
                : Colors.grey.shade300,
          ),
        ),
      ),
    );
  }

  Widget _buildNumPad() {
    final keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
    return GridView.count(
      crossAxisCount: 3,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.6,
      children: keys.map((k) {
        if (k.isEmpty) return const SizedBox();
        return InkWell(
          onTap: () => k == '⌫' ? _delDigit() : _addDigit(k),
          borderRadius: BorderRadius.circular(16),
          child: Center(
            child: Text(
              k,
              style: TextStyle(
                fontSize: k == '⌫' ? 22 : 28,
                fontWeight: FontWeight.bold,
                color: AppTheme.textDark,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              children: [
                const SizedBox(height: 30),
                Row(
                  children: [
                    if (_step > 0)
                      IconButton(
                        onPressed: () => setState(() {
                          _step--;
                          _error = null;
                        }),
                        icon: const Icon(
                          Icons.arrow_back_ios_rounded,
                          color: Colors.white,
                        ),
                      ),
                    const Spacer(),
                  ],
                ),
                const Icon(
                  Icons.person_add_rounded,
                  size: 64,
                  color: Colors.white,
                ),
                const SizedBox(height: 12),
                Text(
                  _step == 0
                      ? 'ข้อมูลของคุณ'
                      : _step == 1
                      ? 'ตั้งรหัส PIN 4 หลัก'
                      : 'ยืนยัน PIN อีกครั้ง',
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 24),
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                  elevation: 8,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      children: [
                        if (_step == 0) ...[
                          TextField(
                            controller: _nameCtrl,
                            style: const TextStyle(fontSize: 20),
                            decoration: const InputDecoration(
                              prefixIcon: Icon(
                                Icons.person_rounded,
                                color: AppTheme.primaryBlue,
                              ),
                              hintText: 'ชื่อ-นามสกุล',
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              const Text(
                                'อายุ: ',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: AppTheme.textGrey,
                                ),
                              ),
                              Expanded(
                                child: Slider(
                                  value: _age.toDouble(),
                                  min: 0,
                                  max: 100,
                                  divisions: 60,
                                  label: '$_age ปี',
                                  activeColor: AppTheme.primaryBlue,
                                  onChanged: (v) =>
                                      setState(() => _age = v.round()),
                                ),
                              ),
                              Text(
                                '$_age ปี',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'คุณคือ:',
                              style: TextStyle(
                                fontSize: 18,
                                color: AppTheme.textGrey,
                              ),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _RoleCard(
                                  label: '👴 ผู้สูงอายุ',
                                  selected: _selectedRole == 'elderly',
                                  onTap: () =>
                                      setState(() => _selectedRole = 'elderly'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _RoleCard(
                                  label: '👨‍⚕️ ผู้ดูแล',
                                  selected: _selectedRole == 'caregiver',
                                  onTap: () => setState(
                                    () => _selectedRole = 'caregiver',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                        if (_step == 1 || _step == 2) ...[
                          const SizedBox(height: 10),
                          _buildPinDots(_step == 1 ? _pin : _pinConfirm),
                          const SizedBox(height: 24),
                          _buildNumPad(),
                        ],
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            _error!,
                            style: const TextStyle(
                              color: AppTheme.sosRed,
                              fontSize: 16,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                        const SizedBox(height: 20),
                        ElevatedButton(
                          onPressed:
                              (_loading ||
                                  (_step == 1 && _pin.length < 4) ||
                                  (_step == 2 && _pinConfirm.length < 4))
                              ? null
                              : _submit,
                          child: _loading
                              ? const CircularProgressIndicator(
                                  color: Colors.white,
                                )
                              : Text(_step == 2 ? 'สมัครสมาชิก' : 'ถัดไป'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _RoleCard({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: selected ? AppTheme.primaryBlue : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected ? AppTheme.primaryBlue : Colors.grey.shade300,
            width: 2,
          ),
        ),
        child: Text(
          label,
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: selected ? Colors.white : AppTheme.textDark,
          ),
        ),
      ),
    );
  }
}
