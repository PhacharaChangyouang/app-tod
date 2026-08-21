import 'package:flutter/material.dart';
import '../utils/app_theme.dart';

Future<void> showMedicationAlert(
  BuildContext context, {
  required String title,
  required String message,
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'ปิดการแจ้งเตือนยา',
    barrierColor: Colors.black54,
    transitionDuration: const Duration(milliseconds: 350),
    pageBuilder: (_, __, ___) =>
        _MedicationAlertDialog(title: title, message: message),
    transitionBuilder: (_, animation, __, child) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutBack,
      );
      return FadeTransition(
        opacity: animation,
        child: ScaleTransition(scale: curved, child: child),
      );
    },
  );
}

class _MedicationAlertDialog extends StatefulWidget {
  final String title;
  final String message;

  const _MedicationAlertDialog({required this.title, required this.message});

  @override
  State<_MedicationAlertDialog> createState() => _MedicationAlertDialogState();
}

class _MedicationAlertDialogState extends State<_MedicationAlertDialog>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
      lowerBound: 0.92,
      upperBound: 1.08,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      contentPadding: const EdgeInsets.fromLTRB(24, 0, 24, 8),
      actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      title: Column(
        children: [
          ScaleTransition(
            scale: _pulseController,
            child: Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: AppTheme.primaryBlue.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.medication_rounded,
                color: AppTheme.primaryBlue,
                size: 44,
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            widget.title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: Text(
        widget.message,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 18, height: 1.4),
      ),
      actions: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.check_rounded),
            label: const Text('รับทราบ', style: TextStyle(fontSize: 18)),
          ),
        ),
      ],
    );
  }
}
