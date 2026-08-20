import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aha_app/main.dart';

void main() {
  testWidgets('AHA app smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const AHAApp());
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
