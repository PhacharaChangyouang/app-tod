import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../utils/api_service.dart';
import '../utils/app_theme.dart';

class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key});

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  final _phoneCtrl = TextEditingController();
  List<dynamic> _connections = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.getFamilyConnections();
      if (mounted)
        setState(() {
          _connections = data;
          _loading = false;
        });
    } catch (error) {
      if (mounted)
        setState(() {
          _error = error.toString();
          _loading = false;
        });
    }
  }

  Future<void> _connect() async {
    final phone = _phoneCtrl.text.trim();
    if (!RegExp(r'^0\d{9}$').hasMatch(phone)) {
      setState(() => _error = 'กรุณากรอกเบอร์โทร 10 หลัก');
      return;
    }
    try {
      final result = await ApiService.connectFamily(phone);
      if (result['success'] != true)
        throw Exception(result['message'] ?? 'เชื่อมต่อไม่สำเร็จ');
      _phoneCtrl.clear();
      setState(() => _error = 'ส่งคำขอเชื่อมต่อแล้ว');
      await _load();
    } catch (error) {
      setState(() => _error = error.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _update(String id, String status) async {
    final result = await ApiService.updateFamilyConnection(id, status);
    if (result['success'] != true && mounted) {
      setState(() => _error = result['message'] ?? 'ดำเนินการไม่สำเร็จ');
      return;
    }
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: AppTheme.bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(20),
                child: Row(
                  children: [
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(
                        Icons.arrow_back_ios_rounded,
                        color: Colors.white,
                      ),
                    ),
                    const Text(
                      'คนในครอบครัว',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(
                      top: Radius.circular(32),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'เชื่อมต่อด้วยเบอร์โทร',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textDark,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _phoneCtrl,
                              keyboardType: TextInputType.phone,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(10),
                              ],
                              decoration: const InputDecoration(
                                prefixIcon: Icon(Icons.phone),
                                hintText: '0812345678',
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          IconButton(
                            onPressed: _connect,
                            icon: const Icon(
                              Icons.person_add_alt_1,
                              color: AppTheme.primaryBlue,
                              size: 32,
                            ),
                          ),
                        ],
                      ),
                      if (_error != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            _error!,
                            style: const TextStyle(color: AppTheme.sosRed),
                          ),
                        ),
                      const SizedBox(height: 24),
                      const Text(
                        'รายการเชื่อมต่อ',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textDark,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: _loading
                            ? const Center(child: CircularProgressIndicator())
                            : _connections.isEmpty
                            ? const Center(
                                child: Text('ยังไม่มีคนในครอบครัวที่เชื่อมต่อ'),
                              )
                            : ListView.builder(
                                itemCount: _connections.length,
                                itemBuilder: (_, index) {
                                  final item =
                                      _connections[index]
                                          as Map<String, dynamic>;
                                  final pending = item['status'] == 'pending';
                                  return Card(
                                    child: ListTile(
                                      leading: const CircleAvatar(
                                        child: Icon(Icons.person),
                                      ),
                                      title: Text(
                                        item['name'] ?? item['phone'] ?? '',
                                      ),
                                      subtitle: Text(
                                        '${item['phone'] ?? ''} - ${item['role'] ?? ''}\nสถานะ: ${item['status']}',
                                      ),
                                      isThreeLine: true,
                                      trailing: pending
                                          ? Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                IconButton(
                                                  onPressed: () => _update(
                                                    item['id'].toString(),
                                                    'accepted',
                                                  ),
                                                  icon: const Icon(
                                                    Icons.check,
                                                    color: Colors.green,
                                                  ),
                                                ),
                                                IconButton(
                                                  onPressed: () => _update(
                                                    item['id'].toString(),
                                                    'rejected',
                                                  ),
                                                  icon: const Icon(
                                                    Icons.close,
                                                    color: AppTheme.sosRed,
                                                  ),
                                                ),
                                              ],
                                            )
                                          : null,
                                    ),
                                  );
                                },
                              ),
                      ),
                    ],
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
