import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'secure_storage.dart';

class ApiService {
  // In production, change this to your server's domain
  static String get _baseUrl =>
      kIsWeb ? 'http://${Uri.base.host}:8080' : 'http://10.0.2.2:8080';

  static Future<Map<String, String>> _authHeaders() async {
    final token = await SecureStorage.getAccessToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static dynamic _decode(http.Response response) {
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    if (!body.containsKey('message') &&
        body['errors'] is List &&
        (body['errors'] as List).isNotEmpty) {
      body['message'] = body['errors'][0]['msg'] ?? 'ข้อมูลไม่ถูกต้อง';
    }
    return body;
  }

  // ---------- AUTH ----------
  static Future<Map<String, dynamic>> requestOtp(String phone) async {
    final res = await http
        .post(
          Uri.parse('$_baseUrl/auth/request-otp'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'phone': phone}),
        )
        .timeout(const Duration(seconds: 8));
    return _decode(res);
  }

  static Future<Map<String, dynamic>> verifyOtp(
    String phone,
    String code,
  ) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'code': code}),
    );
    return _decode(res);
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
      body: jsonEncode({
        'phone': phone,
        'name': name,
        'age': age,
        'role': role,
        'pin': pin,
      }),
    );
    return _decode(res);
  }

  static Future<Map<String, dynamic>> login(String phone, String pin) async {
    final res = await http
        .post(
          Uri.parse('$_baseUrl/auth/login'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'phone': phone, 'pin': pin}),
        )
        .timeout(const Duration(seconds: 8));
    return _decode(res);
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
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดรายการยาได้');
    }
    return body['data'] ?? [];
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
        'frequency': daysOfWeek.length == 7 ? 'daily' : 'weekly',
        'days_of_week': daysOfWeek,
      }),
    );
    final body = jsonDecode(res.body);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถเพิ่มยาได้');
    }
    return body;
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
    return _decode(res);
  }

  static Future<List<dynamic>> getNotifications() async {
    final res = await http.get(
      Uri.parse('$_baseUrl/api/notifications'),
      headers: await _authHeaders(),
    );
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดประวัติได้');
    }
    return body['data'] ?? [];
  }

  static Future<List<dynamic>> getFamilyConnections() async {
    final res = await http.get(
      Uri.parse('$_baseUrl/auth/family/connections'),
      headers: await _authHeaders(),
    );
    final body = _decode(res) as Map<String, dynamic>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(body['message'] ?? 'ไม่สามารถโหลดคนในครอบครัวได้');
    }
    return body['data'] ?? [];
  }

  static Future<Map<String, dynamic>> connectFamily(String phone) async {
    final res = await http.post(
      Uri.parse('$_baseUrl/auth/family/connections'),
      headers: await _authHeaders(),
      body: jsonEncode({'phone': phone}),
    );
    return _decode(res);
  }

  static Future<Map<String, dynamic>> updateFamilyConnection(
    String id,
    String status,
  ) async {
    final res = await http.patch(
      Uri.parse('$_baseUrl/auth/family/connections/$id'),
      headers: await _authHeaders(),
      body: jsonEncode({'status': status}),
    );
    return _decode(res);
  }
}
