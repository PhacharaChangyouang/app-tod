import 'dart:convert';
import 'package:http/http.dart' as http;
import 'secure_storage.dart';

class ApiService {
  // In production, change this to your server's domain
  static const String _baseUrl = 'http://10.0.2.2:8080'; // Android emulator -> localhost

  static Future<Map<String, String>> _authHeaders() async {
    final token = await SecureStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ---------- AUTH ----------
  static Future<Map<String, dynamic>> requestOtp(String phone) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/request-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'code': code}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> register({
    required String phone,
    required String name,
    required int age,
    required String role,
    required String pin,
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'name': name, 'age': age, 'role': role, 'pin': pin}),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> login(String phone, String pin) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'pin': pin}),
    );
    return jsonDecode(res.body);
  }

  static Future<void> logout() async {
    final token = await SecureStorage.getRefreshToken();
    await http.post(
      Uri.parse('$_baseUrl/auth/logout'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refreshToken': token}),
    );
    await SecureStorage.clearAll();
  }

  // ---------- REMINDERS ----------
  static Future<List<dynamic>> getReminders() async {
    final res = await http.get(
      Uri.parse('$_baseUrl/api/reminders'),
      headers: await _authHeaders(),
    );
    final body = jsonDecode(res.body);
    return body['reminders'] ?? [];
  }

  static Future<Map<String, dynamic>> createReminder({
    required String medicineName,
    required String dosage,
    required String reminderTime,
    required List<String> daysOfWeek,
  }) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/api/reminders'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'medicine_name': medicineName,
        'dosage': dosage,
        'reminder_time': reminderTime,
        'days_of_week': daysOfWeek,
      }),
    );
    return jsonDecode(res.body);
  }

  static Future<Map<String, dynamic>> deleteReminder(String id) async {
    final res = await http.delete(
      Uri.parse('$_baseUrl/api/reminders/$id'),
      headers: await _authHeaders(),
    );
    return jsonDecode(res.body);
  }

  // ---------- SOS / NOTIFICATIONS ----------
  static Future<Map<String, dynamic>> sendSos() async {
    final res = await http.post(
      Uri.parse('$_baseUrl/api/notifications'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'type': 'sos',
        'title': '🚨 SOS ฉุกเฉิน!',
        'message': 'ผู้สูงอายุกดปุ่ม SOS ต้องการความช่วยเหลือทันที!',
      }),
    );
    return jsonDecode(res.body);
  }
}
