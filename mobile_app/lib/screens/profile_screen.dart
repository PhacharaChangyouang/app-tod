import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/secure_storage.dart';
import '../utils/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _name = '';
  String _phone = '';
  String _role = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final user = await SecureStorage.getUser();
    setState(() {
      _name = user['name'] ?? '';
      _phone = user['phone'] ?? '';
      _role = user['role'] ?? '';
    });
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'ออกจากระบบ?',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'คุณต้องการออกจากระบบใช่หรือไม่',
          style: TextStyle(fontSize: 18),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ยกเลิก', style: TextStyle(fontSize: 18)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.sosRed),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('ออกจากระบบ', style: TextStyle(fontSize: 18)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      await ApiService.logout();
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(context, '/otp-request', (_) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleLabel = _role == 'caregiver' ? '👨‍⚕️ ผู้ดูแล' : '👴 ผู้สูงอายุ';
    final roleColor = _role == 'caregiver'
        ? AppTheme.accentTeal
        : AppTheme.primaryBlue;

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(
                        Icons.arrow_back_ios_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const Text(
                      'โปรไฟล์',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),

              // Avatar
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 16,
                    ),
                  ],
                ),
                child: Icon(Icons.person_rounded, size: 60, color: roleColor),
              ),
              const SizedBox(height: 12),
              Text(
                _name,
                style: const TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  roleLabel,
                  style: const TextStyle(fontSize: 16, color: Colors.white),
                ),
              ),
              const SizedBox(height: 24),

              // Info cards
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
                      children: [
                        _InfoTile(
                          icon: Icons.phone_rounded,
                          label: 'เบอร์โทรศัพท์',
                          value: _phone,
                        ),
                        const SizedBox(height: 12),
                        _InfoTile(
                          icon: Icons.badge_rounded,
                          label: 'บทบาท',
                          value: roleLabel,
                        ),
                        const Spacer(),
                        ElevatedButton.icon(
                          onPressed: () =>
                              Navigator.pushNamed(context, '/family'),
                          icon: const Icon(Icons.family_restroom_rounded),
                          label: const Text(
                            'จัดการคนในครอบครัว',
                            style: TextStyle(fontSize: 18),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Divider(),
                        const SizedBox(height: 8),
                        const Text(
                          'เวอร์ชัน AHA 1.0.0',
                          style: TextStyle(
                            color: AppTheme.textGrey,
                            fontSize: 14,
                          ),
                        ),
                        const Text(
                          'มีใบรับรอง PDPA | Human Research | AI Ethics',
                          style: TextStyle(
                            color: AppTheme.textGrey,
                            fontSize: 13,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.sosRed,
                          ),
                          onPressed: _logout,
                          icon: const Icon(Icons.logout_rounded),
                          label: const Text(
                            'ออกจากระบบ',
                            style: TextStyle(fontSize: 20),
                          ),
                        ),
                        const SizedBox(height: 12),
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

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFFF5FAFF),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE0EDF5)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppTheme.primaryBlue, size: 26),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(fontSize: 13, color: AppTheme.textGrey),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textDark,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
