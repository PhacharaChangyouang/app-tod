import 'package:flutter/material.dart';
import '../utils/app_theme.dart';
import '../utils/api_service.dart';

class ReminderScreen extends StatefulWidget {
  const ReminderScreen({super.key});

  @override
  State<ReminderScreen> createState() => _ReminderScreenState();
}

class _ReminderScreenState extends State<ReminderScreen> {
  List<dynamic> _reminders = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadReminders();
  }

  Future<void> _loadReminders() async {
    setState(() => _loading = true);
    try {
      final list = await ApiService.getReminders();
      setState(() { _reminders = list; _loading = false; });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<void> _addReminder() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (_) => const _AddReminderSheet(),
    );
    if (result != null) {
      try {
        await ApiService.createReminder(
          medicineName: result['medicine_name'],
          dosage: result['dosage'],
          reminderTime: result['reminder_time'],
          daysOfWeek: List<String>.from(result['days_of_week']),
        );
        await _loadReminders();
      } catch (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('เกิดข้อผิดพลาด กรุณาลองใหม่')),
          );
        }
      }
    }
  }

  Future<void> _deleteReminder(String id) async {
    await ApiService.deleteReminder(id);
    await _loadReminders();
  }

  @override
  Widget build(BuildContext context) {
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
                      icon: const Icon(Icons.arrow_back_ios_rounded, color: Colors.white, size: 28),
                    ),
                    const Text('นัดและยาของฉัน',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                    const Spacer(),
                    IconButton(
                      onPressed: _addReminder,
                      icon: const Icon(Icons.add_circle_rounded, color: Colors.white, size: 36),
                    ),
                  ],
                ),
              ),

              // List
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                  ),
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : _reminders.isEmpty
                          ? _buildEmpty()
                          : ListView.builder(
                              padding: const EdgeInsets.all(20),
                              itemCount: _reminders.length,
                              itemBuilder: (_, i) => _ReminderCard(
                                reminder: _reminders[i],
                                onDelete: () => _deleteReminder(_reminders[i]['id'].toString()),
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

  Widget _buildEmpty() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.medication_rounded, size: 80, color: Color(0xFFB0BEC5)),
          SizedBox(height: 16),
          Text('ยังไม่มีนัดหรือยา', style: TextStyle(fontSize: 22, color: AppTheme.textGrey)),
          SizedBox(height: 8),
          Text('กด + เพื่อเพิ่มรายการ', style: TextStyle(fontSize: 16, color: AppTheme.textGrey)),
        ],
      ),
    );
  }
}

class _ReminderCard extends StatelessWidget {
  final dynamic reminder;
  final VoidCallback onDelete;
  const _ReminderCard({required this.reminder, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        leading: Container(
          width: 56, height: 56,
          decoration: const BoxDecoration(
            gradient: AppTheme.headerGradient,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.medication_rounded, color: Colors.white, size: 28),
        ),
        title: Text(reminder['medicine_name'] ?? '',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (reminder['dosage'] != null)
              Text(reminder['dosage'],
                  style: const TextStyle(fontSize: 15, color: AppTheme.textGrey)),
            const SizedBox(height: 4),
            Row(children: [
              const Icon(Icons.access_time_rounded, size: 16, color: AppTheme.primaryBlue),
              const SizedBox(width: 4),
              Text(reminder['reminder_time'] ?? '',
                  style: const TextStyle(fontSize: 16, color: AppTheme.primaryBlue, fontWeight: FontWeight.bold)),
            ]),
          ],
        ),
        trailing: IconButton(
          icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.sosRed, size: 28),
          onPressed: onDelete,
        ),
      ),
    );
  }
}

class _AddReminderSheet extends StatefulWidget {
  const _AddReminderSheet();

  @override
  State<_AddReminderSheet> createState() => _AddReminderSheetState();
}

class _AddReminderSheetState extends State<_AddReminderSheet> {
  final _nameCtrl = TextEditingController();
  final _dosageCtrl = TextEditingController();
  TimeOfDay _time = const TimeOfDay(hour: 8, minute: 0);
  final List<String> _days = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  final Set<int> _selectedDays = {0, 1, 2, 3, 4, 5, 6};

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24, right: 24, top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('เพิ่มยา / นัดหมาย',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
          const SizedBox(height: 20),
          TextField(
            controller: _nameCtrl,
            style: const TextStyle(fontSize: 18),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.medication_rounded, color: AppTheme.primaryBlue),
              hintText: 'ชื่อยา / นัดหมาย',
            ),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _dosageCtrl,
            style: const TextStyle(fontSize: 18),
            decoration: const InputDecoration(
              prefixIcon: Icon(Icons.info_outline_rounded, color: AppTheme.primaryBlue),
              hintText: 'ขนาด / รายละเอียด (เช่น 1 เม็ด)',
            ),
          ),
          const SizedBox(height: 16),
          Row(children: [
            const Text('เวลา:', style: TextStyle(fontSize: 18, color: AppTheme.textGrey)),
            const SizedBox(width: 12),
            GestureDetector(
              onTap: () async {
                final picked = await showTimePicker(context: context, initialTime: _time);
                if (picked != null) setState(() => _time = picked);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.primaryBlue),
                ),
                child: Text(
                  '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}',
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryBlue),
                ),
              ),
            ),
          ]),
          const SizedBox(height: 16),
          const Text('วัน:', style: TextStyle(fontSize: 18, color: AppTheme.textGrey)),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(7, (i) => GestureDetector(
              onTap: () => setState(() {
                if (_selectedDays.contains(i)) _selectedDays.remove(i);
                else _selectedDays.add(i);
              }),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                width: 42, height: 42,
                decoration: BoxDecoration(
                  color: _selectedDays.contains(i) ? AppTheme.primaryBlue : Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: _selectedDays.contains(i) ? AppTheme.primaryBlue : Colors.grey.shade300,
                  ),
                ),
                child: Center(child: Text(_days[i],
                    style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: _selectedDays.contains(i) ? Colors.white : AppTheme.textGrey))),
              ),
            )),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              if (_nameCtrl.text.trim().isEmpty) return;
              final dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
              Navigator.pop(context, {
                'medicine_name': _nameCtrl.text.trim(),
                'dosage': _dosageCtrl.text.trim(),
                'reminder_time': '${_time.hour.toString().padLeft(2, '0')}:${_time.minute.toString().padLeft(2, '0')}',
                'days_of_week': _selectedDays.map((i) => dayNames[i]).toList(),
              });
            },
            child: const Text('บันทึก'),
          ),
        ],
      ),
    );
  }
}
